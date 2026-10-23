// Remounts between /doctors and each doctor's page (/doctors/akash), which the root template doesn't see.
import { PageTransition } from "@/components/PageTransition";

export default function DoctorsTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
