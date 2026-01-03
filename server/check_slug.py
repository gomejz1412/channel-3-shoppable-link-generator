from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Product

# Setup DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_slug(slug):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.slug == slug).first()
        if product:
            print(f"Found product: {product.title}")
            print(f"URL: {product.product_url}")
        else:
            print(f"Slug '{slug}' not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_slug("r1Q95Fj-7pB6-ytnave")
