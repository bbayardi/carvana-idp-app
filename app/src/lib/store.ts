type Resp = { assessment_level?: number; notes?: string };
const key = (email: string, roleId: number) => `idp.responses.${email}.${roleId}`;

export function loadResponses(email: string, roleId: number): Record<number, Resp> {
  try {
    const raw = localStorage.getItem(key(email, roleId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveResponses(email: string, roleId: number, data: Record<number, Resp>) {
  localStorage.setItem(key(email, roleId), JSON.stringify(data));
}
