// scripts/xlsx-to-json.ts
import * as fs from "node:fs";
import * as path from "node:path";
import XLSX from "xlsx";

const SRC_XLSX = path.resolve(process.cwd(), "data/idp.xlsx");
const OUT_DIR  = path.resolve(process.cwd(), "src/data/generated");

if (!fs.existsSync(SRC_XLSX)) {
  throw new Error(`Excel not found at ${SRC_XLSX}. Put your workbook at data/idp.xlsx`);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const wb = XLSX.readFile(SRC_XLSX);

function readSheet<T = any>(name: string): T[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json<T>(ws, { defval: "" });
}

const roles             = readSheet("Roles");               // [{ role_id, role_description }]
const coreCompetencies  = readSheet("Core Competencies");   // [{ core_competency_id, core_competency_description }]
const assessments       = readSheet("Assessments");         // [{ assessment_level, assessment, assessment_description }]
const competencies      = readSheet("Competencies");        // [{ competency_id, competency_description, role_id, role_description, core_competency_id, core_competency_description }]

// Write raw dumps
fs.writeFileSync(path.join(OUT_DIR, "roles.json"), JSON.stringify(roles, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "core_competencies.json"), JSON.stringify(coreCompetencies, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "assessments.json"), JSON.stringify(assessments, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "competencies.json"), JSON.stringify(competencies, null, 2));

// Group competencies by role_id for fast UI loads
const byRole: Record<string, any[]> = {};
for (const c of competencies as any[]) {
  const rid = String(c.role_id);
  (byRole[rid] ||= []).push(c);
}
fs.writeFileSync(path.join(OUT_DIR, "competencies_by_role.json"), JSON.stringify(byRole, null, 2));

console.log("✅ Wrote JSON to src/data/generated");
console.log("   roles.json, core_competencies.json, assessments.json, competencies.json, competencies_by_role.json");
