"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { ArrowUpRight, Bookmark, Check, ChevronRight, CircleHelp, FileText, PenLine, Plus, RefreshCw, X } from "lucide-react";
import { entryInput, markets, type Entry, type EntryInput, type Section } from "@/lib/entries";

const pages = {
  notes: { path: "/", label: "学习手记", english: "Notebook", description: "留下一点理解，也留下一点疑问。", action: "新建手记", empty: "第一篇手记，从这里开始。", hint: "一段阅读、一个问题，或一个刚刚想通的概念。", body: "笔记", placeholder: "写下你自己的理解……" },
  briefing: { path: "/briefing", label: "市场札记", english: "Observations", description: "关注发生了什么，也记录它为什么重要。", action: "更新资讯", empty: "给重要的信息，留一个位置。", hint: "接入来源后，在这里按需更新美股与加密资产资讯。", body: "观察", placeholder: "" },
  strategies: { path: "/strategies", label: "策略研究", english: "Research", description: "把一个想法，写成可以验证的规则。", action: "新建研究", empty: "先留下一个值得验证的想法。", hint: "从研究假设开始，再逐步补齐入场、退出与风险约束。", body: "研究假设", placeholder: "你观察到了什么？在什么条件下，这个想法可能成立？" },
  reviews: { path: "/reviews", label: "复盘", english: "Reflection", description: "回看当时的判断，写下下一次的改变。", action: "写一篇复盘", empty: "给过去的判断，一次回看的机会。", hint: "可以从一次学习、一次研究，或一次模拟交易开始。", body: "实际发生了什么", placeholder: "先记录事实，再写下你的解释……" },
};
type MarketFilter = "all" | EntryInput["market"];
type Draft = EntryInput & { id?: string; revision?: number };
const blank = (section: Section): Draft => ({ kind: section === "briefing" ? "notes" : section, market: "general", title: "", content: "", details: {} });
function dateLabel(date: string) { return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(date)); }

