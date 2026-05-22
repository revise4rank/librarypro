"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { StatCard } from "./stat-card";

type BlogBlock = {
  type: "heading" | "paragraph" | "list" | "quote" | "cta" | "faq";
  text?: string;
  title?: string;
  question?: string;
  answer?: string;
  items?: string[];
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  readTimeMinutes: number;
  contentJson: BlogBlock[];
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  updatedAt: string;
};

type BlogForm = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  readTimeMinutes: string;
  status: "DRAFT" | "PUBLISHED";
  contentText: string;
};

const starterBlocks: BlogBlock[] = [
  { type: "heading", text: "Why this matters" },
  { type: "paragraph", text: "Write a sharp opening that names the owner problem, the student impact, and the outcome BookLib helps create." },
  { type: "list", items: ["Clear operation flow", "Better student experience", "More reliable growth"] },
  { type: "cta", title: "Want to see this in action?", text: "Book a quick demo and see how BookLib works for a real library workflow." },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function formFromPost(post?: BlogPost | null): BlogForm {
  const blocks = post?.contentJson?.length ? post.contentJson : starterBlocks;
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    category: post?.category ?? "Library Growth",
    excerpt: post?.excerpt ?? "",
    coverImageUrl: post?.coverImageUrl ?? "",
    seoTitle: post?.seoTitle ?? "",
    seoDescription: post?.seoDescription ?? "",
    readTimeMinutes: String(post?.readTimeMinutes ?? 6),
    status: post?.status ?? "DRAFT",
    contentText: JSON.stringify(blocks, null, 2),
  };
}

function parseBlocks(text: string) {
  const parsed = JSON.parse(text) as BlogBlock[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Content JSON must be a non-empty block array.");
  return parsed;
}

export function SuperadminBlogsManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<BlogForm>(formFromPost());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await apiFetch<{ success: boolean; data: BlogPost[] }>("/admin/blogs");
    setPosts(response.data);
    setSelectedId((current) => current || response.data[0]?.id || "");
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load blogs."));
  }, []);

  const selected = useMemo(() => posts.find((post) => post.id === selectedId) ?? null, [posts, selectedId]);

  function openCreate() {
    setSelectedId("");
    setForm(formFromPost());
    setDrawerOpen(true);
  }

  function openEdit(post: BlogPost) {
    setSelectedId(post.id);
    setForm(formFromPost(post));
    setDrawerOpen(true);
  }

  function update(patch: Partial<BlogForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const contentJson = parseBlocks(form.contentText);
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        category: form.category,
        excerpt: form.excerpt,
        coverImageUrl: form.coverImageUrl,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        readTimeMinutes: Number(form.readTimeMinutes || 6),
        status: form.status,
        contentJson,
      };
      if (selectedId) {
        await apiFetch(`/admin/blogs/${selectedId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setMessage("Blog updated.");
      } else {
        const response = await apiFetch<{ success: boolean; data: BlogPost }>("/admin/blogs", { method: "POST", body: JSON.stringify(payload) });
        setSelectedId(response.data.id);
        setMessage("Blog created.");
      }
      setDrawerOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save blog.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(post: BlogPost) {
    if (!window.confirm(`Archive "${post.title}"? It will disappear from public blog.`)) return;
    setSaving(true);
    try {
      await apiFetch(`/admin/blogs/${post.id}`, { method: "DELETE" });
      setMessage("Blog archived.");
      setSelectedId("");
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive blog.");
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = posts.filter((post) => post.status === "PUBLISHED").length;

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Posts" value={posts.length} note="Active blog records." />
        <StatCard label="Published" value={publishedCount} note="Visible on public blog." />
        <StatCard label="Drafts" value={posts.length - publishedCount} note="Internal writing queue." />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Blog library" subtitle="Create SEO guides for landing-page traffic and demo conversion.">
          <div className="grid gap-3">
            <button type="button" onClick={openCreate} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white">
              Write new blog
            </button>
            <div className="grid max-h-[35rem] gap-2 overflow-auto pr-1">
              {posts.map((post) => (
                <button key={post.id} type="button" onClick={() => setSelectedId(post.id)} className={`rounded-xl border p-3 text-left ${selectedId === post.id ? "border-[var(--lp-primary)] bg-[#fff7f1]" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{post.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{post.category} | {post.readTimeMinutes} min read</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${post.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{post.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={selected?.title ?? "Writer preview"} subtitle="Review public-facing SEO details and actions.">
          {selected ? (
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-44 bg-gradient-to-br from-emerald-200 via-cyan-100 to-slate-900 p-5">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-emerald-700">{selected.category}</span>
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{selected.slug}</p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{selected.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{selected.excerpt}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(selected)} className="rounded-lg bg-[var(--lp-primary)] px-3 py-2 text-sm font-black text-white">Edit blog</button>
                <a href={`/blog/${selected.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">Open public page</a>
                <button type="button" onClick={() => void archive(selected)} disabled={saving} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700 disabled:opacity-50">Archive</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select or create a blog post.</p>
          )}
        </DashboardCard>
      </section>

      <FormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedId ? "Edit blog" : "Write new blog"} description="Use original BookLib content. Content JSON controls rich blocks and public article layout." widthClassName="sm:w-[min(96vw,64rem)] max-w-5xl">
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-3">
            <input value={form.title} onChange={(event) => update({ title: event.target.value, slug: form.slug || slugify(event.target.value) })} placeholder="High CTR title" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <input value={form.slug} onChange={(event) => update({ slug: slugify(event.target.value) })} placeholder="slug" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={form.category} onChange={(event) => update({ category: event.target.value })} placeholder="Category" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
              <input value={form.readTimeMinutes} onChange={(event) => update({ readTimeMinutes: event.target.value })} placeholder="Read time" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
              <select value={form.status} onChange={(event) => update({ status: event.target.value as BlogForm["status"] })} className="rounded-lg border border-slate-200 px-3 py-2 outline-none">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <textarea value={form.excerpt} onChange={(event) => update({ excerpt: event.target.value })} placeholder="Retention-focused excerpt" className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <input value={form.coverImageUrl} onChange={(event) => update({ coverImageUrl: event.target.value })} placeholder="Cover image URL (optional)" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <input value={form.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} placeholder="SEO title" className="rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <textarea value={form.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} placeholder="SEO description" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 outline-none" />
            <button type="button" onClick={() => void save()} disabled={saving || !form.title.trim() || !form.excerpt.trim()} className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? "Saving..." : "Save blog"}
            </button>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-black text-slate-700">Rich content JSON blocks</p>
            <textarea value={form.contentText} onChange={(event) => update({ contentText: event.target.value })} className="min-h-[36rem] rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-slate-100 outline-none" />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
