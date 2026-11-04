// Clinic records database: Cloudflare D1 (SQLite), bound as EP_SQL.
// Deliberately NOT named EP_DB: clinic-store.ts switches the whole OPD register to any binding called EP_DB,
// which would hide every appointment already saved in KV.
//
// Holds: staff accounts, patients, appointments (a mirror of the KV OPD register, linked to patients),
// lab reports (the PDFs themselves live in KV under lab-pdf:*), secure report links, WhatsApp notifications
// with their delivery history, and an audit log. Tables are created on first use; every statement is idempotent.

export interface SqlResultMeta {
  changes?: number;
  last_row_id?: number;
}

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta?: SqlResultMeta }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface SqlDatabase {
  prepare(query: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<unknown[]>;
}

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','reception','lab')),
    pass_salt TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    pass_iter INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    session_version INTEGER NOT NULL DEFAULT 1,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    area TEXT,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    created_date TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (phone, name_key)
  )`,
  `CREATE INDEX IF NOT EXISTS patients_created_date ON patients (created_date)`,
  `CREATE TABLE IF NOT EXISTS appointments (
    token TEXT PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS appointments_date ON appointments (date)`,
  `CREATE INDEX IF NOT EXISTS appointments_patient ON appointments (patient_id)`,
  `CREATE TABLE IF NOT EXISTS lab_reports (
    id TEXT PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    test_name TEXT NOT NULL,
    sample_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','processing','ready')),
    delivery_status TEXT NOT NULL DEFAULT 'not_sent'
      CHECK (delivery_status IN ('not_sent','queued','sent','delivered','read','failed')),
    file_key TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_sha256 TEXT,
    uploaded_at INTEGER,
    uploaded_by INTEGER,
    ready_at INTEGER,
    ready_by INTEGER,
    auto_sent_at INTEGER,
    last_sent_at INTEGER,
    delivered_at INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL,
    created_date TEXT NOT NULL,
    created_by INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS lab_reports_patient ON lab_reports (patient_id)`,
  `CREATE INDEX IF NOT EXISTS lab_reports_created_date ON lab_reports (created_date)`,
  `CREATE TABLE IF NOT EXISTS report_links (
    token_hash TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES lab_reports(id),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    open_count INTEGER NOT NULL DEFAULT 0,
    last_opened_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS report_links_report ON report_links (report_id)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('appointment_confirmation','lab_report','owner_summary')),
    ref_id TEXT NOT NULL,
    patient_id INTEGER,
    to_phone TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued','sent','delivered','read','failed')),
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt INTEGER NOT NULL DEFAULT 1,
    trigger TEXT NOT NULL DEFAULT 'auto',
    provider_message_id TEXT,
    error TEXT,
    created_by INTEGER,
    created_at INTEGER NOT NULL,
    created_date TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    sent_at INTEGER,
    delivered_at INTEGER,
    read_at INTEGER,
    failed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_provider_id ON notifications (provider_message_id)`,
  `CREATE INDEX IF NOT EXISTS notifications_ref ON notifications (kind, ref_id)`,
  `CREATE INDEX IF NOT EXISTS notifications_created_date ON notifications (created_date)`,
  `CREATE TABLE IF NOT EXISTS notification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL REFERENCES notifications(id),
    status TEXT NOT NULL,
    detail TEXT,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS notification_events_nid ON notification_events (notification_id)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER,
    action TEXT NOT NULL,
    target TEXT,
    detail TEXT,
    at INTEGER NOT NULL
  )`,
];

const ready = new WeakSet<SqlDatabase>();

/** Creates the tables once per Worker isolate (cheap no-ops after the first run). */
export async function ensureSchema(db: SqlDatabase): Promise<void> {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export function clinicDateKey(ms: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function audit(
  db: SqlDatabase,
  staffId: number | null,
  action: string,
  target?: string,
  detail?: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO audit_log (staff_id, action, target, detail, at) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(staffId, action, target ?? null, detail ?? null, Date.now())
    .run();
}

export function changes(res: { meta?: SqlResultMeta } | undefined): number {
  return res?.meta?.changes ?? 0;
}
