import { describe, expect, it } from "vitest";
import { isSupportedBotCommand } from "./bot-commands";

describe("isSupportedBotCommand", () => {
  it("accepts bot commands that the worker knows how to execute", () => {
    expect(isSupportedBotCommand("send_test_message")).toBe(true);
    expect(isSupportedBotCommand("logout_whatsapp")).toBe(true);
    expect(isSupportedBotCommand("sync_groups")).toBe(true);
  });

  it("rejects unknown command names", () => {
    expect(isSupportedBotCommand("")).toBe(false);
    expect(isSupportedBotCommand("delete_everything")).toBe(false);
  });
});
