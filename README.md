# Telegram Web Clone

A high-fidelity front-end clone of Telegram Web — two-pane layout, seeded
conversations, live search, typing indicators, and simulated bot replies.
Vanilla HTML/CSS/JS, zero dependencies, everything inline in one file.

## Features

- **Two-pane layout** — 420px chat list on the left, conversation on the right
- **7 seeded chats** — friends, the "Weekend Squad" group (multiple colored senders),
  a "Tech News" channel, "Saved Messages", and more — all with realistic histories
- **Live search** — filters chats by name or message content as you type
- **Unread badges** — green count pills; opening a chat clears them (muted chats grey)
- **Ticks that animate** — sent `✓` → delivered `✓✓` (grey) → read (blue) on your messages
- **Typing indicator** — header shows "typing..." before a bot auto-reply lands (~1.5s),
  with rotating contextual canned replies per chat
- **Telegram-style avatars** — gradient initial circles, unique per contact
- Inline SVG icons (search, phone, paperclip, emoji, mic); no external assets

## How to run

Just open the file — no server or build step needed:

```bash
open ~/workspace/telegram-clone/index.html
# or: python3 -m http.server, then visit http://localhost:8000
```

Click any chat to open it, type in "Write a message..." and press Enter to send.
