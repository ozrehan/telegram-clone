/* ================= netlify/functions/api.js =================
   Telegram-clone backend: ONE Netlify Function, manual routing.
   Node 20+, CommonJS, zero npm deps except @netlify/blobs (vendored).

   Blob layout (store "telegram"):
     users/{username}            {username,name,color,grad,bot,replyPool,salt,hash,createdAt,statusText}
     sessions/{token}            {username, exp}
     chats/{chatId}              {id,type,name,grad,about,statusText,members[],pinned{},muted{},botPool[],createdAt}
     chats/{chatId}/messages     [message docs]
     msgindex/{mid}              chatId
     read/{chatId}/{username}    {ts}          last-read watermark (unread counts)
     typing/{chatId}/{username}  {ts}          ephemeral (6s TTL, filtered on read)
     presence/{username}         {ts}          last activity (online status)
     userchats/{username}        [chatId...]   membership index
     botcursor/{chatId}          {i}           round-robin cursor for bot replies
     meta/seeded                 {ts}
     meta/seeded-user/{username} {ts}

   Bot replies are scheduled SERVER-side as future-ts messages:
   POST /messages writes the reply with ts = now + 3500ms; GET /messages
   only returns ts <= now, and GET /typing treats a pending future message
   as "typing...". No timers needed in serverless.
*/
'use strict';

const crypto = require('node:crypto');

const TYPING_TTL = 6000;
const BOT_DELAY = 3500;
const SESSION_DAYS = 30;
const MAX_DATA_LEN = 2000000;   // ~1.5MB binary
const MAX_TEXT = 4096;
const ONLINE_WINDOW = 5 * 60 * 1000;
const KINDS = ['text', 'image', 'file', 'voice', 'sticker'];
const USER_RE = /^[a-z0-9]{3,20}$/;

function rid(prefix) {
  return (prefix || 'm') + crypto.randomBytes(8).toString('hex');
}

/* SHA-256(password) with per-user salt, hex-encoded. */
function pwHash(password, salt) {
  return crypto.createHash('sha256').update(salt + ':' + password).digest('hex');
}

function newToken() {
  return crypto.randomBytes(16).toString('hex'); // 32 hex chars
}

