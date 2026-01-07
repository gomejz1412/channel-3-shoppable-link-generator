from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import FileResponse, HTMLResponse
import json
import os
import shutil

from config import settings
from database import create_tables, ensure_products_feed_column, ensure_bundles_feed_column, ensure_feed_settings_backfill
from routers import auth, admin_products, admin_bundles, public, admin_settings, admin_debug, api_feed, api_admin
from database import get_db
from utils import get_published_products, get_published_bundles, get_feed_settings
from schemas import PublicFeed, Product as ProductSchema, Bundle as BundleSchema
import re

# Create FastAPI app
app = FastAPI(title="Channel 3 Shoppable Link Generator", version="1.0.0")

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="session",
    max_age=86400,  # 24 hours
    same_site="lax",
    https_only=os.getenv("RENDER", "").lower() == "true"  # HTTPS only in production
)

# Add CORS middleware - allow all origins in production, specific in development
if os.getenv("RENDER"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3003", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Create templates directory if it doesn't exist
templates_dir = "templates"
if not os.path.exists(templates_dir):
    os.makedirs(templates_dir)

templates = Jinja2Templates(directory=templates_dir)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(admin_products.router, prefix="/api")
app.include_router(admin_bundles.router, prefix="/api")
app.include_router(admin_settings.router, prefix="/api")
app.include_router(admin_debug.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(api_feed.router, prefix="/api")
app.include_router(api_admin.router, prefix="/api")

# Mount static files for backend
static_dir = "static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Serve a no-content favicon to avoid 404s when the browser requests /favicon.ico
@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)

# NOTE: Frontend is served by the catch-all route at the end of the file
# Do NOT mount the frontend at "/" because it would intercept all requests including /api/*
frontend_dist_dir = "../dist"

def get_injected_html(index_path: str, full_path: str):
    """Helper to inject data and SEO meta tags into index.html"""
    try:
        db = next(get_db())
        products = get_published_products(db)
        bundles = get_published_bundles(db)
        fs = get_feed_settings(db, "default")
        
        feed_data = PublicFeed(
            products=[ProductSchema.from_orm(p) for p in products],
            bundles=[BundleSchema.from_orm(b) for b in bundles],
            influencer_avatar=fs.avatar_url
        )
        
        initial_data_json = feed_data.model_dump_json()
        
        with open(index_path, "r") as f:
            html = f.read()
        
        # Pre-render HTML for Lighthouse/SEO
        pre_rendered = render_pre_rendered_html(products, bundles, fs.avatar_url)
        
        # Inject data and pre-rendered HTML
        data_script = f"<script>window.__INITIAL_DATA__ = {initial_data_json};</script>"
        
        # Use regex for more robust replacement
        html = re.sub(r'<div id="root"></div>', f'{data_script}\n<div id="root">{pre_rendered}</div>', html)
        
        # Inject SEO meta tags
        title = "Shop The Feed - Eve"
        description = "Shop the latest curated looks from Eve. Find your new favorites."
        if full_path.startswith("shop") or full_path.startswith("public"):
            title = "Shop The Feed - Eve"
            description = "Curated shoppable looks from Eve. Find your new favorites."
        
        seo_meta = f"""
        <title>{title}</title>
        <meta name="description" content="{description}">
        <meta property="og:title" content="{title}">
        <meta property="og:description" content="{description}">
        <meta property="og:type" content="website">
        """
        if products and products[0].image_url:
            seo_meta += f'<meta property="og:image" content="{products[0].image_url}">'
        
        # Remove existing title if present to avoid duplicates
        html = re.sub(r'<title>.*?</title>', '', html, flags=re.IGNORECASE)
        html = html.replace('</head>', f'{seo_meta}\n</head>')
        
        return HTMLResponse(content=html, headers={"Cache-Control": "no-store, max-age=0"})
    except Exception as e:
        print(f"Data injection failed for {full_path}: {e}")
        import traceback
        traceback.print_exc()
        return FileResponse(index_path, headers={"Cache-Control": "no-store, max-age=0"})

@app.get("/")
async def root(request: Request):
    """Root endpoint - serve frontend or redirect based on auth"""
    if os.path.exists(frontend_dist_dir):
        index_path = os.path.join(frontend_dist_dir, "index.html")
        user = request.session.get("user")
        if not user:
            return get_injected_html(index_path, "/")
        return FileResponse(index_path, headers={"Cache-Control": "no-store, max-age=0"})
    
    # Fallback to template-based rendering for development
    user = request.session.get("user")
    if user:
        return templates.TemplateResponse("admin/dashboard.html", {"request": request})
    else:
        return templates.TemplateResponse("public/feed.html", {"request": request})

@app.get("/admin")
async def admin_dashboard(request: Request):
    """Admin dashboard - requires authentication"""
    user = request.session.get("user")
    if not user:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/api/login")
    
    # Serve frontend if available, otherwise template
    if os.path.exists(frontend_dist_dir):
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"), headers={"Cache-Control": "no-store, max-age=0"})
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})

