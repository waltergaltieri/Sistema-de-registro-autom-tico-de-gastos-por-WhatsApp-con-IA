function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhone(id) {
  return onlyDigits(
    String(id || "")
      .replace("@c.us", "")
      .replace("@lid", "")
  );
}

function getContactPhone(contact, fallbackId) {
  const contactNumber = onlyDigits(contact?.number);
  if (contactNumber) return contactNumber;

  const serializedId = contact?.id?._serialized || contact?.id?.user || "";
  if (serializedId && !String(serializedId).includes("@lid")) {
    return normalizePhone(serializedId);
  }

  return normalizePhone(fallbackId);
}

module.exports = {
  getContactPhone,
  normalizePhone,
};
