// GET /api/staff/stats   patient statistics from the database (owner, reception)

import { jsonResponse, type CfPagesContext } from "../../_lib/clinic-store";
import { staffGate } from "../../_lib/http";
import { patientStatistics } from "../../_lib/stats";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception"]);
  if (gate instanceof Response) return gate;
  return jsonResponse({ ok: true, ...(await patientStatistics(gate.db)) });
}
