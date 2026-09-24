# Telegram Web Clone

A high-fidelity Telegram Web UI clone — **vanilla HTML/CSS/JS, zero dependencies,
no build step**. Open `index.html` straight from disk (`file://`) or host it anywhere
static.

## Features

- **Chat list** — 12 seeded chats (DMs, 2 groups, 2 channels, Saved Messages, bot),
  live search across names *and* message text, unread badges, mute styling,
  pinned section, right-click menu (pin / mute / mark as read)
- **Conversation view** — date dividers, sender colors in groups, read ticks
  (✓ → ✓✓ → blue), typing indicator, contextual auto-replies, rotating group senders
- **Rich messages** — text, photos (picsum), files, voice messages (playable UI +
  waveform), stickers, quoted replies, "forwarded from" labels
- **Composer** — emoji picker (inserts at cursor, double-click sends sticker),
  attach menu (photo / file), fake voice recorder with live timer,
  reply-to quote bar
- **Message actions** — right-click any bubble: reply, forward (pick-a-chat modal),
  copy text, delete
- **In-chat search** — jump between matches with highlight + counter
- **Info panel** — slide-over with members, shared-media grid, mute toggle
- **Settings** — editable profile name, working toggles (notifications, sounds,
  enter-to-send), accent color picker, persisted to `localStorage`
- **SVG sprite** — all icons in `assets/icons.svg` via `<use>` (inlined in
  `index.html` because browsers block external sprite refs on `file://`)

## Project structure

```
telegram-clone/
├── index.html              # markup skeleton + script/css wiring
├── README.md
├── assets/
│   └── icons.svg           # canonical icon sprite (source of truth)
├── css/
│   ├── variables.css       # design tokens
│   ├── base.css            # reset, avatars, icon buttons
│   ├── layout.css          # app shell, sidebar/pane, responsive
│   ├── chatlist.css        # left panel, rows, badges, search
│   ├── chat.css            # header, bubbles, ticks, context menu, in-chat search
│   ├── inputbar.css        # composer, emoji picker, attach menu, recorder
│   └── panels.css          # info slide-over, settings, forward modal, toast
└── js/
    ├── app.js              # bootstrap, menu wiring, Escape handling
    ├── store.js            # central state (chats, messages, settings)
    ├── bot.js              # typing indicator + contextual auto-replies
    ├── utils/
    │   ├── dom.js          # $, esc, icon(), avatar(), toast()
    │   └── format.js       # time/duration/size formatting, seeded random
    ├── data/
    │   ├── chats.js        # 12 chat definitions
    │   ├── messages.js     # full realistic histories (~180 messages)
    │   └── stickers.js     # sticker packs (emoji grids)
    └── components/
        ├── chatlist.js     # rows, filter, pin/mute/read menu
        ├── chatview.js     # pane, header, in-chat search, message menu, forward modal
        ├── bubbles.js      # bubble renderer (text/image/file/voice/sticker/reply)
        ├── inputbar.js     # composer, emoji/attach/voice recorder, reply bar
        ├── infopanel.js    # chat info slide-over
        └── settings.js     # settings view
```

Scripts are plain classic scripts sharing a global `App` namespace
(`App.utils`, `App.data`, `App.store`, `App.bot`, `App.components.*`) —
deliberately **not** ES modules so everything works from `file://`
(where module CORS fails). Load order in `index.html` matters: utils →
data → store → bot → components → app.

## How to run

No install, no server needed:

```bash
# option 1 — just open it
open index.html            # macOS
xdg-open index.html        # linux

# option 2 — serve it
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Try it

1. Open **Weekend Squad** — a group trek plan with photos, replies and a sticker.
2. Right-click any message → **Reply**, then send — see the quote render.
3. Hit the 📎 **attach** menu → send a photo or file.
4. Tap the 🎤 **mic** → watch the recorder UI, tap again to send a voice bubble.
5. Click a chat **header** → info panel with members + shared media.
6. Hamburger menu (☰) → **Settings** → change the accent color.
