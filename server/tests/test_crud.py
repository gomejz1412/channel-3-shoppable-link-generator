import pytest
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def setup_module():
    """Setup test environment"""
    os.environ["ADMIN_PASSWORD"] = "testpassword123"
    os.environ["SESSION_SECRET"] = "testsecret"
    os.environ["PUBLIC_FEED_ENABLED"] = "true"

def login():
    """Helper function to login"""
    response = client.post("/api/login", json={"password": "testpassword123"})
    assert response.status_code == 200
    return response

def test_create_product():
    """Test creating a product"""
    login()
    
    product_data = {
        "title": "Test Product",
        "description": "Test Description",
        "product_url": "https://example.com/product",
        "image_url": "https://example.com/image.jpg",
        "is_published": True
    }
    
    response = client.post("/api/admin/products", json=product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == product_data["title"]
    assert data["slug"] is not None
    assert data["is_published"] == True

def test_create_unpublished_product():
    """Test creating an unpublished product"""
    login()
    
    product_data = {
        "title": "Draft Product",
        "product_url": "https://example.com/draft",
        "is_published": False
    }
    
    response = client.post("/api/admin/products", json=product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["is_published"] == False
    
    # Verify unpublished product is not in public feed
    response = client.get("/api/public/")
    public_data = response.json()
    assert len([p for p in public_data["products"] if p["title"] == "Draft Product"]) == 0

def test_update_product():
    """Test updating a product"""
    login()
    
    # First create a product
    product_data = {
        "title": "Original Title",
        "product_url": "https://example.com/original",
        "is_published": False
    }
    response = client.post("/api/admin/products", json=product_data)
    product_id = response.json()["id"]
    
    # Update the product
    update_data = {
        "title": "Updated Title",
        "is_published": True
    }
    response = client.put(f"/api/admin/products/{product_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["is_published"] == True
    
    # Verify it appears in public feed
    response = client.get("/api/public/")
    public_data = response.json()
    # Check that our specific product is in the list
    product_titles = [p["title"] for p in public_data["products"]]
    assert "Updated Title" in product_titles

def test_delete_product():
    """Test deleting a product"""
    login()
    
    # Create a product
    product_data = {
        "title": "Product to Delete",
        "product_url": "https://example.com/delete",
        "is_published": True
    }
    response = client.post("/api/admin/products", json=product_data)
    product_id = response.json()["id"]
    
    # Delete the product
    response = client.delete(f"/api/admin/products/{product_id}")
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Verify product is gone
    response = client.get(f"/api/admin/products/{product_id}")
    assert response.status_code == 404

def test_create_bundle():
    """Test creating a bundle with products"""
    login()
    
    # First create some products
    product1_data = {
        "title": "Product 1 for Bundle",
        "product_url": "https://example.com/p1",
        "is_published": True
    }
    product2_data = {
        "title": "Product 2 for Bundle",
        "product_url": "https://example.com/p2",
        "is_published": True
    }
    
    p1_response = client.post("/api/admin/products", json=product1_data)
    p2_response = client.post("/api/admin/products", json=product2_data)
    
    p1_id = p1_response.json()["id"]
    p2_id = p2_response.json()["id"]
    
    # Create bundle with these products
    bundle_data = {
        "title": "Test Bundle",
        "description": "Bundle description",
        "product_ids": [p1_id, p2_id],
        "is_published": True
    }
    
    response = client.post("/api/admin/bundles", json=bundle_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Bundle"
    assert len(data["products"]) == 2
    assert data["is_published"] == True
    
    # Verify bundle appears in public feed
    response = client.get("/api/public/")
    public_data = response.json()
    # Check that our specific bundle is in the list
    bundle_titles = [b["title"] for b in public_data["bundles"]]
    assert "Test Bundle" in bundle_titles
