"use client";

import { useRef, useState } from "react";
import { API_URL, hydrateSessionFromServer } from "../lib/api";

type PublicProfileImageUploadProps = {
  onUploaded: (url: string) => void;
};

export function PublicProfileImageUpload({ onUploaded }: PublicProfileImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const session = await hydrateSessionFromServer();
    if (!session?.user) {
      setError("Login required before uploading images.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/owner/public-profile/uploads`, {
        method: "POST",
        credentials: "include",
        headers: session.csrfToken
          ? {
              "X-CSRF-Token": session.csrfToken,
            }
          : undefined,
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error?.message ?? "Upload failed");
      }

      onUploaded(json.data.url);
      setSuccess(`Image uploaded via ${json.data.provider}.`);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileSelected}
        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
      />
      {uploading ? <p className="text-sm font-semibold text-slate-600">Uploading image...</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
