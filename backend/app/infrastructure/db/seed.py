from decimal import Decimal

from sqlalchemy import select

from app.infrastructure.db.database import Base, SessionLocal, engine
from app.infrastructure.db.models import BuildComponent, BuildModel, Category, Component, Status

STATUSES = [
    ("new", "Новая"),
    ("accepted", "Принята"),
    ("in_progress", "В сборке"),
    ("done", "Выполнена"),
    ("rejected", "Отклонена"),
]

CATALOG = {
    "Процессор": [("Ryzen 5 7500F", 14000), ("Ryzen 7 7700", 26000), ("Ryzen 9 7950X3D", 62000)],
    "Видеокарта": [("GeForce RTX 4060", 33000), ("GeForce RTX 4070 Super", 68000), ("GeForce RTX 4080 Super", 115000)],
    "Оперативная память": [("16 ГБ DDR5", 5500), ("32 ГБ DDR5", 10500), ("64 ГБ DDR5", 21000)],
    "Накопитель": [("SSD 1 ТБ", 6500), ("SSD 2 ТБ", 12000), ("SSD 4 ТБ", 24000)],
}

BUILDS = [
    ("Start", "Для Full HD", 89900, "bg-[#e9e9e3]", False, 0),
    ("Flow", "Выбор большинства", 149900, "bg-[#dfff4f]", True, 1),
    ("Ultra", "Без компромиссов", 279900, "bg-[#d8d9ff]", False, 2),
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        if await session.scalar(select(Status).limit(1)) is None:
            session.add_all([Status(code=c, name=n) for c, n in STATUSES])

        if await session.scalar(select(BuildModel).limit(1)) is None:
            by_category: dict[str, list[Component]] = {}
            for cat_name, items in CATALOG.items():
                cat = Category(name=cat_name)
                session.add(cat)
                by_category[cat_name] = [
                    Component(name=n, price=Decimal(p), stock=10, category=cat) for n, p in items
                ]
                session.add_all(by_category[cat_name])

            for name, label, price, tone, featured, level in BUILDS:
                build = BuildModel(name=name, label=label, price=Decimal(price), tone=tone, featured=featured)
                build.items = [BuildComponent(component=comps[level], quantity=1) for comps in by_category.values()]
                session.add(build)

        await session.commit()
