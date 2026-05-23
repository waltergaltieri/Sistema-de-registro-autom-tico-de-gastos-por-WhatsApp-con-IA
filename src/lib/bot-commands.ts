export const SUPPORTED_BOT_COMMANDS = [
  "send_test_message",
  "logout_whatsapp",
  "sync_groups",
] as const;

export type SupportedBotCommand = (typeof SUPPORTED_BOT_COMMANDS)[number];

export function isSupportedBotCommand(
  command: string
): command is SupportedBotCommand {
  return SUPPORTED_BOT_COMMANDS.includes(command as SupportedBotCommand);
}
