from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from deps import require_public_feed_enabled
from models import Product, Bundle
from schemas import PublicFeed, Product as ProductSchema, Bundle as BundleSchema
from utils import get_published_products, get_published_bundles, get_product_by_slug, get_bundle_by_slug, get_settings

router = APIRouter(prefix="/public", tags=["public"])
templates = Jinja2Templates(directory="templates")

@router.get("/", response_model=PublicFeed)
async def get_public_feed(
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get public feed (published products and bundles)"""
    products = get_published_products(db)
    bundles = get_published_bundles(db)
    settings = get_settings(db)
    return PublicFeed(products=products, bundles=bundles, influencer_avatar=settings.avatar_url)

@router.get("/feed")
async def public_feed_page(
    request: Request,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render public feed page"""
    products = get_published_products(db)
    bundles = get_published_bundles(db)
    return templates.TemplateResponse(
        "public/feed.html", 
        {
            "request": request,
            "products": products,
            "bundles": bundles
        }
    )

@router.get("/product/{slug}", response_model=ProductSchema)
async def get_public_product(
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get a published product by slug"""
    product = get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/product/{slug}/page")
async def public_product_page(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render public product page"""
    product = get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return templates.TemplateResponse(
        "public/product_detail.html", 
        {
            "request": request,
            "product": product
        }
    )

@router.get("/bundle/{slug}", response_model=BundleSchema)
async def get_public_bundle(
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get a published bundle by slug"""
    bundle = get_bundle_by_slug(db, slug)
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return bundle

@router.get("/bundle/{slug}/page")
async def public_bundle_page(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render public bundle page"""
    bundle = get_bundle_by_slug(db, slug)
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    return templates.TemplateResponse(
        "public/bundle_detail.html", 
        {
            "request": request,
            "bundle": bundle
        }
    )
