from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
    )

    gcp_project_id: str
    environment: str = 'development'
    version: str = '0.1.0'
    port: int = 8000
    # En dev : valeur directe dans .env. En prod : chargée depuis Secret Manager au lifespan.
    google_books_api_key: str = ''
    groq_api_key: str = ''


settings = Settings()
