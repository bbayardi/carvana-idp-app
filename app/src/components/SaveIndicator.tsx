import { Cloud, Loader2 } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveIndicatorProps {
  status: SaveStatus;
}

export default function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-white/70">
      {status === "saving" && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Cloud className="w-4 h-4" />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <span className="text-red-400">⚠️ Save failed</span>
        </>
      )}
    </div>
  );
}
