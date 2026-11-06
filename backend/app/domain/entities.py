from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


class OrderStatus:
    NEW = "new"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    REJECTED = "rejected"


@dataclass
class Build:
    id: int
    name: str
    label: str
    price: Decimal
    tone: str
    featured: bool
    specs: list[str] = field(default_factory=list)


@dataclass
class Client:
    id: int | None
    name: str
    phone: str
    email: str | None = None


@dataclass
class Order:
    id: int | None
    client_id: int
    status_code: str
    build_id: int | None = None
    purpose: str | None = None
    performance: str | None = None
    estimated_price: Decimal | None = None
    message: str | None = None
    created_at: datetime | None = None


class InsufficientStockError(Exception):
    """Raised when a build requires more components than are available."""
