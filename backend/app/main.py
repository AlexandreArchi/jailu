import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .books import BookResult, search_books
from .groq_client import get_book_recommendations
from .config import settings
from .logging_config import configure_logging

configure_logging(settings.environment)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info('Démarrage JAILU API version=%s env=%s', settings.version, settings.environment)
    if not settings.google_books_api_key:
        logger.warning('GOOGLE_BOOKS_API_KEY non configurée — endpoint /api/books/search indisponible')
    if not settings.groq_api_key:
        logger.warning('GROQ_API_KEY non configurée — suggestions IA indisponibles')
    yield
    logger.info('Arrêt JAILU API')


app = FastAPI(
    title='JAILU API',
    version=settings.version,
    docs_url='/docs' if settings.environment != 'production' else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'https://jailu-prod.web.app',
    ],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE'],
    allow_headers=['*'],
)


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get('/api/health', response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status='ok', version=settings.version)


@app.get('/api/books/search', response_model=list[BookResult])
async def books_search(q: str = Query(min_length=3)) -> list[BookResult]:
    if not settings.google_books_api_key:
        raise HTTPException(status_code=503, detail='Clé Google Books non configurée')
    return await search_books(q, settings.google_books_api_key)


# ── Suggestions IA ──────────────────────────────────────────────────────────────

class ReadBook(BaseModel):
    title: str
    author: str
    rating: float | None = None


class SuggestionsRequest(BaseModel):
    read_books: Annotated[list[ReadBook], Field(max_length=50)]
    owned_titles: Annotated[list[str], Field(max_length=500)] = []


class SuggestionItem(BaseModel):
    book: BookResult
    reason: str
    source_title: str
    source_author: str


@app.post('/api/suggestions', response_model=list[SuggestionItem])
async def get_suggestions(body: SuggestionsRequest) -> list[SuggestionItem]:
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail='Groq non configuré')
    if not settings.google_books_api_key:
        raise HTTPException(status_code=503, detail='Google Books non configuré')
    if not body.read_books:
        return []

    read_books_dicts = [
        {'title': b.title, 'author': b.author, 'rating': b.rating or 3.0}
        for b in body.read_books
    ]

    # 1. Ask Groq which books to recommend
    groq_recs = await get_book_recommendations(read_books_dicts, settings.groq_api_key)
    if not groq_recs:
        return []

    owned_lower = {t.lower() for t in body.owned_titles}
    top_source = read_books_dicts[0]  # highest-rated book for attribution

    # 2. Search Google Books for each recommendation in parallel
    results = await asyncio.gather(
        *[
            search_books(
                f'intitle:"{r["title"]}" inauthor:"{r["author"]}"',
                settings.google_books_api_key,
            )
            for r in groq_recs
        ],
        return_exceptions=True,
    )

    suggestions: list[SuggestionItem] = []
    for rec, result in zip(groq_recs, results):
        if isinstance(result, Exception) or not result:
            continue
        book = result[0]
        # Skip if already owned
        if book.title.lower() in owned_lower:
            continue
        suggestions.append(
            SuggestionItem(
                book=book,
                reason=rec.get('reason', ''),
                source_title=top_source['title'],
                source_author=top_source['author'],
            )
        )

    return suggestions[:5]


# ── Image proxy ──────────────────────────────────────────────────────────────────

_PROXY_ALLOWED_HOSTS = {
    'covers.openlibrary.org',
    'books.google.com',
    'firebasestorage.googleapis.com',
    'lh3.googleusercontent.com',
}


@app.get('/api/proxy/image')
async def proxy_image(url: str) -> Response:
    """Proxy externe → même origine pour le canvas HTML (contourne CORS tiers)."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ''
        scheme = parsed.scheme
    except Exception:
        host = ''
        scheme = ''
    if scheme not in ('http', 'https') or host not in _PROXY_ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail='URL non autorisée')

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail='Image introuvable')
        content_type = resp.headers.get('content-type', 'image/jpeg')
        return Response(
            content=resp.content,
            media_type=content_type,
            headers={'Cache-Control': 'public, max-age=86400'},
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail='Timeout')
