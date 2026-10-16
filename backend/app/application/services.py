from app.application.schemas import BuildOut, OrderCreate, OrderOut
from app.domain.entities import Client, Order, OrderStatus
from app.domain.repositories import BuildRepository, ClientRepository, OrderRepository


class BuildService:
    def __init__(self, builds: BuildRepository):
        self.builds = builds

    async def list_builds(self) -> list[BuildOut]:
        return [BuildOut(**b.__dict__) for b in await self.builds.list()]


class OrderService:
    def __init__(self, orders: OrderRepository, clients: ClientRepository, builds: BuildRepository):
        self.orders = orders
        self.clients = clients
        self.builds = builds

    async def create_order(self, data: OrderCreate) -> OrderOut:
        client = await self.clients.get_by_phone(data.phone)
        if client is None:
            client = await self.clients.add(Client(id=None, name=data.name, phone=data.phone, email=data.email))

        build_id = data.build_id
        if build_id is not None and not await self.builds.exists(build_id):
            build_id = None

        order = await self.orders.add(
            Order(
                id=None,
                client_id=client.id,
                status_code=OrderStatus.NEW,
                build_id=build_id,
                purpose=data.purpose,
                performance=data.performance,
                estimated_price=data.estimated_price,
                message=data.message,
            )
        )
        return OrderOut(id=order.id, status=order.status_code, created_at=order.created_at)

    async def get_order(self, order_id: int) -> OrderOut | None:
        order = await self.orders.get(order_id)
        if order is None:
            return None
        return OrderOut(id=order.id, status=order.status_code, created_at=order.created_at)
