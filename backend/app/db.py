import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Ensure storage directory exists if using SQLite
if "sqlite" in settings.DATABASE_URL:
    storage_dir = settings.STORAGE_PATH
    os.makedirs(storage_dir, exist_ok=True)

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    from app import models  # noqa
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app import models  # noqa
    Base.metadata.create_all(bind=engine)
