import { supabase } from "./supabase";
import { Data } from "../data";

export type Share = {
  id: string;
  original_user_id: string;
  original_user_email: string;
  collaborator_email: string;
  role_id: number;
  shared_at: string;
  feedback_submitted: boolean;
  feedback_submitted_at: string | null;
  share_token: string;
};

export type ShareSnapshot = {
  share_id: string;
  competency_id: number;
  assessment_level: number | null;
  notes: string | null;
};

export type CollaboratorFeedback = {
  id: string;
  share_id: string;
  competency_id: number;
  collaborator_assessment_level: number | null;
  collaborator_notes: string | null;
  updated_at: string;
};

/**
 * Send email notification to collaborator about new share
 */
async function sendShareEmail(
  collaboratorEmail: string,
  originalUserEmail: string,
  roleId: number,
  shareToken: string
): Promise<boolean> {
  try {
    const roleName = Data.roles.find((r) => r.role_id === roleId)?.role_description || "Unknown Role";
    const shareLink = `${window.location.origin}/collaborate/${shareToken}`;

    const { data, error } = await supabase.functions.invoke("send-share-email", {
      body: {
        collaboratorEmail,
        originalUserEmail,
        roleName,
        shareToken,
        shareLink,
      },
    });

    if (error) {
      console.error("Error sending share email:", error);
      return false;
    }

    console.log("✅ Share email sent successfully to", collaboratorEmail);
    return true;
  } catch (error) {
    console.error("Failed to send share email:", error);
    return false;
  }
}

/**
 * Check if responses are identical to an existing share's snapshot
 */
async function hasIdenticalShare(
  originalUserId: string,
  collaboratorEmail: string,
  roleId: number,
  currentResponses: Record<number, { assessment_level?: number; notes?: string }>
): Promise<boolean> {
  // Get all shares from this user to this collaborator for this role
  const { data: existingShares, error } = await supabase
    .from("shares")
    .select("id")
    .eq("original_user_id", originalUserId)
    .eq("collaborator_email", collaboratorEmail)
    .eq("role_id", roleId);

  if (error || !existingShares || existingShares.length === 0) {
    return false;
  }

  // Check each existing share's snapshots
  for (const share of existingShares) {
    const { data: snapshots } = await supabase
      .from("share_snapshots")
      .select("*")
      .eq("share_id", share.id);

    if (!snapshots) continue;

    // Convert snapshots to same format as currentResponses
    const snapshotResponses: Record<number, { assessment_level?: number; notes?: string }> = {};
    snapshots.forEach(s => {
      snapshotResponses[s.competency_id] = {
        assessment_level: s.assessment_level || undefined,
        notes: s.notes || undefined,
      };
    });

    // Check if identical
    const currentKeys = Object.keys(currentResponses).sort();
    const snapshotKeys = Object.keys(snapshotResponses).sort();

    if (JSON.stringify(currentKeys) !== JSON.stringify(snapshotKeys)) {
      continue; // Different competencies, not identical
    }

    // Check each competency's values
    const isIdentical = currentKeys.every(key => {
      const current = currentResponses[Number(key)];
      const snapshot = snapshotResponses[Number(key)];
      return (
        current.assessment_level === snapshot.assessment_level &&
        (current.notes?.trim() || "") === (snapshot.notes?.trim() || "")
      );
    });

    if (isIdentical) {
      return true; // Found an identical share
    }
  }

  return false;
}

/**
 * Create a share and snapshot the current responses
 */
