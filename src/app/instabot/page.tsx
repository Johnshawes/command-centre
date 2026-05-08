"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  capacity: { capacity: number; current: number; spots_left: number };
  sales: { closed_won_total: number };
  totals: {
    all: number;
    active: number;
    archived: number;
    awaiting_them: number;
    awaiting_us: number;
    high_value_all: number;
    high_value_active: number;
  };
  kpi: { outlines_sent_7d: number; follow_ups_due_24h: number };
  high_value_leads: HighValueLead[];
  funnel_7d: FunnelWindow;
  funnel_30d: FunnelWindow;
  follow_ups: {
    pending: number;
    sent_24h: number;
    sent_72h: number;
    sent_7d: number;
  };
  recent: RecentRow[];
  generated_at: string;
  error?: string;
}

interface HighValueLead {
  ig_sender_id: string;
  funnel: string;
  stage: string;
  flagged_at: string | null;
  last_user_message: string;
  message_count: number;
  awaiting_user: boolean;
  updated_at: string;
}

interface FunnelWindow {
  started: number;
  disqualified: number;
  outline_sent: number;
  engaged_after_outline: number;
  outline_rate: number;
  engaged_rate: number;
  by_funnel: { application: number; lead_magnet: number; startup_course: number };
}

interface RecentRow {
  ig_sender_id: string;
  funnel: string;
  stage: string;
  archived: boolean;
  awaiting_user: boolean;
  follow_up_count: number;
  outline_sent_at: string | null;
  updated_at: string;
  message_count: number;
}

const STAGE_COLOURS: Record<string, string> = {
  qualifying: "bg-warning/15 text-warning border-warning/30",
  qualified: "bg-success/15 text-success border-success/30",
  outline_sent: "bg-primary/15 text-primary border-primary/30",
  call_booked: "bg-success/15 text-success border-success/30",
  closed_won: "bg-success/20 text-success border-success/40",
  closed_lost: "bg-danger/15 text-danger border-danger/30",
  disqualified: "bg-muted/15 text-muted border-muted/30",
  archived: "bg-muted/10 text-muted border-muted/20",
};

const FUNNEL_LABELS: Record<string, string> = {
  application: "Application",
  lead_magnet: "Lead Magnet",
  startup_course: "Course",
};

