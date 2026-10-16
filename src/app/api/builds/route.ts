import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { buildComponents, builds, components } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(builds).orderBy(asc(builds.price));
  const items = await db
    .select({ buildId: buildComponents.buildId, name: components.name, id: buildComponents.id })
    .from(buildComponents)
    .innerJoin(components, eq(buildComponents.componentId, components.id))
    .orderBy(asc(buildComponents.id));
  return Response.json(
    rows.map((b) => ({ ...b, specs: items.filter((i) => i.buildId === b.id).map((i) => i.name) })),
  );
}
