import time
import logging
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # secondes
_cache: dict[str, tuple[list, float]] = {}

GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes'


class BookResult(BaseModel):
    google_books_id: str
    isbn13: str | None
    isbn10: str | None
    title: str
    subtitle: str | None
    authors: list[str]
    publisher: str | None
    published_date: str | None
    page_count: int | None
    description: str | None
    cover_url: str
    thumbnail_url: str | None


def _extract_isbn(identifiers: list[dict]) -> tuple[str | None, str | None]:
    isbn13 = next((i['identifier'] for i in identifiers if i.get('type') == 'ISBN_13'), None)
    isbn10 = next((i['identifier'] for i in identifiers if i.get('type') == 'ISBN_10'), None)
    return isbn13, isbn10


def _build_cover_url(isbn13: str | None, isbn10: str | None, thumbnail: str | None) -> str:
    isbn = isbn13 or isbn10
    if isbn:
        return f'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false'
    return thumbnail or ''


def _parse_volume(item: dict) -> BookResult | None:
    info = item.get('volumeInfo', {})
    identifiers = info.get('industryIdentifiers', [])
    isbn13, isbn10 = _extract_isbn(identifiers)
    thumbnail = info.get('imageLinks', {}).get('thumbnail')
    if thumbnail:
        thumbnail = thumbnail.replace('http://', 'https://')
    cover_url = _build_cover_url(isbn13, isbn10, thumbnail)

    return BookResult(
        google_books_id=item['id'],
        isbn13=isbn13,
        isbn10=isbn10,
        title=info.get('title', 'Titre inconnu'),
        subtitle=info.get('subtitle'),
        authors=info.get('authors', []),
        publisher=info.get('publisher'),
        published_date=info.get('publishedDate'),
        page_count=info.get('pageCount'),
        description=info.get('description'),
        cover_url=cover_url,
        thumbnail_url=thumbnail,
    )


async def search_books(query: str, api_key: str) -> list[BookResult]:
    cache_key = query.lower().strip()
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached[1]) < CACHE_TTL:
        logger.info('Cache hit pour query=%s', cache_key)
        return cached[0]

    params = {
        'q': query,
        'maxResults': 15,
        'orderBy': 'relevance',
        'key': api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(GOOGLE_BOOKS_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        logger.warning('Google Books API erreur %s pour query=%s', e.response.status_code, cache_key)
        return []
    except httpx.RequestError as e:
        logger.error('Google Books API inaccessible : %s', e)
        return []

    results: list[BookResult] = []
    for item in data.get('items', []):
        book = _parse_volume(item)
        if book:
            results.append(book)

    _cache[cache_key] = (results, time.time())
    logger.info('Google Books API : %d résultats pour query=%s', len(results), cache_key)
    return results