export function Notebook({ section }: { section: Section }) {
  const page = pages[section];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<MarketFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => blank(section));
  const [scratch, setScratch] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState("");
  const [draftWarning, setDraftWarning] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const response = await fetch("/api/entries", { cache: "no-store" });
      const data = await response.json() as { entries?: Entry[]; error?: string };
      if (!response.ok || !Array.isArray(data.entries)) throw new Error(data.error || "无法读取记录");
      setEntries(data.entries);
    } catch { setLoadError("记录暂时未能加载，已有内容不会被清空。"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    try {
      setScratch(localStorage.getItem("margin:scratch") || "");
      const saved = localStorage.getItem(`margin:draft:${section}`);
      if (saved) {
        const value = JSON.parse(saved);
        if (value && typeof value.title === "string" && typeof value.content === "string" && value.kind === blank(section).kind && value.market in markets && value.details && typeof value.details === "object") setDraft(value);
      }
    } catch { setDraftWarning("此浏览器无法恢复临时草稿。已保存的记录仍在本地数据库中。"); }
    setReady(true);
  }, [section]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(`margin:draft:${section}`, JSON.stringify(draft)); }
    catch { setDraftWarning("草稿暂存不可用，请使用保存按钮保留内容。"); }
  }, [draft, ready, section]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("margin:scratch", scratch); }
    catch { setDraftWarning("随手记暂存不可用，请将内容写入并保存记录。"); }
  }, [scratch, ready]);

  function begin(entry?: Entry) {
    if (entry) setDraft({ ...entry });
    else if (draft.id) setDraft(blank(section));
    setFormError(""); setOpen(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = entryInput.safeParse(draft);
    if (!result.success) { setFormError("请填写标题和正文后保存。"); return; }
    setSaving(true); setFormError("");
    try {
      const response = await fetch("/api/entries", { method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json() as { entry?: Entry; error?: string };
      if (!response.ok || !data.entry) throw new Error(data.error || "暂时无法保存，请重试。");
      const savedEntry = data.entry;
      setEntries(previous => [savedEntry, ...previous.filter(item => item.id !== savedEntry.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setDraft(blank(section)); setOpen(false); setStatus("已保存到本地。");
    } catch (error) { setFormError(error instanceof Error ? error.message : "暂时无法保存。草稿已保留，请重试。"); }
    finally { setSaving(false); }
  }
  const scoped = entries.filter(entry => entry.kind === section);
  const visible = scoped.filter(entry => filter === "all" || entry.market === filter);
  const detail = (key: keyof EntryInput["details"], value: string) => setDraft(previous => ({ ...previous, details: { ...previous.details, [key]: value } }));

  return (
    <div className="site">
      <a href="#main" className="skip-link">跳到正文</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href="/" aria-label="Margin 首页">Margin<span className="brand-mark" aria-hidden="true" /></Link>
          <nav className="primary-nav" aria-label="主要导航">
            {(Object.entries(pages) as [Section, typeof pages.notes][]).map(([key, item]) => <Link key={key} href={item.path} className={key === section ? "active" : ""} aria-current={key === section ? "page" : undefined}>{item.label}</Link>)}
          </nav>
          <span className="space-label"><Bookmark size={14} strokeWidth={1.5} aria-hidden="true" />个人研究空间</span>
        </div>
      </header>

      <main id="main" className="workspace">
        <div className="page-heading">
          <div><div className="page-title"><h1>{page.label}</h1><span className="english-title">{page.english}</span></div><p>{page.description}</p></div>
          {section !== "briefing" && <button className="button primary" onClick={() => begin()}><Plus size={17} strokeWidth={1.6} aria-hidden="true" />{page.action}</button>}
          {section === "briefing" && <span className="connection-state">资讯源待接入</span>}
        </div>

        <div className="desk">
          <section className="collection" aria-label={page.label}>
            <div className="collection-toolbar">
              <div className="market-filters" aria-label="按市场筛选">
                {([['all', '全部'], ['stocks', '美股'], ['crypto', '加密资产']] as const).map(([key, label]) => <button key={key} aria-pressed={filter === key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)}>{label}</button>)}
              </div>
              <span className="collection-count">{section === "briefing" ? "按需更新" : `${scoped.length} 篇`}</span>
            </div>

            {section === "briefing" ? <div className="paper empty-paper news-paper">
              <div className="paper-top"><span>资讯简报</span><span>未更新</span></div>
              <div className="empty-content"><span className="empty-symbol"><FileText size={25} strokeWidth={1.15} aria-hidden="true" /></span><h2>{page.empty}</h2><p>{filter === "stocks" ? "公司披露、财报与宏观事件，将整理在这里。" : filter === "crypto" ? "交易所公告与项目动态，将整理在这里。" : page.hint}</p><button className="button secondary" disabled><RefreshCw size={15} aria-hidden="true" />更新资讯</button><span className="small-note">来源接入后可用</span></div>
              <div className="paper-bottom"><span>保留原文与时间</span><span>事实与解读分开</span></div>
            </div> : loadError ? <div className="paper error-paper" role="alert"><CircleHelp size={24} strokeWidth={1.4} /><h2>暂时无法打开记录</h2><p>{loadError}</p><button className="button secondary" onClick={load}>重新加载</button></div> : loading ? <div className="paper loading-paper" role="status">正在打开手记…</div> : visible.length === 0 ? <div className="paper empty-paper">
              <div className="paper-top"><span>{page.label}</span><span>{filter === "all" ? "个人收藏" : markets[filter]}</span></div>
              <div className="empty-content"><span className="empty-symbol"><PenLine size={25} strokeWidth={1.15} aria-hidden="true" /></span><h2>{scoped.length ? "这个分类，暂时还没有记录。" : page.empty}</h2><p>{page.hint}</p><button className="text-button" onClick={() => begin()}>{section === "notes" ? "写下第一篇" : page.action}<Plus size={15} aria-hidden="true" /></button></div>
              <div className="paper-bottom"><span>{section === "strategies" ? "研究草稿" : "留给自己的记录"}</span><span>慢慢积累</span></div>
            </div> : <div className="paper entry-list">
              {visible.map((entry, index) => <button key={entry.id} className="entry-row" onClick={() => begin(entry)}>
                <span className="entry-date">{dateLabel(entry.createdAt)}</span>
                <span className="entry-text"><span className="entry-title">{entry.title}</span><span className="entry-excerpt">{entry.content}</span><span className="entry-meta">{markets[entry.market]}{section === "strategies" ? " / 研究草稿" : ""}</span></span>
                <ChevronRight className="entry-chevron" size={17} strokeWidth={1.4} aria-hidden="true" /><span className="sr-only">编辑第 {index + 1} 条记录</span>
              </button>)}
            </div>}
            <div className="collection-foot"><span>{section === "briefing" ? "仅在你需要时更新" : "记录保存在这台电脑的项目中"}</span><span>{section === "strategies" ? "回测尚未接入" : section === "reviews" ? "判断 · 执行 · 改进" : section === "briefing" ? "美股 / 加密资产" : "文字先行"}</span></div>
          </section>

          <aside className="side-notes">
            <section className="scope-section"><h2>研究范围</h2><div className="scope-row"><span className="scope-index">US</span><div><h3>美股</h3><p>公司、行业与宏观</p></div></div><div className="scope-row"><span className="scope-index crypto-index">₿</span><div><h3>加密资产</h3><p>市场、协议与链上</p></div></div></section>
            {section === "briefing" ? <section className="sources-section"><h2>来源目录</h2><a href="https://www.federalreserve.gov/feeds/feeds.htm" target="_blank" rel="noreferrer">美联储发布<ArrowUpRight size={14} aria-hidden="true" /></a><a href="https://www.sec.gov/search-filings/edgar-application-programming-interfaces" target="_blank" rel="noreferrer">SEC 公司披露<ArrowUpRight size={14} aria-hidden="true" /></a><p>加密资产来源待选择</p></section> : <section className="scratch-section"><label htmlFor="scratch">随手记</label><textarea id="scratch" maxLength={4000} placeholder="一个还没成形的想法……" value={scratch} onChange={event => setScratch(event.target.value)} /><div className="scratch-footer"><span>临时草稿</span><button className="icon-button" aria-label="将随手记写入新记录" disabled={!scratch.trim()} onClick={() => { setDraft({ ...blank(section), content: scratch }); setFormError(""); setOpen(true); }}><PenLine size={16} strokeWidth={1.5} /></button></div></section>}
            <p className="aside-caption">{section === "strategies" ? "先记录规则，再寻找支持或推翻它的证据。" : section === "reviews" ? "当时为什么这样想，往往和结果一样值得记录。" : section === "briefing" ? "每一条信息，都应当能回到它的来源。" : "不必完整，先把值得留下的写下来。"}</p>
          </aside>
        </div>
        <div className="status-area" aria-live="polite">{status}{draftWarning && <span className="warning">{draftWarning}</span>}</div>
        <footer className="site-footer"><span className="footer-brand">Margin</span><span>学习 / 观察 / 验证 / 回看</span><span>本地空间</span></footer>
      </main>

      <Dialog.Root open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
        <Dialog.Portal><Dialog.Overlay className="editor-overlay" /><Dialog.Content className="editor" onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("entry-title")?.focus(); }}>
          <div className="editor-top"><Dialog.Title>{draft.id ? "编辑" : "新建"}{section === "strategies" ? "研究草稿" : section === "reviews" ? "复盘" : "手记"}</Dialog.Title><Dialog.Close className="icon-button" aria-label="收起编辑器" disabled={saving}><X size={20} strokeWidth={1.5} /></Dialog.Close></div>
          <Dialog.Description className="editor-description">{draft.id ? "修改后保存到本地。" : "未保存的文字会暂存在此浏览器。"}</Dialog.Description>
          <form onSubmit={save} className="editor-form">
            <label className="sr-only" htmlFor="entry-title">标题</label><input id="entry-title" className="title-input" maxLength={160} required placeholder="写一个标题" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} />
            <label className="market-label">归属市场<select value={draft.market} onChange={event => setDraft({ ...draft, market: event.target.value as EntryInput['market'] })}>{Object.entries(markets).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
            {section === "reviews" && <label className="editor-field">原本的预期<textarea maxLength={4000} value={draft.details.expected || ""} onChange={event => detail("expected", event.target.value)} placeholder="当时掌握了什么信息，又做出了什么判断？" /></label>}
            <label className="editor-field main-field">{page.body}<textarea required maxLength={30000} value={draft.content} onChange={event => setDraft({ ...draft, content: event.target.value })} placeholder={page.placeholder} /></label>
            {section === "strategies" ? <div className="rule-fields">{([['entry','入场条件'], ['exit','退出条件'], ['risk','风险约束']] as const).map(([key, label]) => <label key={key} className="editor-field">{label}<textarea maxLength={4000} value={draft.details[key] || ""} onChange={event => detail(key, event.target.value)} placeholder="可以稍后补充" /></label>)}</div> : <label className="editor-field">{section === "reviews" ? "下一步改变什么" : "还想弄懂的问题"}<textarea maxLength={4000} value={draft.details.next || ""} onChange={event => detail("next", event.target.value)} placeholder="留下一条线索，下次继续。" /></label>}
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="editor-bottom"><span><Bookmark size={13} strokeWidth={1.5} aria-hidden="true" />仅保存在本地</span><button className="button primary" type="submit" disabled={saving}>{saving ? "正在保存…" : <><Check size={16} aria-hidden="true" />保存记录</>}</button></div>
          </form>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
