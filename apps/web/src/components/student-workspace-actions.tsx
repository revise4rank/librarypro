"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../lib/api";

type LibrariesResponse = {
  success: boolean;
  data: Array<{
    library_id: string;
    library_name: string;
    city: string;
    seat_number: string | null;
    login_id: string;
    is_active: boolean;
    joined_at: string;
    left_at: string | null;
    status: "ACTIVE" | "LEFT";
  }>;
};

export function StudentWorkspaceActions({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const [libraries, setLibraries] = useState<LibrariesResponse["data"]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState("");
  const [saving, setSaving] = useState(false);
  const activeLibraries = libraries.filter((library) => library.status === "ACTIVE");

  useEffect(() => {
    apiFetch<LibrariesResponse>("/student/libraries")
      .then((response) => {
        setLibraries(response.data);
        const active = response.data.find((library) => library.is_active);
        if (active) {
          setActiveLibraryId(active.library_id);
        }
      })
      .catch(() => undefined);
  }, []);

  async function switchLibrary(libraryId: string) {
    setActiveLibraryId(libraryId);
    try {
      setSaving(true);
      await apiFetch(`/student/libraries/${libraryId}/active`, {
        method: "PATCH",
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function exitLibrary(libraryId: string) {
    try {
      setSaving(true);
      await apiFetch(`/student/libraries/${libraryId}/exit`, {
        method: "POST",
      });
      await apiFetch(`/student/libraries`, undefined).then((response: LibrariesResponse) => {
        setLibraries(response.data);
        const active = response.data.find((library) => library.is_active);
        setActiveLibraryId(active?.library_id ?? "");
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {activeLibraries.length > 1 ? (
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <span>Library</span>
          <select
            value={activeLibraryId}
            onChange={(event) => void switchLibrary(event.target.value)}
            disabled={saving}
            className="bg-transparent outline-none"
          >
            {activeLibraries.map((library) => (
              <option key={library.library_id} value={library.library_id}>
                {library.library_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {activeLibraryId ? (
        <button
          type="button"
          onClick={() => void exitLibrary(activeLibraryId)}
          disabled={saving}
          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-60"
        >
          Exit library
        </button>
      ) : null}
      {children}
    </>
  );
}
