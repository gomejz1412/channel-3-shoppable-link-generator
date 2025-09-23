from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from deps import require_auth
from models import Product
from schemas import ProductCreate, ProductUpdate, Product as ProductSchema
from utils import create_slug

router = APIRouter(prefix="/admin/products", tags=["admin"])

@router.get("/", response_model=List[ProductSchema])
async def list_products(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get all products (admin only)"""
    return db.query(Product).order_by(Product.created_at.desc()).all()

@router.post("/", response_model=ProductSchema)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Create a new product (admin only)"""
    slug = create_slug(db, Product, product_data.title)
    
    product = Product(
        slug=slug,
        title=product_data.title,
        description=product_data.description,
        image_url=product_data.image_url,
        product_url=product_data.product_url,
        is_published=product_data.is_published
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get a specific product (admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Update a product (admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for field, value in product_data.dict(exclude_unset=True).items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Delete a product (admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"success": True, "message": "Product deleted"}
