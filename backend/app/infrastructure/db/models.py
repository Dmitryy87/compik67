from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.database import Base


class Status(Base):
    __tablename__ = "statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(60))

    orders: Mapped[list["OrderModel"]] = relationship(back_populates="status")

    def __str__(self) -> str:
        return self.name


class ClientModel(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    orders: Mapped[list["OrderModel"]] = relationship(back_populates="client")

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True)

    components: Mapped[list["Component"]] = relationship(back_populates="category")

    def __str__(self) -> str:
        return self.name


class Component(Base):
    __tablename__ = "components"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))

    category: Mapped[Category] = relationship(back_populates="components")
    build_items: Mapped[list["BuildComponent"]] = relationship(back_populates="component")

    def __str__(self) -> str:
        return self.name


class BuildModel(Base):
    __tablename__ = "builds"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    label: Mapped[str] = mapped_column(String(60))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tone: Mapped[str] = mapped_column(String(40), default="bg-[#e9e9e3]")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)

    items: Mapped[list["BuildComponent"]] = relationship(
        back_populates="build", cascade="all, delete-orphan"
    )
    orders: Mapped[list["OrderModel"]] = relationship(back_populates="build")

    def __str__(self) -> str:
        return self.name


class BuildComponent(Base):
    __tablename__ = "build_components"

    id: Mapped[int] = mapped_column(primary_key=True)
    build_id: Mapped[int] = mapped_column(ForeignKey("builds.id", ondelete="CASCADE"))
    component_id: Mapped[int] = mapped_column(ForeignKey("components.id", ondelete="RESTRICT"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    build: Mapped[BuildModel] = relationship(back_populates="items")
    component: Mapped[Component] = relationship(back_populates="build_items")

    def __str__(self) -> str:
        return f"{self.quantity} × #{self.component_id}"


class OrderModel(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    status_id: Mapped[int] = mapped_column(ForeignKey("statuses.id"))
    build_id: Mapped[int | None] = mapped_column(ForeignKey("builds.id", ondelete="SET NULL"), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(30), nullable=True)
    performance: Mapped[str | None] = mapped_column(String(30), nullable=True)
    estimated_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    client: Mapped[ClientModel] = relationship(back_populates="orders")
    status: Mapped[Status] = relationship(back_populates="orders")
    build: Mapped[BuildModel | None] = relationship(back_populates="orders")

    def __str__(self) -> str:
        return f"Заявка #{self.id}"
