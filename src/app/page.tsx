"use client";

import { useState, useEffect, useCallback } from "react";

interface Idea {
  id: number;
  text: string;
  status: string;
  created_at: string;
  researched_at: string | null;
}

export default function IdeasPage() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [flash, setFlash] = useState("");

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      const data = await res.json();
      if (data.ideas) setIdeas(data.ideas);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
    const interval = setInterval(fetchIdeas, 30000);
    return () => clearInterval(interval);
  }, [fetchIdeas]);

  async function submitIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });
      const data = await res.json();

      if (data.status === "stored") {
        setFlash("Idea captured — queued for next digest");
        setInput("");
        fetchIdeas();
        setTimeout(() => setFlash(""), 4000);
      } else {
        setFlash(data.error || "Failed to send idea");
        setTimeout(() => setFlash(""), 4000);
      }
    } catch {
      setFlash("Error saving idea");
      setTimeout(() => setFlash(""), 4000);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/15 text-warning",
      researched: "bg-success/15 text-success",
      published: "bg-primary/15 text-primary",
    };
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || "bg-muted/15 text-muted"}`}
      >
        {status}
      </span>
    );
  };

  const pending = ideas.filter((i) => i.status === "pending");
  const processed = ideas.filter((i) => i.status !== "pending");

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <h2 className="text-xl font-bold mb-1">Idea Capture</h2>
      <p className="text-muted text-sm mb-6">
        Drop an idea — it gets researched and turned into a content brief.
      </p>

      <form onSubmit={submitIdea} className="mb-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Reel about why 70% GP isn't enough if your labour is 40%"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-base"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-full mt-3 py-3.5 bg-primary text-white rounded-xl font-medium disabled:opacity-50 transition-colors active:scale-95 text-base"
        >
          {sending ? "Sending..." : "Capture Idea"}
        </button>
      </form>

      {flash && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            flash.includes("captured")
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {flash}
        </div>
      )}

      {/* Queued */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          Queued ({pending.length})
        </h3>

        {pending.length === 0 ? (
          <div className="text-center py-10 text-muted">
            <p className="text-3xl mb-2">💡</p>
            <p className="text-sm">No ideas queued. Drop one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((idea) => (
              <div
                key={idea.id}
                className="px-4 py-3 bg-surface rounded-xl border border-border"
              >
                <p className="text-sm mb-2">{idea.text}</p>
                <div className="flex items-center justify-between">
                  {statusBadge(idea.status)}
                  <span className="text-xs text-muted">
                    {formatTime(idea.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed */}
      {processed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Processed ({processed.length})
          </h3>
          <div className="space-y-2">
            {processed.map((idea) => (
              <div
                key={idea.id}
                className="px-4 py-3 bg-surface rounded-xl border border-border opacity-60"
              >
                <p className="text-sm mb-2">{idea.text}</p>
                <div className="flex items-center justify-between">
                  {statusBadge(idea.status)}
                  <span className="text-xs text-muted">
                    {formatTime(idea.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
