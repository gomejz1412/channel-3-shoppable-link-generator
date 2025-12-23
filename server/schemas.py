from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
  title: str
  description: Optional[str] = None
  image_url: Optional[str] = None
  product_url: str
  is_published: bool = False
  # Optional feed key for future multi-feed support (currently single Eve feed)
  feed: Optional[str] = None

class ProductCreate(ProductBase):
  pass

class ProductUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  image_url: Optional[str] = None
  product_url: Optional[str] = None
  is_published: Optional[bool] = None
  feed: Optional[str] = None

class Product(ProductBase):
  id: str
  slug: str
  created_at: datetime
  updated_at: Optional[datetime] = None
  
  class Config:
    from_attributes = True

class BundleBase(BaseModel):
  title: str
  description: Optional[str] = None
  is_published: bool = False
  feed: Optional[str] = None

class BundleCreate(BundleBase):
  product_ids: List[str] = []

class BundleUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  is_published: Optional[bool] = None
  product_ids: Optional[List[str]] = None
  feed: Optional[str] = None

class Bundle(BundleBase):
  id: str
  slug: str
  products: List[Product] = []
  created_at: datetime
  updated_at: Optional[datetime] = None
  
  class Config:
    from_attributes = True

class PublicFeed(BaseModel):
  products: List[Product] = []
  bundles: List[Bundle] = []
  influencer_avatar: Optional[str] = None

  class Config:
    from_attributes = True

class SettingsResponse(BaseModel):
  avatar_url: Optional[str] = None

class SettingsUpdate(BaseModel):
  avatar_url: Optional[str] = None

class LoginRequest(BaseModel):
  password: str

class LoginResponse(BaseModel):
  success: bool
  message: str


# URL Resolver (admin)
from typing import List as _List

class ResolveUrlsRequest(BaseModel):
  urls: _List[str]

class ResolveUrlsResponse(BaseModel):
  resolved: _List[str]
  titles: _List[Optional[str]]

class FeedItemCreate(BaseModel):
    # Accept both "title" and "name" from client
    title: str = Field(..., alias="name")
    links: List[str]
    image_url: str = Field(..., alias="imageUrl")
    feed: Optional[str] = "default"

    class Config:
        allow_population_by_field_name = True

class FeedItemResponse(BaseModel):
    # Return fields matching client expectation
    item_id: str = Field(..., alias="itemId")
    public_feed_url: str = Field(..., alias="publicUrl")
    success: bool
    message: str

    class Config:
        allow_population_by_field_name = True
