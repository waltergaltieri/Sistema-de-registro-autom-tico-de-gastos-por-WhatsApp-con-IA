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

export function getMaxIncomingMessageAgeHours(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24;
  }

  return parsed;
}

export function isIncomingMessageTooOld(
  sentAt: string | null | undefined,
  now: Date,
  maxAgeHours: number
) {
  if (!sentAt) {
    return false;
  }

  const sentAtDate = new Date(sentAt);

  if (Number.isNaN(sentAtDate.getTime())) {
    return false;
  }

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return now.getTime() - sentAtDate.getTime() > maxAgeMs;
}

export function buildStaleMessageReply(maxAgeHours: number) {
  return {
    ok: false,
    error: "Message too old",
    reply_text:
      `⚠️ No procesé este comprobante porque el mensaje tiene más de ${maxAgeHours} horas. ` +
      "Reenvialo al grupo si querés registrarlo.",
  };
}
