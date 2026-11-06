from abc import ABC, abstractmethod
from decimal import Decimal

from app.domain.entities import Build, Client, Order


class BuildRepository(ABC):
    @abstractmethod
    async def list(self) -> list[Build]: ...

    @abstractmethod
    async def exists(self, build_id: int) -> bool: ...

    @abstractmethod
    async def reserve_components(self, build_id: int) -> Decimal: ...


class ClientRepository(ABC):
    @abstractmethod
    async def get_by_phone(self, phone: str) -> Client | None: ...

    @abstractmethod
    async def add(self, client: Client) -> Client: ...


class OrderRepository(ABC):
    @abstractmethod
    async def add(self, order: Order) -> Order: ...

    @abstractmethod
    async def get(self, order_id: int) -> Order | None: ...