export default function InstaBotPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/instabot/stats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load");
        return;
      }
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pt-4">
        <Header />
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-6xl mx-auto pt-4">
        <Header />
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm">
          <p className="font-semibold text-danger mb-1">Couldn&apos;t load stats</p>
          <p className="text-foreground">{error}</p>
          <p className="text-muted mt-2 text-xs">
            Most likely cause: <code>SUPABASE_URL</code> / <code>SUPABASE_KEY</code>{" "}
            env vars not set on Vercel.
          </p>
        </div>
      </div>
    );
  }

  const cap = stats.capacity;
  const capPct = cap.capacity > 0 ? cap.current / cap.capacity : 0;

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-12">
      <Header generated_at={stats.generated_at} />

      {/* ── KPI cards ──────────────────────────────────────────────── */}
      <div
        className={`grid grid-cols-2 gap-3 mb-8 ${
          stats.sales.closed_won_total > 0 ? "md:grid-cols-5" : "md:grid-cols-4"
        }`}
      >
        <Kpi
          label="Capacity"
          value={`${cap.current}/${cap.capacity}`}
          sub={`${cap.spots_left} spot${cap.spots_left === 1 ? "" : "s"} left`}
          tone={capPct >= 0.9 ? "danger" : capPct >= 0.6 ? "warning" : "default"}
        />
        {stats.sales.closed_won_total > 0 ? (
          <Kpi
            label="Closed sales"
            value={stats.sales.closed_won_total}
            sub="Programme purchases"
            tone="success"
          />
        ) : null}
        <Kpi
          label="Active conversations"
          value={stats.totals.active}
          sub={`${stats.totals.archived} archived`}
        />
        <Kpi
          label="Outlines sent (7d)"
          value={stats.kpi.outlines_sent_7d}
          sub="Bot's working signal"
        />
        <Kpi
          label="Follow-ups due 24h"
          value={stats.kpi.follow_ups_due_24h}
          sub={`${stats.totals.awaiting_them} awaiting reply`}
        />
      </div>

      {/* ── High-value leads ───────────────────────────────────────── */}
      {stats.high_value_leads.length > 0 ? (
        <div className="bg-gradient-to-br from-warning/15 to-primary/10 border-2 border-warning/40 rounded-xl p-5 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span>🔥</span> High-value leads
            </h3>
            <span className="text-xs text-muted">
              {stats.totals.high_value_active} active · {stats.totals.high_value_all} total
            </span>
          </div>
          <p className="text-xs text-muted mb-4">
            Leads who told the bot they do £100K+/month or run 3+ shops. Step in personally.
          </p>
          <div className="space-y-2">
            {stats.high_value_leads.map((l) => (
              <HighValueItem key={l.ig_sender_id} lead={l} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Funnel comparison ─────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-semibold">Funnel</h3>
          <span className="text-xs text-muted">7-day vs 30-day</span>
        </div>
        <FunnelTable f7={stats.funnel_7d} f30={stats.funnel_30d} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* ── Follow-up sequence ──────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-1">Follow-up sequence</h3>
          <p className="text-xs text-muted mb-4">
            How far through the re-engagement sequence each silent lead has gone.
          </p>
          <FollowUpRow
            label="Pending 24h check-in"
            count={stats.follow_ups.pending}
            stepLabel="next up"
          />
          <FollowUpRow
            label="24h sent — case study next"
            count={stats.follow_ups.sent_24h - stats.follow_ups.sent_72h}
            stepLabel="step 2"
          />
          <FollowUpRow
            label="72h sent — capacity close next"
            count={stats.follow_ups.sent_72h - stats.follow_ups.sent_7d}
            stepLabel="step 3"
          />
          <FollowUpRow
            label="7d sent — archiving"
            count={stats.follow_ups.sent_7d}
            stepLabel="final"
          />
        </div>

        {/* ── Funnel split ────────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-1">Where leads enter (30d)</h3>
          <p className="text-xs text-muted mb-4">
            Which funnel each conversation started in.
          </p>
          <FunnelSplit f={stats.funnel_30d} />
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-1">Recent activity</h3>
        <p className="text-xs text-muted mb-4">Last 15 conversations updated.</p>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            No conversations yet. Once leads start hitting the bot they&apos;ll show up here.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.recent.map((r) => (
              <RecentItem key={r.ig_sender_id} r={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function Header({ generated_at }: { generated_at?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold">Insta Bot</h2>
      <p className="text-muted text-sm">
        Live conversion data — refreshes every minute
        {generated_at ? (
          <span className="text-xs ml-2 opacity-70">
            (updated {new Date(generated_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})
          </span>
        ) : null}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const valueColour =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
      ? "text-warning"
      : tone === "success"
      ? "text-success"
      : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColour}`}>{value}</p>
      {sub ? <p className="text-xs text-muted mt-1">{sub}</p> : null}
    </div>
  );
}

function HighValueItem({ lead }: { lead: HighValueLead }) {
  const flaggedAt = lead.flagged_at ? new Date(lead.flagged_at) : null;
  const flaggedLabel = flaggedAt
    ? flaggedAt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  return (
    <div className="bg-surface border border-warning/30 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-warning/15 text-warning border-warning/30 font-semibold uppercase tracking-wide">
            {(FUNNEL_LABELS[lead.funnel] ?? lead.funnel)}
          </span>
          <span className="text-[10px] text-muted">{lead.message_count} msgs</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              lead.awaiting_user
                ? "bg-warning/15 text-warning border-warning/30"
                : "bg-success/15 text-success border-success/30"
            }`}
          >
            {lead.awaiting_user ? "Waiting on them" : "Bot to reply"}
          </span>
        </div>
        <span className="text-xs text-muted whitespace-nowrap">{flaggedLabel}</span>
      </div>
      {lead.last_user_message ? (
        <p className="text-sm text-foreground italic line-clamp-2">
          “{lead.last_user_message}”
        </p>
      ) : null}
      <p className="text-[10px] text-muted mt-2 font-mono truncate">
        ig: {lead.ig_sender_id}
      </p>
    </div>
  );
}

function FunnelTable({ f7, f30 }: { f7: FunnelWindow; f30: FunnelWindow }) {
  const rows: { label: string; v7: number; v30: number; rate?: number }[] = [
    { label: "Conversations started", v7: f7.started, v30: f30.started },
    { label: "Disqualified", v7: f7.disqualified, v30: f30.disqualified },
    {
      label: "Reached programme outline",
      v7: f7.outline_sent,
      v30: f30.outline_sent,
      rate: f30.outline_rate,
    },
    {
      label: "Engaged after outline",
      v7: f7.engaged_after_outline,
      v30: f30.engaged_after_outline,
      rate: f30.engaged_rate,
    },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 text-xs text-muted px-2 py-1">
        <div className="col-span-6">Stage</div>
        <div className="col-span-2 text-right">7d</div>
        <div className="col-span-2 text-right">30d</div>
        <div className="col-span-2 text-right">Rate</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-12 text-sm bg-surface-hover/40 rounded-lg px-2 py-2 items-center"
        >
          <div className="col-span-6 font-medium">{r.label}</div>
          <div className="col-span-2 text-right tabular-nums">{r.v7}</div>
          <div className="col-span-2 text-right tabular-nums">{r.v30}</div>
          <div className="col-span-2 text-right tabular-nums text-muted">
            {r.rate != null ? `${Math.round(r.rate * 100)}%` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowUpRow({
  label,
  count,
  stepLabel,
}: {
  label: string;
  count: number;
  stepLabel: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{stepLabel}</p>
      </div>
      <p className="text-lg font-bold tabular-nums">{Math.max(0, count)}</p>
    </div>
  );
}

function FunnelSplit({ f }: { f: FunnelWindow }) {
  const total = f.started || 1;
  const rows = [
    { key: "application", count: f.by_funnel.application },
    { key: "lead_magnet", count: f.by_funnel.lead_magnet },
    { key: "startup_course", count: f.by_funnel.startup_course },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = (r.count / total) * 100;
        return (
          <div key={r.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{FUNNEL_LABELS[r.key]}</span>
              <span className="tabular-nums text-muted">
                {r.count} <span className="text-xs">({Math.round(pct)}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentItem({ r }: { r: RecentRow }) {
  const stageKey = r.archived ? "archived" : r.stage;
  const colour = STAGE_COLOURS[stageKey] ?? "bg-muted/15 text-muted border-muted/30";
  const time = new Date(r.updated_at);
  const timeLabel = time.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const status =
    r.archived
      ? "Archived"
      : r.awaiting_user
      ? r.follow_up_count > 0
        ? `Follow-up ${r.follow_up_count} sent — waiting`
        : "Waiting on them"
      : "Awaiting bot reply";

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-surface-hover/50">
      <span
        className={`text-[10px] px-2 py-1 rounded-full border font-medium uppercase tracking-wide whitespace-nowrap ${colour}`}
      >
        {stageKey.replace("_", " ")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {FUNNEL_LABELS[r.funnel] ?? r.funnel} ·{" "}
          <span className="text-muted font-normal">{r.message_count} msgs</span>
        </p>
        <p className="text-xs text-muted truncate">{status}</p>
      </div>
      <p className="text-xs text-muted whitespace-nowrap">{timeLabel}</p>
    </div>
  );
}
