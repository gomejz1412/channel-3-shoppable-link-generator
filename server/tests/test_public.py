import pytest
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def test_public_feed_disabled():
    """Test public feed when disabled"""
    # Mock the settings to disable public feed
    from unittest.mock import patch
    from config import settings
    
    with patch.object(settings, 'public_feed_enabled', False):
        response = client.get("/api/public/")
        assert response.status_code == 404
        assert "Public feed is disabled" in response.json()["detail"]
        
        response = client.get("/api/public/feed")
        assert response.status_code == 404

def test_public_feed_enabled_empty():
    """Test public feed when enabled but empty"""
    # Create a new client with enabled feed
    from main import app
    import os
    os.environ["PUBLIC_FEED_ENABLED"] = "true"
    
    # Re-import to get fresh settings
    import importlib
    import config
    importlib.reload(config)
    
    test_client = TestClient(app)
    response = test_client.get("/api/public/")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert "bundles" in data
    # Note: We can't guarantee empty since other tests may have created data
    # Just verify the structure is correct
    assert isinstance(data["products"], list)
    assert isinstance(data["bundles"], list)

def test_public_product_not_found():
    """Test accessing non-existent product"""
    os.environ["PUBLIC_FEED_ENABLED"] = "true"
    
    response = client.get("/api/public/product/nonexistent")
    assert response.status_code == 404
    assert "Product not found" in response.json()["detail"]

def test_public_bundle_not_found():
    """Test accessing non-existent bundle"""
    os.environ["PUBLIC_FEED_ENABLED"] = "true"
    
    response = client.get("/api/public/bundle/nonexistent")
    assert response.status_code == 404
    assert "Bundle not found" in response.json()["detail"]

def test_public_pages_rendered():
    """Test that public pages render correctly"""
    os.environ["PUBLIC_FEED_ENABLED"] = "true"
    
    # Test feed page
    response = client.get("/api/public/feed")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    
    # Test product page (should 404 for non-existent product)
    response = client.get("/api/public/product/test/page")
    assert response.status_code == 404
    
    # Test bundle page (should 404 for non-existent bundle)
    response = client.get("/api/public/bundle/test/page")
    assert response.status_code == 404
