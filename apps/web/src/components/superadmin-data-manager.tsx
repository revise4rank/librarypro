"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { StatCard } from "./stat-card";

type DataOverview = {
  metrics: Record<string, string>;
  recentAudit: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    actor_name: string | null;
    library_name: string | null;
  }>;
  recentLibraries: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    total_seats: number;
    available_seats: number;
    owner_name: string;
    subscription_status: string | null;
  }>;
  readableTables: string[];
};

type SyllabusTemplate = {
  id: string;
  class_name: string;
  subject_title: string;
  topics: Array<{ id: string; topic_title: string }>;
};

const metricCards = [
  ["Marketplace listings", "marketplace_listings"],
  ["Active libraries", "active_libraries"],
  ["Student accounts", "student_accounts"],
  ["Active admissions", "active_assignments"],
  ["Open seats", "available_seats"],
  ["Unallotted", "unallotted_students"],
  ["Tenant revenue", "tenant_revenue_month"],
  ["Tenant dues", "tenant_dues"],
  ["Platform MRR", "platform_mrr_month"],
  ["Leads 30d", "marketplace_leads_30d"],
  ["Review reports", "open_review_reports"],
  ["Live offers", "live_offers"],
] as const;

function valueFor(metrics: Record<string, string> | undefined, key: string) {
  return metrics?.[key] ?? "0";
}

function parseCsvRows(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    return {
      className: row.className,
      subjectTitle: row.subjectTitle,
      topicTitle: row.topicTitle,
      estimatedMinutes: Number(row.estimatedMinutes || 60),
      topicOrder: Number(row.topicOrder || index),
      colorHex: row.colorHex || "",
    };
  });
}

export function SuperadminDataManager() {
  const [data, setData] = useState<DataOverview | null>(null);
  const [templates, setTemplates] = useState<SyllabusTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syllabusCsv, setSyllabusCsv] = useState(
    "className,subjectTitle,topicTitle,estimatedMinutes,topicOrder,colorHex\nClass 12,Physics,Current Electricity,90,1,#2563eb\nClass 12,Physics,Ray Optics,90,2,#2563eb\nClass 12,Chemistry,Solid State,75,1,#16a34a",
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewResponse, templateResponse] = await Promise.all([
          apiFetch<{ success: boolean; data: DataOverview }>("/admin/data-overview"),
          apiFetch<{ success: boolean; data: SyllabusTemplate[] }>("/admin/syllabus/templates"),
        ]);
        setData(overviewResponse.data);
        setTemplates(templateResponse.data);
        setError(null);
      } catch (loadError) {
        setData({
          metrics: {},
          recentAudit: [],
          recentLibraries: [],
          readableTables: [],
        });
        setError(loadError instanceof Error ? loadError.message : "Unable to load platform data.");
      }
    }

    void loadData();
  }, []);

  async function importSyllabusTemplates() {
    try {
      setImporting(true);
      const rows = parseCsvRows(syllabusCsv);
      if (rows.length === 0) {
        setImportStatus("CSV needs a header row and at least one topic row.");
        return;
      }
      const response = await apiFetch<{ success: boolean; data: { subjectsTouched: number; topicsTouched: number } }>("/admin/syllabus/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setImportStatus(`${response.data.subjectsTouched} subjects and ${response.data.topicsTouched} topics imported.`);
      const templateResponse = await apiFetch<{ success: boolean; data: SyllabusTemplate[] }>("/admin/syllabus/templates");
      setTemplates(templateResponse.data);
      setError(null);
    } catch (importError) {
      setImportStatus(null);
      setError(importError instanceof Error ? importError.message : "Unable to import syllabus CSV.");
    } finally {
      setImporting(false);
    }
  }

  if (!data) return null;

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, key]) => (
          <StatCard key={key} label={label} value={valueFor(data.metrics, key)} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Recent database activity" subtitle="Latest audit events across owners, students, and platform actions.">
          <div className="grid gap-2">
            {data.recentAudit.map((event) => (
              <div key={event.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--lp-text)]">{event.action}</p>
                  <span className="rounded-md bg-[var(--lp-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--lp-muted)]">
                    {event.created_at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--lp-muted)]">
                  {event.entity_type} {event.library_name ? `| ${event.library_name}` : ""} {event.actor_name ? `| ${event.actor_name}` : ""}
                </p>
              </div>
            ))}
            {data.recentAudit.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No audit events yet.</p> : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Tenant health snapshot" subtitle="Recent libraries with owner, subscription, and seat capacity visibility.">
          <div className="grid gap-2">
            {data.recentLibraries.map((library) => (
              <div key={library.id} className="grid gap-2 rounded-lg border border-[var(--lp-border)] bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--lp-text)]">{library.name}</p>
                  <p className="text-xs leading-5 text-[var(--lp-muted)]">{library.city} | {library.owner_name}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{library.available_seats}/{library.total_seats} seats</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{library.subscription_status ?? library.status}</span>
                </div>
              </div>
            ))}
            {data.recentLibraries.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No libraries found.</p> : null}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard title="Super admin data access" subtitle="Read-only operational areas available from this page.">
        <div className="flex flex-wrap gap-2">
          {data.readableTables.map((table) => (
            <span key={table} className="rounded-md border border-[var(--lp-border)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--lp-muted)]">
              {table}
            </span>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Global syllabus upload" subtitle="Upload class-wise subject topics that students can import in Study Zone.">
        <div className="grid gap-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setSyllabusCsv(String(reader.result ?? ""));
              reader.readAsText(file);
            }}
            className="rounded-xl border border-[var(--lp-border)] bg-white p-3 text-sm font-semibold text-[var(--lp-muted)]"
          />
          <textarea
            value={syllabusCsv}
            onChange={(event) => setSyllabusCsv(event.target.value)}
            className="min-h-56 rounded-xl border border-[var(--lp-border)] bg-white p-4 font-mono text-xs text-[var(--lp-text)] outline-none"
            spellCheck={false}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[var(--lp-muted)]">
              Headers: className, subjectTitle, topicTitle, estimatedMinutes, topicOrder, colorHex
            </p>
            <button
              type="button"
              onClick={() => void importSyllabusTemplates()}
              disabled={importing}
              className="rounded-full border border-[var(--lp-primary)] bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Import syllabus
            </button>
          </div>
          {importStatus ? <p className="text-sm font-semibold text-emerald-700">{importStatus}</p> : null}
          <div className="grid gap-2 md:grid-cols-3">
            {templates.slice(0, 9).map((template) => (
              <div key={template.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lp-muted)]">{template.class_name}</p>
                <p className="mt-1 text-sm font-bold text-[var(--lp-text)]">{template.subject_title}</p>
                <p className="mt-1 text-xs text-[var(--lp-muted)]">{template.topics.length} topics</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
