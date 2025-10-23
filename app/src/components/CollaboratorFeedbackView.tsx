import { useEffect, useState, useRef, useMemo } from "react";
import { ArrowLeft, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import {
  getShareDetails,
  saveCollaboratorFeedback,
  submitFeedback,
  type Share,
  type ShareSnapshot,
} from "../lib/sharing";
import { Data } from "../data";
import CompetencyFeedbackRow from "./CompetencyFeedbackRow";

interface CollaboratorFeedbackViewProps {
  shareId: string;
  onBack: () => void;
}

type FeedbackResp = {
  collaborator_assessment_level?: number;
  collaborator_notes?: string;
};

export default function CollaboratorFeedbackView({
  shareId,
  onBack,
}: CollaboratorFeedbackViewProps) {
  const [share, setShare] = useState<Share | null>(null);
  const [snapshots, setSnapshots] = useState<Record<number, ShareSnapshot>>({});
  const [feedback, setFeedback] = useState<Record<number, FeedbackResp>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const saveTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    async function loadShareData() {
      setLoading(true);
      const data = await getShareDetails(shareId);
      setShare(data.share);
      setSnapshots(data.snapshots);

      // Convert feedback to local format
      const localFeedback: Record<number, FeedbackResp> = {};
      Object.entries(data.feedback).forEach(([compId, f]) => {
        localFeedback[Number(compId)] = {
          collaborator_assessment_level: f.collaborator_assessment_level || undefined,
          collaborator_notes: f.collaborator_notes || undefined,
        };
      });
      setFeedback(localFeedback);
      setLoading(false);
    }
    loadShareData();
  }, [shareId]);

  const competencies = useMemo(() => {
    if (!share) return [];
    return Data.competencies_by_role[String(share.role_id)] ?? [];
  }, [share]);

  const groupedByCore = useMemo(() => {
    const groups: Record<number, { description: string; competencies: typeof competencies }> = {};
    for (const c of competencies) {
      if (!groups[c.core_competency_id]) {
        groups[c.core_competency_id] = {
          description: c.core_competency_description,
          competencies: [],
        };
      }
      groups[c.core_competency_id].competencies.push(c);
    }
    return groups;
  }, [competencies]);

  const handleFeedbackChange = async (
    competencyId: number,
    response: FeedbackResp
  ) => {
    // Optimistically update UI
    setFeedback((prev) => ({ ...prev, [competencyId]: response }));

    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Show saving status
    setSaving(true);

    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      await saveCollaboratorFeedback(
        shareId,
        competencyId,
        response.collaborator_assessment_level,
        response.collaborator_notes
      );
      setSaving(false);
    }, 2000);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const success = await submitFeedback(shareId);
    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        onBack();
      }, 2000);
    }
    setSubmitting(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const completedCount = Object.values(feedback).filter(
    (f) => f.collaborator_assessment_level && f.collaborator_notes?.trim()
  ).length;
  const allComplete = completedCount === competencies.length && competencies.length > 0;
  const role = share ? Data.roles.find((r) => r.role_id === share.role_id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A8E1] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} style={{ transform: 'rotate(45deg)' }} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Share Has Been Deleted
          </h2>
          <p className="text-gray-600 mb-6">
            This shared assessment has been removed by the person who shared it with you. You no longer have access to provide feedback.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold rounded-lg transition-colors uppercase tracking-wide"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isReadOnly = share.feedback_submitted && !submitted;

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Feedback Submitted!
          </h2>
          <p className="text-gray-600">
            Your feedback has been sent to {share.original_user_email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="sticky top-0 bg-[#003B5C] border-b border-[#00A8E1]/30 shadow-lg z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to list</span>
          </button>

          <div className="mb-4">
            <h1 className="text-xl font-bold text-white uppercase tracking-wide mb-1">
              {isReadOnly ? "Your Submitted Feedback" : "Providing Feedback"}
            </h1>
            <p className="text-sm text-white/80">
              For: <strong>{share.original_user_email}</strong>
            </p>
            <p className="text-sm text-white/70">
              Role: {role?.role_description || `Role ID: ${share.role_id}`}
            </p>
            <p className="text-xs text-white/60 mt-1">
              Shared on {new Date(share.shared_at).toLocaleDateString()} at {new Date(share.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {isReadOnly && (
              <p className="text-xs text-green-300 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Submitted on {new Date(share.feedback_submitted_at!).toLocaleDateString()} at {new Date(share.feedback_submitted_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-3">
              <div
                className={`relative overflow-hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${
                  allComplete
                    ? "border-green-400/50"
                    : "border-[#00A8E1]/50"
                }`}
              >
                {/* Progress bar background fill */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    allComplete ? "bg-green-500/30" : "bg-[#00A8E1]/20"
                  }`}
                  style={{
                    width: `${competencies.length > 0 ? (completedCount / competencies.length) * 100 : 0}%`,
                  }}
                />

                {/* Content (relative to appear above background) */}
                <span
                  className={`relative text-sm font-semibold ${
                    allComplete ? "text-green-300" : "text-[#00A8E1]"
                  }`}
                >
                  {completedCount}
                </span>
                <span
                  className={`relative text-sm ${
                    allComplete ? "text-green-200" : "text-white/80"
                  }`}
                >
                  of
                </span>
                <span
                  className={`relative text-sm font-semibold ${
                    allComplete ? "text-green-300" : "text-[#00A8E1]"
                  }`}
                >
                  {competencies.length}
                </span>
                <span
                  className={`relative text-sm ${
                    allComplete ? "text-green-200" : "text-white/80"
                  }`}
                >
                  complete
                </span>
              </div>
              {saving && (
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!allComplete || submitting}
                className="px-4 py-2 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-xs flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {Object.entries(groupedByCore).map(([coreId, group]) => {
          const isCollapsed = collapsedSections[Number(coreId)];
          return (
            <div key={coreId} className="mb-6">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, [Number(coreId)]: !prev[Number(coreId)] }))}
                className="w-full p-4 bg-gradient-to-r from-[#003B5C] to-[#002838] border border-[#00A8E1]/30 rounded-lg mb-3 shadow-md hover:from-[#004566] hover:to-[#003142] transition-all flex items-center justify-between"
              >
                <h2 className="text-lg font-bold text-white uppercase tracking-wide">
                  {group.description}
                </h2>
                <ChevronDown className={`w-5 h-5 text-white transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="grid gap-3">
                  {group.competencies.map((c) => (
                    <CompetencyFeedbackRow
                      key={c.competency_id}
                      comp={c}
                      snapshot={snapshots[c.competency_id]}
                      value={feedback[c.competency_id] || {}}
                      onChange={(next) => handleFeedbackChange(c.competency_id, next)}
                      readOnly={isReadOnly}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
