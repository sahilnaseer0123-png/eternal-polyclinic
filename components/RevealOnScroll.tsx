"use client";

// Fades in each `.reveal` section once, the first time it comes into view (CSS in globals.css).
// Runs again after every navigation, because new pages bring new sections.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Reveal any elements already in or near the viewport immediately
    const checkVisible = () => {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 50) {
          el.classList.add("is-visible");
        }
      });
    };

    checkVisible();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px 50px 0px", threshold: 0.01 },
    );
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
