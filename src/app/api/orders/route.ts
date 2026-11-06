import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { buildComponents, builds, clients, components, orders, statuses } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  build_id?: number | null;
  purpose?: string;
  performance?: string;
};

class OrderError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function POST(req: Request) {
  await ensureSeed();
  const body = (await req.json().catch(() => ({}))) as Body;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (name.length < 2 || phone.length < 5) {
    return Response.json({ detail: "Некорректные имя или телефон" }, { status: 422 });
  }
  if (body.build_id != null && (!Number.isInteger(body.build_id) || body.build_id <= 0)) {
    return Response.json({ detail: "Некорректная сборка" }, { status: 422 });
  }

  try {
    const order = await db.transaction(async (tx) => {
      const buildId = body.build_id ?? null;
      let estimatedPrice: string | null = null;
      if (buildId !== null) {
        const [build] = await tx.select({ price: builds.price }).from(builds).where(eq(builds.id, buildId));
        if (!build) throw new OrderError("Сборка не найдена", 404);
        estimatedPrice = build.price;

        // Locks are acquired in the same order for every build to prevent overselling and deadlocks.
        const rows = await tx.select({
          componentId: buildComponents.componentId,
          quantity: buildComponents.quantity,
          stock: components.stock,
        }).from(buildComponents)
          .innerJoin(components, eq(buildComponents.componentId, components.id))
          .where(eq(buildComponents.buildId, buildId))
          .orderBy(buildComponents.componentId)
          .for("update", { of: components });
        const required = new Map<number, { quantity: number; stock: number }>();
        for (const row of rows) {
          if (row.quantity <= 0) throw new OrderError("Некорректное количество комплектующих в сборке", 409);
          const previous = required.get(row.componentId);
          required.set(row.componentId, { quantity: (previous?.quantity ?? 0) + row.quantity, stock: row.stock });
        }
        const insufficient = [...required].filter(([, item]) => item.stock < item.quantity).map(([id]) => id);
        if (insufficient.length) {
          throw new OrderError(`Недостаточно комплектующих на складе: ${insufficient.join(", ")}`, 409);
        }
        for (const [id, item] of required) {
          await tx.update(components).set({ stock: sql`${components.stock} - ${item.quantity}` })
            .where(eq(components.id, id));
        }
      }

      // Concurrent orders for the same new phone must not break the stock transaction.
      await tx.insert(clients).values({ name, phone, email: body.email ?? null }).onConflictDoNothing({ target: clients.phone });
      const [client] = await tx.select().from(clients).where(eq(clients.phone, phone)).limit(1);
      const [status] = await tx.select().from(statuses).where(eq(statuses.code, "new")).limit(1);
      if (!status) throw new Error("Status 'new' not found");
      const [created] = await tx.insert(orders).values({
        clientId: client.id,
        statusId: status.id,
        buildId,
        purpose: body.purpose?.slice(0, 30) ?? null,
        performance: body.performance?.slice(0, 30) ?? null,
        estimatedPrice,
        message: body.message?.slice(0, 2000) ?? null,
      }).returning();
      return created;
    });
    return Response.json({ id: order.id, status: "new", created_at: order.createdAt, estimated_price: order.estimatedPrice }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) return Response.json({ detail: error.message }, { status: error.status });
    throw error;
  }
}
