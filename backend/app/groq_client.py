import logging
import httpx

logger = logging.getLogger(__name__)

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL = 'llama-3.1-8b-instant'


async def generate_suggestion_reason(
    source_title: str,
    source_author: str,
    suggested_title: str,
    suggested_author: str,
    suggested_description: str | None,
    api_key: str,
) -> str | None:
    """
    Appelle Groq pour générer une raison de suggestion personnalisée.
    Retourne None en cas d'erreur (le client fallback sur la raison statique).
    """
    desc_snippet = f'\nDescription du livre suggéré : {suggested_description[:250]}' if suggested_description else ''

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
            data = resp.json()
            reason = data['choices'][0]['message']['content'].strip()
            # Capitalize first letter
            return reason[0].upper() + reason[1:] if reason else None
    except Exception as e:
        logger.warning('Groq error for "%s": %s', suggested_title, e)
        return None
# Groq integration active
