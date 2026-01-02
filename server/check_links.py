import asyncio
import httpx
import argparse
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from models import Product
from utils import check_url_health

# Setup DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def check_links(dry_run: bool = True):
    db = SessionLocal()
    try:
        # Get all published products
        products = db.query(Product).filter(Product.is_published == True).all()
        print(f"Found {len(products)} published products.")
        
        broken_count = 0
        checked_count = 0
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for product in products:
                # Split multiline URLs and check each one
                urls = [u.split('|')[-1].strip() for u in product.product_url.split('\n') if u.strip()]
                
                is_healthy = True
                failed_url = ""
                
                for url in urls:
                    if not url:
                        continue
                        
                    checked_count += 1
                    print(f"Checking: {url[:60]}...", end="", flush=True)
                    
                    healthy = await check_url_health(url, client)
                    
                    if healthy:
                        print(" ✅")
                    else:
                        print(" ❌")
                        is_healthy = False
                        failed_url = url
                        break # One broken link fails the product
                
                if not is_healthy:
                    broken_count += 1
                    print(f"⚠️  Product '{product.title}' has broken link: {failed_url}")
                    
                    if not dry_run:
                        print(f"   Unpublishing product {product.id}...")
                        product.is_published = False
                        db.add(product)
                    else:
                        print(f"   [DRY RUN] Would unpublish product {product.id}")
                        
        if not dry_run and broken_count > 0:
            db.commit()
            print(f"\nCommitted changes. Unpublished {broken_count} products.")
        else:
            print(f"\nFinished. Found {broken_count} broken products out of {len(products)} checked.")
            if dry_run and broken_count > 0:
                print("Run with --live to apply changes.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Check health of product links")
    parser.add_argument("--live", action="store_true", help="Actually unpublish broken products")
    args = parser.parse_args()
    
    asyncio.run(check_links(dry_run=not args.live))
