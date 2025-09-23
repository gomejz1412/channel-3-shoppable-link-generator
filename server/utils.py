from nanoid import generate
from sqlalchemy.orm import Session
from models import Product, Bundle, Settings

def generate_slug():
    """Generate a unique slug for products and bundles"""
    return generate(size=10)

def create_slug(db: Session, model_class, title: str):
    """Create a unique slug for a model instance"""
    base_slug = generate_slug()
    slug = base_slug
    counter = 1
    
    # Check if slug already exists
    while db.query(model_class).filter(model_class.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug

def get_published_products(db: Session):
    """Get all published products"""
    return db.query(Product).filter(Product.is_published == True).all()

def get_published_bundles(db: Session):
    """Get all published bundles"""
    return db.query(Bundle).filter(Bundle.is_published == True).all()

def get_product_by_slug(db: Session, slug: str):
    """Get a published product by slug"""
    return db.query(Product).filter(
        Product.slug == slug, 
        Product.is_published == True
    ).first()

def get_bundle_by_slug(db: Session, slug: str):
    """Get a published bundle by slug"""
    return db.query(Bundle).filter(
        Bundle.slug == slug, 
        Bundle.is_published == True
    ).first()

def get_settings(db: Session) -> Settings:
    """Fetch global settings row; create if missing."""
    settings = db.query(Settings).filter(Settings.id == "global").first()
    if not settings:
        settings = Settings(id="global", avatar_url=None)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
