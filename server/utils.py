from nanoid import generate
from sqlalchemy.orm import Session
from models import Product, Bundle, Settings

# New imports for URL sanitation
import httpx
import urllib.parse
import re

def generate_slug():
    """Generate a unique slug for products and bundles"""
    return generate(size=10)

def create_slug(db: Session, model_class, title: str):
    """Create a unique slug for a model instance"""
    base_slug = generate_slug()
    slug = base_slug
    counter = 1
    
    # Check if slug already exists
    while db.query(model_class).filter(model_class.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug

def get_published_products(db: Session):
    """Get all published products"""
    return db.query(Product).filter(Product.is_published == True).all()

def get_published_bundles(db: Session):
    """Get all published bundles"""
    return db.query(Bundle).filter(Bundle.is_published == True).all()

def get_product_by_slug(db: Session, slug: str):
    """Get a published product by slug"""
    return db.query(Product).filter(
        Product.slug == slug, 
        Product.is_published == True
    ).first()

def get_bundle_by_slug(db: Session, slug: str):
    """Get a published bundle by slug"""
    return db.query(Bundle).filter(
        Bundle.slug == slug, 
        Bundle.is_published == True
    ).first()

def get_settings(db: Session) -> Settings:
    """Fetch global settings row; create if missing."""
    settings = db.query(Settings).filter(Settings.id == "global").first()
    if not settings:
        settings = Settings(id="global", avatar_url=None)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ---------------------------- Link sanitation helpers ---------------------------- #

_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_OG_TITLE_RE = re.compile(
    r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\']',
    re.IGNORECASE | re.DOTALL,
)
_META_REFRESH_RE = re.compile(
    r'<meta[^>]+http-equiv=["\']refresh["\'][^>]+content=["\']\s*\d+\s*;\s*url=([^"\']+)["\']',
    re.IGNORECASE,
)

def _extract_title(html: str) -> str | None:
    if not html:
        return None
    m = _OG_TITLE_RE.search(html)
    if m:
        return _cleanup_title(m.group(1).strip())
    m = _TITLE_RE.search(html)
    if m:
        return _cleanup_title(m.group(1).strip())
    return None

def _cleanup_title(title: str) -> str:
    # Split on common separators and pick the first non-empty piece
    for sep in [" | ", " – ", " — ", " • ", "|", "–", "—", "•"]:
        if sep in title:
            part = title.split(sep)[0].strip()
            if part:
                return part
    return title

def infer_label_from_url_py(u: str) -> str:
    try:
        url = urllib.parse.urlparse(u)
        path = url.path or ""
        parts = [p for p in path.split("/") if p]
        base = parts[-1] if parts else (url.hostname or u)
        base = urllib.parse.unquote(base)
        base = re.sub(r"[_-]+", " ", base).strip()
        # Title case simple words
        return " ".join([w[:1].upper() + w[1:] if w else w for w in base.split()])
    except Exception:
        return u

async def resolve_channel3_if_needed(u: str, client: httpx.AsyncClient) -> str:
    """
    Resolve buy.trychannel3.com redirects, including meta-refresh pages.
    """
    try:
        parsed = urllib.parse.urlparse(u)
        host = (parsed.hostname or "").lower()
        if host != "buy.trychannel3.com":
            return u

        # Try HEAD for redirect URL
        try:
            r_head = await client.head(u)
            final_url = str(r_head.url)
            if final_url and final_url != u:
                return final_url
        except Exception:
            pass

        # GET and inspect content + URL
        r_get = await client.get(u)
        final_url = str(r_get.url)

        # If content is HTML, check for meta refresh
        if "text/html" in r_get.headers.get("content-type", "").lower():
            m = _META_REFRESH_RE.search(r_get.text or "")
            if m:
                candidate = urllib.parse.urljoin(final_url, m.group(1).strip())
                return candidate

        return final_url if final_url else u
    except Exception:
        return u

async def fetch_title(u: str, client: httpx.AsyncClient) -> str | None:
    try:
        parsed = urllib.parse.urlparse(u)
        if parsed.scheme not in ("http", "https"):
            return None
        r = await client.get(u)
        if "text/html" in r.headers.get("content-type", "").lower():
            return _extract_title(r.text or "")
        return None
    except Exception:
        return None

async def sanitize_multiline_urls(multiline: str, client: httpx.AsyncClient) -> str:
    """
    Accepts a multiline string of entries that may be:
      - "Label | URL"
      - "URL"
    Returns a normalized multiline string in "Label | URL" form with:
      - Channel 3 URLs resolved to destination
      - Labels filled by: manual > fetched title > inferred from URL
    """
    if not multiline:
        return multiline

    lines = [l.strip() for l in multiline.splitlines() if l.strip()]
    out_lines: list[str] = []

    for line in lines:
        label = None
        link = line

        if "|" in line:
            parts = line.split("|", 1)
            label = parts[0].strip() or None
            link = parts[1].strip()

        # Validate link
        try:
            parsed = urllib.parse.urlparse(link)
            if parsed.scheme not in ("http", "https"):
                continue
        except Exception:
            continue

        # Resolve Channel 3 if necessary
        final_url = await resolve_channel3_if_needed(link, client)

        use_label = label
        if not use_label:
            title = await fetch_title(final_url, client)
            use_label = title or infer_label_from_url_py(final_url)

        out_lines.append(f"{use_label} | {final_url}")

    return "\n".join(out_lines)
