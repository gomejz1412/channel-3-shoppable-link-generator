import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_unauthorized_access_to_admin():
    """Test that unauthorized users are redirected from admin pages"""
    # Test admin dashboard redirects to login
    response = client.get("/admin", follow_redirects=False)
    assert response.status_code in [302, 307]  # Allow both redirect types
    assert "/api/login" in response.headers["location"]
    
    # Test admin API returns 401
    response = client.get("/api/admin/products")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

def test_successful_login():
    """Test successful login flow"""
    # Create a test environment with known password
    import os
    os.environ["ADMIN_PASSWORD"] = "testpassword123"
    os.environ["SESSION_SECRET"] = "testsecret"
    
    # Test login endpoint
    response = client.post("/api/login", json={"password": "testpassword123"})
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Test that we can now access admin endpoints
    response = client.get("/api/admin/products")
    assert response.status_code == 200

def test_failed_login():
    """Test failed login attempt"""
    response = client.post("/api/login", json={"password": "wrongpassword"})
    assert response.status_code == 401
    assert "Invalid password" in response.json()["detail"]

def test_logout():
    """Test logout functionality"""
    # Login first
    client.post("/api/login", json={"password": "testpassword123"})
    
    # Test logout
    response = client.post("/api/logout")
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Verify we can't access admin endpoints after logout
    response = client.get("/api/admin/products")
    assert response.status_code == 401
