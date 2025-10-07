import { useEffect, useMemo, useState } from "react";
import { Data } from "./data";
import HeaderBar from "./components/HeaderBar";
import { loadResponses, saveResponses } from "./lib/store";
import CoreCompetencySection from "./components/CoreCompetencySection";

export default function App() {
  const [roleId, setRoleId] = useState<number>(() => {
    const v = localStorage.getItem("idp.role_id");
    return v ? Number(v) : (Data.roles[0]?.role_id ?? 0);
  });
  const [email] = useState(() => localStorage.getItem("idp.user_email") || "");
  const [responses, setResponses] = useState<Record<number, { assessment_level?: number; notes?: string }>>(
    () => loadResponses(email, roleId)
  );

  const comps = useMemo(() => Data.competencies_by_role[String(roleId)] ?? [], [roleId]);

  const groupedByCore = useMemo(() => {
    const groups: Record<number, { description: string; competencies: typeof comps }> = {};
    for (const c of comps) {
      if (!groups[c.core_competency_id]) {
        groups[c.core_competency_id] = {
          description: c.core_competency_description,
          competencies: []
        };
      }
      groups[c.core_competency_id].competencies.push(c);
    }
    return groups;
  }, [comps]);

  useEffect(() => {
    localStorage.setItem("idp.role_id", String(roleId));
    // reload store when role changes
    setResponses(loadResponses(localStorage.getItem("idp.user_email") || "", roleId));
  }, [roleId]);

  useEffect(() => {
    const em = localStorage.getItem("idp.user_email") || "";
    saveResponses(em, roleId, responses);
  }, [responses, roleId]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm z-10">
        <HeaderBar roleId={roleId} responses={responses} />
        <div className="max-w-4xl mx-auto px-4 pb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="role" className="text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white min-w-[200px]"
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
            >
              {Data.roles.map(r => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_description}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:ml-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-semibold text-blue-700">
                {Object.values(responses).filter(r => r.assessment_level).length}
              </span>
              <span className="text-sm text-blue-600">of</span>
              <span className="text-sm font-semibold text-blue-700">{comps.length}</span>
              <span className="text-sm text-blue-600">complete</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {Object.entries(groupedByCore).map(([coreId, group]) => (
          <CoreCompetencySection
            key={coreId}
            coreCompetencyId={Number(coreId)}
            coreCompetencyDescription={group.description}
            competencies={group.competencies}
            responses={responses}
            onChange={(compId, next) => setResponses(prev => ({ ...prev, [compId]: next }))}
          />
        ))}
      </main>
    </div>
  );
}
