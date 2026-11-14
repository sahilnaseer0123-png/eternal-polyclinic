"use client";

import { useState, type ReactNode } from "react";

/**
 * Renders an expandable disclosure card on phones (< 640px) while keeping the full heading
 * and body visible with zero layout shift on tablet and desktop screens.
 */
export function MobileDetailsCard({
  id,
  heading,
  className = "reveal card rounded-3xl p-4 sm:p-6",
  children,
}: {
  id: string;
  heading: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left sm:hidden"
      >
        <div className="min-w-0">{heading}</div>
        <span
          aria-hidden="true"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-transform duration-200 ${
            open ? "rotate-45 bg-brand-tint text-accent" : "bg-sand text-muted"
          }`}
        >
          +
        </span>
      </button>

      <div className="hidden sm:block">{heading}</div>

      <div id={id} className={`${open ? "ep-day-swap block" : "hidden"} sm:block`}>
        {children}
      </div>
    </div>
  );
}
