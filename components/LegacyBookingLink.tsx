"use client";

// Old one-page links like /#book-akash now live at /book?doctor=akash. Forward them.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LegacyBookingLink() {
  const router = useRouter();
  useEffect(() => {
    const match = window.location.hash.match(/^#book(?:-([\w-]+))?$/);
    if (match) router.replace(match[1] ? `/book?doctor=${encodeURIComponent(match[1])}` : "/book");
  }, [router]);
  return null;
}
