from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Base

# Create engine and session
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)

def ensure_products_feed_column():
    """
    Lightweight migration: add 'feed' column to products if missing (SQLite-safe).
    Safe to call multiple times.
    """
    try:
        with engine.begin() as conn:
            # Check existing columns
            res = conn.execute(text("PRAGMA table_info('products')"))
            cols = [row[1] for row in res]  # row tuple: (cid, name, type, notnull, dflt_value, pk)
            if "feed" not in cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN feed TEXT"))
                print("Migration: Added 'feed' column to products")
    except Exception as e:
        print(f"Migration check for products.feed failed: {e}")

def ensure_bundles_feed_column():
    """
    Lightweight migration: add 'feed' column to bundles if missing (SQLite-safe).
    Safe to call multiple times.
    """
    try:
        with engine.begin() as conn:
            # Check existing columns
            res = conn.execute(text("PRAGMA table_info('bundles')"))
            cols = [row[1] for row in res]  # row tuple: (cid, name, type, notnull, dflt_value, pk)
            if "feed" not in cols:
                conn.execute(text("ALTER TABLE bundles ADD COLUMN feed TEXT"))
                print("Migration: Added 'feed' column to bundles")
    except Exception as e:
        print(f"Migration check for bundles.feed failed: {e}")
