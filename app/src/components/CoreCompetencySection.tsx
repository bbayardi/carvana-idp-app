import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate completion count for this section
  const completedCount = competencies.filter(c => {
    const resp = responses[c.competency_id];
    return resp?.assessment_level && resp?.notes?.trim();
  }).length;
  const totalCount = competencies.length;
  const isFullyComplete = completedCount === totalCount && totalCount > 0;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#003B5C] to-[#002838] border border-[#00A8E1]/30 rounded-lg hover:border-[#00A8E1]/60 transition-all mb-3 shadow-md"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            {coreCompetencyDescription}
          </h2>
          <span className={`text-xs font-medium transition-colors ${
            isFullyComplete ? 'text-green-400' : 'text-[#00A8E1]'
          }`}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#00A8E1] transition-transform duration-200 ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
      </button>

      {isExpanded && (
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
      )}
    </div>
  );
}
