/* ================= js/api.js — backend client =================
   Fetch wrapper for the Netlify Functions API.
   Token persisted in localStorage under 'tg_token'.
   Server messages carry `ts`; stampTime() adds the `time` ("HH:MM")
   string the UI renders.
*/
'use strict';
window.App = window.App || {};

App.api = (() => {
  const BASE = '/api';
  const KEY = 'tg_token';
  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) {}

  const pad = n => String(n).padStart(2, '0');

  function stampTime(m) {
    if (m && m.ts != null && !m.time) {
      const d = new Date(m.ts);
      m.time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    return m;
  }
  function normChat(c) {
    if (c && c.lastMessage) stampTime(c.lastMessage);
    return c;
  }

  function setToken(t) {
    token = t || null;
    try {
      if (token) localStorage.setItem(KEY, token);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  async function req(method, path, body) {
    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: 'Bearer ' + token } : {}
        ),
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Network error — backend unreachable');
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) {
      setToken(null);
      if (App.auth) App.auth.show('Session expired — please log in again.');
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
    return data;
  }

  return {
    get token() { return token; },
    setToken,
    signup: (username, password, name) =>
      req('POST', '/auth/signup', { username, password, name }),
    login: (username, password) =>
      req('POST', '/auth/login', { username, password }),
    me: () => req('GET', '/me'),
    chats: async () => ({ chats: (await req('GET', '/chats')).chats.map(normChat) }),
    createChat: async (payload) =>
      ({ chat: normChat((await req('POST', '/chats', payload)).chat) }),
    messages: async (id, after) => {
      const d = await req('GET', '/chats/' + id + '/messages' + (after ? '?after=' + after : ''));
      return { messages: (d.messages || []).map(stampTime), now: d.now };
    },
    send: async (id, msg) =>
      ({ message: stampTime((await req('POST', '/chats/' + id + '/messages', msg)).message) }),
    markRead: (id) => req('POST', '/chats/' + id + '/read'),
    typing: (id) => req('POST', '/chats/' + id + '/typing'),
    getTyping: (id) => req('GET', '/chats/' + id + '/typing'),
    deleteMessage: (mid) => req('POST', '/messages/' + mid + '/delete'),
    userSearch: (q) => req('GET', '/users/search?q=' + encodeURIComponent(q)),
    chatInfo: (id) => req('GET', '/chats/' + id + '/info'),
    pin: (id) => req('POST', '/chats/' + id + '/pin'),
    mute: (id) => req('POST', '/chats/' + id + '/mute')
  };
})();
