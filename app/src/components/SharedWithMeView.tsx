import { useEffect, useState, useMemo } from "react";
import { Mail, Calendar, CheckCircle, Clock, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { getSharesForCollaborator, type Share } from "../lib/sharing";
import { Data } from "../data";

interface SharedWithMeViewProps {
  userEmail: string;
  onSelectShare: (shareId: string) => void;
}

type StateFilter = "both" | "pending" | "submitted";
type SortDirection = "asc" | "desc";

export default function SharedWithMeView({
  userEmail,
  onSelectShare,
}: SharedWithMeViewProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [stateFilter, setStateFilter] = useState<StateFilter>("both");
  const [groupByEmail, setGroupByEmail] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadShares() {
      setLoading(true);
      const data = await getSharesForCollaborator(userEmail);
      setShares(data);
      setLoading(false);
    }
    loadShares();
  }, [userEmail]);

  // Filter and sort shares
  const filteredAndSortedShares = useMemo(() => {
    let result = [...shares];

    // Apply state filter
    if (stateFilter === "pending") {
      result = result.filter(s => !s.feedback_submitted);
    } else if (stateFilter === "submitted") {
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

  // Group shares by email if enabled
  const groupedShares = useMemo(() => {
    if (!groupByEmail) return null;

    const groups: Record<string, Share[]> = {};
    for (const share of filteredAndSortedShares) {
      const email = share.original_user_email;
      if (!groups[email]) {
        groups[email] = [];
      }
      groups[email].push(share);
    }
    return groups;
  }, [filteredAndSortedShares, groupByEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A8E1] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared assessments...</p>
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
            Nothing here... yet
          </h2>
          <p className="text-gray-500 text-sm">
            When someone shares their assessment with you, it will appear here for you to provide feedback.
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
      <button
        key={share.id}
        onClick={() => onSelectShare(share.id)}
        className="w-full !bg-white relative z-10 border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg hover:border-[#00A8E1]/50 transition-all text-left"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {share.original_user_email}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              {role?.role_description || `Role ID: ${share.role_id}`}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{sharedDate} at {sharedTime}</span>
            </div>
          </div>
          {share.feedback_submitted ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-700">
                Submitted
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-semibold text-amber-700">
                Pending
              </span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Assessments Shared With Me
      </h2>

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
            <option value="submitted">Submitted</option>
          </select>
        </div>

        {/* Group By Email */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByEmail}
              onChange={(e) => setGroupByEmail(e.target.checked)}
              className="w-4 h-4 text-[#00A8E1] border-gray-300 rounded focus:ring-[#00A8E1]"
            />
            <span className="text-sm font-medium text-gray-700">Group by Email</span>
          </label>
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
          {Object.entries(groupedShares).map(([email, emailShares]) => {
            const isCollapsed = collapsedGroups[email] ?? true;
            return (
              <div key={email}>
                <button
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [email]: !prev[email] }))}
                  className="w-full p-4 bg-gradient-to-r from-[#003B5C] to-[#002838] border border-[#00A8E1]/30 rounded-lg mb-3 shadow-md hover:from-[#004566] hover:to-[#003142] transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">
                      {email}
                    </h3>
                    <span className="text-xs font-medium text-[#00A8E1]">
                      {emailShares.length} {emailShares.length === 1 ? 'assessment' : 'assessments'}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="grid gap-4 mb-4">
                    {emailShares.map(share => renderShareCard(share))}
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
    </div>
  );
}
