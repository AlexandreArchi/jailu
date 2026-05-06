import asyncio
import re
import time
import logging
import unicodedata
from pydantic import BaseModel
from spellchecker import SpellChecker
import httpx

# Initialisé une fois au démarrage (dictionnaire fr bundlé dans le package)
_spell_fr = SpellChecker(language='fr', distance=1)

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
    language: str | None


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
        language=info.get('language'),
    )


def _score(book: BookResult) -> int:
    s = 0
    if book.language == 'fr':
        s += 12
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


_FR_STOPWORDS = {'le', 'la', 'les', 'de', 'du', 'des', "l'", "d'", 'un', 'une', 'au', 'aux', 'en', 'et'}


def _strip_accents(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


def _keywords_only(q: str) -> str:
    words = q.split()
    keywords = [w for w in words if w.lower() not in _FR_STOPWORDS and len(w) > 2]
    return ' '.join(keywords) if keywords else q


def _spell_correct(q: str) -> str | None:
    """
    Corrige les fautes de lettres mot par mot.
    Ignore les mots courts (≤4 chars) et les mots déjà connus du dictionnaire fr.
    Retourne None si aucune correction n'est appliquée.
    """
    words = q.split()
    # Seuil à 7 chars : évite les faux positifs sur les mots courts
    # ("egares" → "gares" est un faux positif sans ce seuil)
    candidates = [w.lower() for w in words if len(w) >= 7]
    unknown = _spell_fr.unknown(candidates)
    if not unknown:
        return None

    corrected = []
    changed = False
    for word in words:
        w_lower = word.lower()
        if w_lower in unknown:
            suggestion = _spell_fr.correction(w_lower)
            if suggestion and suggestion != w_lower:
                corrected.append(suggestion)
                changed = True
                continue
        corrected.append(word)

    return ' '.join(corrected) if changed else None


def _normalize_isbn(q: str) -> str | None:
    digits = re.sub(r'[\s\-]', '', q)
    if re.match(r'^97[89]\d{10}$', digits):
        return digits
    if re.match(r'^\d{10}$', digits):
        return digits
    return None


def _build_queries(q: str) -> list[str]:
    """
    Construit plusieurs variantes de requête pour maximiser les chances de trouver un livre.
    Les guillemets sont essentiels pour les préfixes intitle:/inauthor: sur plusieurs mots.
    """
    words = q.split()
    queries: list[str] = [q]  # requête brute en premier

    if len(words) == 1:
        queries += [f'intitle:"{q}"', f'inauthor:"{q}"']
    elif len(words) <= 3:
        # Courte requête : peut être un titre ou un auteur
        queries += [f'intitle:"{q}"', f'inauthor:"{q}"']
    else:
        # Longue requête : "auteur titre" OU "titre auteur"
        # Auteur 1 mot en premier : "camus l'etranger"
        queries.append(
            f'inauthor:"{words[0]}" intitle:"{" ".join(words[1:])}"'
        )
        # Auteur 1 mot en dernier : "l'etranger camus"
        queries.append(
            f'intitle:"{" ".join(words[:-1])}" inauthor:"{words[-1]}"'
        )
        # Auteur 2 mots en premier : "amine maalouf le labyrinthe..."
        queries.append(
            f'inauthor:"{" ".join(words[:2])}" intitle:"{" ".join(words[2:])}"'
        )
        # Auteur 2 mots en dernier : "le labyrinthe... amine maalouf"
        queries.append(
            f'intitle:"{" ".join(words[:-2])}" inauthor:"{" ".join(words[-2:])}"'
        )
        # Titre seul sur les derniers mots (filet de sécurité)
        queries.append(f'intitle:"{" ".join(words[-3:])}"')

    # Dédupliquer en conservant l'ordre
    seen: set[str] = set()
    unique = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)
    return unique[:6]  # max 6 requêtes parallèles


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
        # ISBN direct
        isbn = _normalize_isbn(cache_key)
        if isbn:
            results = await _fetch(f'isbn:{isbn}', api_key, client, max_results=5)
            if results:
                _cache[cache_key] = (results, time.time())
                return results

        # Requêtes principales
        queries = _build_queries(cache_key)

        # Variante sans accents
        stripped = _strip_accents(cache_key)
        if stripped != cache_key and stripped not in queries:
            queries.append(stripped)

        # Variante corrigée orthographiquement (fautes de lettres)
        corrected = _spell_correct(cache_key)
        if corrected and corrected not in queries:
            queries.append(corrected)
            logger.info('Correction orthographique: "%s" → "%s"', cache_key, corrected)

        queries = queries[:6]

        logger.info('Requêtes pour "%s": %s', cache_key, queries)
        results_lists = await asyncio.gather(*[_fetch(q, api_key, client) for q in queries])

        seen: set[str] = set()
        merged: list[BookResult] = []
        for results in results_lists:
            for book in results:
                if book.google_books_id not in seen:
                    seen.add(book.google_books_id)
                    merged.append(book)

        # Fallback : si peu de résultats, retry sans articles français
        if len(merged) < 3:
            keywords = _keywords_only(cache_key)
            if keywords != cache_key:
                logger.info('Fallback mots-clés "%s" → "%s"', cache_key, keywords)
                kw_lists = await asyncio.gather(
                    *[_fetch(q, api_key, client) for q in _build_queries(keywords)[:3]]
                )
                for results in kw_lists:
                    for book in results:
                        if book.google_books_id not in seen:
                            seen.add(book.google_books_id)
                            merged.append(book)

    merged.sort(key=_score, reverse=True)
    final = merged[:15]
    _cache[cache_key] = (final, time.time())
    logger.info('%d résultats pour "%s" (pool: %d)', len(final), cache_key, len(merged))
    return final
