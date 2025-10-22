import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { getShareByToken, canUserProvideFeedback, type Share } from "../lib/sharing";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import CollaboratorFeedbackView from "./CollaboratorFeedbackView";
import AuthGate from "./AuthGate";

export default function CollaboratePage() {
  return (
    <AuthGate>
      {(user) => <CollaboratePageContent user={user} />}
    </AuthGate>
  );
}

function CollaboratePageContent({ user }: { user: User }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<Share | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShare() {
      if (!token) {
        setError("No share token provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      const shareData = await getShareByToken(token);

      if (!shareData) {
        setError("Share not found or has been deleted");
        setLoading(false);
        return;
      }

      // Verify user has access
      const userEmail = user.email || "";
      if (!canUserProvideFeedback(shareData, userEmail)) {
        setError("You don't have permission to access this share");
        setLoading(false);
        return;
      }

      setShare(shareData);
      setLoading(false);
    }

    loadShare();
  }, [token, user.email]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#00A8E1] mx-auto mb-4" />
          <p className="text-gray-600">Loading share...</p>
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Unable to Access Share
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "This share is no longer available."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold rounded-lg transition-colors uppercase tracking-wide"
          >
            Go to My Assessments
          </button>
        </div>
      </div>
    );
  }

  return (
    <CollaboratorFeedbackView
      shareId={share.id}
      onBack={() => navigate("/")}
    />
  );
}
