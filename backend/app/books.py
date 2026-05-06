import asyncio
import re
import time
import logging
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

CACHE_TTL = 300
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
    categories: list[str]


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
    if not info.get('title') or not info.get('authors'):
        return None

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
        title=info['title'],
        subtitle=info.get('subtitle'),
        authors=info.get('authors', []),
        publisher=info.get('publisher'),
        published_date=info.get('publishedDate'),
        page_count=info.get('pageCount'),
        description=info.get('description'),
        cover_url=cover_url,
        thumbnail_url=thumbnail,
        categories=info.get('categories', []),
    )


def _score(book: BookResult) -> int:
    s = 0
    if book.isbn13:
        s += 10
    elif book.isbn10:
        s += 5
    # Open Library cover = better quality than Google Books thumbnail
    if book.cover_url and 'openlibrary' in book.cover_url:
        s += 8
    elif book.cover_url:
        s += 3
    if book.description:
        s += 5
    if book.page_count and book.page_count > 0:
        s += 3
    if book.publisher:
        s += 2
    if book.published_date:
        s += 1
    return s


def _normalize_isbn(q: str) -> str | None:
    digits = re.sub(r'[\s\-]', '', q)
    if re.match(r'^97[89]\d{10}$', digits):
        return digits
    if re.match(r'^\d{10}$', digits):
        return digits
    return None


async def _fetch(q: str, api_key: str, client: httpx.AsyncClient, max_results: int = 20) -> list[BookResult]:
    params = {
        'q': q,
        'maxResults': max_results,
        'printType': 'books',
        'orderBy': 'relevance',
        'key': api_key,
    }
    try:
        response = await client.get(GOOGLE_BOOKS_URL, params=params)
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        logger.warning('Google Books fetch error for q=%s: %s', q, e)
        return []

    results = []
    for item in data.get('items', []):
        book = _parse_volume(item)
        if book:
            results.append(book)
    return results


async def search_books(query: str, api_key: str) -> list[BookResult]:
    cache_key = query.lower().strip()
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached[1]) < CACHE_TTL:
        logger.info('Cache hit: %s', cache_key)
        return cached[0]

    async with httpx.AsyncClient(timeout=10.0) as client:
        # ISBN detection: search directly by ISBN
        isbn = _normalize_isbn(cache_key)
        if isbn:
            results = await _fetch(f'isbn:{isbn}', api_key, client, max_results=5)
            if results:
                _cache[cache_key] = (results, time.time())
                return results

        # Build parallel queries: general + author-focused + title-focused
        queries = [cache_key, f'intitle:{cache_key}']
        # For short queries (likely an author name), also search by author
        words = cache_key.split()
        if len(words) <= 3:
            queries.append(f'inauthor:{cache_key}')

        tasks = [_fetch(q, api_key, client) for q in queries]
        results_lists = await asyncio.gather(*tasks)

    # Merge and deduplicate (keep first occurrence = highest relevance from main query)
    seen: set[str] = set()
    merged: list[BookResult] = []
    for results in results_lists:
        for book in results:
            if book.google_books_id not in seen:
                seen.add(book.google_books_id)
                merged.append(book)

    # Re-rank by completeness score
    merged.sort(key=_score, reverse=True)
    final = merged[:15]

    _cache[cache_key] = (final, time.time())
    logger.info('%d résultats pour "%s" (avant dédup: %d)', len(final), cache_key, len(merged))
    return final
