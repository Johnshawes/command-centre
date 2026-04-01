"use client";

import { useState, useEffect, useCallback } from "react";

interface Brief {
  id: number;
  status: string;
  hook_1: string | null;
  hook_2: string | null;
  curiosity_line: string | null;
  end_line_1: string | null;
  end_line_2: string | null;
  caption: string | null;
  hashtags: string | null;
  why_this_week: string | null;
  raw_content: Record<string, unknown> | null;
  created_at: string;
  reviewed_at: string | null;
}

type Tab = "pending" | "approved" | "rejected";

export default function PublishPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      const data = await res.json();
      if (data.briefs) setBriefs(data.briefs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filtered = briefs.filter((b) => b.status === activeTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: `Pending (${briefs.filter((b) => b.status === "pending").length})` },
    { key: "approved", label: `Approved (${briefs.filter((b) => b.status === "approved").length})` },
    { key: "rejected", label: `Rejected (${briefs.filter((b) => b.status === "rejected").length})` },
  ];

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-1">Publisher</h2>
      <p className="text-muted text-sm mb-8">
        Your daily content briefs — review, approve, and publish.
      </p>

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
              ? "No briefs waiting for review. Content bot posts here daily at 7:05am."
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
        <span className="text-xs text-muted">{formatDate(brief.created_at)}</span>
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

      {/* Hook variations */}
      <div className="px-6 py-5 space-y-4">
        {(brief.hook_1 || brief.hook_2) && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Hooks</p>
            <div className="flex gap-3">
              {brief.hook_1 && (
                <div className="flex-1 bg-background px-4 py-3 rounded-lg">
                  <p className="text-xs text-muted mb-1">A</p>
                  <p className="font-semibold">{brief.hook_1}</p>
                </div>
              )}
              {brief.hook_2 && (
                <div className="flex-1 bg-background px-4 py-3 rounded-lg">
                  <p className="text-xs text-muted mb-1">B</p>
                  <p className="font-semibold">{brief.hook_2}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {brief.curiosity_line && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Curiosity Line</p>
            <p className="text-sm">{brief.curiosity_line}</p>
          </div>
        )}

        {(brief.end_line_1 || brief.end_line_2) && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">End Lines</p>
            <div className="flex gap-3">
              {brief.end_line_1 && (
                <div className="flex-1 bg-background px-4 py-3 rounded-lg">
                  <p className="text-xs text-muted mb-1">1</p>
                  <p className="text-sm">{brief.end_line_1}</p>
                </div>
              )}
              {brief.end_line_2 && (
                <div className="flex-1 bg-background px-4 py-3 rounded-lg">
                  <p className="text-xs text-muted mb-1">2</p>
                  <p className="text-sm">{brief.end_line_2}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {brief.caption && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Caption</p>
            <p className="text-sm whitespace-pre-wrap">{brief.caption}</p>
          </div>
        )}

        {brief.hashtags && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Hashtags</p>
            <p className="text-sm text-primary">{brief.hashtags}</p>
          </div>
        )}

        {brief.why_this_week && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            {expanded ? "Hide reasoning ▴" : "Why this week? ▾"}
          </button>
        )}
        {expanded && brief.why_this_week && (
          <div className="bg-background px-4 py-3 rounded-lg">
            <p className="text-sm text-muted">{brief.why_this_week}</p>
          </div>
        )}
      </div>
    </div>
  );
}