# Catch-all route for client-side routing - MUST be last
# This serves frontend files or index.html for SPA routing
@app.get("/{full_path:path}")
async def catch_all(request: Request, full_path: str):
    """Catch-all route for client-side routing - serves frontend SPA"""
    # Log every catch-all hit to debug routing issues
    print(f"CATCH-ALL HIT: {request.method} /{full_path}")
    
    if os.path.exists(frontend_dist_dir):
        # Check if the requested path is a file that exists (css, js, images, etc)
        file_path = os.path.join(frontend_dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise serve index.html for client-side routing (SPA mode)
        index_path = os.path.join(frontend_dist_dir, "index.html")
        
        # Inject data for public paths or root
        if full_path == "" or full_path.startswith("public") or full_path.startswith("shop"):
            return get_injected_html(index_path, full_path)

        return FileResponse(index_path, headers={"Cache-Control": "no-store, max-age=0"})
    
    # Fallback for development
    return templates.TemplateResponse("public/feed.html", {"request": request})

def render_pre_rendered_html(products, bundles, avatar_url):
    """Generate a simplified HTML version of the feed for initial paint/SEO"""
    html = '<div class="w-full min-h-screen p-4 md:p-8 bg-slate-50">'
    html += '<div class="max-w-7xl mx-auto">'
    html += '<div class="text-center mb-8"><h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">Shop The Feed</h1><p class="mt-2 text-lg text-gray-500">Find your new favorites, curated with Eve.</p></div>'
    
    if not products and not bundles:
        html += '<div class="text-center py-16"><h3 class="mt-2 text-sm font-medium text-gray-900">No products found</h3></div>'
    else:
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">'
        for p in products:
            img_url = p.image_url or f"https://picsum.photos/seed/{p.slug}/400/400"
            html += f"""
            <div class="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                <header class="flex items-center p-4 border-b border-gray-100">
                    <img src="{avatar_url or ''}" alt="Influencer" class="w-10 h-10 rounded-full object-cover" />
                    <div class="ml-3"><p class="font-semibold text-sm text-gray-800">Eve</p><p class="text-xs text-gray-500">Affiliate Link</p></div>
                </header>
                <div class="aspect-square bg-gray-100"><img src="{img_url}" alt="{p.title}" class="w-full h-full object-cover" loading="eager"></div>
                <div class="p-4 flex flex-col flex-grow">
                    <div class="flex-grow"><p class="font-semibold text-gray-800 mb-1">{p.title}</p><p class="text-gray-700 text-sm leading-relaxed mt-1">{p.description or ''}</p></div>
                    <button class="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-lg">Tap to Buy</button>
                </div>
            </div>
            """
        html += '</div>'
    html += '</div></div>'
    return html

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    # Log the effective DB URL so we can verify persistence setup in Render logs
    print(f"Using DATABASE_URL={settings.database_url}")

    # One-time migration: if we switched to persistent disk at /var/data/app.db,
    # and an older ./app.db exists while the disk DB doesn't, copy it over.
    try:
        if "/var/data/app.db" in settings.database_url:
            src = "./app.db"
            dst = "/var/data/app.db"
            if os.path.exists(src) and not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
                print("Migrated SQLite DB from ./app.db -> /var/data/app.db")
    except Exception as e:
        print(f"DB migration check failed: {e}")

    create_tables()
    ensure_products_feed_column()
    ensure_bundles_feed_column()
    ensure_feed_settings_backfill()
    print("Database tables created successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
