// PUT /api/staff/lab-reports/:id/file   upload or replace the PDF (owner, lab). Body: the raw PDF bytes,
//     header X-File-Name. Checks: real PDF (starts with %PDF-, ends with %%EOF), not encrypted-looking junk,
//     1 KB – 10 MB. Stored privately in KV (never a public URL). Status becomes Processing until someone
//     presses Mark Ready, so the file can be checked before the patient gets it.
// GET /api/staff/lab-reports/:id/file   view the PDF (owner, reception, lab), never cached.

import { jsonResponse, toHex, type CfPagesContext } from "../../../../_lib/clinic-store";
import { audit } from "../../../../_lib/db";
import { bad } from "../../../../_lib/http";
import { pdfKey } from "../../../../_lib/notify";
import { loadReport } from "../[id]";

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MIN_PDF_BYTES = 1024;

/** Returns an error message, or null when the bytes are a plausible PDF. */
export function checkPdf(bytes: Uint8Array): string | null {
  if (bytes.length < MIN_PDF_BYTES) return "That file is too small to be a lab report PDF.";
  if (bytes.length > MAX_PDF_BYTES) return "PDF is larger than 10 MB. Scan at a lower resolution and try again.";
  const head = new TextDecoder().decode(bytes.subarray(0, 5));
  if (head !== "%PDF-") return "That isn't a PDF file. Export or scan the report as PDF.";
  const tail = new TextDecoder().decode(bytes.subarray(Math.max(0, bytes.length - 1024)));
  if (!tail.includes("%%EOF")) return "The PDF looks incomplete (cut off while copying). Save it again and re-upload.";
  return null;
}

export function safeFileName(raw: string | null, fallback: string): string {
  let decoded = (raw ?? "").trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep as sent
  }
  let name = decoded.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!name) name = fallback;
  if (!/\.pdf$/i.test(name)) name = `${name}.pdf`;
  return name.slice(-100);
}

export async function onRequestPut(context: CfPagesContext): Promise<Response> {
  const res = await loadReport(context, ["owner", "lab"]);
  if (res instanceof Response) return res;
  const { db, staff, row, id } = res;
  const kv = context.env.EP_KV;
  if (!kv) return bad("File storage (EP_KV) is not connected.", 503);

  // Replacing a PDF (even one already sent) puts the report back to Processing; marking it Ready again sends the corrected file.
  const type = (context.request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (type && type !== "application/pdf" && type !== "application/octet-stream") return bad("Upload a PDF file.", 415);
  const declared = Number(context.request.headers.get("Content-Length"));
  if (declared > MAX_PDF_BYTES) return bad("PDF is larger than 10 MB.", 413);

  const bytes = new Uint8Array(await context.request.arrayBuffer());
  const problem = checkPdf(bytes);
  if (problem) return bad(problem, 422);

  const sha = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
  const fileName = safeFileName(
    context.request.headers.get("X-File-Name"),
    `Lab-report-${String(row.patient_code)}-${String(row.sample_date)}.pdf`,
  );
  const key = pdfKey(id);
  try {
    await kv.put(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, {
      metadata: { reportId: id, sha256: sha, uploadedBy: staff.id },
    });
  } catch (err) {
    return bad(`Upload failed while saving: ${err instanceof Error ? err.message : "storage error"}. Please try again.`, 502);
  }

  const now = Date.now();
  await db
    .prepare(
      `UPDATE lab_reports SET file_key = ?1, file_name = ?2, file_size = ?3, file_sha256 = ?4, uploaded_at = ?5, uploaded_by = ?6,
       status = 'processing', ready_at = NULL, auto_sent_at = NULL, updated_at = ?5 WHERE id = ?7`,
    )
    .bind(key, fileName, bytes.length, sha, now, staff.id, id)
    .run();
  // The previous file (if any) is no longer referenced: remove it from storage.
  if (row.file_key && row.file_key !== key) await kv.delete(String(row.file_key)).catch(() => undefined);
  await audit(db, staff.id, row.file_key ? "lab.replace_pdf" : "lab.upload_pdf", `report:${id}`, `${fileName} (${Math.round(bytes.length / 1024)} KB)`);
  return jsonResponse({ ok: true, fileName, fileSize: bytes.length, status: "processing" });
}

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const res = await loadReport(context, ["owner", "reception", "lab"]);
  if (res instanceof Response) return res;
  const { row, db, staff, id } = res;
  if (!row.file_key || !context.env.EP_KV) return bad("No PDF uploaded yet.", 404);
  const data = await context.env.EP_KV.get(String(row.file_key), "arrayBuffer");
  if (!data) return bad("The PDF is missing from storage. Upload it again.", 404);
  await audit(db, staff.id, "lab.view_pdf", `report:${id}`);
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${String(row.file_name ?? "report.pdf").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
