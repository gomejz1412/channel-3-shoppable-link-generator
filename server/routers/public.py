from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from deps import require_public_feed_enabled
from models import Product, Bundle
from schemas import PublicFeed, Product as ProductSchema, Bundle as BundleSchema
from utils import get_published_products, get_published_bundles, get_product_by_slug, get_bundle_by_slug, get_settings, get_feed_settings
from utils import resolve_channel3_if_needed, fetch_title
import urllib.parse
import httpx
import os
import json

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
    fs = get_feed_settings(db, "default")
    return PublicFeed(products=products, bundles=bundles, influencer_avatar=fs.avatar_url)

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

@router.post("/resolve-urls")
async def public_resolve_urls(payload: dict):
    """
    Public-safe resolver: resolves only buy.trychannel3.com URLs to their destinations.
    Other domains are returned unchanged. No auth required, short timeouts.
    Request body: { "urls": string[] }
    Response: { "resolved": string[], "titles": (string|null)[] }
    """
    urls = list(payload.get("urls", []) or [])[:10]
    timeout = httpx.Timeout(3.0, connect=3.0, read=3.0, write=3.0)
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
    resolved: list[str] = []
    titles: list[str | None] = []
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
        for u in urls:
            try:
                parsed = urllib.parse.urlparse(u)
                host = (parsed.hostname or "").lower()
                if "trychannel3.com" in host:
                    final_url = await resolve_channel3_if_needed(u, client)
                    resolved.append(final_url)
                    # Try to fetch a title for the destination page
                    title = await fetch_title(final_url, client)
                    titles.append(title)
                else:
                    resolved.append(u)
                    titles.append(None)
            except Exception:
                resolved.append(u)
                titles.append(None)
    return {"resolved": resolved, "titles": titles}


@router.get("/version")
async def public_version():
    """
    Return build metadata to verify the deployed version and defeat caches.
    Writes to server/static/version.json during build in render.yaml.
    """
    try:
        path = os.path.join("static", "version.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
        else:
            data = {"built_at": "unknown", "commit": "unknown"}
    except Exception:
        data = {"built_at": "unknown", "commit": "unknown"}
    # no-store so mobile clients don't cache this response
    return JSONResponse(content=data, headers={"Cache-Control": "no-store, max-age=0"})


# ---------------- WWIB public endpoints (mirrors /public with feed='wwib') ---------------- #

router_wwib = APIRouter(prefix="/public-wwib", tags=["public-wwib"])

@router_wwib.get("/", response_model=PublicFeed)
async def get_public_feed_wwib(
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get WWIB public feed (published products in WWIB feed and global bundles)"""
    products = get_published_products(db, feed="wwib")
    bundles = get_published_bundles(db, feed="wwib")
    fs = get_feed_settings(db, "wwib")
    return PublicFeed(products=products, bundles=bundles, influencer_avatar=fs.avatar_url)

@router_wwib.get("/feed")
async def public_feed_page_wwib(
    request: Request,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render WWIB public feed page"""
    products = get_published_products(db, feed="wwib")
    bundles = get_published_bundles(db, feed="wwib")
    return templates.TemplateResponse(
        "public/feed.html", 
        {
            "request": request,
            "products": products,
            "bundles": bundles
        }
    )

@router_wwib.get("/product/{slug}", response_model=ProductSchema)
async def get_public_product_wwib(
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get a WWIB published product by slug"""
    product = get_product_by_slug(db, slug, feed="wwib")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router_wwib.get("/product/{slug}/page")
async def public_product_page_wwib(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render WWIB public product page"""
    product = get_product_by_slug(db, slug, feed="wwib")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return templates.TemplateResponse(
        "public/product_detail.html", 
        {
            "request": request,
            "product": product
        }
    )

@router_wwib.get("/bundle/{slug}", response_model=BundleSchema)
async def get_public_bundle_wwib(
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Get a published bundle by slug (bundles are global)"""
    bundle = get_bundle_by_slug(db, slug, feed="wwib")
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return bundle

@router_wwib.get("/bundle/{slug}/page")
async def public_bundle_page_wwib(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
    _ = Depends(require_public_feed_enabled)
):
    """Render WWIB public bundle page (bundles are global)"""
    bundle = get_bundle_by_slug(db, slug, feed="wwib")
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    return templates.TemplateResponse(
        "public/bundle_detail.html", 
        {
            "request": request,
            "bundle": bundle
        }
    )