export async function createShare(
  originalUserId: string,
  originalUserEmail: string,
  collaboratorEmail: string,
  roleId: number,
  currentResponses: Record<number, { assessment_level?: number; notes?: string }>
): Promise<{ success: boolean; shareId?: string; shareToken?: string; error?: string }> {
  try {
    console.log("Creating share with:", {
      originalUserId,
      originalUserEmail,
      collaboratorEmail,
      roleId,
      responseCount: Object.keys(currentResponses).length,
    });

    // Check if an identical share already exists
    const hasIdentical = await hasIdenticalShare(
      originalUserId,
      collaboratorEmail,
      roleId,
      currentResponses
    );

    if (hasIdentical) {
      return {
        success: false,
        error: "You've already shared an identical assessment with this collaborator. Please make edits to send a new assessment.",
      };
    }

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from("shares")
      .insert({
        original_user_id: originalUserId,
        original_user_email: originalUserEmail,
        collaborator_email: collaboratorEmail,
        role_id: roleId,
      })
      .select()
      .single();

    if (shareError) {
      console.error("Error creating share:", shareError);
      console.error("Full error details:", JSON.stringify(shareError, null, 2));
      return { success: false, error: shareError.message };
    }

    console.log("Share created successfully:", share);

    // Send email notification to collaborator
    const emailSent = await sendShareEmail(
      collaboratorEmail,
      originalUserEmail,
      roleId,
      share.share_token
    );

    if (!emailSent) {
      console.warn("Share created but email notification failed");
      // Don't fail the share creation if email fails
    }

    // Create snapshots of current responses
    const snapshots = Object.entries(currentResponses).map(([compId, resp]) => ({
      share_id: share.id,
      competency_id: Number(compId),
      assessment_level: resp.assessment_level || null,
      notes: resp.notes || null,
    }));

    if (snapshots.length > 0) {
      const { error: snapshotError } = await supabase
        .from("share_snapshots")
        .insert(snapshots);

      if (snapshotError) {
        console.error("Error creating snapshots:", snapshotError);
        // Rollback the share if snapshots fail
        await supabase.from("shares").delete().eq("id", share.id);
        return { success: false, error: snapshotError.message };
      }
    }

    return { success: true, shareId: share.id, shareToken: share.share_token };
  } catch (err) {
    console.error("Unexpected error in createShare:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get shares where the current user is the collaborator (need to provide feedback)
 */
export async function getSharesForCollaborator(
  userEmail: string
): Promise<Share[]> {
  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .eq("collaborator_email", userEmail)
    .order("shared_at", { ascending: false });

  if (error) {
    console.error("Error fetching shares for collaborator:", error);
    return [];
  }

  return data || [];
}

/**
 * Get shares created by the current user (to view received feedback)
 */
export async function getMyShares(userId: string): Promise<Share[]> {
  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .eq("original_user_id", userId)
    .order("shared_at", { ascending: false });

  if (error) {
    console.error("Error fetching user's shares:", error);
    return [];
  }

  return data || [];
}

/**
 * Get share by token - used for direct link access
 */
export async function getShareByToken(
  shareToken: string
): Promise<Share | null> {
  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .eq("share_token", shareToken)
    .single();

  if (error) {
    console.error("Error fetching share by token:", error);
    return null;
  }

  return data;
}

/**
 * Get share details with snapshots and feedback
 */
export async function getShareDetails(shareId: string): Promise<{
  share: Share | null;
  snapshots: Record<number, ShareSnapshot>;
  feedback: Record<number, CollaboratorFeedback>;
}> {
  // Get the share
  const { data: share, error: shareError } = await supabase
    .from("shares")
    .select("*")
    .eq("id", shareId)
    .single();

  if (shareError) {
    console.error("Error fetching share:", shareError);
    return { share: null, snapshots: {}, feedback: {} };
  }

  // Get snapshots
  const { data: snapshotData, error: snapshotError } = await supabase
    .from("share_snapshots")
    .select("*")
    .eq("share_id", shareId);

  if (snapshotError) {
    console.error("Error fetching snapshots:", snapshotError);
  }

  const snapshots: Record<number, ShareSnapshot> = {};
  (snapshotData || []).forEach((s) => {
    snapshots[s.competency_id] = s;
  });

  // Get feedback
  const { data: feedbackData, error: feedbackError } = await supabase
    .from("collaborator_feedback")
    .select("*")
    .eq("share_id", shareId);

  if (feedbackError) {
    console.error("Error fetching feedback:", feedbackError);
  }

  const feedback: Record<number, CollaboratorFeedback> = {};
  (feedbackData || []).forEach((f) => {
    feedback[f.competency_id] = f;
  });

  return { share, snapshots, feedback };
}

/**
 * Save collaborator feedback for a competency (auto-save)
 */
export async function saveCollaboratorFeedback(
  shareId: string,
  competencyId: number,
  assessment: number | undefined,
  notes: string | undefined
): Promise<boolean> {
  const { error } = await supabase
    .from("collaborator_feedback")
    .upsert(
      {
        share_id: shareId,
        competency_id: competencyId,
        collaborator_assessment_level: assessment || null,
        collaborator_notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "share_id,competency_id",
      }
    );

  if (error) {
    console.error("Error saving collaborator feedback:", error);
    return false;
  }

  return true;
}

/**
 * Submit completed feedback
 */
export async function submitFeedback(shareId: string): Promise<boolean> {
  const { error } = await supabase
    .from("shares")
    .update({
      feedback_submitted: true,
      feedback_submitted_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (error) {
    console.error("Error submitting feedback:", error);
    return false;
  }

  return true;
}

/**
 * Verify that a user has access to provide feedback for a share
 */
export function canUserProvideFeedback(
  share: Share | null,
  userEmail: string
): boolean {
  if (!share) return false;
  return share.collaborator_email.toLowerCase() === userEmail.toLowerCase();
}

/**
 * Check if collaborator has started providing any feedback
 */
export async function hasFeedbackStarted(shareId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("collaborator_feedback")
    .select("collaborator_assessment_level, collaborator_notes")
    .eq("share_id", shareId);

  if (error) {
    console.error("Error checking feedback status:", error);
    return false;
  }

  // Check if any feedback has assessment level or notes
  const hasAnyFeedback = (data || []).some(
    (f) => f.collaborator_assessment_level !== null || (f.collaborator_notes && f.collaborator_notes.trim() !== "")
  );

  return hasAnyFeedback;
}

/**
 * Delete a share and all associated data
 */
export async function deleteShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete feedback first (foreign key constraint)
    const { error: feedbackError } = await supabase
      .from("collaborator_feedback")
      .delete()
      .eq("share_id", shareId);

    if (feedbackError) {
      console.error("Error deleting feedback:", feedbackError);
      return { success: false, error: feedbackError.message };
    }

    // Delete snapshots
    const { error: snapshotError } = await supabase
      .from("share_snapshots")
      .delete()
      .eq("share_id", shareId);

    if (snapshotError) {
      console.error("Error deleting snapshots:", snapshotError);
      return { success: false, error: snapshotError.message };
    }

    // Delete the share itself
    const { error: shareError } = await supabase
      .from("shares")
      .delete()
      .eq("id", shareId);

    if (shareError) {
      console.error("Error deleting share:", shareError);
      return { success: false, error: shareError.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in deleteShare:", err);
    return { success: false, error: String(err) };
  }
}
