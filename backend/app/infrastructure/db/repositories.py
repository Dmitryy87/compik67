from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.entities import Build, Client, InsufficientStockError, Order
from app.domain.repositories import BuildRepository, ClientRepository, OrderRepository
from app.infrastructure.db.models import BuildComponent, BuildModel, ClientModel, Component, OrderModel, Status


class SqlBuildRepository(BuildRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self) -> list[Build]:
        stmt = (
            select(BuildModel)
            .options(selectinload(BuildModel.items).selectinload(BuildComponent.component))
            .order_by(BuildModel.price)
        )
        rows = (await self.session.scalars(stmt)).all()
        return [
            Build(
                id=b.id,
                name=b.name,
                label=b.label,
                price=b.price,
                tone=b.tone,
                featured=b.featured,
                specs=[i.component.name for i in sorted(b.items, key=lambda x: x.id)],
            )
            for b in rows
        ]

    async def exists(self, build_id: int) -> bool:
        return await self.session.get(BuildModel, build_id) is not None

    async def reserve_components(self, build_id: int) -> Decimal:
        build = await self.session.get(BuildModel, build_id)
        if build is None:
            raise LookupError("Сборка не найдена")

        rows = (
            await self.session.execute(
                select(
                    BuildComponent.component_id,
                    BuildComponent.quantity,
                    Component.stock,
                )
                .join(Component, Component.id == BuildComponent.component_id)
                .where(BuildComponent.build_id == build_id)
                .order_by(BuildComponent.component_id)
                .with_for_update(of=Component)
            )
        ).all()

        required = defaultdict(int)
        available = {}
        for component_id, quantity, stock in rows:
            required[component_id] += quantity
            available[component_id] = stock

        insufficient = [
            str(component_id)
            for component_id, quantity in required.items()
            if available[component_id] < quantity
        ]
        if insufficient:
            raise InsufficientStockError(
                "Недостаточно комплектующих на складе: " + ", ".join(insufficient)
            )

        for component_id, quantity in required.items():
            await self.session.execute(
                update(Component)
                .where(Component.id == component_id)
                .values(stock=Component.stock - quantity)
            )

        await self.session.flush()
        return build.price


class SqlClientRepository(ClientRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_phone(self, phone: str) -> Client | None:
        row = await self.session.scalar(select(ClientModel).where(ClientModel.phone == phone))
        return Client(id=row.id, name=row.name, phone=row.phone, email=row.email) if row else None

    async def add(self, client: Client) -> Client:
        row = ClientModel(name=client.name, phone=client.phone, email=client.email)
        self.session.add(row)
        await self.session.flush()
        client.id = row.id
        return client


class SqlOrderRepository(OrderRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, order: Order) -> Order:
        status = await self.session.scalar(select(Status).where(Status.code == order.status_code))
        if status is None:
            raise RuntimeError(f"Status '{order.status_code}' not found")
        row = OrderModel(
            client_id=order.client_id,
            status_id=status.id,
            build_id=order.build_id,
            purpose=order.purpose,
            performance=order.performance,
            estimated_price=order.estimated_price,
            message=order.message,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        order.id = row.id
        order.created_at = row.created_at
        return order

    async def get(self, order_id: int) -> Order | None:
        row = await self.session.get(OrderModel, order_id, options=[selectinload(OrderModel.status)])
        if row is None:
            return None
        return Order(
            id=row.id,
            client_id=row.client_id,
            status_code=row.status.code,
            build_id=row.build_id,
            purpose=row.purpose,
            performance=row.performance,
            estimated_price=row.estimated_price,
            message=row.message,
            created_at=row.created_at,
        )
