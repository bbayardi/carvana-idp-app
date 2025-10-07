import { Data } from "../data";
import CompetencyRow from "./CompetencyRow";

type Resp = { assessment_level?: number; notes?: string };
type Props = {
  coreCompetencyId: number;
  coreCompetencyDescription: string;
  competencies: (typeof Data.competencies_by_role)[string];
  responses: Record<number, Resp>;
  onChange: (compId: number, next: Resp) => void;
};

export default function CoreCompetencySection({
  coreCompetencyDescription,
  competencies,
  responses,
  onChange,
}: Props) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {coreCompetencyDescription}
        </h2>
      </div>
      <div className="grid gap-3">
        {competencies.map(c => (
          <CompetencyRow
            key={c.competency_id}
            comp={c}
            value={responses[c.competency_id] || {}}
            onChange={(next) => onChange(c.competency_id, next)}
          />
        ))}
      </div>
    </div>
  );
}
