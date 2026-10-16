import { boolean, integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Зеркало схемы backend (SQLAlchemy) — 7 связанных таблиц
export const statuses = pgTable("statuses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 60 }).notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull().unique(),
  email: varchar("email", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull().unique(),
});

export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
});

export const builds = pgTable("builds", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  label: varchar("label", { length: 60 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  tone: varchar("tone", { length: 40 }).notNull().default("bg-[#e9e9e3]"),
  featured: boolean("featured").notNull().default(false),
});

export const buildComponents = pgTable("build_components", {
  id: serial("id").primaryKey(),
  buildId: integer("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
  componentId: integer("component_id").notNull().references(() => components.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  statusId: integer("status_id").notNull().references(() => statuses.id),
  buildId: integer("build_id").references(() => builds.id, { onDelete: "set null" }),
  purpose: varchar("purpose", { length: 30 }),
  performance: varchar("performance", { length: 30 }),
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
