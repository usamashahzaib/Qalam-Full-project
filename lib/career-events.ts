export type CareerEvent =
  | "career.application_created"
  | "career.application_stage_changed"
  | "career.evidence_created"
  | "career.evidence_deleted"
  | "career.consent_updated"
  | "career.organization_submitted"

export const trackCareerEvent = (type: CareerEvent, payload: Record<string, unknown> = {}) =>
  fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, payload, createdAt: new Date().toISOString() }) }).catch(() => undefined)
