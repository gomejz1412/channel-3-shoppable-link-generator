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

# Additional redirect hints in HTML
_JS_HREF_RE = re.compile(r'window\.location(?:\.href)?\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
_JS_REPLACE_RE = re.compile(r'location\.replace\(\s*["\']([^"\']+)["\']\s*\)', re.IGNORECASE)
_JS_ASSIGN_RE = re.compile(r'location\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
_CANONICAL_RE = re.compile(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', re.IGNORECASE)

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
    Resolve buy.trychannel3.com redirects robustly:
    - HEAD then GET
    - meta refresh
    - JS redirects (window.location / location.replace / assignment)
    - <link rel="canonical">
    Follows a few hops with guards.
    """
    try:
        current = u
        visited = set()
        for _ in range(3):  # follow up to 3 hops
            parsed = urllib.parse.urlparse(current)
            host = (parsed.hostname or "").lower()
            if "trychannel3.com" not in host:
                return current
            if current in visited:
                break
            visited.add(current)

            # Prefer HEAD first
            try:
                r_head = await client.head(current)
                head_url = str(r_head.url)
                if head_url and head_url != current:
                    current = head_url
                    continue
            except Exception:
                pass

            # Then GET and inspect
            r_get = await client.get(current)
            final_url = str(r_get.url) if r_get is not None else current
            text = r_get.text or ""
            ctype = (r_get.headers.get("content-type", "") or "").lower()

            # HTML-based hints
            if "text/html" in ctype:
                # meta refresh
                m = _META_REFRESH_RE.search(text)
                if m:
                    candidate = urllib.parse.urljoin(final_url, m.group(1).strip())
                    if candidate and candidate != current:
                        current = candidate
                        continue
                # JS redirects
                for rx in (_JS_HREF_RE, _JS_REPLACE_RE, _JS_ASSIGN_RE):
                    jm = rx.search(text)
                    if jm:
                        target = urllib.parse.urljoin(final_url, jm.group(1).strip())
                        if target and target != current:
                            current = target
                            break
                else:
                    # canonical link as last resort
                    cm = _CANONICAL_RE.search(text)
                    if cm:
                        canon = urllib.parse.urljoin(final_url, cm.group(1).strip())
                        if canon and canon != current:
                            current = canon
                            continue
                    # no change from HTML hints
                    current = final_url
                    continue
            else:
                # Non-HTML: trust the final URL from GET
                current = final_url
                continue

        return current
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
