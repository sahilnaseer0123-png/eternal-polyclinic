// Remounts when the first part of the address changes (/ -> /doctors -> /book), so the page animates.
import { PageTransition } from "@/components/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
