/* ================= components/chatlist.js — left panel ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.chatlist = (() => {
  const { $, esc, icon, avatar } = App.utils;

  function snippetHtml(chat, lm) {
    if (!lm) return '<span class="snippet"></span>';
    let s = esc(lm.kind === 'text' ? lm.text : kindLabel(lm));
    if (lm.from === (App.me && App.me.username) && chat.type !== 'channel')
      s = '<span class="ticks">✓✓</span> ' + s;
    if (chat.type === 'group' && lm.from !== (App.me && App.me.username) && lm.sender)
      s = '<b>' + esc(lm.sender.split(' ')[0]) + ':</b> ' + s;
    if (chat.type === 'channel') s = 'Channel · ' + s;
    return '<span class="snippet">' + s + '</span>';
  }

  function kindLabel(m) {
    return { image: '📷 Photo', file: '📎 ' + (m.fileName || 'File'),
      voice: '🎤 Voice message', sticker: m.text || 'Sticker' }[m.kind] || '';
  }

  function rowHtml(chat) {
    const lm = App.store.lastMessage(chat);
    const active = App.store.state.activeId === chat.id ? ' active' : '';
    const muted = chat.muted ? ' muted' : '';
    const badge = chat.unread
      ? '<span class="badge">' + chat.unread + '</span>' : '';
    const mute = chat.muted ? icon('mute', 'sm') + '' : '';
    const pin = chat.pinned ? '<span class="muteIcon">' + icon('pin', 'sm') + '</span>' : '';
    return (
      '<div class="chat' + active + muted + '" data-id="' + chat.id + '">' +
        avatar(chat, 'a50') +
        '<div class="info"><div class="top">' +
          '<span class="name">' + esc(chat.name) + '</span>' +
          '<span class="time">' + (lm ? esc(lm.time) : '') + '</span>' +
        '</div><div class="bottom">' +
          snippetHtml(chat, lm) +
          '<span class="right">' + pin + badge +
          (chat.muted && !chat.unread ? '<span class="muteIcon">' + icon('mute', 'sm') + '</span>' : '') +
          '</span>' +
        '</div></div>' +
      '</div>'
    );
  }

  /** right-click menu on a chat row: pin / mute / mark read */
  function rowMenu(e, chat) {
    e.preventDefault();
    App.components.chatview.closeMenu();
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="pin">' + icon('pin') + (chat.pinned ? 'Unpin' : 'Pin to top') + '</button>' +
        '<button data-a="mute">' + icon('mute') + (chat.muted ? 'Unmute' : 'Mute') + '</button>' +
        '<button data-a="read">' + icon('check-double') + 'Mark as read</button>' +
      '</div>');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      App.components.chatview.closeMenu();
      const done = () => render(App.store.state.filter);
      if (a === 'pin') App.store.togglePin(chat.id).then(done);
      else if (a === 'mute') App.store.toggleMute(chat.id).then(done);
      else if (a === 'read') App.store.clearUnread(chat.id).then(done);
      else done();
    });
  }

  function render(filter) {
    App.store.state.filter = filter == null ? App.store.state.filter : filter;
    const q = App.store.state.filter.trim().toLowerCase();
    const list = $('chatlist');
    if (!list) return;
    list.innerHTML = '';
    const chats = App.store.sortedChats().filter(c =>
      !q || c.name.toLowerCase().includes(q) ||
      App.store.getMessages(c.id).some(m => (m.text || '').toLowerCase().includes(q)));

    if (!chats.length) {
      list.innerHTML = '<div class="empty-list">No chats found</div>';
      return;
    }
    const pinned = chats.filter(c => c.pinned), rest = chats.filter(c => !c.pinned);
    if (pinned.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">Pinned</div>'));
      pinned.forEach(c => list.appendChild(mountRow(c)));
    }
    rest.forEach(c => list.appendChild(mountRow(c)));
  }

  function mountRow(chat) {
    const row = App.utils.el(rowHtml(chat));
    row.addEventListener('click', () => App.components.chatview.open(chat.id));
    row.addEventListener('contextmenu', e => rowMenu(e, chat));
    return row;
  }

  function bindSearch() {
    $('search').addEventListener('input', e => render(e.target.value));
  }

  return { render, bindSearch };
})();
