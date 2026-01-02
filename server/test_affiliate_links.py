import asyncio
import httpx
from utils import sanitize_multiline_urls

async def test():
    client = httpx.AsyncClient(follow_redirects=True)
    
    # Test Skimlinks URL
    skimlinks_url = "https://go.skimresources.com/?id=46189X1771256&xs=19&url=https%3A%2F%2Fbebe.com%2Fproducts%2Fscuba-crepe-square-neck-dress-black&xi=320930_17673934108040598159117741194008005"
    
    # Test Viglink URL
    viglink_url = "https://redirect.viglink.com/?key=696b51b99691e26f146ea311b6838bb5&u=https%3A%2F%2Fm.patpat.com%2Fproducts%2Fonesies-pajamas-matching-christmas-outfits-allover-pattern-zipper-front-holly-jolly-print-back-multicolour%3Fvariant%3D47640523342067&cuid=d4a8be21-071e-4d6d-92bb-c7781370f701&utm_source=ytnave"
    
    # Test direct link
    direct_link = "https://bebe.com/products/scuba-crepe-square-neck-dress-black"
    
    multiline = f"{skimlinks_url}\n{viglink_url}\n{direct_link}"
    
    print("Input URLs:")
    print(multiline)
    print("\nSanitizing...")
    
    sanitized = await sanitize_multiline_urls(multiline, client)
    
    print("\nSanitized URLs:")
    print(sanitized)
    
    # Check if affiliate links are preserved
    if skimlinks_url in sanitized:
        print("\n✅ Skimlinks URL preserved!")
    else:
        print("\n❌ Skimlinks URL STRIPPED!")
        
    if viglink_url in sanitized:
        print("✅ Viglink URL preserved!")
    else:
        print("❌ Viglink URL STRIPPED!")
        
    await client.aclose()

if __name__ == "__main__":
    asyncio.run(test())
