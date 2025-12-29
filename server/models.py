from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()

# Association table for bundles and products
bundle_products = Table(
    'bundle_products',
    Base.metadata,
    Column('bundle_id', String, ForeignKey('bundles.id'), primary_key=True),
    Column('product_id', String, ForeignKey('products.id'), primary_key=True)
)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    image_url = Column(Text)
    product_url = Column(String, nullable=False)
    is_published = Column(Boolean, default=False)
    # Optional feed key for future multi-feed support (currently single Eve feed)
    feed = Column(String, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Bundle(Base):
    __tablename__ = "bundles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    is_published = Column(Boolean, default=False)
    # Optional feed key for future multi-feed support (currently single Eve feed)
    feed = Column(String, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Many-to-many relationship with products
    products = relationship("Product", secondary=bundle_products, backref="bundles")

class Settings(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default="global")
    # Store a persistent avatar URL or data URL (kept small by client)
    avatar_url = Column(Text)


class FeedSettings(Base):
    __tablename__ = "feed_settings"

    # Feed key e.g. "default" (single Eve feed, reserved for future expansion)
    feed = Column(String, primary_key=True)
    avatar_url = Column(Text)
