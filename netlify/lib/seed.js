/* ================= netlify/lib/seed.js =================
   Builds backend seed objects from the frontend's js/data/*.js files
   (single source of truth — loaded with a `window` shim since the data
   files are plain browser scripts).

   Exports:
     buildSeed() -> {
       demoUsers: [{username,name,bot,replyPool,color,grad,statusText}],
       groupBots: [{username,name,color}],
       userWorkspace(username, displayName) -> { chats, messages }
         // chats: server chat docs for a brand-new real user
         // messages: { chatId: [server message docs] }
     }
*/
'use strict';

const path = require('node:path');

function loadData() {
  if (global.window && global.window.App && global.window.App.data) {
    return global.window.App.data;
  }
  // `window` must BE the global object: the data files use bare `App`
  // (works in browsers because window === globalThis there).
  global.window = global;
  global.App = undefined;
  const dataDir = path.join(__dirname, '..', '..', 'js', 'data');
  require(path.join(dataDir, 'chats.js'));
  require(path.join(dataDir, 'messages.js'));
  return global.window.App.data;
}

/* avatar gradient -> representative hex (for group sender colors) */
const GRAD_COLORS = {
  g1: '#d45246', g2: '#3f7db5', g3: '#4a9e1e', g4: '#7b4b94',
  g5: '#e07b1f', g6: '#2f80ed', g7: '#c93a6e', g8: '#2a9e76'
};

const PALETTE = ['#d45246', '#2f80ed', '#4a9e1e', '#7b4b94',
  '#e07b1f', '#c93a6e', '#2a9e76', '#5682a3'];

