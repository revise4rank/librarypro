"use client";

import { ArrowRight, BookOpenCheck, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
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
  const gradients = ["from-emerald-50 via-white to-emerald-100", "from-amber-50 via-white to-emerald-100", "from-sky-50 via-white to-emerald-100", "from-violet-50 via-white to-emerald-100"];
  return (
    <div className={`flex min-h-56 flex-col justify-between bg-gradient-to-br ${gradients[index % gradients.length]} p-6`}>
      <span className="w-fit rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">BookLib Guide</span>
      <p className="max-w-sm text-2xl font-bold leading-tight text-slate-900">{title}</p>
    </div>
  );
}

function renderBlock(block: BlogBlock, index: number, demoHref: string) {
  if (block.type === "heading") return <h2 key={index} className="mt-10 text-3xl font-bold tracking-tight text-slate-950">{block.text}</h2>;
  if (block.type === "list") {
    return (
      <div key={index} className="mt-5 grid gap-3">
        {(block.items ?? []).map((item) => (
          <p key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 text-base leading-7 text-slate-700">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
            {item}
          </p>
        ))}
      </div>
    );
  }
  if (block.type === "quote") return <blockquote key={index} className="mt-6 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-5 text-lg font-bold leading-8 text-emerald-950">{block.text}</blockquote>;
  if (block.type === "cta") {
    return (
      <div key={index} className="mt-8 rounded-lg bg-emerald-600 p-6 text-white">
        <h3 className="text-2xl font-bold">{block.title ?? "Book a demo"}</h3>
        <p className="mt-3 text-sm leading-7 text-emerald-50">{block.text}</p>
        <a href={demoHref || "/owner/register?demo=1"} target={demoHref?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-emerald-700">
          <MessageCircle className="h-4 w-4" /> Book Demo
        </a>
      </div>
    );
  }
  if (block.type === "faq") {
    return (
      <div key={index} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="font-bold text-slate-950">{block.question}</p>
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

  const demoHref = useMemo(() => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage) || "/owner/register?demo=1", [settings]);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteHeader activeLabel="Blog" demoHref={demoHref} showDemo={settings.enableBookDemoCta} />
      <FloatingWhatsapp settings={settings} />
      <section className="bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_48%,#eefbf5_100%)]">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-16 text-center md:py-24">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
            <BookOpenCheck className="h-4 w-4 text-emerald-600" />
            BookLib Blog
          </div>
          <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.7rem,5.8vw,5.4rem)] font-bold leading-[1.04] text-slate-900">Growth ideas for serious study libraries.</h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">Original guides on admissions, QR attendance, seat management, student retention, and library discovery.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={demoHref} target={demoHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700">
              Book Demo
              <ArrowRight className="h-5 w-5" />
            </a>
            <Link href="/owner/register" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-emerald-200 bg-white px-7 text-base font-bold text-emerald-700 transition hover:bg-emerald-50">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1180px] px-4 py-12 md:py-16">
        {error ? <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{error}</p> : null}
        {featured ? (
          <Link href={`/blog/${featured.slug}`} className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl lg:grid-cols-[1fr_0.9fr]">
            <BlogCover title={featured.title} />
            <div className="p-6 md:p-8">
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{featured.category}</span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">{featured.title}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{featured.excerpt}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">Read featured guide <ArrowRight className="h-4 w-4" /></p>
            </div>
          </Link>
        ) : null}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, index) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <BlogCover index={index + 1} title={post.title} />
              <div className="p-5">
                <p className="text-xs font-bold uppercase text-slate-400">{post.category} | {post.readTimeMinutes} min read</p>
                <h3 className="mt-3 text-xl font-bold leading-tight group-hover:text-emerald-700">{post.title}</h3>
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

  const demoHref = useMemo(() => whatsappHref(settings.demoWhatsappNumber || settings.supportWhatsappNumber, settings.demoWhatsappMessage) || "/owner/register?demo=1", [settings]);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteHeader activeLabel="Blog" demoHref={demoHref} showDemo={settings.enableBookDemoCta} />
      <FloatingWhatsapp settings={settings} />
      {error ? (
        <section className="mx-auto w-full max-w-[840px] px-4 py-20">
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>
          <Link href="/blog" className="mt-5 inline-flex rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white">Back to blogs</Link>
        </section>
      ) : null}
      {post ? (
        <>
          <section className="bg-[linear-gradient(135deg,#ffffff_0%,#f4fbf8_48%,#eefbf5_100%)]">
            <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-14 md:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {post.category}
                </span>
                <h1 className="mt-5 text-[clamp(2.4rem,5.4vw,4.9rem)] font-bold leading-[1.04] text-slate-900">{post.title}</h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{post.excerpt}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <p className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm">{post.readTimeMinutes} min read</p>
                  <a href={demoHref} target={demoHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
                    Book Demo
                  </a>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 shadow-xl">
                <BlogCover title={post.title} />
              </div>
            </div>
          </section>
          <article className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-12 lg:grid-cols-[0.28fr_0.72fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">In this guide</p>
                <div className="mt-4 grid gap-2">
                  {post.contentJson.filter((block) => block.type === "heading").slice(0, 6).map((block) => (
                    <p key={block.text} className="text-sm font-bold leading-6 text-slate-600">{block.text}</p>
                  ))}
                </div>
              </div>
            </aside>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-9">
              {post.contentJson.map((block, index) => renderBlock(block, index, demoHref))}
            </div>
          </article>
          {related.length ? (
            <section className="mx-auto w-full max-w-[1180px] px-4 pb-16">
              <h2 className="text-3xl font-bold tracking-tight">Related guides</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {related.map((item, index) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <BlogCover index={index + 1} title={item.title} />
                    <div className="p-5">
                      <p className="text-xs font-bold text-emerald-700">{item.category}</p>
                      <h3 className="mt-2 text-lg font-bold leading-tight">{item.title}</h3>
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
