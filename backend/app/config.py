"""Application settings, read from environment variables (see .env.example)."""
from pydantic import Field
from pydantic_settings import BaseSettings

# PRD section 7: dimension weights
WEIGHTS = {"grammar": 0.20, "coherence": 0.25, "content": 0.35, "vocabulary": 0.20}

# LLM provider -> environment variable holding its API key (read by LangChain itself)
PROVIDER_KEY_ENV = {"google_genai": "GOOGLE_API_KEY", "openai": "OPENAI_API_KEY"}


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://aes:aes@db:5432/aes"
    jwt_secret: str = Field(min_length=32)
    jwt_expire_minutes: int = 720

    llm_provider: str = "google_genai"
    llm_model: str = "gemini-3.6-flash"
    llm_fallback_models: str = ""  # comma-separated, tried in order when the main model fails

    chroma_dir: str = "/data/chroma"

    min_words: int = 50
    max_words: int = 2000
    max_upload_bytes: int = 2_000_000


settings = Settings()
