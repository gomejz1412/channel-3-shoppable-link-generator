from fastapi import APIRouter, Request, Response, status, HTTPException, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database import get_db
from deps import verify_admin_password
from schemas import LoginRequest, LoginResponse

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/login")
async def login_page(request: Request):
    """Render login page"""
    return templates.TemplateResponse("auth/login.html", {"request": request})

@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request, 
    response: Response, 
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Handle login form submission"""
    if verify_admin_password(login_data.password):
        # Set session
        request.session["user"] = {"username": "admin"}
        return LoginResponse(success=True, message="Login successful")
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

@router.post("/logout")
async def logout(request: Request):
    """Handle logout"""
    request.session.clear()
    return {"success": True, "message": "Logged out successfully"}

@router.get("/logout")
async def logout_page(request: Request):
    """Redirect to login after logout"""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
