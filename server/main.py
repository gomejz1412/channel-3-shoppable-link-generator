from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
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
    https_only=False  # Set to True in production
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3003", "http://localhost:5173"],  # Vite dev server
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

# Mount static files
static_dir = "static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root(request: Request):
    """Root endpoint - redirect to public feed or admin based on auth"""
    # Check if user is authenticated
    user = request.session.get("user")
    if user:
        # Redirect to admin dashboard
        return templates.TemplateResponse("admin/dashboard.html", {"request": request})
    else:
        # Redirect to public feed
        return templates.TemplateResponse("public/feed.html", {"request": request})

@app.get("/admin")
async def admin_dashboard(request: Request):
    """Admin dashboard - requires authentication"""
    user = request.session.get("user")
    if not user:
        # Redirect to login if not authenticated
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/api/login")
    
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    create_tables()
    print("Database tables created successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
