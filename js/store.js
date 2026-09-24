/* ================= store.js — central state ================= */
'use strict';
window.App = window.App || {};

/**
 * App.store — single source of truth.
 * Holds chats, messages, the active chat, reply draft and user settings.
 * After every mutation it asks the UI to re-render the affected part.
 */
App.store = (() => {
  let _mid = 1;

  const state = {
    chats: App.data.chats,
    messages: App.data.messages,
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

  /* assign stable ids to seeded messages */
  for (const id of Object.keys(state.messages))
    for (const m of state.messages[id]) m.mid = 'm' + (_mid++);

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
  const getMessages = id => state.messages[id] || (state.messages[id] = []);
  const findMessage = (chatId, mid) => getMessages(chatId).find(m => m.mid === mid);
  const lastMessage = chat => {
    const arr = getMessages(chat.id);
    return arr[arr.length - 1] || null;
  };

  /* pinned chats first, then by recency of last message (stable otherwise) */
  function sortedChats() {
    const pinned = state.chats.filter(c => c.pinned);
    const rest = state.chats.filter(c => !c.pinned);
    return pinned.concat(rest);
  }

  /* ---------- mutations ---------- */
  function addMessage(chatId, msg) {
    msg.mid = 'm' + (_mid++);
    msg.time = msg.time || App.utils.nowTime();
    msg.kind = msg.kind || 'text';
    getMessages(chatId).push(msg);
    return msg;
  }
  function setActive(id) {
    state.activeId = id;
    state.replyTo = null;
  }
  function clearUnread(id) {
    const c = getChat(id);
    if (c) c.unread = 0;
  }
  function bumpUnread(id) {
    const c = getChat(id);
    if (c && id !== state.activeId) c.unread = (c.unread || 0) + 1;
  }
  function togglePin(id) {
    const c = getChat(id);
    if (c) c.pinned = !c.pinned;
  }
  function toggleMute(id) {
    const c = getChat(id);
    if (c) c.muted = !c.muted;
  }
  function deleteMessage(chatId, mid) {
    const arr = getMessages(chatId);
    const i = arr.findIndex(m => m.mid === mid);
    if (i >= 0) arr.splice(i, 1);
  }
  function setReplyTo(q) { state.replyTo = q; }
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
    addMessage, setActive, clearUnread, bumpUnread,
    togglePin, toggleMute, deleteMessage, setReplyTo,
    updateSettings, saveSettings
  };
})();
