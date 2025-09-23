#!/usr/bin/env python3
"""
FastAPI Server Startup Script
Run with: python server/run.py
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Check required environment variables
required_vars = ["ADMIN_PASSWORD", "SESSION_SECRET"]
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print("❌ Missing required environment variables:")
    for var in missing_vars:
        print(f"   - {var}")
    print("\nPlease create a .env file with these variables or set them in your environment.")
    print("You can copy server/.env.example to server/.env and update the values.")
    exit(1)

# Import app after environment is loaded
from main import app

if __name__ == "__main__":
    print("🚀 Starting Channel 3 Shoppable Link Generator Server...")
    print(f"📊 Database: {os.getenv('DATABASE_URL', 'sqlite:///./app.db')}")
    print(f"🌐 Public Feed: {'Enabled' if os.getenv('PUBLIC_FEED_ENABLED', 'true').lower() == 'true' else 'Disabled'}")
    print("🔗 Server running at: http://localhost:8000")
    print("   - Public feed: http://localhost:8000/")
    print("   - Admin login: http://localhost:8000/api/login")
    print("   - Admin dashboard: http://localhost:8000/admin")
    print("\nPress Ctrl+C to stop the server")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
