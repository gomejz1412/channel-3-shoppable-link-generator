from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Product

# Setup DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_counts():
    db = SessionLocal()
    try:
        total = db.query(Product).count()
        published = db.query(Product).filter(Product.is_published == True).count()
        unpublished = db.query(Product).filter(Product.is_published == False).count()
        
        print(f"Total Products: {total}")
        print(f"Published: {published}")
        print(f"Unpublished: {unpublished}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_counts()
