import { Data } from "../data";

type Resp = { assessment_level?: number; notes?: string };
type Props = {
  comp: (typeof Data.competencies_by_role)[string][number];
  value: Resp;
  onChange: (next: Resp) => void;
};

export default function CompetencyRow({ comp, value, onChange }: Props) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-medium text-gray-900 mb-3">{comp.competency_description}</div>

      <div className="flex flex-col lg:flex-row gap-3">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full lg:w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
          value={value.assessment_level ?? ""}
          onChange={(e) => onChange({ ...value, assessment_level: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Select assessment…</option>
          {Data.assessments.map(a => (
            <option key={a.assessment_level} value={a.assessment_level}>
              {a.assessment_level} — {a.assessment}
            </option>
          ))}
        </select>

        <textarea
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none bg-white"
          rows={2}
          placeholder="Notes to support your rating…"
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    </div>
  );
}
