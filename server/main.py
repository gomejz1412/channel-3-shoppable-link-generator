from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import FileResponse
import os

from config import settings
from database import create_tables
from routers import auth, admin_products, admin_bundles, public, admin_settings

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
app.include_router(public.router, prefix="/api")

# Mount static files for backend
static_dir = "static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Serve frontend static files in production
frontend_dist_dir = "../dist"
if os.path.exists(frontend_dist_dir):
    app.mount("/", StaticFiles(directory=frontend_dist_dir, html=True), name="frontend")

@app.get("/")
async def root(request: Request):
    """Root endpoint - serve frontend or redirect based on auth"""
    # If frontend dist exists, serve index.html for client-side routing
    if os.path.exists(frontend_dist_dir):
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
    
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
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})

# Catch-all route for client-side routing
@app.get("/{full_path:path}")
async def catch_all(request: Request, full_path: str):
    """Catch-all route for client-side routing"""
    if os.path.exists(frontend_dist_dir):
        # Check if the requested path is a file that exists
        file_path = os.path.join(frontend_dist_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html for client-side routing
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
    
    # Fallback for development
    return templates.TemplateResponse("public/feed.html", {"request": request})

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    create_tables()
    print("Database tables created successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
