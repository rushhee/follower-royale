"use client";

import { useState, useRef } from "react";

interface UploadResult {
  added: number;
  skipped: number;
  total: number;
}

export default function FollowerUpload({ onSync }: { onSync: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/followers/sync", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setResult(data);
        onSync();
      }
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-bold mb-4">Sync Followers</h2>
      <p className="text-gray-400 text-sm mb-4">
        Upload your Instagram data export (JSON or CSV) to sync followers.
      </p>
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          className="text-sm text-gray-400 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-500"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload & Sync"}
        </button>
      </div>
      {result && (
        <div className="mt-3 text-sm text-green-400">
          {result.added} new followers added, {result.skipped} already existed ({result.total} in file)
        </div>
      )}
      {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
    </div>
  );
}
