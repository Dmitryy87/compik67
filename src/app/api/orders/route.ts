import { eq } from "drizzle-orm";
import { db } from "@/db";
import { builds, clients, orders, statuses } from "@/db/schema";
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
  estimated_price?: number;
};

export async function POST(req: Request) {
  await ensureSeed();
  const body = (await req.json().catch(() => ({}))) as Body;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (name.length < 2 || phone.length < 5) {
    return Response.json({ detail: "Некорректные имя или телефон" }, { status: 422 });
  }

  let [client] = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1);
  if (!client) {
    [client] = await db.insert(clients).values({ name, phone, email: body.email ?? null }).returning();
  }

  let buildId: number | null = typeof body.build_id === "number" ? body.build_id : null;
  if (buildId !== null) {
    const found = await db.select({ id: builds.id }).from(builds).where(eq(builds.id, buildId)).limit(1);
    if (found.length === 0) buildId = null;
  }

  const [status] = await db.select().from(statuses).where(eq(statuses.code, "new")).limit(1);
  const [order] = await db
    .insert(orders)
    .values({
      clientId: client.id,
      statusId: status.id,
      buildId,
      purpose: body.purpose?.slice(0, 30) ?? null,
      performance: body.performance?.slice(0, 30) ?? null,
      estimatedPrice: body.estimated_price != null ? String(body.estimated_price) : null,
      message: body.message?.slice(0, 2000) ?? null,
    })
    .returning();

  return Response.json({ id: order.id, status: "new", created_at: order.createdAt }, { status: 201 });
}
