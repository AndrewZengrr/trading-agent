import { env } from "cloudflare:workers";
import type { Entry, EntryInput } from "./entries";
type Row = Omit<Entry, "details" | "createdAt" | "updatedAt"> & { details: string; created_at: string; updated_at: string; };
function database() { if (!env.DB) throw new Error("DB unavailable"); return env.DB; }
function fromRow(row: Row): Entry {
  const { details, created_at, updated_at, ...rest } = row;
  return { ...rest, details: JSON.parse(details), createdAt: created_at, updatedAt: updated_at };
}
export async function listEntries() {
  const { results } = await database().prepare("SELECT * FROM entries ORDER BY created_at DESC, id DESC").all<Row>();
  return results.map(fromRow);
}
export async function createEntry(input: EntryInput) {
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await database().prepare("INSERT INTO entries (id, kind, market, title, content, details, created_at, updated_at, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(id, input.kind, input.market, input.title, input.content, JSON.stringify(input.details), now, now).run();
  return { ...input, id, createdAt: now, updatedAt: now, revision: 1 };
}
export async function updateEntry(id: string, revision: number, input: EntryInput) {
  const now = new Date().toISOString();
  const row = await database().prepare("UPDATE entries SET market = ?, title = ?, content = ?, details = ?, updated_at = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND kind = ? RETURNING *")
    .bind(input.market, input.title, input.content, JSON.stringify(input.details), now, id, revision, input.kind).first<Row>();
  return row ? fromRow(row) : null;
}
