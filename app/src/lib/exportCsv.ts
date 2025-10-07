import { Data } from "../data";

export function buildCsvRows(args: {
  userEmail: string;
  roleId: number;
  responses: Record<number, { assessment_level?: number; notes?: string }>;
}) {
  const { roleId, responses } = args;
  const rows: string[][] = [];
  const comps = Data.competencies_by_role[String(roleId)] ?? [];
  const aIdx: Record<number, (typeof Data.assessments)[number]> = {};
  for (const a of Data.assessments) aIdx[a.assessment_level] = a;

  for (const c of comps) {
    const r = responses[c.competency_id] || {};
    const a = r.assessment_level ? aIdx[r.assessment_level] : undefined;
    const assessment = a ? `${a.assessment_level} - ${a.assessment}` : "";
    rows.push([
      c.role_description || "",
      c.core_competency_description || "",
      c.competency_description || "",
      assessment,
      (r.notes || "").replace(/\r?\n/g, " ").trim(),
    ]);
  }
  return rows;
}

export function toCsv(rows: string[][]) {
  const header = [
    "Role",
    "Core Competency",
    "Competency",
    "Assessment",
    "Notes"
  ];
  return [header, ...rows]
    .map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g,'""')}"`).join(","))
    .join("\n");
}
