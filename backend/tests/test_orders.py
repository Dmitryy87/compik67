"""API/database tests. Set TEST_DATABASE_URL to an asyncpg URL for PostgreSQL locking tests."""
import asyncio
import os
import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.infrastructure.db.database import Base, get_session
from app.infrastructure.db.models import BuildComponent, BuildModel, Category, ClientModel, Component, OrderModel, Status
from app.presentation.api.routes import router


@pytest_asyncio.fixture
async def db(tmp_path):
    url = os.environ.get("TEST_DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/test.db")
    postgres = url.startswith("postgresql+asyncpg:")
    schema = f"test_orders_{uuid.uuid4().hex}"
    admin_engine = None
    if postgres:
        admin_engine = create_async_engine(url)
        async with admin_engine.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": schema}} if postgres else {})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as session:
        category = Category(name="CPU")
        component = Component(name="CPU", price=Decimal("12.50"), stock=5, category=category)
        other = Component(name="GPU", price=Decimal("30"), stock=1, category=category)
        build = BuildModel(name="Build", label="Test", price=Decimal("123.45"), tone="test", featured=False)
        # Duplicate lines should be summed, not checked independently.
        build.items = [BuildComponent(component=component, quantity=2), BuildComponent(component=component, quantity=1), BuildComponent(component=other, quantity=1)]
        session.add_all([build, Status(code="new", name="New")])
        await session.commit()
        ids = (build.id, component.id, other.id)
    yield sessions, ids, postgres
    await engine.dispose()
    if admin_engine:
        async with admin_engine.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin_engine.dispose()


@pytest_asyncio.fixture
async def client(db):
    sessions, _, _ = db
    app = FastAPI()
    app.include_router(router)

    async def session_override():
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as client:
        yield client


async def stock_and_counts(db):
    sessions, (_, component_id, other_id), _ = db
    async with sessions() as session:
        stock = [await session.scalar(select(Component.stock).where(Component.id == i)) for i in (component_id, other_id)]
        orders = await session.scalar(select(func.count()).select_from(OrderModel))
        clients = await session.scalar(select(func.count()).select_from(ClientModel))
        return stock, orders, clients


@pytest.mark.asyncio
async def test_price_stock_and_retrieval(db, client):
    _, (build_id, _, _), _ = db
    response = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "build_id": build_id, "estimated_price": "0.01"})
    assert response.status_code == 201, response.text
    assert Decimal(response.json()["estimated_price"]) == Decimal("123.45")
    assert await stock_and_counts(db) == ([2, 0], 1, 1)
    fetched = await client.get(f"/api/orders/{response.json()['id']}")
    assert Decimal(fetched.json()["estimated_price"]) == Decimal("123.45")

    rejected = await client.post("/api/orders", json={"name": "Other", "phone": "54321", "build_id": build_id})
    assert rejected.status_code == 409
    assert await stock_and_counts(db) == ([2, 0], 1, 1)


@pytest.mark.asyncio
async def test_duplicate_lines_are_summed_before_any_stock_is_changed(db, client):
    sessions, (build_id, component_id, _), _ = db
    async with sessions() as session:
        component = await session.get(Component, component_id)
        component.stock = 2  # Each line fits separately, but 2 + 1 does not.
        await session.commit()
    response = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "build_id": build_id})
    assert response.status_code == 409
    assert await stock_and_counts(db) == ([2, 1], 0, 0)


@pytest.mark.asyncio
async def test_missing_build_and_no_build(db, client):
    missing = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "build_id": 99999})
    assert missing.status_code == 404
    assert await stock_and_counts(db) == ([5, 1], 0, 0)
    response = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "estimated_price": "not even a number"})
    assert response.status_code == 201
    assert response.json()["estimated_price"] is None
    assert await stock_and_counts(db) == ([5, 1], 1, 1)


@pytest.mark.asyncio
async def test_failure_after_reservation_rolls_back(db, client):
    sessions, (build_id, _, _), _ = db
    async with sessions() as session:
        status = await session.scalar(select(Status).where(Status.code == "new"))
        await session.delete(status)
        await session.commit()
    response = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "build_id": build_id})
    assert response.status_code == 500
    assert await stock_and_counts(db) == ([5, 1], 0, 0)


@pytest.mark.asyncio
async def test_nonpositive_quantities_are_rejected(db, client):
    sessions, (build_id, _, _), _ = db
    async with sessions() as session:
        item = await session.scalar(select(BuildComponent).where(BuildComponent.build_id == build_id))
        item.quantity = -1
        await session.commit()
    response = await client.post("/api/orders", json={"name": "Alex", "phone": "12345", "build_id": build_id})
    assert response.status_code == 409
    assert await stock_and_counts(db) == ([5, 1], 0, 0)


@pytest.mark.asyncio
async def test_concurrent_orders_do_not_oversell(db, client):
    _, (build_id, _, _), postgres = db
    if not postgres:
        pytest.skip("PostgreSQL required for row-locking test")
    responses = await asyncio.gather(*[
        client.post("/api/orders", json={"name": "Alex", "phone": str(12345 + i), "build_id": build_id})
        for i in range(2)
    ])
    assert sorted(response.status_code for response in responses) == [201, 409]
    assert await stock_and_counts(db) == ([2, 0], 1, 1)
