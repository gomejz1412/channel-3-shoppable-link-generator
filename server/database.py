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

def ensure_feed_settings_backfill():
    """
    Ensure per-feed settings rows exist and backfill default avatar from legacy Settings.
    - Creates feed_settings table row for 'default' if missing.
    - Copies settings.avatar_url into feed_settings('default') if present and not already set.
    Safe to call multiple times.
    """
    try:
        with engine.begin() as conn:
            # Ensure table exists (created via SQLAlchemy metadata in create_tables)
            # Backfill default row if missing
            exists = conn.execute(text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='feed_settings'")).fetchone()
            if not exists:
                # If table somehow missing (shouldn't be if create_tables called), create it minimally
                conn.execute(text("CREATE TABLE IF NOT EXISTS feed_settings (feed TEXT PRIMARY KEY, avatar_url TEXT)"))

            row = conn.execute(text("SELECT feed FROM feed_settings WHERE feed = 'default'")).fetchone()
            if not row:
                # See if legacy Settings has an avatar to copy
                legacy = conn.execute(text("SELECT avatar_url FROM settings WHERE id='global'")).fetchone()
                legacy_avatar = legacy[0] if legacy and len(legacy) else None
                conn.execute(
                    text("INSERT INTO feed_settings (feed, avatar_url) VALUES ('default', :avatar)"),
                    {"avatar": legacy_avatar}
                )
                print("Backfill: Created feed_settings('default') from legacy Settings")

            # Ensure WWIB row exists (no avatar by default)
            wwib = conn.execute(text("SELECT feed FROM feed_settings WHERE feed = 'wwib'")).fetchone()
            if not wwib:
                conn.execute(
                    text("INSERT INTO feed_settings (feed, avatar_url) VALUES ('wwib', NULL)")
                )
                print("Backfill: Created feed_settings('wwib')")
    except Exception as e:
        print(f"Feed settings backfill failed: {e}")
