alter table chats
add column last_message_id uuid references messages(id);