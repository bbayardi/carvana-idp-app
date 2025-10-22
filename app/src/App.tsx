import { useEffect, useMemo, useState, useRef } from "react";
import { Data } from "./data";
import HeaderBar from "./components/HeaderBar";
import { loadResponses, saveResponse, migrateLocalDataToSupabase, type Resp } from "./lib/store";
import CoreCompetencySection from "./components/CoreCompetencySection";
import AuthGate from "./components/AuthGate";
import SaveIndicator from "./components/SaveIndicator";
import TabNavigation from "./components/TabNavigation";
import ShareModal from "./components/ShareModal";
import SharedWithMeView from "./components/SharedWithMeView";
import MyFeedbackView from "./components/MyFeedbackView";
import CollaboratorFeedbackView from "./components/CollaboratorFeedbackView";
import { createShare, getSharesForCollaborator, getMyShares } from "./lib/sharing";
import { Share2, FileDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { buildCsvRows, toCsv } from "./lib/exportCsv";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Tab = "my-assessment" | "shared-with-me" | "my-feedback";

function AppContent({ user }: { user: User }) {
  const [roleId, setRoleId] = useState<number>(() => {
    const v = localStorage.getItem("idp.role_id");
    return v ? Number(v) : 0; // Start with no role selected
  });
  const [responses, setResponses] = useState<Record<number, Resp>>({});
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showInstructions, setShowInstructions] = useState(() => {
    return localStorage.getItem("idp.hideInstructions") !== "true";
  });
  const [activeTab, setActiveTab] = useState<Tab>("my-assessment");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [currentShareToken, setCurrentShareToken] = useState<string | undefined>();
  const [selectedFeedbackShareId, setSelectedFeedbackShareId] = useState<string | null>(null);
  const [sharedWithMeCount, setSharedWithMeCount] = useState(0);
  const [myFeedbackCount, setMyFeedbackCount] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const email = user.email || "";

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

  // Initial load: migrate localStorage data if exists, then load from Supabase
  useEffect(() => {
    async function initialize() {
      setMigrating(true);
      // Try to migrate any existing localStorage data
      const migrated = await migrateLocalDataToSupabase(user.id, email);
      if (migrated) {
        console.log('Migrated localStorage data to Supabase');
      }
      setMigrating(false);

      // Load responses from Supabase
      setLoading(true);
      const data = await loadResponses(user.id, email, roleId);
      setResponses(data);
      setLoading(false);
    }
    initialize();
  }, [user.id, email, roleId]);

  // Save role preference
  useEffect(() => {
    localStorage.setItem("idp.role_id", String(roleId));
  }, [roleId]);

  // Handle response changes - save individual response to Supabase with debouncing
  const handleResponseChange = async (competencyId: number, response: Resp) => {
    // Optimistically update UI
    setResponses(prev => ({ ...prev, [competencyId]: response }));

    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Show saving status immediately
    setSaveStatus("saving");

    // Wait 2 seconds before actually saving (debounce)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Save to Supabase
        await saveResponse(user.id, email, roleId, competencyId, response);

        // Show saved status
        setSaveStatus("saved");

        // Auto-hide "Saved" after 2 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Save failed:", error);
        setSaveStatus("error");

        // Auto-hide error after 3 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      }
    }, 2000); // 2 second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load share counts
  useEffect(() => {
    async function loadCounts() {
      const [sharedWithMe, myShares] = await Promise.all([
        getSharesForCollaborator(email),
        getMyShares(user.id),
      ]);
      setSharedWithMeCount(sharedWithMe.filter((s) => !s.feedback_submitted).length);
      setMyFeedbackCount(myShares.filter((s) => s.feedback_submitted).length);
    }
    loadCounts();
  }, [email, user.id]);

  // Handle CSV export
  const handleExportCsv = () => {
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
  };

  // Handle sharing assessment
  const handleShare = async (collaboratorEmail: string): Promise<boolean> => {
    if (roleId === 0) {
      alert("Please select a role first");
      return false;
    }

    // Check if all competencies are complete
    const completedCount = Object.values(responses).filter(r => r.assessment_level && r.notes?.trim()).length;
    if (completedCount < comps.length) {
      throw new Error("Complete all competency assessments and notes to share your assessment.");
    }

    const result = await createShare(
      user.id,
      email,
      collaboratorEmail,
      roleId,
      responses
    );

    if (result.success) {
      // Store token to show in modal
      setCurrentShareToken(result.shareToken);

      // Log share link for manual sharing (until email is set up)
      const shareLink = `${window.location.origin}/collaborate/${result.shareToken}`;
      console.log("✅ Share created successfully!");
      console.log("📧 Share this link with the collaborator:", shareLink);
      console.log("📋 Copy this link:", shareLink);

      // TODO: Send email notification with share link

      // Refresh counts
      const myShares = await getMyShares(user.id);
      setMyFeedbackCount(myShares.filter((s) => s.feedback_submitted).length);

      return true;
    }

    // Throw error with specific message from createShare
    throw new Error(result.error || "Failed to share assessment. Please try again.");
  };

  if (migrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Migrating your data...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your responses...</p>
        </div>
      </div>
    );
  }

  // Get role name for share modal
  const roleName = roleId > 0
    ? Data.roles.find((r) => r.role_id === roleId)?.role_description || "Unknown Role"
    : "Unknown Role";

  // If viewing a specific feedback share from "Shared With Me" tab
  if (selectedFeedbackShareId) {
    return (
      <CollaboratorFeedbackView
        shareId={selectedFeedbackShareId}
        onBack={() => {
          setSelectedFeedbackShareId(null);
          // Refresh counts when returning
          getSharesForCollaborator(email).then((shares) => {
            setSharedWithMeCount(shares.filter((s) => !s.feedback_submitted).length);
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-[#003B5C] border-b border-[#00A8E1]/30 shadow-lg z-10">
        <HeaderBar />

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sharedWithMeCount={sharedWithMeCount}
          myFeedbackCount={myFeedbackCount}
        />

        {/* Instructions - Only show on My Assessment tab */}
        {activeTab === "my-assessment" && showInstructions && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="bg-[#00A8E1]/10 border border-[#00A8E1]/30 rounded-lg p-4 mb-4 relative">
              <button
                onClick={() => {
                  setShowInstructions(false);
                  localStorage.setItem("idp.hideInstructions", "true");
                }}
                className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                aria-label="Close instructions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="text-sm text-white/90 leading-relaxed pr-6">
                <strong className="text-white font-bold">HOW TO USE THIS TOOL:</strong> Select your role below to view the competencies required for that position.
                Rate your current skill level for each competency using the assessment scale (1-5), and add any notes about your experience or development goals.
                Your progress is automatically saved and accessible from any device.
              </p>
            </div>
          </div>
        )}

        {/* Role selector and progress - Only show on My Assessment tab */}
        {activeTab === "my-assessment" && (
          <div className="max-w-4xl mx-auto px-4 pt-4 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label htmlFor="role" className="text-sm font-medium text-white">ROLE</label>
                <select
                  id="role"
                  className="border border-[#00A8E1]/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none transition-all bg-white/10 text-white min-w-[200px]"
                  value={roleId}
                  onChange={(e) => setRoleId(Number(e.target.value))}
                >
                  <option value={0} className="text-gray-900">-- Select a role --</option>
                  {Data.roles.map(r => (
                    <option key={r.role_id} value={r.role_id} className="text-gray-900">
                      {r.role_description}
                    </option>
                  ))}
                </select>
              </div>
              {roleId > 0 && (
                <>
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="px-3 py-2 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold rounded-lg transition-colors uppercase tracking-wide text-sm flex items-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-2 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold rounded-lg transition-colors uppercase tracking-wide text-sm flex items-center gap-1.5"
                  >
                    <FileDown className="w-4 h-4" />
                    Export CSV
                  </button>
                </>
              )}
            </div>
            {roleId > 0 && (() => {
              const completedCount = Object.values(responses).filter(r => r.assessment_level && r.notes?.trim()).length;
              const isFullyComplete = completedCount === comps.length && comps.length > 0;

              return (
                <div className="flex items-center gap-3">
                  <SaveIndicator status={saveStatus} />
                  <div className={`relative overflow-hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${
                    isFullyComplete
                      ? 'border-green-400/50'
                      : 'border-[#00A8E1]/50'
                  }`}>
                    {/* Progress bar background fill */}
                    <div
                      className={`absolute inset-0 transition-all duration-500 ease-out ${
                        isFullyComplete ? 'bg-green-500/30' : 'bg-[#00A8E1]/20'
                      }`}
                      style={{
                        width: `${comps.length > 0 ? (completedCount / comps.length) * 100 : 0}%`,
                      }}
                    />

                    {/* Content (relative to appear above background) */}
                    <span className={`relative text-sm font-semibold ${
                      isFullyComplete ? 'text-green-300' : 'text-[#00A8E1]'
                    }`}>
                      {completedCount}
                    </span>
                    <span className={`relative text-sm ${
                      isFullyComplete ? 'text-green-200' : 'text-white/80'
                    }`}>of</span>
                    <span className={`relative text-sm font-semibold ${
                      isFullyComplete ? 'text-green-300' : 'text-[#00A8E1]'
                    }`}>{comps.length}</span>
                    <span className={`relative text-sm ${
                      isFullyComplete ? 'text-green-200' : 'text-white/80'
                    }`}>complete</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </header>

      <main>
        {activeTab === "my-assessment" && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            {roleId === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Select your role to begin rating your competencies.
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Choose a role from the dropdown above to get started.
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(groupedByCore).map(([coreId, group]) => (
                <CoreCompetencySection
                  key={coreId}
                  coreCompetencyId={Number(coreId)}
                  coreCompetencyDescription={group.description}
                  competencies={group.competencies}
                  responses={responses}
                  onChange={handleResponseChange}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "shared-with-me" && (
          <SharedWithMeView
            userEmail={email}
            onSelectShare={setSelectedFeedbackShareId}
          />
        )}

        {activeTab === "my-feedback" && <MyFeedbackView userId={user.id} />}
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setCurrentShareToken(undefined);
        }}
        onShare={handleShare}
        roleName={roleName}
        shareToken={currentShareToken}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      {(user) => <AppContent user={user} />}
    </AuthGate>
  );
}
