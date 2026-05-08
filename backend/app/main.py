import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from .books import BookResult, search_books
from .config import settings
from .logging_config import configure_logging

configure_logging(settings.environment)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info('Démarrage JAILU API version=%s env=%s', settings.version, settings.environment)
    if not settings.google_books_api_key:
        logger.warning('GOOGLE_BOOKS_API_KEY non configurée — endpoint /api/books/search indisponible')
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
        host = urlparse(url).hostname or ''
    except Exception:
        host = ''
    if host not in _PROXY_ALLOWED_HOSTS:
        raise HTTPException(status_code=400, detail='Hôte non autorisé')

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
