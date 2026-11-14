"use client";

// One-shot motion runtime: staggered scroll reveals, hero count-up stats,
// interactive desktop hero dot-grid canvas, and scroll-state guard for floating UI.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REDUCED = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function setupScrollReveals(timers: number[]) {
  document.querySelectorAll<HTMLElement>(".reveal-group").forEach((group) => {
    group.querySelectorAll<HTMLElement>(".reveal").forEach((el, idx) => {
      if (!el.classList.contains("is-visible")) {
        el.style.setProperty("--mo-i", String(Math.min(idx, 5)));
      }
    });
  });

  const markVisible = (el: HTMLElement) => {
    el.classList.add("is-visible");
    const timer = window.setTimeout(() => {
      el.style.removeProperty("--mo-i");
    }, 1100);
    timers.push(timer);
  };

  if (REDUCED()) {
    document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach(markVisible);
    return () => {};
  }

  const aboveFold: HTMLElement[] = [];
  const belowFold: HTMLElement[] = [];

  document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)").forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Reveal anything already above or within the current viewport (handles anchor jumps & restores).
    if (rect.top < window.innerHeight - 40) {
      aboveFold.push(el);
    } else {
      belowFold.push(el);
    }
  });

  const raf = aboveFold.length
    ? requestAnimationFrame(() => aboveFold.forEach(markVisible))
    : 0;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          markVisible(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -24px 0px", threshold: 0.02 },
  );

  belowFold.forEach((el) => observer.observe(el));

  let scrollRaf = 0;
  const sweepAboveViewport = () => {
    scrollRaf = 0;
    const limit = window.innerHeight - 24;
    for (const el of belowFold) {
      if (el.classList.contains("is-visible")) continue;
      if (el.getBoundingClientRect().top < limit) {
        markVisible(el);
        observer.unobserve(el);
      }
    }
  };
  const onViewportMove = () => {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(sweepAboveViewport);
  };
  window.addEventListener("scroll", onViewportMove, { passive: true });
  window.addEventListener("hashchange", onViewportMove);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    window.removeEventListener("scroll", onViewportMove);
    window.removeEventListener("hashchange", onViewportMove);
    observer.disconnect();
  };
}

function runCountUps() {
  if (REDUCED()) return () => {};
  const frames: number[] = [];

  document.querySelectorAll<HTMLElement>("[data-count]:not([data-counted])").forEach((el) => {
    const end = Number(el.dataset.count);
    el.dataset.counted = "1";
    if (!(end > 0) || !el.firstChild) return;

    const text = el.firstChild;
    const start = performance.now() + 140;
    const duration = 900;

    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      text.nodeValue = Math.round(end * eased).toLocaleString("en-IN");
      if (t < 1) {
        frames.push(requestAnimationFrame(tick));
      }
    };

    text.nodeValue = "0";
    frames.push(requestAnimationFrame(tick));
  });

  return () => {
    frames.forEach((id) => cancelAnimationFrame(id));
  };
}

function setupHeroDots() {
  if (REDUCED() || !FINE_POINTER()) return () => {};
  const canvas = document.querySelector<HTMLCanvasElement>(".ep-hero-dots");
  const host = canvas?.parentElement;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !host || !ctx) return () => {};

  const GAP = 24;
  const REACH = 160;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let raf = 0;
  let dirty: [number, number, number, number] | null = null;
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };

  const resize = () => {
    w = host.clientWidth;
    h = host.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = null;
  };

  const draw = () => {
    raf = 0;
    if (dirty) ctx.clearRect(dirty[0], dirty[1], dirty[2], dirty[3]);
    dirty = null;
    if (!pointer.on) return;

    pointer.x += (pointer.tx - pointer.x) * 0.22;
    pointer.y += (pointer.ty - pointer.y) * 0.22;

    const x0 = Math.max(0, Math.floor((pointer.x - REACH) / GAP));
    const x1 = Math.min(Math.ceil(w / GAP), Math.ceil((pointer.x + REACH) / GAP));
    const y0 = Math.max(0, Math.floor((pointer.y - REACH) / GAP));
    const y1 = Math.min(Math.ceil(h / GAP), Math.ceil((pointer.y + REACH) / GAP));

    ctx.fillStyle = "#1D4ED8";
    for (let gy = y0; gy < y1; gy += 1) {
      for (let gx = x0; gx < x1; gx += 1) {
        const x = gx * GAP + GAP / 2;
        const y = gy * GAP + GAP / 2;
        const near = 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH;
        if (near <= 0) continue;
        const radius = 1.1 + near * near * 2.1;
        ctx.globalAlpha = near * 0.38;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    dirty = [x0 * GAP - 6, y0 * GAP - 6, (x1 - x0) * GAP + 12, (y1 - y0) * GAP + 12];
    if (Math.abs(pointer.tx - pointer.x) > 0.5 || Math.abs(pointer.ty - pointer.y) > 0.5) {
      raf = requestAnimationFrame(draw);
    }
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.tx = e.clientX - r.left;
    pointer.ty = e.clientY - r.top;
    if (!pointer.on) {
      pointer.on = true;
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
    }
    kick();
  };

  const onLeave = () => {
    pointer.on = false;
    kick();
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerleave", onLeave);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerleave", onLeave);
    ctx.clearRect(0, 0, w, h);
  };
}

function setupScrollState() {
  let scrollTimer = 0;

  const onScroll = () => {
    document.body.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      document.body.classList.remove("is-scrolling");
    }, 180);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(scrollTimer);
    document.body.classList.remove("is-scrolling");
  };
}

export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const timers: number[] = [];
    const stopReveals = setupScrollReveals(timers);
    const stopCountUps = runCountUps();
    const stopDots = setupHeroDots();
    const stopScroll = setupScrollState();

    return () => {
      stopReveals();
      stopCountUps();
      stopDots();
      stopScroll();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [pathname]);

  return null;
}
