interface AutoLinkDecisionInput {
  currentLinkedGroupId: string | null;
  syncedGroupCount: number;
}

export function shouldAutoLinkSyncedWhatsAppGroup(
  input: AutoLinkDecisionInput
) {
  void input;
  return false;
}
