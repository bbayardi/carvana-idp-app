import { useEffect, useState, useMemo } from "react";
import { Mail, Calendar, CheckCircle, Clock, ArrowLeft, Trash2, AlertTriangle, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { getMyShares, getShareDetails, hasFeedbackStarted, deleteShare, type Share } from "../lib/sharing";
import { Data } from "../data";

interface MyFeedbackViewProps {
  userId: string;
}

type StateFilter = "both" | "pending" | "received";
type SortDirection = "asc" | "desc";
type GroupBy = "none" | "email" | "role";

export default function MyFeedbackView({ userId }: MyFeedbackViewProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalShare, setDeleteModalShare] = useState<Share | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [stateFilter, setStateFilter] = useState<StateFilter>("both");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadShares() {
      setLoading(true);
      const data = await getMyShares(userId);
      setShares(data);
      setLoading(false);
    }
    loadShares();
  }, [userId]);

  // Filter and sort shares
  const filteredAndSortedShares = useMemo(() => {
    let result = [...shares];

    // Apply state filter
    if (stateFilter === "pending") {
      result = result.filter(s => !s.feedback_submitted);
    } else if (stateFilter === "received") {
      result = result.filter(s => s.feedback_submitted);
    }

    // Apply sorting
    result.sort((a, b) => {
      const dateA = new Date(a.shared_at).getTime();
      const dateB = new Date(b.shared_at).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [shares, stateFilter, sortDirection]);

  // Group shares by email or role if enabled
  const groupedShares = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: Record<string, Share[]> = {};
    for (const share of filteredAndSortedShares) {
      let key: string;
      if (groupBy === "email") {
        key = share.collaborator_email;
      } else {
        // Group by role
        const role = Data.roles.find(r => r.role_id === share.role_id);
        key = role?.role_description || `Role ID: ${share.role_id}`;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(share);
    }
    return groups;
  }, [filteredAndSortedShares, groupBy]);

  const handleDeleteClick = async (share: Share, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the share detail view

    // Check if feedback has been started
    const feedbackStarted = await hasFeedbackStarted(share.id);

    if (feedbackStarted) {
      setDeleteError(`${share.collaborator_email} has already started providing feedback.`);
      return;
    }

    setDeleteModalShare(share);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalShare) return;

    setDeleting(true);
    const result = await deleteShare(deleteModalShare.id);

    if (result.success) {
      // Remove from local state
      setShares(shares.filter(s => s.id !== deleteModalShare.id));
      setDeleteModalShare(null);
    } else {
      setDeleteError(result.error || "Failed to delete share");
    }

    setDeleting(false);
  };

  const handleCancelDelete = () => {
    setDeleteModalShare(null);
  };

  if (selectedShareId) {
    return (
      <FeedbackDetailView
        shareId={selectedShareId}
        onBack={() => setSelectedShareId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A8E1] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No shared assessments yet
          </h2>
          <p className="text-gray-500 text-sm">
            Share your assessment with a manager or collaborator to receive feedback. Use the "Share Assessment" button in your assessment tab.
          </p>
        </div>
      </div>
    );
  }

  const renderShareCard = (share: Share) => {
    const role = Data.roles.find((r) => r.role_id === share.role_id);
    const sharedDate = new Date(share.shared_at).toLocaleDateString();
    const sharedTime = new Date(share.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div
        key={share.id}
        onClick={() => setSelectedShareId(share.id)}
        className="w-full !bg-white relative z-10 border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg hover:border-[#00A8E1]/50 transition-all text-left cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {share.collaborator_email}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              {role?.role_description || `Role ID: ${share.role_id}`}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Shared {sharedDate} at {sharedTime}</span>
              {share.feedback_submitted && share.feedback_submitted_at && (
                <>
                  <span>•</span>
                  <span>
                    Received {new Date(share.feedback_submitted_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {share.feedback_submitted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-700" />
                <span className="text-xs font-semibold text-green-700">
                  Received
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(share, e)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete share"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Shared Assessments</h2>

      {/* Filter Bar */}
      <div className="!bg-white relative z-10 border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4 shadow-md">
        {/* Sort Direction */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort:</span>
          <button
            onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={sortDirection === "asc" ? "Oldest first" : "Newest first"}
          >
            {sortDirection === "asc" ? (
              <ArrowUp className="w-4 h-4 text-gray-700" />
            ) : (
              <ArrowDown className="w-4 h-4 text-gray-700" />
            )}
          </button>
        </div>

        {/* State Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="state-filter" className="text-sm font-medium text-gray-700">State:</label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as StateFilter)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none"
          >
            <option value="both">Both</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
          </select>
        </div>

        {/* Group By */}
        <div className="flex items-center gap-2">
          <label htmlFor="group-by" className="text-sm font-medium text-gray-700">Group By:</label>
          <select
            id="group-by"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none"
          >
            <option value="none">None</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
          </select>
        </div>
      </div>

      {/* No results message */}
      {filteredAndSortedShares.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No assessments match your filters
            </h2>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters to see more assessments.
            </p>
          </div>
        </div>
      ) : groupedShares ? (
        /* Grouped view */
        <div className="space-y-4">
          {Object.entries(groupedShares).map(([groupKey, groupShares]) => {
            const isCollapsed = collapsedGroups[groupKey] ?? true;
            return (
              <div key={groupKey}>
                <button
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                  className="w-full p-4 bg-gradient-to-r from-[#003B5C] to-[#002838] border border-[#00A8E1]/30 rounded-lg mb-3 shadow-md hover:from-[#004566] hover:to-[#003142] transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">
                      {groupKey}
                    </h3>
                    <span className="text-xs font-medium text-[#00A8E1]">
                      {groupShares.length} {groupShares.length === 1 ? 'assessment' : 'assessments'}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="grid gap-4 mb-4">
                    {groupShares.map(share => renderShareCard(share))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Ungrouped view */
        <div className="grid gap-4">
          {filteredAndSortedShares.map(share => renderShareCard(share))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalShare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Delete Shared Assessment?
              </h3>
              <p className="text-sm text-gray-600">
                This will permanently remove your feedback request from{" "}
                <strong>{deleteModalShare.collaborator_email}</strong> and they will no longer be able to access it.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-6 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Share"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cannot Delete Share
                </h3>
                <p className="text-sm text-gray-600">
                  {deleteError}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 text-white bg-[#00A8E1] hover:bg-[#0095C8] rounded-lg font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackDetailView({
  shareId,
  onBack,
}: {
  shareId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<Share | null>(null);
  const [snapshots, setSnapshots] = useState<any>({});
  const [feedback, setFeedback] = useState<any>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      const data = await getShareDetails(shareId);
      setShare(data.share);
      setSnapshots(data.snapshots);
      setFeedback(data.feedback);
      setLoading(false);
    }
    loadDetails();
  }, [shareId]);

  // Move all hook calls before early returns to comply with Rules of Hooks
  const role = share ? Data.roles.find((r) => r.role_id === share.role_id) : null;
  const competencies = share ? (Data.competencies_by_role[String(share.role_id)] ?? []) : [];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A8E1] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback details...</p>
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Feedback not found</p>
          <button
            onClick={onBack}
            className="mt-4 text-[#00A8E1] hover:text-[#0095C8] font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to list</span>
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Feedback from {share.collaborator_email}
            </h2>
            <p className="text-sm text-gray-600">
              {role?.role_description || `Role ID: ${share.role_id}`}
            </p>
          </div>
          {share.feedback_submitted ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-700">Received</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg">
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-semibold text-amber-700">Pending</span>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Shared on {new Date(share.shared_at).toLocaleDateString()}
          {share.feedback_submitted && share.feedback_submitted_at && (
            <> • Received on {new Date(share.feedback_submitted_at).toLocaleDateString()}</>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByCore).map(([coreId, group]) => {
          const isCollapsed = collapsedSections[Number(coreId)];
          return (
            <div key={coreId}>
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
                <div className="space-y-4">
                  {group.competencies.map((comp) => {
                    const snapshot = snapshots[comp.competency_id];
                    const fb = feedback[comp.competency_id];
                    const yourAssessment = snapshot?.assessment_level
                      ? Data.assessments.find((a) => a.assessment_level === snapshot.assessment_level)
                      : null;
                    const theirAssessment = fb?.collaborator_assessment_level
                      ? Data.assessments.find((a) => a.assessment_level === fb.collaborator_assessment_level)
                      : null;

                    return (
                      <div
                        key={comp.competency_id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <h3 className="font-medium text-gray-900 mb-4">
                          {comp.competency_description}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-2 uppercase">
                              Your Assessment
                            </p>
                            <p className="text-sm font-medium text-gray-900 mb-2">
                              {yourAssessment
                                ? `${yourAssessment.assessment_level} — ${yourAssessment.assessment}`
                                : "Not assessed"}
                            </p>
                            <p className="text-sm text-gray-700">
                              {snapshot?.notes || (
                                <span className="text-gray-400 italic">No notes</span>
                              )}
                            </p>
                          </div>
                          {share.feedback_submitted ? (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-2 uppercase">
                                Their Feedback
                              </p>
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                {theirAssessment
                                  ? `${theirAssessment.assessment_level} — ${theirAssessment.assessment}`
                                  : "Not assessed"}
                              </p>
                              <p className="text-sm text-gray-700">
                                {fb?.collaborator_notes || (
                                  <span className="text-gray-400 italic">No notes</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-center">
                              <div className="text-center">
                                <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-amber-900 mb-1 uppercase">
                                  Awaiting Feedback
                                </p>
                                <p className="text-xs text-amber-700">
                                  Waiting for {share.collaborator_email}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
