delete from bot_message_logs older
using bot_message_logs newer
where older.whatsapp_message_id is not null
  and older.whatsapp_message_id = newer.whatsapp_message_id
  and older.created_at < newer.created_at;

create unique index if not exists idx_bot_message_logs_whatsapp_message_id_unique
  on bot_message_logs(whatsapp_message_id)
  where whatsapp_message_id is not null;
