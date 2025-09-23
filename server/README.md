# Channel 3 Shoppable Link Generator - Server

FastAPI backend with server-side templates, session authentication, and persistent storage for creating shareable product links.

## Features

- **Server-driven architecture**: FastAPI with Jinja2 templates
- **Session-based authentication**: Secure admin access with httpOnly cookies
- **Persistent storage**: SQLite database with SQLAlchemy ORM
- **Public shareable links**: Read-only public pages with unique slugs
- **Environment configuration**: Flexible settings via environment variables
- **Comprehensive testing**: pytest tests for auth, CRUD, and public access

## Quick Start

### 1. Install Python Dependencies

```bash
# Install server dependencies
npm run server:install

# Or manually:
cd server
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp server/.env.example server/.env

# Edit server/.env with your settings:
# ADMIN_PASSWORD=your_secure_password_here
# SESSION_SECRET=your_very_long_random_session_secret_here
# DATABASE_URL=sqlite:///./app.db
# PUBLIC_FEED_ENABLED=true
```

### 3. Run the Server

```bash
# Run server only
npm run server:dev

# Run both frontend and backend (recommended for development)
npm run full:dev
```

The server will start at http://localhost:8000

## URLs

- **Public Feed**: http://localhost:8000/
- **Admin Login**: http://localhost:8000/api/login
- **Admin Dashboard**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/docs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Password for admin access | **Required** |
| `SESSION_SECRET` | Secret key for session encryption | **Required** |
| `DATABASE_URL` | Database connection string | `sqlite:///./app.db` |
| `PUBLIC_FEED_ENABLED` | Enable/disable public access | `true` |

## API Endpoints

### Authentication
- `POST /api/login` - Admin login
- `POST /api/logout` - Admin logout
- `GET /api/login` - Login page

### Admin (Protected)
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/{id}` - Update product
- `DELETE /api/admin/products/{id}` - Delete product
- `GET /api/admin/bundles` - List all bundles
- `POST /api/admin/bundles` - Create bundle
- `PUT /api/admin/bundles/{id}` - Update bundle
- `DELETE /api/admin/bundles/{id}` - Delete bundle

### Public (Read-only)
- `GET /api/public/` - Public feed (JSON)
- `GET /api/public/feed` - Public feed page (HTML)
- `GET /api/public/product/{slug}` - Product details (JSON)
- `GET /api/public/product/{slug}/page` - Product page (HTML)
- `GET /api/public/bundle/{slug}` - Bundle details (JSON)
- `GET /api/public/bundle/{slug}/page` - Bundle page (HTML)

## Data Model

### Product
- `id` (UUID) - Unique identifier
- `slug` (String) - URL-friendly identifier
- `title` (String) - Product title
- `description` (Text) - Product description
- `image_url` (String) - Product image URL
- `product_url` (String) - Original product URL
- `is_published` (Boolean) - Publication status
- `created_at` (DateTime) - Creation timestamp
- `updated_at` (DateTime) - Last update timestamp

### Bundle
- `id` (UUID) - Unique identifier
- `slug` (String) - URL-friendly identifier
- `title` (String) - Bundle title
- `description` (Text) - Bundle description
- `is_published` (Boolean) - Publication status
- `products` (Relationship) - Associated products
- `created_at` (DateTime) - Creation timestamp
- `updated_at` (DateTime) - Last update timestamp

## Security Features

- **Session-based authentication** with httpOnly cookies
- **SameSite cookie policy** for CSRF protection
- **Environment-based secrets** (no hardcoded passwords)
- **Public/private separation** - public pages have no edit controls
- **Input validation** with Pydantic schemas
- **SQL injection protection** via SQLAlchemy ORM

## Testing

```bash
# Run all tests
npm run server:test

# Run specific test files
cd server
python -m pytest tests/test_auth.py -v
python -m pytest tests/test_public.py -v
python -m pytest tests/test_crud.py -v
```

## Development Workflow

1. **Setup**: Install dependencies and configure environment
2. **Development**: Run `npm run full:dev` for both frontend and backend
3. **Testing**: Run tests to verify functionality
4. **Deployment**: Deploy with proper environment variables

## Deployment Notes

- Set `https_only=True` in SessionMiddleware for production
- Use a proper database (PostgreSQL) in production
- Set strong `SESSION_SECRET` and `ADMIN_PASSWORD`
- Configure reverse proxy (nginx) for static files
- Set proper CORS origins for your domain

## Troubleshooting

**Database Issues**: Delete `app.db` file to reset the database

**Session Issues**: Clear browser cookies or use incognito mode

**Environment Issues**: Verify `.env` file exists in `server/` directory

**Port Conflicts**: Change port in `server/run.py` if 8000 is occupied
