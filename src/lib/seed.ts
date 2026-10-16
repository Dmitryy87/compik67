import { db } from "@/db";
import { buildComponents, builds, categories, components, statuses } from "@/db/schema";

const STATUSES = [
  ["new", "Новая"],
  ["accepted", "Принята"],
  ["in_progress", "В сборке"],
  ["done", "Выполнена"],
  ["rejected", "Отклонена"],
] as const;

const CATALOG: Record<string, [string, number][]> = {
  "Процессор": [["Ryzen 5 7500F", 14000], ["Ryzen 7 7700", 26000], ["Ryzen 9 7950X3D", 62000]],
  "Видеокарта": [["GeForce RTX 4060", 33000], ["GeForce RTX 4070 Super", 68000], ["GeForce RTX 4080 Super", 115000]],
  "Оперативная память": [["16 ГБ DDR5", 5500], ["32 ГБ DDR5", 10500], ["64 ГБ DDR5", 21000]],
  "Накопитель": [["SSD 1 ТБ", 6500], ["SSD 2 ТБ", 12000], ["SSD 4 ТБ", 24000]],
};

const BUILDS = [
  { name: "Start", label: "Для Full HD", price: "89900", tone: "bg-[#e9e9e3]", featured: false },
  { name: "Flow", label: "Выбор большинства", price: "149900", tone: "bg-[#dfff4f]", featured: true },
  { name: "Ultra", label: "Без компромиссов", price: "279900", tone: "bg-[#d8d9ff]", featured: false },
];

let seeded = false;

export async function ensureSeed() {
  if (seeded) return;
  const existingStatus = await db.select({ id: statuses.id }).from(statuses).limit(1);
  if (existingStatus.length === 0) {
    await db.insert(statuses).values(STATUSES.map(([code, name]) => ({ code, name }))).onConflictDoNothing();
  }
  const existingBuild = await db.select({ id: builds.id }).from(builds).limit(1);
  if (existingBuild.length === 0) {
    const levels: number[][] = [[], [], []];
    for (const [catName, items] of Object.entries(CATALOG)) {
      const [cat] = await db.insert(categories).values({ name: catName }).returning();
      const comps = await db
        .insert(components)
        .values(items.map(([name, price]) => ({ name, price: String(price), stock: 10, categoryId: cat.id })))
        .returning();
      comps.forEach((c, i) => levels[i].push(c.id));
    }
    const created = await db.insert(builds).values(BUILDS).returning();
    for (let i = 0; i < created.length; i++) {
      await db.insert(buildComponents).values(levels[i].map((componentId) => ({ buildId: created[i].id, componentId })));
    }
  }
  seeded = true;
}
