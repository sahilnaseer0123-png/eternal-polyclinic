// Page-to-page motion: the old page fades out quickly and the new one rises in (CSS in globals.css,
// ".page-exit" / ".page-enter"). Used by app/template.tsx and app/doctors/template.tsx, which remount
// on navigation; a layout never would. Only client navigations animate: the first page load doesn't,
// so it can't slow the page's first paint. Off under prefers-reduced-motion. Header, tab bar and
// WhatsApp button are named in their components so they stay still while the page changes.

import { ViewTransition } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
