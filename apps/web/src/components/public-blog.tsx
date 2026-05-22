"use client";

import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingWhatsapp } from "./floating-whatsapp";
import { PublicSiteHeader } from "./public-site-header";
import { apiFetch } from "../lib/api";
import {
  emptyPublicSiteSettings,
  fetchPublicSiteSettings,
  type PublicSiteSettings,
  whatsappHref,
} from "../lib/public-site-settings";

export type BlogBlock = {
  type: "heading" | "paragraph" | "list" | "quote" | "cta" | "faq";
  text?: string;
  title?: string;
  question?: string;
  answer?: string;
  items?: string[];
};

export type PublicBlogPost = {
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
  publishedAt: string | null;
};

function BlogCover({ index = 0, title }: { index?: number; title: string }) {
  const gradients = [
    "from-emerald-200 via-cyan-100 to-slate-900",
    "from-amber-200 via-emerald-100 to-slate-900",
    "from-sky-200 via-emerald-100 to-slate-900",
    "from-violet-200 via-cyan-100 to-slate-900",
  ];
  return (
    <div className={`flex min-h-56 flex-col justify-between bg-gradient-to-br ${gradients[index % gradients.length]} p-6`}>
      <span className="w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-black text-emerald-700">BookLib Guide</span>
      <p className="max-w-sm text-2xl font-black leading-tight text-white drop-shadow">{title}</p>
    </div>
  );
}

function renderBlock(block: BlogBlock, index: number, demoHref: string) {
  if (block.type === "heading") return <h2 key={index} className="mt-10 text-3xl font-black tracking-tight text-slate-950">{block.text}</h2>;
  if (block.type === "list") {
    return (
      <div key={index} className="mt-5 grid gap-3">
        {(block.items ?? []).map((item) => (
          <p key={item} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-700">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
            {item}
          </p>
        ))}
      </div>
    );
  }
  if (block.type === "quote") return <blockquote key={index} className="mt-6 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 text-lg font-bold leading-8 text-emerald-950">{block.text}</blockquote>;
  if (block.type === "cta") {
    return (
      <div key={index} className="mt-8 rounded-2xl bg-slate-950 p-6 text-white">
        <h3 className="text-2xl font-black">{block.title ?? "Book a demo"}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{block.text}</p>
        {demoHref ? (
          <a href={demoHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">
            <MessageCircle className="h-4 w-4" /> Book Demo
          </a>
        ) : null}
      </div>
    );
  }
  if (block.type === "faq") {
    return (
      <div key={index} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="font-black text-slate-950">{block.question}</p>
        <p className="mt-2 text-base leading-7 text-slate-600">{block.answer}</p>
      </div>
    );
  }
  return <p key={index} className="mt-5 text-lg leading-9 text-slate-700">{block.text}</p>;
}

export function PublicBlogList() {
  const [settings, setSettings] = useState<PublicSiteSettings>(emptyPublicSiteSettings);
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicSiteSettings().then(setSettings).catch(() => setSettings(emptyPublicSiteSettings));
    apiFetch<{ success: boolean; data: PublicBlogPost[] }>("/public/blogs", undefined, false)
      .then((response) => setPosts(response.data))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load blogs."));
  }, []);

  const demoHref = useMemo(() => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage), [settings]);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <PublicSiteHeader activeLabel="Blog" demoHref={demoHref} showDemo={settings.enableBookDemoCta && Boolean(demoHref)} />
      <FloatingWhatsapp settings={settings} />
      <section className="bg-slate-950 text-white">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-16 md:py-20">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">BookLib Blog</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,4.8rem)] font-black leading-none tracking-[-0.055em]">Growth ideas for serious study libraries.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">Original guides on admissions, QR attendance, seat management, student retention, and library discovery.</p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1180px] px-4 py-12">
        {error ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{error}</p> : null}
        {featured ? (
          <Link href={`/blog/${featured.slug}`} className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl lg:grid-cols-[1fr_0.9fr]">
            <BlogCover title={featured.title} />
            <div className="p-6 md:p-8">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{featured.category}</span>
              <h2 className="mt-5 text-3xl font-black tracking-tight">{featured.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{featured.excerpt}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-700">Read featured guide <ArrowRight className="h-4 w-4" /></p>
            </div>
          </Link>
        ) : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, index) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <BlogCover index={index + 1} title={post.title} />
              <div className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{post.category} | {post.readTimeMinutes} min read</p>
                <h3 className="mt-3 text-xl font-black leading-tight group-hover:text-emerald-700">{post.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function PublicBlogDetail({ slug }: { slug: string }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(emptyPublicSiteSettings);
  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [related, setRelated] = useState<PublicBlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicSiteSettings().then(setSettings).catch(() => setSettings(emptyPublicSiteSettings));
    apiFetch<{ success: boolean; data: PublicBlogPost }>(`/public/blogs/${slug}`, undefined, false)
      .then((response) => setPost(response.data))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Blog not found."));
    apiFetch<{ success: boolean; data: PublicBlogPost[] }>("/public/blogs", undefined, false)
      .then((response) => setRelated(response.data.filter((item) => item.slug !== slug).slice(0, 3)))
      .catch(() => setRelated([]));
  }, [slug]);

  const demoHref = useMemo(() => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage), [settings]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <PublicSiteHeader activeLabel="Blog" demoHref={demoHref} showDemo={settings.enableBookDemoCta && Boolean(demoHref)} />
      <FloatingWhatsapp settings={settings} />
      {error ? (
        <section className="mx-auto w-full max-w-[840px] px-4 py-20">
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>
          <Link href="/blog" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Back to blogs</Link>
        </section>
      ) : null}
      {post ? (
        <>
          <section className="bg-slate-950 text-white">
            <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-14 md:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">{post.category}</span>
                <h1 className="mt-5 text-[clamp(2.4rem,5vw,4.7rem)] font-black leading-none tracking-[-0.055em]">{post.title}</h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{post.excerpt}</p>
                <p className="mt-5 text-sm font-bold text-slate-400">{post.readTimeMinutes} min read</p>
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/10">
                <BlogCover title={post.title} />
              </div>
            </div>
          </section>
          <article className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-12 lg:grid-cols-[0.28fr_0.72fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">In this guide</p>
                <div className="mt-4 grid gap-2">
                  {post.contentJson.filter((block) => block.type === "heading").slice(0, 6).map((block) => (
                    <p key={block.text} className="text-sm font-bold leading-6 text-slate-600">{block.text}</p>
                  ))}
                </div>
              </div>
            </aside>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
              {post.contentJson.map((block, index) => renderBlock(block, index, demoHref))}
            </div>
          </article>
          {related.length ? (
            <section className="mx-auto w-full max-w-[1180px] px-4 pb-16">
              <h2 className="text-3xl font-black tracking-tight">Related guides</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {related.map((item, index) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <BlogCover index={index + 1} title={item.title} />
                    <div className="p-5">
                      <p className="text-xs font-black text-emerald-700">{item.category}</p>
                      <h3 className="mt-2 text-lg font-black leading-tight">{item.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : !error ? (
        <p className="mx-auto w-full max-w-[840px] px-4 py-20 text-sm text-slate-500">Loading blog...</p>
      ) : null}
    </main>
  );
}
