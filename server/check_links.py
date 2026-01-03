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

async def check_links(dry_run: bool = True, republish: bool = False, safe_mode: bool = False):
    db = SessionLocal()
    try:
        if republish:
            print("Republishing ALL products...")
            products = db.query(Product).all()
            count = 0
            for product in products:
                if not product.is_published:
                    product.is_published = True
                    db.add(product)
                    count += 1
            
            if not dry_run:
                db.commit()
                print(f"Republished {count} products.")
            else:
                print(f"[DRY RUN] Would republish {count} products.")
            return

        # Get all published products
        products = db.query(Product).filter(Product.is_published == True).all()
        print(f"Found {len(products)} published products.")
        
        broken_count = 0
        checked_count = 0
        
        # Use a safe fallback URL for broken links
        # In production, this should be the full URL. For now, we use a relative path if supported, 
        # or assume the frontend handles it. Since this is stored in DB, we should use a full URL if possible.
        # But we don't know the domain here easily. Let's use a relative path which works for <a> tags.
        SAFE_URL = "/static/link-broken.html"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for product in products:
                # Split multiline URLs and check each one
                urls = [u.split('|')[-1].strip() for u in product.product_url.split('\n') if u.strip()]
                
                is_healthy = True
                failed_url = ""
                
                for url in urls:
                    if not url:
                        continue
                        
                    # Skip if already safe
                    if url == SAFE_URL:
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
                        if safe_mode:
                            print(f"   [SAFE MODE] Replacing broken link with {SAFE_URL}...")
                            # Preserve labels if possible, but for now just replace the whole URL field
                            # to ensure safety.
                            product.product_url = SAFE_URL
                            # Keep is_published = True
                        else:
                            print(f"   Unpublishing product {product.id}...")
                            product.is_published = False
                        db.add(product)
                    else:
                        if safe_mode:
                             print(f"   [DRY RUN] Would replace link with {SAFE_URL}")
                        else:
                             print(f"   [DRY RUN] Would unpublish product {product.id}")
                        
        if not dry_run and broken_count > 0:
            db.commit()
            print(f"\nCommitted changes. Processed {broken_count} broken products.")
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
    parser.add_argument("--live", action="store_true", help="Actually apply changes")
    parser.add_argument("--republish", action="store_true", help="Republish all products (undo)")
    parser.add_argument("--safe-mode", action="store_true", help="Replace broken links with safe URL instead of unpublishing")
    args = parser.parse_args()
    
    asyncio.run(check_links(dry_run=not args.live, republish=args.republish, safe_mode=args.safe_mode))
