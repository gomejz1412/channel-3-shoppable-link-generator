from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from deps import require_auth
from models import Product
from schemas import ProductCreate, ProductUpdate, Product as ProductSchema
from utils import create_slug, sanitize_multiline_urls
import httpx

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
    
    # Sanitize incoming product_url lines (resolve Channel 3 + label with titles)
    timeout = httpx.Timeout(3.0, connect=3.0, read=3.0, write=3.0)
    headers = {"User-Agent": "Channel3-LinkSanitizer/1.0 (+https://trychannel3.com)"}
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
        sanitized_urls = await sanitize_multiline_urls(product_data.product_url, client)
    
    product = Product(
        slug=slug,
        title=product_data.title,
        description=product_data.description,
        image_url=product_data.image_url,
        product_url=sanitized_urls,
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
    
    data = product_data.dict(exclude_unset=True)
    if "product_url" in data and data["product_url"] is not None:
        timeout = httpx.Timeout(3.0, connect=3.0, read=3.0, write=3.0)
        headers = {"User-Agent": "Channel3-LinkSanitizer/1.0 (+https://trychannel3.com)"}
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
            data["product_url"] = await sanitize_multiline_urls(data["product_url"], client)

    for field, value in data.items():
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
