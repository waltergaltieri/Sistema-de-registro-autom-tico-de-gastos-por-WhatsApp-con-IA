export function getOrganizationFileHashFilters(
  organizationId: string,
  fileHash: string
) {
  return [
    ["organization_id", organizationId],
    ["file_sha256", fileHash],
  ] as const;
}

export function buildStorageUploadFailureReply() {
  return {
    ok: false,
    error: "Storage upload failed",
    reply_text:
      "⚠️ No pude guardar el comprobante en el sistema. Intentá enviarlo nuevamente.",
  };
}
