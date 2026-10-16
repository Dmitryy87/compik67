from typing import Any

from sqlalchemy import select, update
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from starlette_admin import action
from starlette_admin.contrib.sqla import Admin, ModelView

from app.core.config import settings
from app.domain.entities import OrderStatus
from app.infrastructure.db.database import engine
from app.infrastructure.db.models import (
    BuildComponent,
    BuildModel,
    Category,
    ClientModel,
    Component,
    OrderModel,
    Status,
)
from app.presentation.admin.auth import AdminAuth


async def _set_status(request: Request, pks: list[Any], code: str) -> int:
    session = request.state.session
    status_id = await session.scalar(select(Status.id).where(Status.code == code))
    ids = [int(pk) for pk in pks]
    await session.execute(update(OrderModel).where(OrderModel.id.in_(ids)).values(status_id=status_id))
    await session.commit()
    return len(ids)


class OrderView(ModelView):
    fields = ["id", "client", "status", "build", "purpose", "performance", "estimated_price", "message", "created_at"]
    exclude_fields_from_create = ["created_at"]
    exclude_fields_from_edit = ["created_at"]
    searchable_fields = ["message", "purpose", "performance"]
    sortable_fields = ["id", "created_at", "estimated_price"]
    fields_default_sort = [("id", True)]

    @action(name="accept", text="Принять", confirmation="Принять выбранные заявки?",
            submit_btn_text="Принять", submit_btn_class="btn-success")
    async def accept_action(self, request: Request, pks: list[Any]) -> str:
        return f"Принято заявок: {await _set_status(request, pks, OrderStatus.ACCEPTED)}"

    @action(name="in_progress", text="В сборку", confirmation="Перевести в сборку?",
            submit_btn_text="Да", submit_btn_class="btn-primary")
    async def progress_action(self, request: Request, pks: list[Any]) -> str:
        return f"В сборке: {await _set_status(request, pks, OrderStatus.IN_PROGRESS)}"

    @action(name="done", text="Выполнена", confirmation="Отметить как выполненные?",
            submit_btn_text="Да", submit_btn_class="btn-success")
    async def done_action(self, request: Request, pks: list[Any]) -> str:
        return f"Выполнено: {await _set_status(request, pks, OrderStatus.DONE)}"

    @action(name="reject", text="Отклонить", confirmation="Отклонить выбранные заявки?",
            submit_btn_text="Отклонить", submit_btn_class="btn-danger")
    async def reject_action(self, request: Request, pks: list[Any]) -> str:
        return f"Отклонено: {await _set_status(request, pks, OrderStatus.REJECTED)}"


class ClientView(ModelView):
    fields = ["id", "name", "phone", "email", "created_at", "orders"]
    exclude_fields_from_create = ["created_at", "orders"]
    exclude_fields_from_edit = ["created_at"]
    searchable_fields = ["name", "phone", "email"]


class ComponentView(ModelView):
    fields = ["id", "name", "category", "price", "stock"]
    searchable_fields = ["name"]


class BuildView(ModelView):
    fields = ["id", "name", "label", "price", "tone", "featured", "items"]


class BuildComponentView(ModelView):
    fields = ["id", "build", "component", "quantity"]


def create_admin() -> Admin:
    admin = Admin(
        engine,
        title="KOMPIK67 CRM",
        base_url="/admin",
        auth_provider=AdminAuth(),
        middlewares=[Middleware(SessionMiddleware, secret_key=settings.secret_key)],
    )
    admin.add_view(OrderView(OrderModel, icon="fa fa-inbox", name="Заявка", label="Заявки"))
    admin.add_view(ClientView(ClientModel, icon="fa fa-user", name="Клиент", label="Клиенты"))
    admin.add_view(BuildView(BuildModel, icon="fa fa-desktop", name="Сборка", label="Сборки"))
    admin.add_view(BuildComponentView(BuildComponent, icon="fa fa-link", name="Состав сборки", label="Состав сборок"))
    admin.add_view(ComponentView(Component, icon="fa fa-microchip", name="Комплектующее", label="Комплектующие"))
    admin.add_view(ModelView(Category, icon="fa fa-tags", name="Категория", label="Категории"))
    admin.add_view(ModelView(Status, icon="fa fa-flag", name="Статус", label="Статусы"))
    return admin
