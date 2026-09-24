# Telegram Web Clone — now a real full-stack prototype


**Live demo:** [https://ozrehan-telegram-clone.netlify.app](https://ozrehan-telegram-clone.netlify.app)

A high-fidelity Telegram Web UI clone with a **working backend**: real accounts,
real 1:1 DMs and groups between actual users, server-persisted history, and
server-side bot contacts. **Netlify Functions + Netlify Blobs**, zero framework,
vanilla JS frontend.

## What really works now

- **Accounts** — sign up / log in (scrypt-hashed passwords, 30-day sessions).
  Your chats follow you to any browser you log in on.
- **Real messaging** — two browsers logged in as different users can DM each
  other; messages arrive via 2.5s polling, with unread badges, read markers,
  and live "typing..." indicators both ways.
- **Groups** — create groups with a name + picked members; everyone in the
  group sees everything.
- **Demo contacts** — the original 12 seeded chats (Arjun, Weekend Squad,
  Tech News…) are per-account; the contacts are bot users that reply
  **server-side** (typing indicator → reply after ~3.5s, no client timers).
- **Attachments** — photos/files are really uploaded (data URLs, ≤1.5MB) and
  stored with the message; voice notes, stickers, quoted replies, forwards,
  and per-user pin/mute all persist server-side.

## Features (UI, 100% preserved)

- **Chat list** — live search, unread badges, mute styling, pinned section,
  right-click menu (pin / mute / mark as read), compose FAB for new chats
- **Conversation view** — sender colors in groups, read ticks, typing indicator,
  in-chat search with match jumping
- **Rich messages** — text, photos, files, voice messages (waveform UI),
  stickers, quoted replies, "forwarded from" labels
- **Composer** — emoji picker (inserts at cursor, double-click sends sticker),
  attach menu (real file picker), voice recorder with live timer, reply bar
- **Message actions** — right-click: reply, forward (pick-a-chat modal),
  copy text, delete (own messages, server-enforced)
- **Info panel** — members, shared-media grid, mute toggle
- **Settings** — working toggles, accent color picker, log out

## Project structure

```
telegram-clone/
├── index.html              # markup skeleton + script/css wiring
├── netlify.toml            # functions dir + /api/* -> function rewrite
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
│   ├── panels.css          # info slide-over, settings, forward modal, toast
│   └── auth.css            # login/signup screen, compose FAB, new-chat modal
├── netlify/
│   ├── functions/
│   │   ├── api.js          # THE backend: one function, manual routing
│   │   ├── package.json    # + vendored node_modules (@netlify/blobs)
│   │   └── node_modules/   # vendored deps (ships in the deploy zip)
│   ├── lib/
│   │   └── seed.js         # builds seed data from js/data/*.js (single source)
│   └── tests/
│       └── api.test.js     # 15 backend test groups (node netlify/tests/api.test.js)
└── js/
    ├── app.js              # bootstrap, auth gate, menu wiring, Escape handling
    ├── api.js              # fetch wrapper, token mgmt, server->UI normalization
    ├── store.js            # central state, now server-backed (cache + sync)
    ├── utils/
    │   ├── dom.js          # $, esc, icon(), avatar(), toast()
    │   └── format.js       # time/duration/size formatting, seeded random
    ├── data/
    │   ├── chats.js        # demo chat definitions (seed source for the backend)
    │   ├── messages.js     # demo histories (seed source for the backend)
    │   └── stickers.js     # sticker packs (emoji grids, still used by picker)
    └── components/
        ├── auth.js         # Telegram-styled login/signup screen
        ├── newchat.js      # user search -> real DM; group creation modal
        ├── chatlist.js     # rows, filter, pin/mute/read menu
        ├── chatview.js     # pane, header, in-chat search, message menu,
        │                   # forward modal, 2.5s poll loop (messages + typing)
        ├── bubbles.js      # bubble renderer (text/image/file/voice/sticker/reply)
        ├── inputbar.js     # composer, emoji/attach/voice recorder, reply bar
        ├── infopanel.js    # chat info slide-over
        └── settings.js     # settings view + log out
```

Scripts are plain classic scripts sharing a global `App` namespace —
deliberately **not** ES modules so the frontend has no build step.
Load order in `index.html`: utils → api → data(stickers) → store →
components → app.

## Backend API (`netlify/functions/api.js`)

One Netlify Function, manual routing, Node 20+, CommonJS. Only dependency:
`@netlify/blobs` (vendored). Passwords: scrypt. Auth: Bearer sessions,
30-day expiry.

| Method & path | What it does |
|---|---|
| `POST /api/auth/signup` | `{username,password,name}` → `{token,user}`; seeds your demo chats |
| `POST /api/auth/login` | `{username,password}` → `{token,user}` |
| `GET /api/me` | your profile |
| `GET /api/chats` | your chats, each with `lastMessage` + `unreadCount` |
| `POST /api/chats` | `{type:"dm",username}` → real 1:1 chat (reuses existing); `{type:"group",name,memberUsernames[]}` |
| `GET /api/chats/:id/messages?after=<ts>` | poll endpoint — returns messages with `after < ts <= now` |
| `POST /api/chats/:id/messages` | send `{text,kind,data?,fileName?,fileSize?,duration?,replyTo?}`; bot contacts get a server-scheduled reply |
| `POST /api/chats/:id/read` | mark read (resets your unread) |
| `POST /api/chats/:id/typing` | ephemeral typing ping (6s TTL) |
| `GET /api/chats/:id/typing` | who's typing (real users + pending bot replies) |
| `POST /api/messages/:id/delete` | delete your own message |
| `GET /api/users/search?q=` | find registered users to chat with |
| `GET /api/chats/:id/info` | members + shared media |
| `POST /api/chats/:id/pin`, `/mute` | per-user pin/mute toggles |

Bot replies are scheduled **server-side as future-timestamp messages**:
when you message a bot contact, the reply is written with
`ts = now + 3500ms`; the messages endpoint only returns `ts <= now`, and
the typing endpoint treats a pending future message as "typing...".
No timers, works on serverless.

Run the backend tests (in-memory blob shim, controllable clock):

```bash
node netlify/tests/api.test.js   # 15 test groups, exits 0
```

## How to run

The frontend needs the backend, so serve it where `/api/*` resolves —
easiest is the deployed Netlify site, or Netlify Dev:

```bash
npm i -g netlify-cli
netlify dev        # serves the site + functions at http://localhost:8888
```

Deploy (the zip ships everything, functions + vendored deps included):

```bash
zip -qr telegram-fullstack.zip . -x "*.DS_Store*"
# upload via Netlify API / dashboard / CLI
```

## Try it

1. **Sign up** as e.g. `rehan` — your 12 demo chats are seeded instantly.
2. Open **Arjun Mehta**, send a message — watch "typing..." then his reply
   arrive ~3.5s later (server-side bot, works even if you switch chats).
3. **Sign up a second user** in another browser/incognito → search them with
   the ✏️ compose button → start a **real DM** and message back and forth.
4. Create a **group** with the compose button; post from both accounts.
5. Attach a real photo (📎 → Photo) — it's uploaded and stored with the message.
