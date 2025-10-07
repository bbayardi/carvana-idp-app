// central import for generated data
import roles from "./generated/roles.json";
import core_competencies from "./generated/core_competencies.json";
import assessments from "./generated/assessments.json";
import competencies_by_role from "./generated/competencies_by_role.json";

export const Data = {
  roles: roles as Array<{ role_id: number; role_description: string }>,
  core_competencies: core_competencies as Array<{ core_competency_id: number; core_competency_description: string }>,
  assessments: assessments as Array<{ assessment_level: number; assessment: string; assessment_description: string }>,
  competencies_by_role: competencies_by_role as Record<string, Array<{
    competency_id: number;
    competency_description: string;
    role_id: number;
    role_description: string;
    core_competency_id: number;
    core_competency_description: string;
  }>>,
};
