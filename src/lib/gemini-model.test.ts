import { describe, expect, it, vi } from "vitest";
import { getGeminiModelCandidates, processExpenseWithGemini } from "./gemini";

describe("getGeminiModelCandidates", () => {
  it("tries the configured model first and keeps gemini-2.5-flash-lite as fallback", () => {
    expect(getGeminiModelCandidates("gemini-2.0-flash")).toEqual([
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
    ]);
  });

  it("does not duplicate the default model", () => {
    expect(getGeminiModelCandidates("gemini-2.5-flash-lite")).toEqual([
      "gemini-2.5-flash-lite",
    ]);
  });
});

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

  it("falls back to gemini-2.5-flash-lite when configured model is exhausted", async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-2.0-flash";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "quota exceeded",
      } as Response)
      .mockResolvedValueOnce({
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/models/gemini-2.0-flash:generateContent"
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      "/models/gemini-2.5-flash-lite:generateContent"
    );

    fetchMock.mockRestore();
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_MODEL = originalModel;
  });
});
