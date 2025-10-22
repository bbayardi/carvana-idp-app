import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { Data } from "../data";

type Resp = { assessment_level?: number; notes?: string };
type Props = {
  comp: (typeof Data.competencies_by_role)[string][number];
  value: Resp;
  onChange: (next: Resp) => void;
};

export default function CompetencyRow({ comp, value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tooltipButtonRef = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // If empty, force to minimum height
    if (!value.notes || value.notes.trim() === '') {
      textarea.style.height = '38px';
      textarea.style.overflow = 'hidden';
      return;
    }

    // Temporarily allow overflow for accurate measurement
    textarea.style.overflow = 'visible';
    textarea.style.height = '1px';

    // Force reflow
    void textarea.offsetHeight;

    // Get the natural height
    const newHeight = Math.max(38, textarea.scrollHeight);

    // Apply height and hide overflow
    textarea.style.height = newHeight + 'px';
    textarea.style.overflow = 'hidden';
  }, [value.notes]);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative">
      <div className="font-medium text-gray-900 mb-3">{comp.competency_description}</div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="flex items-center gap-2 w-full lg:w-auto relative">
          <select
            className="border border-[#00A8E1]/30 rounded-lg px-3 py-1.5 text-sm w-full lg:w-72 focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none transition-all bg-white h-[38px]"
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

          {/* Tooltip */}
          <div className="flex-shrink-0">
            <button
              ref={tooltipButtonRef}
              type="button"
              onMouseEnter={() => {
                if (tooltipButtonRef.current) {
                  const rect = tooltipButtonRef.current.getBoundingClientRect();
                  setTooltipPosition({
                    top: rect.bottom + 8,
                    left: rect.left
                  });
                }
                setShowTooltip(true);
              }}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-[#00A8E1] transition-colors"
              aria-label="Assessment level descriptions"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="border border-[#00A8E1]/30 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none resize-none bg-white leading-relaxed"
          style={{ overflow: 'hidden' }}
          placeholder="Notes to support your rating…"
          value={value.notes ?? ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>

      {/* Tooltip rendered via portal to ensure it's on top */}
      {showTooltip && createPortal(
        <div
          className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-4"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            zIndex: 99999
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <h4 className="font-semibold text-gray-900 text-sm mb-3">Assessment Levels:</h4>
          <div className="space-y-2">
            {Data.assessments.map(a => (
              <div key={a.assessment_level} className="text-xs">
                <span className="font-semibold text-gray-900">{a.assessment_level} — {a.assessment}:</span>
                <p className="text-gray-600 mt-0.5">{a.assessment_description}</p>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
