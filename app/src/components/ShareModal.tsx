import { useState } from "react";
import { X, Mail, Loader2, CheckCircle, Copy } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (collaboratorEmail: string) => Promise<boolean>;
  roleName: string;
  shareToken?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  onShare,
  roleName,
  shareToken,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      const success = await onShare(email);
      if (success) {
        setSent(true);
        // User can close manually with the X button
      } else {
        setError("Failed to share assessment. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setEmail("");
      setSent(false);
      setError("");
      setCopied(false);
    }
  };

  const shareLink = shareToken
    ? `${window.location.origin}/collaborate/${shareToken}`
    : "";

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={handleClose}
          disabled={sending}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00A8E1]/10 rounded-full mb-4">
            <Mail className="w-6 h-6 text-[#00A8E1]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Share Your Assessment
          </h2>
          <p className="text-sm text-gray-600">
            Share your <strong>{roleName}</strong> assessment with a manager or
            collaborator to request their feedback.
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="collaborator-email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Collaborator Email
              </label>
              <input
                id="collaborator-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@carvana.com"
                required
                pattern=".*@carvana\.com$"
                title="Must be a Carvana email address"
                disabled={sending}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E1] focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be a @carvana.com email address
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !email}
                className="flex-1 bg-[#00A8E1] hover:bg-[#0095C8] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  "Share"
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Assessment Shared!
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Share created for <strong>{email}</strong>
            </p>

            {shareLink && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2 text-left">
                  Copy this link and send it to the collaborator:
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 text-xs bg-transparent border-none outline-none text-gray-700"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-[#00A8E1] hover:bg-[#0095C8] text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
