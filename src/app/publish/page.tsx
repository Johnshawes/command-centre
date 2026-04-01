"use client";

import { useState, useEffect, useCallback } from "react";

interface HookVariation {
  line_1: string;
  line_2: string;
  curiosity_line: string;
  end_line_1: string;
  end_line_2: string;
}

interface RawBrief {
  hook_1: HookVariation;
  hook_2: HookVariation;
  hook_3: HookVariation;
  caption: string;
  hashtags: string;
  why_this_week: string;
  angle?: string;
}

interface Brief {
  id: number;
  status: string;
  caption: string | null;
  hashtags: string | null;
  why_this_week: string | null;
  raw_content: RawBrief | null;
  created_at: string;
  reviewed_at: string | null;
}

type Tab = "pending" | "approved" | "rejected";

export default function PublishPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      const data = await res.json();
      if (data.briefs) {
        const parsed = data.briefs.map((b: Brief) => ({
          ...b,
          raw_content:
            typeof b.raw_content === "string"
              ? JSON.parse(b.raw_content)
              : b.raw_content,
        }));
        setBriefs(parsed);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  async function triggerGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();
      if (data.status === "generated") {
        fetchBriefs();
      }
      return data;
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchBriefs();
    const interval = setInterval(fetchBriefs, 60000);
    return () => clearInterval(interval);
  }, [fetchBriefs]);

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/briefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchBriefs();
      }
    } catch {
      // silent
    } finally {
      setUpdating(null);
    }
  }

  const filtered = briefs.filter((b) => b.status === activeTab);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: briefs.filter((b) => b.status === "pending").length },
    { key: "approved", label: "Approved", count: briefs.filter((b) => b.status === "approved").length },
    { key: "rejected", label: "Rejected", count: briefs.filter((b) => b.status === "rejected").length },
  ];

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Publisher</h2>
        <button
          onClick={triggerGenerate}
          disabled={generating}
          className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors active:scale-95"
        >
          {generating ? "Generating..." : "Generate Brief"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted">
          <p>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-4xl mb-3">
            {activeTab === "pending" ? "📱" : activeTab === "approved" ? "✅" : "🗑️"}
          </p>
          <p className="text-sm">
            {activeTab === "pending"
              ? "No briefs waiting. Research bot runs daily at 7am."
              : activeTab === "approved"
                ? "No approved briefs."
                : "No rejected briefs."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((brief) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              updating={updating === brief.id}
              onApprove={() => updateStatus(brief.id, "approved")}
              onReject={() => updateStatus(brief.id, "rejected")}
              onRestore={() => updateStatus(brief.id, "pending")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`w-full py-3 rounded-lg text-sm font-medium transition-all active:scale-95 ${
        copied
          ? "bg-success/15 text-success"
          : "bg-surface-hover text-foreground border border-border"
      }`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function HookSection({ hook, label, index }: { hook: HookVariation; label: string; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  const allText = [
    hook.line_1,
    hook.line_2,
    "",
    hook.curiosity_line,
    "",
    hook.end_line_1,
    hook.end_line_2,
  ].join("\n");

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between active:bg-surface-hover"
      >
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-muted text-sm">{expanded ? "▴" : "▾"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Visual preview of the reel flow */}
          <div className="bg-background rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-muted mb-1">ON SCREEN</p>
              <p className="font-bold text-lg leading-tight">{hook.line_1}</p>
              <p className="font-bold text-lg leading-tight">{hook.line_2}</p>
            </div>
            <div className="border-l-2 border-warning pl-3">
              <p className="text-xs text-muted mb-1">CURIOSITY</p>
              <p className="text-sm">{hook.curiosity_line}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">END</p>
              <p className="text-sm font-medium">{hook.end_line_1}</p>
              <p className="text-sm font-semibold text-primary">{hook.end_line_2}</p>
            </div>
          </div>

          <CopyButton text={allText} label={`Copy ${label} text`} />
        </div>
      )}
    </div>
  );
}

function BriefCard({
  brief,
  updating,
  onApprove,
  onReject,
  onRestore,
}: {
  brief: Brief;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRestore: () => void;
}) {
  const raw = brief.raw_content;

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-3">
      {/* Date + angle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted">{formatDate(brief.created_at)}</span>
        {raw?.angle && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {raw.angle}
          </span>
        )}
      </div>

      {/* 3 Hook sections */}
      {raw && (
        <div className="space-y-2">
          {raw.hook_1 && <HookSection hook={raw.hook_1} label="Hook A" index={0} />}
          {raw.hook_2 && <HookSection hook={raw.hook_2} label="Hook B" index={1} />}
          {raw.hook_3 && <HookSection hook={raw.hook_3} label="Hook C" index={2} />}
        </div>
      )}

      {/* Caption */}
      {brief.caption && (
        <div className="space-y-2">
          <details className="bg-surface rounded-xl border border-border overflow-hidden">
            <summary className="px-4 py-3.5 font-semibold text-sm cursor-pointer active:bg-surface-hover">
              Caption
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="bg-background rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{brief.caption}</p>
              </div>
              <CopyButton text={brief.caption} label="Copy caption" />
            </div>
          </details>
        </div>
      )}

      {/* Hashtags */}
      {brief.hashtags && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <span className="font-semibold text-sm">Hashtags</span>
          </div>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm text-primary">{brief.hashtags}</p>
            <CopyButton text={brief.hashtags} label="Copy hashtags" />
          </div>
        </div>
      )}

      {/* Why this week */}
      {(raw?.why_this_week || brief.why_this_week) && (
        <details className="bg-surface rounded-xl border border-border overflow-hidden">
          <summary className="px-4 py-3.5 font-semibold text-sm cursor-pointer text-muted active:bg-surface-hover">
            Why this week?
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-muted">{raw?.why_this_week || brief.why_this_week}</p>
          </div>
        </details>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {brief.status === "pending" && (
          <>
            <button
              onClick={onReject}
              disabled={updating}
              className="flex-1 py-3.5 rounded-xl text-sm font-medium border border-border text-muted active:scale-95 transition-all disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              disabled={updating}
              className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-success text-white active:scale-95 transition-all disabled:opacity-50"
            >
              Approve
            </button>
          </>
        )}
        {brief.status !== "pending" && (
          <button
            onClick={onRestore}
            disabled={updating}
            className="flex-1 py-3.5 rounded-xl text-sm font-medium border border-border text-muted active:scale-95 transition-all disabled:opacity-50"
          >
            Move to Pending
          </button>
        )}
      </div>
    </div>
  );
}
