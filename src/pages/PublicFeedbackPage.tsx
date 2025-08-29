// src/pages/PublicFeedbackPage.tsx
import React, { useState } from "react";
import {API_BASE} from "../lib/api";
// Enum المطلوب
export type FeedbackCategory = 0 | 1 | 2 | 3 | 4;
const CategoryLabels: Record<FeedbackCategory, string> = {
  0: "Access",
  1: "Quality",
  2: "Safety",
  3: "Responsiveness",
  4: "Others",
};

type Props = {
  projectId?: string;
};

// const API_BASE = "https://192.168.1.169:7012";

export default function PublicFeedbackPage({ projectId }: Props) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>(0);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);

    try {
      const payload = {
        content,
        category,
        priority: null,
        dateReceived: new Date().toISOString(),
        projectId: projectId ?? null,
      };

      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      const res = await fetch(`${API_BASE}/api/app/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status}`);
      }

      setMsg({ ok: "Feedback submitted successfully." });
      setContent("");
      setCategory(0);
    } catch (e: any) {
      setMsg({ err: e?.message || "Failed to submit feedback" });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        {/* النموذج (فقط feedback + category) */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Your feedback
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your feedback here..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={category}
              onChange={(e) =>
                setCategory(Number(e.target.value) as FeedbackCategory)
              }
            >
              {Object.entries(CategoryLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 hover:bg-purple-700"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </div>

          {msg?.ok && <div className="text-green-700 text-sm">{msg.ok}</div>}
          {msg?.err && <div className="text-red-600 text-sm">{msg.err}</div>}
        </form>
      </div>
    </div>
  );
}
