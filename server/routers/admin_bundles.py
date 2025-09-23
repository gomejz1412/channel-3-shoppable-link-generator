from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from deps import require_auth
from models import Bundle, Product
from schemas import BundleCreate, BundleUpdate, Bundle as BundleSchema
from utils import create_slug

router = APIRouter(prefix="/admin/bundles", tags=["admin"])

@router.get("/", response_model=List[BundleSchema])
async def list_bundles(
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get all bundles (admin only)"""
    return db.query(Bundle).order_by(Bundle.created_at.desc()).all()

@router.post("/", response_model=BundleSchema)
async def create_bundle(
    bundle_data: BundleCreate,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Create a new bundle (admin only)"""
    slug = create_slug(db, Bundle, bundle_data.title)
    
    # Get products for the bundle
    products = []
    for product_id in bundle_data.product_ids:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            products.append(product)
    
    bundle = Bundle(
        slug=slug,
        title=bundle_data.title,
        description=bundle_data.description,
        is_published=bundle_data.is_published,
        products=products
    )
    
    db.add(bundle)
    db.commit()
    db.refresh(bundle)
    return bundle

@router.get("/{bundle_id}", response_model=BundleSchema)
async def get_bundle(
    bundle_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Get a specific bundle (admin only)"""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return bundle

@router.put("/{bundle_id}", response_model=BundleSchema)
async def update_bundle(
    bundle_id: str,
    bundle_data: BundleUpdate,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Update a bundle (admin only)"""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    # Update basic fields
    for field, value in bundle_data.dict(exclude_unset=True, exclude={"product_ids"}).items():
        setattr(bundle, field, value)
    
    # Update products if provided
    if bundle_data.product_ids is not None:
        products = []
        for product_id in bundle_data.product_ids:
            product = db.query(Product).filter(Product.id == product_id).first()
            if product:
                products.append(product)
        bundle.products = products
    
    db.commit()
    db.refresh(bundle)
    return bundle

@router.delete("/{bundle_id}")
async def delete_bundle(
    bundle_id: str,
    db: Session = Depends(get_db),
    user = Depends(require_auth)
):
    """Delete a bundle (admin only)"""
    bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    db.delete(bundle)
    db.commit()
    return {"success": True, "message": "Bundle deleted"}
