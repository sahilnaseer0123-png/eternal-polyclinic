// Browser-side calls to the staff API (/api/staff/*, /api/admin/auth). Same-origin, cookie-based.

export type StaffRole = "owner" | "reception" | "lab";

export type StaffSession = {
  id: number;
  username: string;
  displayName: string;
  role: StaffRole;
};

export type WhatsAppSetup = {
  channel: "meta_cloud_api" | "twilio" | "webhook" | "unconfigured";
  appointmentTemplate: boolean;
  labReportTemplate: boolean;
  deliveryWebhook: boolean;
};

export type AuthInfo = {
  configured: boolean;
  authenticated: boolean;
  database: boolean;
  staffMode: "unavailable" | "pin_only" | "setup" | "accounts" | "offline";
  staff: StaffSession | null;
  whatsapp?: WhatsAppSetup;
};

export const ROLE_LABEL: Record<StaffRole, string> = { owner: "Owner", reception: "Reception", lab: "Lab" };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  headers.set("Accept", "application/json");
  let res: Response;
  try {
    res = await fetch(path, { ...init, body, headers, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiError("No connection. Check the internet and try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("ep:staff_signed_out"));
    }
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export async function fetchAuthInfo(): Promise<AuthInfo> {
  try {
    const res = await fetch("/api/admin/auth", { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("offline");
    const data = (await res.json()) as Partial<AuthInfo>;
    return {
      configured: Boolean(data.configured),
      authenticated: Boolean(data.authenticated),
      database: Boolean(data.database),
      staffMode: (data.staffMode as AuthInfo["staffMode"]) ?? "pin_only",
      staff: data.staff ?? null,
      whatsapp: data.whatsapp,
    };
  } catch {
    // `next dev` (no Functions) or offline: the reception desk falls back to its local mode.
    return { configured: false, authenticated: false, database: false, staffMode: "offline", staff: null };
  }
}

/** Opens a PDF the staff member may see, in a new tab (blob URL, nothing cached). */
export async function openStaffPdf(reportId: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const res = await fetch(`/api/staff/lab-reports/${encodeURIComponent(reportId)}/file`, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || "Could not open the PDF.");
    }
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
}

export function qs(params: Record<string, string | number | null | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