/* ------------------------------------------------------------------ */
/* app factory: createApp(store, opts) — store is a @netlify/blobs      */
/* store (or an in-memory shim with the same interface for tests).      */
/* ------------------------------------------------------------------ */
function createApp(store, opts) {
  opts = opts || {};
  const now = opts.now || (() => Date.now());
  const seedMod = opts.seed || require('../lib/seed.js');

  const get = (k) => store.get(k, { type: 'json' }).then(v => v == null ? null : v);
  const set = (k, v) => store.setJSON(k, v);
  const del = (k) => store.delete(k);
  const listKeys = async (prefix) => {
    const r = await store.list({ prefix });
    const blobs = r.blobs || r || [];
    return blobs.map(b => b.key || b);
  };

  /* ---------------- users & sessions ---------------- */
  const getUser = (username) => get('users/' + username);

  async function ensureSeeded(username, displayName) {
    const seeded = await get('meta/seeded');
    const { demoUsers, userWorkspace, colorFor } = seedMod.buildSeed();
    if (!seeded) {
      for (const u of demoUsers) {
        if (!(await getUser(u.username))) {
          await set('users/' + u.username, {
            username: u.username, name: u.name, bot: true,
            replyPool: u.replyPool || [], color: u.color, grad: u.grad || 'g2',
            statusText: u.statusText || 'last seen recently',
            createdAt: now()
          });
        }
      }
      await set('meta/seeded', { ts: now() });
    }
    const uSeeded = await get('meta/seeded-user/' + username);
    if (!uSeeded) {
      const { chats, outMessages } = userWorkspace(username, displayName);
      const myChats = [];
      for (const chat of chats) {
        await set('chats/' + chat.id, chat);
        const pack = outMessages[chat.id];
        await set('chats/' + chat.id + '/messages', pack.messages);
        for (const m of pack.messages) await set('msgindex/' + m.mid, chat.id);
        await set('read/' + chat.id + '/' + username, { ts: pack.lastRead });
        myChats.push(chat.id);
        for (const mem of chat.members) {
          const key = 'userchats/' + mem.username;
          const arr = (await get(key)) || [];
          if (!arr.includes(chat.id)) { arr.push(chat.id); await set(key, arr); }
        }
      }
      await set('userchats/' + username, myChats);
      await set('meta/seeded-user/' + username, { ts: now() });
    }
  }

  async function auth(headers) {
    const h = (headers && (headers.authorization || headers.Authorization)) || '';
    const m = /^Bearer (.+)$/.exec(h.trim());
    if (!m) return null;
    let user = null;
    for (let i = 0; i < 5 && !user; i++) {
      const sess = await get('sessions/' + m[1]);
      if (sess && sess.exp >= now()) user = await getUser(sess.username);
      if (!user && i < 4) await new Promise(r => setTimeout(r, 350));
    }
    if (!user) return null;
    // presence heartbeat (best effort)
    set('presence/' + user.username, { ts: now() }).catch(() => {});
    // first-run seeding for this account
    await ensureSeeded(user.username, user.name);
    return user;
  }

  /* ---------------- chats ---------------- */
  const getChat = (id) => get('chats/' + id);
  const getMessages = async (id) => (await get('chats/' + id + '/messages')) || [];
  const setMessages = (id, arr) => set('chats/' + id + '/messages', arr);
  const isMember = (chat, username) => chat.members.some(m => m.username === username);
  const memberOf = (chat, username) => chat.members.find(m => m.username === username);

  function peerStatus(chat, me) {
    if (chat.type === 'dm' || chat.type === 'bot') {
      const peer = chat.members.find(m => m.username !== me.username);
      if (peer) {
        const p = peer._presence;
        if (p && now() - p < ONLINE_WINDOW) return 'online';
        const u = peer._user;
        return (u && u.statusText) || 'last seen recently';
      }
      return '';
    }
    if (chat.type === 'group') return chat.members.length + ' members';
    if (chat.type === 'channel') return chat.statusText || (chat.members.length + ' subscribers');
    return '';
  }

  /** hydrate a chat doc into the frontend's chat shape for `me` */
  async function chatView(chat, me) {
    // attach presence + user records for status computation
    for (const mem of chat.members) {
      const p = await get('presence/' + mem.username);
      mem._presence = p ? p.ts : 0;
      if (mem.username !== me.username) mem._user = await getUser(mem.username);
    }
    const msgs = (await getMessages(chat.id)).filter(m => m.ts <= now());
    const lm = msgs[msgs.length - 1] || null;
    const lr = await get('read/' + chat.id + '/' + me.username);
    const lastRead = lr ? lr.ts : 0;
    const unread = msgs.filter(m => m.ts > lastRead && m.from !== me.username).length;
    // strip private hydrations before sending
    const members = chat.members.map(({ _presence, _user, ...rest }) => rest);
    return {
      id: chat.id, type: chat.type, name: chat.name, grad: chat.grad,
      about: chat.about || '', status: peerStatus({ ...chat, members: chat.members }, me),
      members, unread,
      pinned: !!(chat.pinned && chat.pinned[me.username]),
      muted: !!(chat.muted && chat.muted[me.username]),
      lastMessage: lm ? {
        mid: lm.mid, from: lm.from, kind: lm.kind, text: lm.text || '',
        sender: lm.sender, fileName: lm.fileName, ts: lm.ts
      } : null
    };
  }

  function publicMsg(m) {
    const o = {
      mid: m.mid, from: m.from, kind: m.kind, text: m.text || '',
      ts: m.ts, sender: m.sender, color: m.color
    };
    if (m.src) o.src = m.src;
    if (m.data) o.data = m.data;
    if (m.fileName) o.fileName = m.fileName;
    if (m.fileSize != null) o.fileSize = m.fileSize;
    if (m.duration != null) o.duration = m.duration;
    if (m.replyTo) o.replyTo = m.replyTo;
    if (m.forwardedFrom) o.forwardedFrom = m.forwardedFrom;
    return o;
  }

  /* ---------------- server-side bot ---------------- */
  async function maybeBotReply(chat, senderUser) {
    if (chat.type === 'saved' || chat.type === 'channel') return;
    const t = now();
    if (chat.type === 'dm' || chat.type === 'bot') {
      const peer = chat.members.find(m => m.username !== senderUser.username);
      if (!peer) return;
      const peerUser = await getUser(peer.username);
      if (!peerUser || !peerUser.bot || !peerUser.replyPool.length) return;
      const cur = (await get('botcursor/' + chat.id)) || { i: 0 };
      const text = peerUser.replyPool[cur.i % peerUser.replyPool.length];
      await set('botcursor/' + chat.id, { i: cur.i + 1 });
      await appendMessage(chat, {
        from: peer.username, kind: 'text', text,
        sender: peer.name, color: peer.color, ts: t + BOT_DELAY
      });
      return;
    }
    if (chat.type === 'group') {
      if (!chat.botPool || !chat.botPool.length) return;
      const bots = [];
      for (const mem of chat.members) {
        if (mem.username === senderUser.username) continue;
        const u = await getUser(mem.username);
        if (u && u.bot) bots.push({ mem, u });
      }
      if (!bots.length) return;
      const cur = (await get('botcursor/' + chat.id)) || { i: 0 };
      const pick = bots[cur.i % bots.length];
      const text = chat.botPool[cur.i % chat.botPool.length];
      await set('botcursor/' + chat.id, { i: cur.i + 1 });
      await appendMessage(chat, {
        from: pick.mem.username, kind: 'text', text,
        sender: pick.mem.name, color: pick.mem.color, ts: t + BOT_DELAY
      });
    }
  }

  async function appendMessage(chat, fields) {
    const msg = Object.assign({ mid: rid('m') }, fields);
    const arr = await getMessages(chat.id);
    arr.push(msg);
    await setMessages(chat.id, arr);
    await set('msgindex/' + msg.mid, chat.id);
    return msg;
  }

  /* ---------------- route handler ---------------- */
  async function handle(method, path, query, body, headers) {
    query = query || {};
    body = body || {};
    const seg = path.split('/').filter(Boolean);
    const ok = (json, status) => ({ status: status || 200, json });
    const err = (status, message) => ({ status, json: { error: message } });

    /* --- public: auth --- */
    if (method === 'POST' && seg[0] === 'auth' && (seg[1] === 'signup' || seg[1] === 'login')) {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!USER_RE.test(username)) return err(400, 'Username must be 3-20 chars: a-z, 0-9');
      if (password.length < 6) return err(400, 'Password must be at least 6 characters');
      if (seg[1] === 'signup') {
        const name = String(body.name || '').trim().slice(0, 40);
        if (!name) return err(400, 'Display name is required');
        if (await getUser(username)) return err(409, 'Username is taken');
        const { colorFor } = seedMod.buildSeed();
        const salt = crypto.randomBytes(16).toString('hex');
        const user = {
          username, name, bot: false, color: colorFor(username), grad: 'g2',
          salt, hash: pwHash(password, salt), createdAt: now(),
          statusText: 'last seen recently'
        };
        await set('users/' + username, user);
        await ensureSeeded(username, name);
        const token = newToken();
        await set('sessions/' + token, { username, exp: now() + SESSION_DAYS * 864e5 });
        await set('presence/' + username, { ts: now() });
        return ok({ token, user: { username, name, color: user.color } });
      }
      // login
      const user = await getUser(username);
      if (!user || user.bot || !user.salt ||
          pwHash(password, user.salt) !== user.hash)
        return err(401, 'Invalid username or password');
      const token = newToken();
      await set('sessions/' + token, { username, exp: now() + SESSION_DAYS * 864e5 });
      await set('presence/' + username, { ts: now() });
      return ok({ token, user: { username, name: user.name, color: user.color } });
    }

    /* --- everything else needs auth --- */
    const me = await auth(headers);
    if (!me) return err(401, 'Unauthorized');

    const myChatIds = async () => (await get('userchats/' + me.username)) || [];
    const requireChat = async (id) => {
      const chat = await getChat(id);
      if (!chat || !isMember(chat, me.username)) return null;
      return chat;
    };

    // GET /me
    if (method === 'GET' && seg[0] === 'me' && seg.length === 1)
      return ok({ username: me.username, name: me.name, color: me.color });

    // GET /users/search?q=
    if (method === 'GET' && seg[0] === 'users' && seg[1] === 'search') {
      const q = String(query.q || '').trim().toLowerCase();
      if (!q) return ok({ users: [] });
      const keys = await listKeys('users/');
      const out = [];
      for (const k of keys) {
        const u = await get(k);
        if (!u || u.username === me.username) continue;
        if (u.username.includes(q) || (u.name || '').toLowerCase().includes(q))
          out.push({ username: u.username, name: u.name, bot: !!u.bot, color: u.color });
        if (out.length >= 20) break;
      }
      return ok({ users: out });
    }

    // GET /chats
    if (method === 'GET' && seg[0] === 'chats' && seg.length === 1) {
      const ids = await myChatIds();
      const out = [];
      for (const id of ids) {
        const chat = await getChat(id);
        if (chat) out.push(await chatView(chat, me));
      }
      return ok({ chats: out });
    }

    // POST /chats  {type:'dm',username} | {type:'group',name,memberUsernames[]}
    if (method === 'POST' && seg[0] === 'chats' && seg.length === 1) {
      const type = body.type;
      if (type === 'dm') {
        const other = String(body.username || '').trim().toLowerCase();
        const otherUser = await getUser(other);
        if (!otherUser) return err(404, 'User not found');
        if (other === me.username) return err(400, "You can't chat with yourself");
        // reuse existing dm
        for (const id of await myChatIds()) {
          const c = await getChat(id);
          if (c && (c.type === 'dm' || c.type === 'bot') &&
              c.members.some(m => m.username === other))
            return ok({ chat: await chatView(c, me) });
        }
        const { colorFor } = seedMod.buildSeed();
        const chat = {
          id: rid('c'), type: 'dm', name: otherUser.name, grad: otherUser.grad || 'g2',
          about: '', statusText: otherUser.statusText || '',
          members: [
            { username: me.username, name: me.name, color: me.color, role: 'member' },
            { username: other, name: otherUser.name, color: otherUser.color, role: 'member' }
          ],
          pinned: {}, muted: {},
          botPool: otherUser.bot ? (otherUser.replyPool || []) : [],
          createdAt: now()
        };
        await set('chats/' + chat.id, chat);
        await set('chats/' + chat.id + '/messages', []);
        await set('read/' + chat.id + '/' + me.username, { ts: now() });
        await set('read/' + chat.id + '/' + other, { ts: now() });
        for (const u of [me.username, other]) {
          const arr = (await get('userchats/' + u)) || [];
          arr.push(chat.id); await set('userchats/' + u, arr);
        }
        return ok({ chat: await chatView(chat, me) }, 201);
      }
      if (type === 'group') {
        const name = String(body.name || '').trim().slice(0, 60);
        if (!name) return err(400, 'Group name is required');
        const want = Array.isArray(body.memberUsernames) ? body.memberUsernames : [];
        const members = [{ username: me.username, name: me.name, color: me.color, role: 'admin' }];
        const grads = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
        for (const un of want) {
          const u = await getUser(String(un).toLowerCase());
          if (u && u.username !== me.username &&
              !members.some(m => m.username === u.username))
            members.push({ username: u.username, name: u.name, color: u.color, role: 'member' });
        }
        const chat = {
          id: rid('c'), type: 'group', name,
          grad: grads[Math.floor(Math.random() * grads.length)],
          about: '', statusText: '', members,
          pinned: {}, muted: {},
          botPool: ['+1 for that', "I'm in 🙋", 'lol classic', 'Sounds good!', 'On my way'],
          createdAt: now()
        };
        await set('chats/' + chat.id, chat);
        await set('chats/' + chat.id + '/messages', []);
        for (const m of members) {
          await set('read/' + chat.id + '/' + m.username, { ts: now() });
          const arr = (await get('userchats/' + m.username)) || [];
          arr.push(chat.id); await set('userchats/' + m.username, arr);
        }
        // system message
        await appendMessage(chat, {
          from: me.username, kind: 'text', text: me.name + ' created the group',
          sender: me.name, color: me.color, ts: now()
        });
        return ok({ chat: await chatView(chat, me) }, 201);
      }
      return err(400, 'type must be "dm" or "group"');
    }

    /* --- /chats/:id/* --- */
    if (seg[0] === 'chats' && seg[1]) {
      const chat = await requireChat(seg[1]);
      if (!chat) return err(404, 'Chat not found');
      const sub = seg[2];

      // GET /chats/:id/messages?after=
      if (method === 'GET' && sub === 'messages') {
        const after = parseFloat(query.after || '0') || 0;
        const t = now();
        const msgs = (await getMessages(chat.id))
          .filter(m => m.ts > after && m.ts <= t)
          .sort((a, b) => a.ts - b.ts)
          .map(publicMsg);
        return ok({ messages: msgs, now: t });
      }

      // POST /chats/:id/messages
      if (method === 'POST' && sub === 'messages') {
        if (chat.type === 'channel') return err(403, 'Only admins can post to channels');
        const kind = body.kind || 'text';
        if (!KINDS.includes(kind)) return err(400, 'Bad kind');
        const text = String(body.text || '').slice(0, MAX_TEXT);
        const data = body.data ? String(body.data) : null;
        if (data && data.length > MAX_DATA_LEN) return err(413, 'Attachment too large (max ~1.5MB)');
        if (!text && !data && kind !== 'voice' && kind !== 'sticker')
          return err(400, 'Empty message');
        const mem = memberOf(chat, me.username);
        const msg = {
          from: me.username, kind, text,
          sender: me.name, color: mem ? mem.color : me.color, ts: now()
        };
        if (data) msg.data = data;
        if (body.fileName) msg.fileName = String(body.fileName).slice(0, 120);
        if (body.fileSize != null) msg.fileSize = Math.max(0, parseInt(body.fileSize, 10) || 0);
        if (body.duration != null) msg.duration = Math.max(0, parseInt(body.duration, 10) || 0);
        if (body.forwardedFrom) msg.forwardedFrom = String(body.forwardedFrom).slice(0, 80);
        if (body.replyTo && body.replyTo.mid) {
          const all = await getMessages(chat.id);
          const q = all.find(x => x.mid === body.replyTo.mid);
          if (q) msg.replyTo = {
            mid: q.mid,
            sender: q.from === me.username ? 'You' : (q.sender || chat.name),
            text: (q.text || '').slice(0, 140)
          };
        }
        const saved = await appendMessage(chat, msg);
        // bot auto-reply scheduled server-side (future-ts message)
        await maybeBotReply(chat, me).catch(() => {});
        return ok({ message: publicMsg(saved) }, 201);
      }

      // POST /chats/:id/read
      if (method === 'POST' && sub === 'read') {
        await set('read/' + chat.id + '/' + me.username, { ts: now() });
        return ok({ ok: true });
      }

      // POST /chats/:id/typing
      if (method === 'POST' && sub === 'typing') {
        await set('typing/' + chat.id + '/' + me.username, { ts: now() });
        return ok({ ok: true });
      }

      // GET /chats/:id/typing
      if (method === 'GET' && sub === 'typing') {
        const t = now();
        const keys = await listKeys('typing/' + chat.id + '/');
        const seen = new Map();
        for (const k of keys) {
          const un = k.split('/').pop();
          if (un === me.username) continue;
          const rec = await get(k);
          if (rec && t - rec.ts < TYPING_TTL) {
            const u = await getUser(un);
            seen.set(un, u ? u.name : un);
          }
        }
        // pending server-scheduled bot replies show as typing too
        const pending = (await getMessages(chat.id)).filter(m => m.ts > t);
        for (const m of pending) seen.set(m.from, m.sender || m.from);
        return ok({
          typing: [...seen.entries()].map(([username, name]) => ({ username, name }))
        });
      }

      // GET /chats/:id/info
      if (method === 'GET' && sub === 'info') {
        const t = now();
        const media = (await getMessages(chat.id))
          .filter(m => m.kind === 'image' && m.ts <= t && (m.src || m.data))
          .slice(-50)
          .map(m => ({ mid: m.mid, src: m.src || m.data, ts: m.ts }));
        return ok({
          id: chat.id, name: chat.name, type: chat.type,
          about: chat.about || '', grad: chat.grad,
          members: chat.members.map(m => ({
            username: m.username, name: m.name, color: m.color, role: m.role
          })),
          media, canSend: chat.type !== 'channel'
        });
      }

      // POST /chats/:id/pin  |  /mute  (per-user toggles)
      if (method === 'POST' && (sub === 'pin' || sub === 'mute')) {
        const key = sub === 'pin' ? 'pinned' : 'muted';
        chat[key] = chat[key] || {};
        if (chat[key][me.username]) delete chat[key][me.username];
        else chat[key][me.username] = true;
        await set('chats/' + chat.id, chat);
        return ok({ [key]: !!chat[key][me.username] });
      }

      return err(404, 'Not found');
    }

    /* --- POST /messages/:id/delete  and  DELETE /messages/:id
           (own messages only; both spellings supported) --- */
    const deleteMessage = async (mid) => {
      const chatId = await get('msgindex/' + mid);
      if (!chatId) return err(404, 'Message not found');
      const chat = await requireChat(chatId);
      if (!chat) return err(404, 'Chat not found');
      const arr = await getMessages(chatId);
      const i = arr.findIndex(m => m.mid === mid);
      if (i < 0) return err(404, 'Message not found');
      if (arr[i].from !== me.username) return err(403, "You can only delete your own messages");
      arr.splice(i, 1);
      await setMessages(chatId, arr);
      await del('msgindex/' + mid);
      return ok({ ok: true });
    };
    if (method === 'POST' && seg[0] === 'messages' && seg[2] === 'delete') {
      return deleteMessage(seg[1]);
    }
    if (method === 'DELETE' && seg[0] === 'messages' && seg[1] && seg.length === 2) {
      return deleteMessage(seg[1]);
    }

    return err(404, 'Not found');
  }

  return { handle };
}

