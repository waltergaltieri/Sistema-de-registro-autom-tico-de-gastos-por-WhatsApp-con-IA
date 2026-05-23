import { describe, expect, it } from "vitest";
import phoneUtils from "./phone.js";

const { getContactPhone, normalizePhone } = phoneUtils;

describe("normalizePhone", () => {
  it("keeps only the phone digits from WhatsApp ids", () => {
    expect(normalizePhone("5491125050687@c.us")).toBe("5491125050687");
  });
});

describe("getContactPhone", () => {
  it("prefers the contact phone number when WhatsApp sends a lid author", () => {
    const contact = {
      number: "5491125050687",
      id: { _serialized: "72478361710620@lid" },
    };

    expect(getContactPhone(contact, "72478361710620@lid")).toBe("5491125050687");
  });

  it("falls back to c.us ids when the contact number is missing", () => {
    const contact = {
      id: { _serialized: "5491164003510@c.us" },
    };

    expect(getContactPhone(contact, "72478361710620@lid")).toBe("5491164003510");
  });
});
