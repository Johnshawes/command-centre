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
        // Parse raw_content if it's a string (Postgres JSONB can return as string)
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

  // Check for pending digests on load and poll
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: `Pending (${briefs.filter((b) => b.status === "pending").length})` },
    { key: "approved", label: `Approved (${briefs.filter((b) => b.status === "approved").length})` },
    { key: "rejected", label: `Rejected (${briefs.filter((b) => b.status === "rejected").length})` },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-1">Publisher</h2>
          <p className="text-muted text-sm">
            Your daily content briefs — review, approve, and publish.
          </p>
        </div>
        <button
          onClick={triggerGenerate}
          disabled={generating}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate Brief"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface rounded-lg p-1 border border-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted">
          <p>Loading briefs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-4xl mb-3">
            {activeTab === "pending" ? "📱" : activeTab === "approved" ? "✅" : "🗑️"}
          </p>
          <p>
            {activeTab === "pending"
              ? "No briefs waiting for review. Research bot triggers daily at 7am."
              : activeTab === "approved"
                ? "No approved briefs yet."
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
      className="text-xs text-muted hover:text-primary transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function HookCard({ hook, label }: { hook: HookVariation; label: string }) {
  return (
    <div className="bg-background rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
      <div className="space-y-1">
        <p className="font-bold text-lg leading-tight">{hook.line_1}</p>
        <p className="font-bold text-lg leading-tight">{hook.line_2}</p>
      </div>
      <div className="border-l-2 border-warning pl-3 space-y-1">
        <p className="text-sm text-muted italic">{hook.curiosity_line}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{hook.end_line_1}</p>
        <p className="text-sm font-semibold text-primary">{hook.end_line_2}</p>
      </div>
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
  const [expanded, setExpanded] = useState(false);
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
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{formatDate(brief.created_at)}</span>
          {raw?.angle && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {raw.angle}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {brief.status === "pending" && (
            <>
              <button
                onClick={onReject}
                disabled={updating}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted hover:text-danger hover:border-danger transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                disabled={updating}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-success text-white hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            </>
          )}
          {brief.status !== "pending" && (
            <button
              onClick={onRestore}
              disabled={updating}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Move to Pending
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* 3 Hook variations */}
        {raw && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Hook Variations</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {raw.hook_1 && <HookCard hook={raw.hook_1} label="Hook A" />}
              {raw.hook_2 && <HookCard hook={raw.hook_2} label="Hook B" />}
              {raw.hook_3 && <HookCard hook={raw.hook_3} label="Hook C" />}
            </div>
          </div>
        )}

        {/* Caption */}
        {brief.caption && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Caption</p>
              <CopyButton text={brief.caption} label="Copy caption" />
            </div>
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{brief.caption}</p>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {brief.hashtags && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Hashtags</p>
              <CopyButton text={brief.hashtags} label="Copy hashtags" />
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm text-primary">{brief.hashtags}</p>
            </div>
          </div>
        )}

        {/* Why this week */}
        {(raw?.why_this_week || brief.why_this_week) && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              {expanded ? "Hide reasoning ▴" : "Why this week? ▾"}
            </button>
            {expanded && (
              <div className="bg-background px-4 py-3 rounded-lg">
                <p className="text-sm text-muted">{raw?.why_this_week || brief.why_this_week}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