/* ---------------- Netlify Function entrypoint ----------------
   Blobs are configured from the injected event.blobs context (the same
   pattern as the WhatsApp clone). If Blobs is unavailable the function
   falls back to an ephemeral in-memory store so it always answers
   instead of crashing. */
async function handler(event) {
  let store = null;
  try {
    const blobs = require("@netlify/blobs");
    try {
      const _c = JSON.parse(Buffer.from(event.blobs, "base64").toString());
      blobs.setEnvironmentContext({
        siteID: event.headers["x-nf-site-id"],
        token: _c.token,
        apiURL: "https://api.netlify.com",
      });
    } catch (e) { /* not on Netlify: local tests */ }
    store = blobs.getStore("telegram");
    // Probe the store early so a misconfigured Blobs env fails here,
    // inside our try/catch, instead of crashing the invocation.
    await store.get("__probe__").catch(() => null);
  } catch (e) {
    store = null;
  }
  if (!store) {
    // Fallback: in-memory store (ephemeral). Mimics the @netlify/blobs
    // subset the app factory uses: get(k,{type:'json'}), setJSON,
    // set, delete, list({prefix}).
    const mem = new Map();
    store = {
      get: async (k, opts) => {
        if (!mem.has(k)) return null;
        const v = mem.get(k);
        if (opts && opts.type === "json") {
          try { return JSON.parse(v); } catch (e) { return null; }
        }
        return v;
      },
      setJSON: async (k, v) => { mem.set(k, JSON.stringify(v)); },
      set: async (k, v) => { mem.set(k, typeof v === "string" ? v : JSON.stringify(v)); },
      delete: async (k) => { mem.delete(k); },
      list: async (opts) => {
        const prefix = (opts && opts.prefix) || "";
        return { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
      },
    };
  }
  try {
    const app = createApp(store);
    // event.path: /.netlify/functions/api/auth/login  ->  /auth/login
    // (also handles the /api/* rewrite form: /api/auth/login)
    let path = event.path || "/";
    path = path.replace(/^\/\.netlify\/functions\/api/, "");
    path = path.replace(/^\/api/, "") || "/";
    if (!path.startsWith("/")) path = "/" + path;
    let body = {};
    if (event.body) {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
      try { body = JSON.parse(raw); } catch (e) {
        return {
          statusCode: 400,
          headers: Object.assign({ 'Content-Type': 'application/json' }, cors()),
          body: JSON.stringify({ error: 'invalid JSON body' })
        };
      }
    }
    if (event.httpMethod === 'OPTIONS')
      return { statusCode: 204, headers: cors(), body: '' };
    const res = await app.handle(
      event.httpMethod, path, event.queryStringParameters || {}, body, event.headers || {});
    return {
      statusCode: res.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, cors()),
      body: JSON.stringify(res.json)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: Object.assign({ 'Content-Type': 'application/json' }, cors()),
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };
}

module.exports = { handler, createApp };

/* local smoke: node netlify/functions/api.js (runs nothing, just loads) */
