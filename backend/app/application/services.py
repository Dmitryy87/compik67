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
        # The repository reads the build price and reserves stock in the same
        # transaction that persists the order; client-supplied prices are ignored.
        build_id = data.build_id
        estimated_price = None
        if build_id is not None:
            estimated_price = await self.builds.reserve_components(build_id)

        client = await self.clients.get_by_phone(data.phone)
        if client is None:
            client = await self.clients.add(Client(id=None, name=data.name, phone=data.phone, email=data.email))

        order = await self.orders.add(
            Order(
                id=None,
                client_id=client.id,
                status_code=OrderStatus.NEW,
                build_id=build_id,
                purpose=data.purpose,
                performance=data.performance,
                estimated_price=estimated_price,
                message=data.message,
            )
        )
        return OrderOut(
            id=order.id,
            status=order.status_code,
            created_at=order.created_at,
            estimated_price=order.estimated_price,
        )

    async def get_order(self, order_id: int) -> OrderOut | None:
        order = await self.orders.get(order_id)
        if order is None:
            return None
        return OrderOut(id=order.id, status=order.status_code, created_at=order.created_at, estimated_price=order.estimated_price)