function colorFor(username) {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** assign seed timestamps: last message 30s ago, earlier ones 2min apart */
function stampSeedTimes(sms) {
  const base = Date.now() - 30000;
  for (let i = 0; i < sms.length; i++)
    sms[i].ts = base - (sms.length - 1 - i) * 120000;
  return sms;
}

let _mid = 1;
const mid = () => 's' + (_mid++);

/**
 * Convert one demo message into a server message doc.
 * mapFrom: username to use when the demo message is from 'me'.
 * mapThem: username to use when from 'them' but no sender name (DMs).
 * resolveSender(name): username for a group sender display name.
 */
function toServerMsg(m, mapFrom, mapThem, resolveSender) {
  const fromMe = m.from === 'me';
  const senderName = fromMe ? null : (m.sender || null);
  const out = {
    mid: mid(),
    from: fromMe ? mapFrom : (senderName ? resolveSender(senderName) : mapThem),
    kind: m.kind || 'text',
    text: m.text || ''
  };
  if (m.src) out.src = m.src;
  if (m.fileName) out.fileName = m.fileName;
  if (m.fileSize) out.fileSize = m.fileSize;
  if (m.duration != null) out.duration = m.duration;
  if (m.replyTo) out.replyTo = { sender: m.replyTo.sender, text: m.replyTo.text };
  if (m.forwardedFrom) out.forwardedFrom = m.forwardedFrom;
  if (senderName) out._senderName = senderName; // resolved later against member list
  if (m.color) out._color = m.color;
  return out;
}

function buildSeed() {
  const data = loadData();
  const chats = data.chats;
  const messages = data.messages;

  /* username for a group member display name; 'You' handled by caller */
  const nameToUser = {};
  const groupBots = [];

  // DM contacts become demo users (username = chat id)
  const demoUsers = [];
  for (const c of chats) {
    if (c.type === 'dm' || c.type === 'bot') {
      demoUsers.push({
        username: c.id,
        name: c.name,
        bot: true,
        replyPool: (c.replies && c.replies.length ? c.replies : ['Got it 👍']),
        color: GRAD_COLORS[c.grad] || '#5682a3',
        grad: c.grad,
        statusText: c.status || 'last seen recently'
      });
      nameToUser[c.name.toLowerCase()] = c.id;
    }
  }

  // Group members become bot users (dedupe against DM contacts by name)
  for (const c of chats) {
    if (c.type !== 'group' || !c.members) continue;
    for (const mm of c.members) {
      if (/^you$/i.test(mm.name)) continue;
      const key = mm.name.toLowerCase();
      if (nameToUser[key]) continue; // e.g. 'Rohan Verma' -> existing 'rohan'
      const username = key.replace(/[^a-z0-9]/g, '');
      nameToUser[key] = username;
      groupBots.push({ username, name: mm.name, bot: true, replyPool: [], color: mm.color, grad: 'g2', statusText: 'last seen recently' });
    }
  }
  const allDemoUsers = demoUsers.concat(groupBots);

  // channel author pseudo-users
  const channelAuthors = [];
  for (const c of chats) {
    if (c.type === 'channel') {
      channelAuthors.push({ username: c.id, name: c.name, bot: true, replyPool: [], color: GRAD_COLORS[c.grad] || '#5682a3', grad: c.grad, statusText: c.status });
      nameToUser[c.name.toLowerCase()] = c.id;
    }
  }

  const resolveSender = (chat) => (displayName) => {
    if (/^you$/i.test(displayName)) return '__ME__';
    const key = String(displayName).toLowerCase();
    return nameToUser[key] || key.replace(/[^a-z0-9]/g, '') || 'unknown';
  };

  /**
   * Build the full workspace (chats + messages) for a new real user.
   */
  function userWorkspace(username, displayName) {
    const outChats = [];
    const outMessages = {};
    const meColor = colorFor(username);

    const finalizeMsg = (sm, chat) => {
      const mem = chat.members.find(x => x.username === sm.from);
      sm.sender = mem ? mem.name : sm._senderName || displayName;
      sm.color = mem ? mem.color : (sm._color || meColor);
      delete sm._senderName; delete sm._color;
      return sm;
    };

    for (const c of chats) {
      const chatId = c.type === 'saved' ? 'saved-' + username
        : (c.type === 'dm' || c.type === 'bot') ? 'dm-' + username + '-' + c.id
        : 'grp-' + username + '-' + c.id;

      const members = [];
      if (c.type === 'dm' || c.type === 'bot' || c.type === 'saved') {
        members.push({ username, name: displayName, color: meColor, role: 'member' });
        if (c.type !== 'saved') {
          const peer = demoUsers.find(u => u.username === c.id);
          members.push({ username: c.id, name: peer.name, color: peer.color, role: 'member' });
        }
      } else if (c.type === 'group') {
        for (const mm of c.members) {
          if (/^you$/i.test(mm.name)) {
            members.push({ username, name: displayName, color: meColor, role: mm.role });
          } else {
            const un = nameToUser[mm.name.toLowerCase()];
            members.push({ username: un, name: mm.name, color: mm.color, role: mm.role });
          }
        }
      } else if (c.type === 'channel') {
        members.push({ username: c.id, name: c.name, color: GRAD_COLORS[c.grad] || '#5682a3', role: 'admin' });
        members.push({ username, name: displayName, color: meColor, role: 'subscriber' });
      }

      const chat = {
        id: chatId,
        type: c.type,
        name: c.type === 'saved' ? 'Saved Messages' : c.name,
        grad: c.grad,
        about: c.about || '',
        statusText: c.status || '',
        members,
        pinned: {},
        muted: {},
        botPool: (c.type === 'dm' || c.type === 'bot' || c.type === 'group') ? (c.replies || []) : [],
        createdAt: Date.now()
      };
      // seed pinned/unmuted from demo flags
      if (c.pinned) chat.pinned[username] = true;
      if (c.muted) chat.muted[username] = true;

      const rs = resolveSender(chat);
      const mapThem = (c.type === 'dm' || c.type === 'bot' || c.type === 'channel') ? c.id : null;
      const sms = stampSeedTimes((messages[c.id] || []).map(m => {
        const sm = toServerMsg(m, username, mapThem, (dn) => {
          const r = rs(dn);
          return r === '__ME__' ? username : r;
        });
        return finalizeMsg(sm, chat);
      }));
      // seed unreads: demo unread counts -> mark read cutoff before last N messages
      const unread = c.unread || 0;
      const lastRead = unread > 0 && sms.length
        ? sms[Math.max(0, sms.length - unread - 1)].ts
        : Date.now();

      outChats.push(chat);
      outMessages[chatId] = { messages: sms, lastRead };
    }
    return { chats: outChats, outMessages };
  }

  return { demoUsers: allDemoUsers.concat(channelAuthors), userWorkspace, colorFor, GRAD_COLORS };
}

module.exports = { buildSeed };
