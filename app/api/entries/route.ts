import { z } from "zod";
import { entryInput } from "@/lib/entries";
import { createEntry, listEntries, updateEntry } from "@/lib/entry-store";

// Local-only first version. Add authentication and per-user ownership before hosting.
function localOnly(request: Request) {
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return Response.json({ error: "当前仅支持本地使用。" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return Response.json({ error: "请求来源不匹配。" }, { status: 403 });
  return null;
}
function failed(error: unknown) {
  console.error("Entry storage failed", error);
  return Response.json({ error: "暂时无法读取或保存记录。请保留草稿，稍后重试。" }, { status: 503 });
}
export async function GET(request: Request) {
  const denied = localOnly(request); if (denied) return denied;
  try { return Response.json({ entries: await listEntries() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  const denied = localOnly(request); if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "无法识别记录内容。" }, { status: 400 }); }
  const result = entryInput.safeParse(body);
  if (!result.success) return Response.json({ error: "请填写标题和内容，并检查文本长度。" }, { status: 400 });
  try { return Response.json({ entry: await createEntry(result.data) }, { status: 201 }); }
  catch (error) { return failed(error); }
}
export async function PUT(request: Request) {
  const denied = localOnly(request); if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "无法识别记录内容。" }, { status: 400 }); }
  const result = entryInput.extend({ id: z.string().uuid(), revision: z.number().int().positive() }).safeParse(body);
  if (!result.success) return Response.json({ error: "请检查记录内容。" }, { status: 400 });
  try {
    const { id, revision, ...input } = result.data;
    const entry = await updateEntry(id, revision, input);
    if (!entry) return Response.json({ error: "这条记录已在别处更新。请保留草稿，刷新页面后重试。" }, { status: 409 });
    return Response.json({ entry });
  } catch (error) { return failed(error); }
}
