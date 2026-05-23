import { describe, expect, it, vi } from "vitest";
import { processExpenseWithGemini } from "./gemini";

describe("processExpenseWithGemini model selection", () => {
  it("uses gemini-2.5-flash-lite by default", async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    description: "Comprobante",
                    total_amount: 100,
                    confidence: 0.9,
                    short_human_summary: "Gasto de prueba",
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    await processExpenseWithGemini({
      imageBase64: "abc",
      mimeType: "image/jpeg",
      messageText: "",
      senderName: "Walter",
      sentAt: "2026-05-23T00:00:00.000Z",
      categories: [],
    });

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/models/gemini-2.5-flash-lite:generateContent"
    );

    fetchMock.mockRestore();
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_MODEL = originalModel;
  });
});
