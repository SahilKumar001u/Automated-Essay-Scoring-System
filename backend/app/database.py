from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# Render hands out postgresql:// URLs; SQLAlchemy needs the psycopg (v3) driver named
engine = create_engine(settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as db:
        yield db
