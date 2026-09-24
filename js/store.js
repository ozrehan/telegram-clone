/* ================= store.js — central state (server-backed) =================
   Chats and messages live in Netlify Blobs via App.api.
   The store caches them locally and keeps the same public API
   the components were written against.
*/
'use strict';
window.App = window.App || {};

/**
 * App.store — single source of truth.
 * state.chats: server chat views {id,name,type,grad,status,about,members,
 *   unread,pinned,muted,lastMessage}
 * state.messages[chatId]: cached server messages {mid,from,kind,text,src,
 *   data,fileName,fileSize,duration,replyTo,forwardedFrom,ts,sender,color,time}
 */
App.store = (() => {
  const state = {
    chats: [],
    messages: {},
    activeId: null,
    replyTo: null,          // {mid, sender, text} quoted in the composer
    filter: '',
    settings: {
      profileName: 'Rehan',
      notifications: true,
      sounds: true,
      enterToSend: true,
      accent: '#5682a3'
    }
  };

  /* ---------- persistence (best-effort; file:// safe) ---------- */
  function saveSettings() {
    try { localStorage.setItem('tgclone-settings', JSON.stringify(state.settings)); } catch (e) {}
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem('tgclone-settings');
      if (raw) Object.assign(state.settings, JSON.parse(raw));
    } catch (e) {}
  }

  /* ---------- reads ---------- */
  const getChat = id => state.chats.find(c => c.id === id);
  const getMessages = id => state.messages[id] || [];
  const findMessage = (chatId, mid) => getMessages(chatId).find(m => m.mid === mid);
  const lastMessage = chat => chat.lastMessage || null;

  /* pinned chats first, then by recency of last message (stable otherwise) */
  function sortedChats() {
    const byRecency = (a, b) =>
      ((b.lastMessage && b.lastMessage.ts) || 0) - ((a.lastMessage && a.lastMessage.ts) || 0);
    const pinned = state.chats.filter(c => c.pinned).sort(byRecency);
    const rest = state.chats.filter(c => !c.pinned).sort(byRecency);
    return pinned.concat(rest);
  }

  /* ---------- server sync ---------- */
  async function loadChats() {
    const d = await App.api.chats();
    state.chats = d.chats;
    return state.chats;
  }

  async function loadMessages(chatId) {
    const d = await App.api.messages(chatId, 0);
    state.messages[chatId] = d.messages;
    return d.messages;
  }

  /** merge freshly polled messages into the cache; returns the new ones */
  function mergeMessages(chatId, msgs) {
    const cache = state.messages[chatId] || (state.messages[chatId] = []);
    const have = new Set(cache.map(m => m.mid));
    const fresh = msgs.filter(m => !have.has(m.mid));
    if (fresh.length) {
      cache.push(...fresh);
      cache.sort((a, b) => a.ts - b.ts);
    }
    return fresh;
  }

  function touchLastMessage(chatId, m) {
    const chat = getChat(chatId);
    if (chat) chat.lastMessage = {
      mid: m.mid, from: m.from, kind: m.kind, text: m.text || '',
      sender: m.sender, fileName: m.fileName, ts: m.ts, time: m.time
    };
  }

  async function sendMessage(chatId, payload) {
    const d = await App.api.send(chatId, payload);
    const cache = state.messages[chatId] || (state.messages[chatId] = []);
    if (!cache.some(m => m.mid === d.message.mid)) {
      cache.push(d.message);
      cache.sort((a, b) => a.ts - b.ts);
    }
    touchLastMessage(chatId, d.message);
    return d.message;
  }

  async function deleteMessage(chatId, mid) {
    await App.api.deleteMessage(mid);
    const arr = state.messages[chatId] || [];
    const i = arr.findIndex(m => m.mid === mid);
    if (i >= 0) arr.splice(i, 1);
  }

  /* ---------- local mutations ---------- */
  function setActive(id) {
    state.activeId = id;
    state.replyTo = null;
  }
  function setReplyTo(q) { state.replyTo = q; }

  async function clearUnread(id) {
    const c = getChat(id);
    if (c) c.unread = 0;
    try { await App.api.markRead(id); } catch (e) {}
  }
  async function togglePin(id) {
    const c = getChat(id);
    if (!c) return;
    try {
      const d = await App.api.pin(id);
      c.pinned = d.pinned;
    } catch (e) { App.utils.toast(e.message); }
  }
  async function toggleMute(id) {
    const c = getChat(id);
    if (!c) return;
    try {
      const d = await App.api.mute(id);
      c.muted = d.muted;
    } catch (e) { App.utils.toast(e.message); }
  }
  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    saveSettings();
    document.documentElement.style.setProperty('--accent', state.settings.accent);
    document.documentElement.style.setProperty('--accent-dark', state.settings.accent);
  }

  loadSettings();
  document.documentElement.style.setProperty('--accent', state.settings.accent);

  return {
    state, getChat, getMessages, findMessage, lastMessage, sortedChats,
    loadChats, loadMessages, mergeMessages, sendMessage, deleteMessage,
    setActive, clearUnread, togglePin, toggleMute, setReplyTo,
    updateSettings, saveSettings
  };
})();
