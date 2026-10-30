"use client";

// Share this page: the phone's share sheet (WhatsApp etc.) where available, otherwise copy the link.

import { useState } from "react";

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The patient closed the share sheet; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={
        className ??
        "card card-hover inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold text-ink hover:text-brand transition-colors"
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : "Share profile"}</span>
    </button>
  );
}
