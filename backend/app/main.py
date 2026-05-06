import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .logging_config import configure_logging

configure_logging(settings.environment)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info('Démarrage JAILU API version=%s env=%s', settings.version, settings.environment)
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
