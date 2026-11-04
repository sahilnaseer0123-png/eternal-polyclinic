// Cloudflare D1 stand-in for tests: Node's built-in SQLite behind the same prepare/bind/first/run/all/batch API.
// Same SQL engine family as D1 (SQLite), so schema, constraints, ON CONFLICT and RETURNING behave the same.

import { createRequire } from "node:module";
import type { SqlDatabase, SqlStatement } from "@/functions/_lib/db";

// node:sqlite ships with Node 22+, but the project's @types/node (v20) doesn't describe it yet.
type SqliteStatement = {
  get(...v: unknown[]): unknown;
  all(...v: unknown[]): unknown[];
  run(...v: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
};
type DatabaseSync = { exec(sql: string): void; prepare(sql: string): SqliteStatement };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseSync };

export function createTestD1(): SqlDatabase & { raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON");
  const prepare = (sql: string, values: unknown[] = []): SqlStatement => {
    const conv = () => values.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v)) as (string | number | null)[];
    return {
      bind: (...v: unknown[]) => {
        if (v.some((x) => x === undefined)) throw new Error(`D1_TYPE_ERROR: undefined bound in: ${sql.slice(0, 80)}`);
        return prepare(sql, v);
      },
      async first<T>() {
        return ((raw.prepare(sql).get(...conv()) as T | undefined) ?? null) as T | null;
      },
      async run() {
        const r = raw.prepare(sql).run(...conv());
        return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...conv()) as T[] };
      },
    };
  };
  return {
    raw,
    prepare: (sql: string) => prepare(sql),
    async batch(statements: SqlStatement[]) {
      const out = [];
      for (const s of statements) out.push(await s.run());
      return out;
    },
  };
}

/** A small but valid PDF (header, one empty page, trailer, %%EOF), padded past the 1 KB minimum. */
export function tinyPdf(label = "Test report"): ArrayBuffer {
  const body = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj
% ${label}
% ${"padding ".repeat(140)}
trailer << /Root 1 0 R >>
%%EOF
`;
  return new TextEncoder().encode(body).buffer as ArrayBuffer;
}

type Call = { url: string; method: string; body: unknown; headers: Record<string, string> };

/** Replaces global fetch with a fake WhatsApp provider. Returns the recorded calls and a restore function. */
export function fakeWhatsApp(opts: { fail?: boolean } = {}) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let body: unknown = init?.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // form-encoded
      }
    } else if (body instanceof FormData) {
      body = Object.fromEntries([...body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : `[file ${(v as File).name} ${(v as File).size}b]`]));
    }
    calls.push({ url, method: init?.method ?? "GET", body, headers: Object.fromEntries(new Headers(init?.headers).entries()) });
    if (opts.fail) {
      return new Response(JSON.stringify({ error: { message: "Recipient phone number not in allowed list", code: 131030 } }), { status: 400 });
    }
    if (url.endsWith("/media")) return Response.json({ id: `media-${++n}` });
    return Response.json({ messages: [{ id: `wamid.TEST${++n}` }] });
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}
