import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Single aggregated endpoint for the Insta Bot dashboard.
// Pulls all conversations + config and computes stats in-memory.
// Fine until we're well past 10k conversations.

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Conversation {
  ig_sender_id: string;
  funnel: string;
  stage: string;
  path: string | null;
  message_history: { role: string; content: string }[] | null;
  last_user_message_at: string | null;
  last_assistant_message_at: string | null;
  outline_sent_at: string | null;
  awaiting_user: boolean;
  follow_up_count: number;
  next_follow_up_at: string | null;
  archived: boolean;
  is_high_value: boolean | null;
  high_value_flagged_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ConfigRow {
  key: string;
  value: string;
}

function within(d: string | null, ms: number): boolean {
  if (!d) return false;
  return Date.now() - new Date(d).getTime() <= ms;
}

const DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const sb = getSupabase();

    const [convRes, cfgRes] = await Promise.all([
      sb.from("instagram_conversations").select("*"),
      sb.from("bot_config").select("key,value"),
    ]);

    if (convRes.error) throw convRes.error;
    if (cfgRes.error) throw cfgRes.error;

    const convs = (convRes.data ?? []) as Conversation[];
    const cfg = Object.fromEntries(
      ((cfgRes.data ?? []) as ConfigRow[]).map((r) => [r.key, r.value]),
    );

    const capacity = parseInt(cfg.monthly_capacity ?? "10", 10);
    const current = parseInt(cfg.current_clients_this_month ?? "0", 10);
    const spotsLeft = Math.max(0, capacity - current);
    const closedWonTotal = parseInt(cfg.closed_won_total ?? "0", 10);

    // ── Lifecycle counts ─────────────────────────────────────────────
    const active = convs.filter((c) => !c.archived);
    const archived = convs.filter((c) => c.archived);
    const awaitingThem = active.filter((c) => c.awaiting_user);
    const awaitingUs = active.filter((c) => !c.awaiting_user);

    // ── Funnel windows ───────────────────────────────────────────────
    function funnelWindow(days: number) {
      const ms = days * DAY;
      const started = convs.filter((c) => within(c.created_at, ms));
      const outlineSent = convs.filter((c) => within(c.outline_sent_at, ms));
      const disqualified = started.filter((c) => c.stage === "disqualified");
      // "Engaged with close" = outline was sent and they replied after
      const engagedAfterOutline = outlineSent.filter((c) => {
        if (!c.outline_sent_at || !c.last_user_message_at) return false;
        return new Date(c.last_user_message_at) > new Date(c.outline_sent_at);
      });

      const byFunnel = {
        application: started.filter((c) => c.funnel === "application").length,
        lead_magnet: started.filter((c) => c.funnel === "lead_magnet").length,
        startup_course: started.filter((c) => c.funnel === "startup_course").length,
      };

      return {
        started: started.length,
        disqualified: disqualified.length,
        outline_sent: outlineSent.length,
        engaged_after_outline: engagedAfterOutline.length,
        outline_rate:
          started.length > 0 ? outlineSent.length / started.length : 0,
        engaged_rate:
          outlineSent.length > 0
            ? engagedAfterOutline.length / outlineSent.length
            : 0,
        by_funnel: byFunnel,
      };
    }

    const funnel7 = funnelWindow(7);
    const funnel30 = funnelWindow(30);

    // ── Follow-up state ──────────────────────────────────────────────
    // follow_up_count = how many follow-ups have already been sent to this
    // conversation (resets to 0 when user replies). So:
    //   count=0 + awaiting_user -> waiting for first follow-up to fire
    //   count=1 -> already sent the 24h check-in
    //   count=2 -> already sent the 72h case study
    //   count=3 -> already sent the 7d capacity close (next sweep archives)
    const followUpsByStep = {
      pending: awaitingThem.filter((c) => c.follow_up_count === 0).length,
      sent_24h: convs.filter((c) => c.follow_up_count >= 1).length,
      sent_72h: convs.filter((c) => c.follow_up_count >= 2).length,
      sent_7d: convs.filter((c) => c.follow_up_count >= 3).length,
    };

    // Due in next 24h
    const dueIn24h = awaitingThem.filter(
      (c) =>
        c.next_follow_up_at &&
        new Date(c.next_follow_up_at).getTime() - Date.now() <= DAY,
    ).length;

    // Outlines sent in last 7 days
    const outlinesSent7d = convs.filter((c) => within(c.outline_sent_at, 7 * DAY)).length;

    // ── High-value leads ─────────────────────────────────────────────
    const highValueAll = convs.filter((c) => c.is_high_value);
    const highValueActive = highValueAll
      .filter((c) => !c.archived)
      .sort((a, b) => {
        const at = a.high_value_flagged_at ?? a.updated_at;
        const bt = b.high_value_flagged_at ?? b.updated_at;
        return new Date(bt).getTime() - new Date(at).getTime();
      })
      .slice(0, 10)
      .map((c) => {
        const lastUserMsg = (c.message_history ?? [])
          .slice()
          .reverse()
          .find((m) => m.role === "user")?.content ?? "";
        return {
          ig_sender_id: c.ig_sender_id,
          funnel: c.funnel,
          stage: c.stage,
          flagged_at: c.high_value_flagged_at,
          last_user_message: lastUserMsg.slice(0, 200),
          message_count: c.message_history?.length ?? 0,
          awaiting_user: c.awaiting_user,
          updated_at: c.updated_at,
        };
      });

    // ── Recent activity (last 15) ────────────────────────────────────
    const recent = [...convs]
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      .slice(0, 15)
      .map((c) => ({
        ig_sender_id: c.ig_sender_id,
        funnel: c.funnel,
        stage: c.stage,
        archived: c.archived,
        awaiting_user: c.awaiting_user,
        follow_up_count: c.follow_up_count,
        outline_sent_at: c.outline_sent_at,
        updated_at: c.updated_at,
        message_count: c.message_history?.length ?? 0,
      }));

    return NextResponse.json({
      capacity: { capacity, current, spots_left: spotsLeft },
      sales: {
        closed_won_total: closedWonTotal,
      },
      totals: {
        all: convs.length,
        active: active.length,
        archived: archived.length,
        awaiting_them: awaitingThem.length,
        awaiting_us: awaitingUs.length,
        high_value_all: highValueAll.length,
        high_value_active: highValueActive.length,
      },
      kpi: {
        outlines_sent_7d: outlinesSent7d,
        follow_ups_due_24h: dueIn24h,
      },
      high_value_leads: highValueActive,
      funnel_7d: funnel7,
      funnel_30d: funnel30,
      follow_ups: followUpsByStep,
      recent,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
