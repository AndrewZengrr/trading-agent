import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  market: text("market").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  details: text("details").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  revision: integer("revision").notNull().default(1),
});
