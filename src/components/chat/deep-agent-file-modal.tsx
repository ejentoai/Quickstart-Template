"use client";

import { useState, useCallback } from "react";
import { X, Copy, Download, Check, ExternalLink } from "lucide-react";
import { Markdown } from "@/components/markdown";
import type { DeepAgentFile } from "./hooks/useChat";

interface DeepAgentFileModalProps {
  file: DeepAgentFile;
  onClose: () => void;
}

export function DeepAgentFileModal({ file, onClose }: DeepAgentFileModalProps) {
  const [copied, setCopied] = useState(false);
  const isMarkdown = /\.(md|markdown)$/i.test(file.name);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [file.content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [file]);

  const handleOpenInNewTab = useCallback(() => {
    const blob = new Blob([file.content], { type: isMarkdown ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [file, isMarkdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-[80vh] w-[700px] max-w-[95vw] flex-col rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium truncate max-w-[500px]">{file.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isMarkdown ? (
            <div className="prose prose-sm max-w-none">
              <Markdown message={{ role: "assistant" }}>{file.content}</Markdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-sm font-mono text-foreground">
              {file.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
