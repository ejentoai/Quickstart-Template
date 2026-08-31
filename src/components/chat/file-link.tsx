"use client";

import { useState } from "react";
import { FileText, Download } from "lucide-react";

interface ArtifactItem {
  number: number;
  url: string;
  type: string;
  name: string;
  container: string;
}

interface FileLinkProps {
  artifactRef: string;
  artifacts?: ArtifactItem[];
  loading?: boolean;
}

const PREVIEWABLE_EXTS = ['pdf', 'docx', 'ppt', 'pptx'];

function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
}

function resolveArtifact(artifactRef: string, artifacts: ArtifactItem[]): ArtifactItem | null {
  if (!artifactRef?.toLowerCase().startsWith('file:')) return null;
  const index = parseInt(artifactRef.split(':')[1], 10);
  return artifacts.find(a => Number(a.number) === index) ?? null;
}

async function fetchAndOpen(artifact: ArtifactItem) {
  const params = new URLSearchParams({
    name: artifact.name,
    container: artifact.container,
    format: 'file',
  });
  const response = await fetch(`/api/citations/get-citation-content?${params}`);
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const ext = getExtension(artifact.name);

  if (PREVIEWABLE_EXTS.includes(ext)) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function FileLink({ artifactRef, artifacts, loading }: FileLinkProps) {
  const [busy, setBusy] = useState(false);

  if (!artifacts?.length) return <span>{artifactRef}</span>;

  const artifact = resolveArtifact(artifactRef, artifacts);
  if (!artifact) return <span>{artifactRef}</span>;

  // Strip leading numeric prefix added by the backend (e.g. "43877-cities.pdf" → "cities.pdf")
  const displayName = artifact.name.replace(/^\d+-/, '');

  const handleDownload = async () => {
    if (busy || loading) return;
    setBusy(true);
    try {
      await fetchAndOpen(artifact);
    } catch (err) {
      console.error('[FileLink] download failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm not-prose">
      <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <span className="text-gray-700 truncate max-w-[220px]">{displayName}</span>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy || loading}
        className="ml-1 inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
      >
        <Download className="h-3 w-3" />
        {busy ? 'Opening…' : 'Download'}
      </button>
    </span>
  );
}
