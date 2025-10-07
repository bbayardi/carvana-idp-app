import { useEffect, useState } from "react";
import { buildCsvRows, toCsv } from "../lib/exportCsv";

type Props = {
  roleId: number;
  responses: Record<number, { assessment_level?: number; notes?: string }>;
};

export default function HeaderBar({ roleId, responses }: Props) {
  const [email, setEmail] = useState(() => localStorage.getItem("idp.user_email") || "");

  useEffect(() => { localStorage.setItem("idp.user_email", email); }, [email]);

  function exportCsv() {
    if (!email) { alert("Add your email first."); return; }
    const rows = buildCsvRows({ userEmail: email, roleId, responses });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const date = new Date();
    const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
    const filename = `${dateStr}_idp_${email}.csv`;
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center gap-4">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Individual Development Plan
      </h1>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:ml-auto">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@carvana.com"
          />
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
