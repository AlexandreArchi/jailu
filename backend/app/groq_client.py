import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama-3.1-8b-instant'


async def get_book_recommendations(
    read_books: list[dict],  # [{title, author, rating}] — sorted by rating desc
    api_key: str,
) -> list[dict]:  # [{title, author, reason}]
    """
    Demande à Groq de recommander 5 livres basés sur la bibliothèque de l'utilisateur.
    Retourne [] en cas d'erreur (le frontend affichera l'état vide).
    """
    top = read_books[:6]
    books_str = '\n'.join(
        f'- "{b["title"]}" de {b["author"]} ({b["rating"]}/5)'
        for b in top
    )

    prompt = (
        "Tu es un libraire expert francophone. Voici les livres les mieux notés d'un lecteur :\n\n"
        f"{books_str}\n\n"
        "Recommande exactement 5 livres que ce lecteur aimerait vraiment lire. Règles :\n"
        "- Livres réels, disponibles en version française\n"
        "- 5 auteurs différents entre eux ET différents des auteurs listés ci-dessus\n"
        "- Pas de suite directe d'un livre déjà listé\n"
        "- Variété de styles et d'univers\n\n"
        "Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication :\n"
        '[{"title":"Titre exact","author":"Prénom Nom","reason":"Raison courte max 12 mots"}]'
    )

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': GROQ_MODEL,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 500,
                    'temperature': 0.6,
                },
            )
            resp.raise_for_status()
            content = resp.json()['choices'][0]['message']['content'].strip()

            # Extract JSON array (handle potential markdown code blocks)
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if not match:
                logger.warning('Groq: no JSON array in response: %s', content[:300])
                return []

            recs = json.loads(match.group())
            return [
                r for r in recs
                if isinstance(r, dict) and r.get('title') and r.get('author')
            ]
    except Exception as e:
        logger.warning('Groq recommendations error: %s', e)
        return []


async def generate_suggestion_reason(
    source_title: str,
    source_author: str,
    suggested_title: str,
    suggested_author: str,
    suggested_description: str | None,
    api_key: str,
) -> str | None:
    """
    Génère une raison de suggestion personnalisée pour un livre (endpoint legacy).
    """
    desc_snippet = (
        f'\nDescription : {suggested_description[:250]}' if suggested_description else ''
    )

    prompt = (
        f'Tu es un libraire passionné. En une phrase courte et précise (15 mots maximum), '
        f'explique pourquoi quelqu\'un qui a adoré "{source_title}" de {source_author} '
        f'aimerait "{suggested_title}" de {suggested_author}.{desc_snippet}\n'
        f'Réponds uniquement avec la raison, sans guillemets, sans "Parce que" au début, '
        f'sans ponctuation finale.'
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': GROQ_MODEL,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 60,
                    'temperature': 0.75,
                },
            )
            resp.raise_for_status()
            reason = resp.json()['choices'][0]['message']['content'].strip()
            return reason[0].upper() + reason[1:] if reason else None
    except Exception as e:
        logger.warning('Groq reason error for "%s": %s', suggested_title, e)
        return None
