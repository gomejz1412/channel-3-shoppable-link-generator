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

@app.get("/")
async def root(request: Request):
    """Root endpoint - serve frontend or redirect based on auth"""
    # If frontend dist exists, serve index.html for client-side routing
    if os.path.exists(frontend_dist_dir):
        index_path = os.path.join(frontend_dist_dir, "index.html")
        
        # Check if we should inject data (only for public view or if not logged in)
        user = request.session.get("user")
        if not user:
            try:
                # Fetch data for injection
                db = next(get_db())
                products = get_published_products(db)
                bundles = get_published_bundles(db)
                fs = get_feed_settings(db, "default")
                
                initial_data = {
                    "products": [p.__dict__ for p in products],
                    "bundles": [b.__dict__ for b in bundles],
                    "influencerAvatar": fs.avatar_url
                }
                
                # Clean up SQLAlchemy objects for JSON serialization
                for p in initial_data["products"]:
                    p.pop('_sa_instance_state', None)
                    if p.get('created_at'): p['created_at'] = p['created_at'].isoformat()
                    if p.get('updated_at'): p['updated_at'] = p['updated_at'].isoformat()
                for b in initial_data["bundles"]:
                    b.pop('_sa_instance_state', None)
                    if b.get('created_at'): b['created_at'] = b['created_at'].isoformat()
                    if b.get('updated_at'): b['updated_at'] = b['updated_at'].isoformat()

                with open(index_path, "r") as f:
                    html = f.read()
                
                # Inject data
                data_script = f"<script>window.__INITIAL_DATA__ = {json.dumps(initial_data)};</script>"
                html = html.replace('<div id="root"></div>', f'{data_script}\n<div id="root"></div>')
                
                # Inject SEO meta tags
                seo_meta = f"""
                <meta name="description" content="Shop the latest curated looks from Eve. Find your new favorites.">
                <meta property="og:title" content="Shop The Feed - Eve">
                <meta property="og:description" content="Curated shoppable looks from Eve.">
                """
                if products and products[0].image_url:
                    seo_meta += f'<meta property="og:image" content="{products[0].image_url}">'
                
                html = html.replace('</head>', f'{seo_meta}\n</head>')
                
                return HTMLResponse(content=html, headers={"Cache-Control": "no-store, max-age=0"})
            except Exception as e:
                print(f"Data injection failed: {e}")
                # Fallback to normal file response
        
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
    print(f"CATCH-ALL HIT: {request.method} /{full_path} (if this shows api routes, routing is broken)")
    
    # Skip API routes entirely - let them be handled by their routers
    # FastAPI will call this only if no other route matched
    # So if we get here for an API path, it means it was truly not found
    
    if os.path.exists(frontend_dist_dir):
        # Check if the requested path is a file that exists (css, js, images, etc)
        file_path = os.path.join(frontend_dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise serve index.html for client-side routing (SPA mode)
        index_path = os.path.join(frontend_dist_dir, "index.html")
        
        # Inject data for public paths
        if full_path.startswith("public"):
            try:
                db = next(get_db())
                products = get_published_products(db)
                bundles = get_published_bundles(db)
                fs = get_feed_settings(db, "default")
                
                initial_data = {
                    "products": [p.__dict__ for p in products],
                    "bundles": [b.__dict__ for b in bundles],
                    "influencerAvatar": fs.avatar_url
                }
                
                for p in initial_data["products"]:
                    p.pop('_sa_instance_state', None)
                    if p.get('created_at'): p['created_at'] = p['created_at'].isoformat()
                    if p.get('updated_at'): p['updated_at'] = p['updated_at'].isoformat()
                for b in initial_data["bundles"]:
                    b.pop('_sa_instance_state', None)
                    if b.get('created_at'): b['created_at'] = b['created_at'].isoformat()
                    if b.get('updated_at'): b['updated_at'] = b['updated_at'].isoformat()

                with open(index_path, "r") as f:
                    html = f.read()
                
                data_script = f"<script>window.__INITIAL_DATA__ = {json.dumps(initial_data)};</script>"
                html = html.replace('<div id="root"></div>', f'{data_script}\n<div id="root"></div>')
                
                return HTMLResponse(content=html, headers={"Cache-Control": "no-store, max-age=0"})
            except Exception as e:
                print(f"Data injection failed in catch-all: {e}")

        return FileResponse(index_path, headers={"Cache-Control": "no-store, max-age=0"})
    
    # Fallback for development
    return templates.TemplateResponse("public/feed.html", {"request": request})

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
