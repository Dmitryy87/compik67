from fastapi import APIRouter, Depends, HTTPException, status

from app.application.schemas import BuildOut, OrderCreate, OrderOut
from app.application.services import BuildService, OrderService
from app.domain.entities import InsufficientStockError
from app.presentation.api.deps import get_build_service, get_order_service

router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict:
    return {"ok": True}


@router.get("/builds", response_model=list[BuildOut])
async def list_builds(service: BuildService = Depends(get_build_service)):
    return await service.list_builds()


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(data: OrderCreate, service: OrderService = Depends(get_order_service)):
    try:
        return await service.create_order(data)
    except InsufficientStockError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, service: OrderService = Depends(get_order_service)):
    order = await service.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return order
