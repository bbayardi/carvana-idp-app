import { supabase } from './supabase';

export type Resp = { assessment_level?: number; notes?: string };

// Keep localStorage functions for backwards compatibility and fallback
const key = (email: string, roleId: number) => `idp.responses.${email}.${roleId}`;

function loadLocalResponses(email: string, roleId: number): Record<number, Resp> {
  try {
    const raw = localStorage.getItem(key(email, roleId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalResponses(email: string, roleId: number, data: Record<number, Resp>) {
  localStorage.setItem(key(email, roleId), JSON.stringify(data));
}

// Supabase functions
export async function loadResponses(userId: string, email: string, roleId: number): Promise<Record<number, Resp>> {
  try {
    const { data, error } = await supabase
      .from('user_responses')
      .select('competency_id, assessment_level, notes')
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) throw error;

    // Convert array to Record format
    const responses: Record<number, Resp> = {};
    data?.forEach(item => {
      responses[item.competency_id] = {
        assessment_level: item.assessment_level,
        notes: item.notes,
      };
    });

    return responses;
  } catch (error) {
    console.error('Error loading responses from Supabase:', error);
    // Fallback to localStorage
    return loadLocalResponses(email, roleId);
  }
}

export async function saveResponse(
  userId: string,
  email: string,
  roleId: number,
  competencyId: number,
  response: Resp
) {
  try {
    const { error } = await supabase
      .from('user_responses')
      .upsert({
        user_id: userId,
        email,
        role_id: roleId,
        competency_id: competencyId,
        assessment_level: response.assessment_level,
        notes: response.notes,
      }, {
        onConflict: 'user_id,role_id,competency_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving response to Supabase:', error);
    // Fallback to localStorage
    const current = loadLocalResponses(email, roleId);
    current[competencyId] = response;
    saveLocalResponses(email, roleId, current);
  }
}

// Migration utility: Move localStorage data to Supabase
export async function migrateLocalDataToSupabase(userId: string, email: string) {
  try {
    const migrated: string[] = [];

    // Find all localStorage keys for this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`idp.responses.${email}.`)) continue;

      const roleId = parseInt(key.split('.').pop() || '0');
      if (!roleId) continue;

      const data = loadLocalResponses(email, roleId);

      // Upload each competency response
      for (const [competencyId, response] of Object.entries(data)) {
        await saveResponse(userId, email, roleId, parseInt(competencyId), response);
      }

      migrated.push(key);
    }

    // Clear migrated localStorage data
    migrated.forEach(key => localStorage.removeItem(key));

    return migrated.length > 0;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
}
