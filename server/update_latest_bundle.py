from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Bundle

# Setup DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Get the latest bundle
    latest_bundle = db.query(Bundle).order_by(Bundle.created_at.desc()).first()

    if latest_bundle:
        print(f"Found bundle: {latest_bundle.id}")
        print(f"Old description: {latest_bundle.description}")

        new_description = "Curated Must‑Have\n\nPopular\nA perfect pick for your look. Stylish, versatile, and ready to wear."
        latest_bundle.description = new_description
        
        db.commit()
        print(f"New description: {latest_bundle.description}")
        print("Successfully updated latest bundle.")
    else:
        print("No bundles found.")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
