import { z } from "zod";

export const entryInput = z.object({
  kind: z.enum(["notes", "strategies", "reviews"]),
  market: z.enum(["general", "stocks", "crypto"]),
  title: z.string().trim().min(1, "请填写标题").max(160),
  content: z.string().trim().min(1, "请写下内容").max(30000),
  details: z.object({
    next: z.string().max(4000).optional(),
    entry: z.string().max(4000).optional(),
    exit: z.string().max(4000).optional(),
    risk: z.string().max(4000).optional(),
    expected: z.string().max(4000).optional(),
  }).strict(),
});
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = EntryInput & { id: string; createdAt: string; updatedAt: string; revision: number; };
export type Section = EntryInput["kind"] | "briefing";
export const markets = { general: "通用", stocks: "美股", crypto: "加密资产" } as const;
