from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BuildOut(BaseModel):
    id: int
    name: str
    label: str
    price: Decimal
    tone: str
    featured: bool
    specs: list[str]


class OrderCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    email: str | None = Field(default=None, max_length=120)
    message: str | None = Field(default=None, max_length=2000)
    build_id: int | None = None
    purpose: str | None = Field(default=None, max_length=30)
    performance: str | None = Field(default=None, max_length=30)
    estimated_price: Decimal | None = None


class OrderOut(BaseModel):
    id: int
    status: str
    created_at: datetime | None
