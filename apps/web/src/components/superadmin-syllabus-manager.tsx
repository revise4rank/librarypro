"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";
import { FormDrawer } from "./form-drawer";
import { StatCard } from "./stat-card";

type SyllabusTemplate = {
  id: string;
  class_name: string;
  subject_title: string;
  color_hex?: string | null;
  topics: Array<{ id: string; topic_title: string; estimated_minutes?: number | null; topic_order?: number | null }>;
};

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

export function SuperadminSyllabusManager() {
  const [templates, setTemplates] = useState<SyllabusTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("All");
  const [syllabusCsv, setSyllabusCsv] = useState(
    "className,subjectTitle,topicTitle,estimatedMinutes,topicOrder,colorHex\nClass 12,Physics,Current Electricity,90,1,#2563eb\nClass 12,Physics,Ray Optics,90,2,#2563eb\nClass 12,Chemistry,Solid State,75,1,#16a34a",
  );
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function loadTemplates() {
    const response = await apiFetch<{ success: boolean; data: SyllabusTemplate[] }>("/admin/syllabus/templates");
    setTemplates(response.data);
    setError(null);
  }

  useEffect(() => {
    loadTemplates().catch((loadError) => {
      setTemplates([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load syllabus templates.");
    });
  }, []);

  const classOptions = useMemo(() => Array.from(new Set(templates.map((template) => template.class_name))).sort(), [templates]);
  const visibleTemplates = classFilter === "All" ? templates : templates.filter((template) => template.class_name === classFilter);
  const topicCount = templates.reduce((sum, template) => sum + template.topics.length, 0);
  const visibleTopicCount = visibleTemplates.reduce((sum, template) => sum + template.topics.length, 0);

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
      await loadTemplates();
      setImportOpen(false);
    } catch (importError) {
      setImportStatus(null);
      setError(importError instanceof Error ? importError.message : "Unable to import syllabus CSV.");
    } finally {
      setImporting(false);
    }
  }

  async function uploadSyllabusFile(file: File) {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiFetch<{ success: boolean; data: { subjectsTouched: number; topicsTouched: number } }>("/admin/syllabus/import-file", {
        method: "POST",
        body: formData,
      });
      setImportStatus(`${response.data.subjectsTouched} subjects and ${response.data.topicsTouched} topics imported from ${file.name}.`);
      await loadTemplates();
      setImportOpen(false);
    } catch (uploadError) {
      setImportStatus(null);
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload syllabus file.");
    } finally {
      setUploadingFile(false);
    }
  }

  function downloadCsvTemplate() {
    const csv = [
      "className,subjectTitle,topicTitle,estimatedMinutes,topicOrder,colorHex",
      "Class 12,Physics,Current Electricity,90,1,#2563eb",
      "Class 12,Physics,Ray Optics,90,2,#2563eb",
      "Class 12,Chemistry,Solid State,75,1,#16a34a",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "booklib-syllabus-import-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Classes" value={classOptions.length} note="Unique class filters available for students." />
        <StatCard label="Subjects" value={templates.length} note="Class-wise subject templates." />
        <StatCard label="Topics" value={topicCount} note="Checklist rows students can import." />
        <StatCard label="Visible now" value={visibleTopicCount} note={classFilter === "All" ? "All uploaded topics." : `${classFilter} topics.`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard title="Upload syllabus" subtitle="Import CSV or XLSX files with class, subject, and topic rows.">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="rounded-full border border-[var(--lp-primary)] bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
            >
              Import syllabus template
            </button>
            {importStatus ? <p className="text-sm font-semibold text-emerald-700">{importStatus}</p> : null}
          </div>
        </DashboardCard>

        <FormDrawer
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title="Import syllabus template"
          description="Download the template, fill class-wise topics, then upload CSV or XLSX for students."
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-3">
              <a
                href="/api-proxy/v1/admin/syllabus/template.xlsx"
                className="rounded-full border border-[var(--lp-primary)] bg-[var(--lp-primary)] px-5 py-3 text-sm font-bold text-white"
              >
                Download Excel template
              </a>
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="rounded-full border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-bold text-[var(--lp-text)]"
              >
                Download CSV template
              </button>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void uploadSyllabusFile(file);
                event.currentTarget.value = "";
              }}
              className="rounded-xl border border-[var(--lp-border)] bg-white p-3 text-sm font-semibold text-[var(--lp-muted)]"
            />
            {uploadingFile ? <p className="text-sm font-semibold text-[var(--lp-muted)]">Uploading syllabus file...</p> : null}
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
                {importing ? "Importing..." : "Import syllabus"}
              </button>
            </div>
            {importStatus ? <p className="text-sm font-semibold text-emerald-700">{importStatus}</p> : null}
          </div>
        </FormDrawer>

        <DashboardCard title="Student import library" subtitle="Review what students can pull into Study Zone by class and subject.">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {["All", ...classOptions].map((className) => (
                <button
                  key={className}
                  type="button"
                  onClick={() => setClassFilter(className)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${
                    classFilter === className
                      ? "border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white"
                      : "border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {visibleTemplates.map((template) => (
                <div key={template.id} className="rounded-lg border border-[var(--lp-border)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lp-muted)]">{template.class_name}</p>
                      <p className="mt-1 truncate text-sm font-bold text-[var(--lp-text)]">{template.subject_title}</p>
                    </div>
                    <span className="rounded-md bg-[var(--lp-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--lp-muted)]">
                      {template.topics.length} topics
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1">
                    {template.topics.slice(0, 4).map((topic) => (
                      <p key={topic.id} className="truncate text-xs text-[var(--lp-muted)]">
                        {topic.topic_title}
                      </p>
                    ))}
                    {template.topics.length > 4 ? <p className="text-xs font-semibold text-[var(--lp-muted)]">+{template.topics.length - 4} more topics</p> : null}
                  </div>
                </div>
              ))}
            </div>
            {visibleTemplates.length === 0 ? <p className="text-sm text-[var(--lp-muted)]">No syllabus templates uploaded yet.</p> : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
