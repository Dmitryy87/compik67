from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services import BuildService, OrderService
from app.infrastructure.db.database import get_session
from app.infrastructure.db.repositories import SqlBuildRepository, SqlClientRepository, SqlOrderRepository


def get_build_service(session: AsyncSession = Depends(get_session)) -> BuildService:
    return BuildService(SqlBuildRepository(session))


def get_order_service(session: AsyncSession = Depends(get_session)) -> OrderService:
    return OrderService(SqlOrderRepository(session), SqlClientRepository(session), SqlBuildRepository(session))
