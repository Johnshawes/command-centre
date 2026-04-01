"use client";

import { useState, useEffect, useCallback } from "react";

interface ReelReview {
  id: number;
  content: {
    content?: string;
    text?: string;
    generated_at?: string;
  };
  created_at: string;
}

export default function AnalyticsPage() {
  const [reviews, setReviews] = useState<ReelReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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

  function parseReviewContent(review: ReelReview): string {
    const raw = review.content;
    // The reel review content comes as either .content or .text
    return raw?.content || raw?.text || JSON.stringify(raw);
  }

  // Parse sections from the reel review markdown
  function parseSections(text: string) {
    const sections: { title: string; icon: string; body: string }[] = [];

    const patterns = [
      { icon: "🏆", title: "Winner", regex: /🏆\s*WINNER\s*\n([\s\S]*?)(?=\n📉|\n💡|\n📊|---|\n\n\n|$)/i },
      { icon: "📉", title: "Underperformer", regex: /📉\s*UNDERPERFORMER\s*\n([\s\S]*?)(?=\n💡|\n📊|---|\n\n\n|$)/i },
      { icon: "💡", title: "Change Tomorrow", regex: /💡\s*ONE THING TO CHANGE TOMORROW\s*\n([\s\S]*?)(?=\n📊|---|\n\n\n|$)/i },
      { icon: "📊", title: "Numbers", regex: /📊\s*NUMBERS AT A GLANCE\s*\n([\s\S]*?)(?=---|$)/i },
    ];

    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        sections.push({ title: p.title, icon: p.icon, body: match[1].trim() });
      }
    }

    return sections;
  }

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <h2 className="text-xl font-bold mb-1">Analytics</h2>
      <p className="text-muted text-sm mb-6">
        Your reel performance — updated daily at 8pm.
      </p>

      {loading ? (
        <div className="text-center py-16 text-muted">
          <p>Loading...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">No reel reviews yet. The research bot runs a performance review at 8pm daily.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => {
            const text = parseReviewContent(review);
            const sections = parseSections(text);

            return (
              <div key={review.id} className="space-y-3">
                <div className="px-1">
                  <span className="text-xs text-muted">{formatDate(review.created_at)}</span>
                </div>

                {sections.length > 0 ? (
                  sections.map((section, i) => (
                    <div
                      key={i}
                      className="bg-surface rounded-xl border border-border overflow-hidden"
                    >
                      <div className="px-4 py-3.5 border-b border-border">
                        <span className="font-semibold text-sm">
                          {section.icon} {section.title}
                        </span>
                      </div>
                      <div className="px-4 py-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {section.body}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface rounded-xl border border-border p-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
