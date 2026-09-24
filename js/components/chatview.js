/* ================= components/chatview.js — conversation pane =================
   Owns the right pane: header, message list, in-chat search, typing
   indicator and the message right-click context menu.

   Messages come from the server. A 2.5s poll loop fetches new messages
   and typing indicators for the active chat (the real-time mechanism).
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.chatview = (() => {
  const { $, esc, icon, avatar } = App.utils;
  let searchState = null;   // {chat, matches:[mids], idx}
  let pollTimer = null;
  let pollCount = 0;

  function pane() { return $('chatpane'); }

  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /* ---------------- open a chat ---------------- */
  async function open(id) {
    const chat = App.store.getChat(id);
    if (!chat) return;
    stopPoll();
    App.store.setActive(id);
    App.components.infopanel.close();
    App.components.settings.close();
    searchState = null;
    pollCount = 0;

    pane().innerHTML =
      '<div id="cheader">' +
        '<div class="avatar ' + chat.grad + ' a44" data-info>' + App.utils.initials(chat.name) + '</div>' +
        '<div id="ctitle" data-info><div class="name">' + esc(chat.name) + '</div>' +
        '<div class="status" id="cstatus">' + esc(chat.status || '') + '</div></div>' +
        '<button class="iconbtn" id="hSearch" title="Search in chat">' + icon('search') + '</button>' +
        '<button class="iconbtn" id="hCall" title="Call">' + icon('phone') + '</button>' +
        '<button class="iconbtn" id="hMore" title="More">' + icon('more') + '</button>' +
      '</div>' +
      '<div id="chatsearch"><input id="csInput" placeholder="Search in conversation…">' +
      '<span class="count" id="csCount"></span>' +
      '<button class="iconbtn" id="csClose" title="Close">' + icon('close') + '</button></div>' +
      '<div id="messages"><div id="msgsInner"><div class="datebubble">Loading…</div></div></div>' +
      '<div id="replybar"><div style="flex:1;min-width:0">' +
        '<div class="rsender" id="rsSender"></div><div class="rtext" id="rsText"></div></div>' +
        '<button class="iconbtn" id="rsClose" title="Cancel reply">' + icon('close') + '</button></div>' +
      '<div id="inputbar"></div>';

    pane().classList.add('open');
    document.querySelectorAll('[data-info]').forEach(el =>
      el.addEventListener('click', () => App.components.infopanel.open(chat)));
    $('hSearch').addEventListener('click', toggleSearch);
    $('csClose').addEventListener('click', toggleSearch);
    $('csInput').addEventListener('input', e => runSearch(chat, e.target.value));
    $('csInput').addEventListener('keydown', e => { if (e.key === 'Enter') nextMatch(1); });
    $('hCall').addEventListener('click', () =>
      App.utils.toast('Calling ' + chat.name + '… (demo)'));
    $('hMore').addEventListener('click', e => headerMenu(e, chat));
    $('rsClose').addEventListener('click', () => App.components.inputbar.clearReply());

    // load history from the server, then start the live poll loop
    try {
      await App.store.loadMessages(chat.id);
    } catch (e) {
      $('msgsInner').innerHTML = '<div class="datebubble">Could not load messages</div>';
    }
    renderMessages(chat);
    App.components.inputbar.mount($('inputbar'), chat);
    App.store.clearUnread(chat.id); // async mark-read; updates badge optimistically below
    chat.unread = 0;
    App.components.chatlist.render(App.store.state.filter);
    startPoll(chat);
  }

  /* ---------------- live polling (messages + typing) ---------------- */
  function startPoll(chat) {
    stopPoll();
    let lastTs = 0;
    for (const m of App.store.getMessages(chat.id))
      if (m.ts > lastTs) lastTs = m.ts;

    const tick = async () => {
      if (App.store.state.activeId !== chat.id) { stopPoll(); return; }
      try {
        const d = await App.api.messages(chat.id, lastTs);
        const fresh = App.store.mergeMessages(chat.id, d.messages);
        for (const m of fresh) {
          appendMessage(chat, m);
          if (m.ts > lastTs) lastTs = m.ts;
        }
        if (fresh.length) {
          App.store.clearUnread(chat.id);
          chat.unread = 0;
          App.components.chatlist.render(App.store.state.filter);
        }
        const ty = await App.api.getTyping(chat.id);
        renderTyping(chat, (ty && ty.typing) || []);
        pollCount++;
        if (pollCount % 4 === 0) {
          // refresh the chat list (unread badges, last-message snippets)
          try {
            const keepFilter = App.store.state.filter;
            await App.store.loadChats();
            const ae = document.activeElement;
            if (!ae || ae.id !== 'search') App.components.chatlist.render(keepFilter);
          } catch (e) {}
        }
      } catch (e) { /* network blip — keep polling */ }
    };
    pollTimer = setInterval(tick, 2500);
    tick();
  }

  function renderTyping(chat, typing) {
    const s = $('cstatus');
    if (!s || App.store.state.activeId !== chat.id) return;
    if (typing.length) {
      const names = typing.map(t => t.name.split(' ')[0]);
      s.textContent = names.length === 1
        ? names[0] + ' is typing...'
        : names.slice(0, 2).join(' and ') + ' are typing...';
      s.classList.add('typing');
    } else {
      s.textContent = chat.status || '';
      s.classList.remove('typing');
    }
  }

  /* ---------------- header "more" menu ---------------- */
  function headerMenu(e, chat) {
    e.stopPropagation();
    closeMenu();
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="info">' + icon('search') + 'View info</button>' +
        '<button data-a="mute">' + icon('mute') + (chat.muted ? 'Unmute' : 'Mute') + '</button>' +
        '<button data-a="clear">' + icon('close') + 'Clear history</button>' +
      '</div>');
    const r = e.currentTarget.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      closeMenu();
      if (a === 'info') App.components.infopanel.open(chat);
      if (a === 'mute') {
        App.store.toggleMute(chat.id).then(() => {
          open(chat.id);
          App.components.chatlist.render(App.store.state.filter);
        });
      }
      if (a === 'clear') App.utils.toast('Clear history is not available in this prototype');
    });
  }

  /* ---------------- messages ---------------- */
  function renderMessages(chat) {
    const inner = $('msgsInner');
    if (!inner) return;
    inner.innerHTML = '<div class="datebubble">Today</div>';
    for (const m of App.store.getMessages(chat.id)) {
      const b = App.components.bubbles.render(chat, m);
      wireBubble(b, chat, m);
      inner.appendChild(b);
    }
    scrollBottom();
  }

  function appendMessage(chat, m) {
    const inner = $('msgsInner');
    if (!inner || App.store.state.activeId !== chat.id) return;
    // avoid duplicates if the poll and the send path race
    if (inner.querySelector('.msg[data-mid="' + m.mid + '"]')) return;
    const b = App.components.bubbles.render(chat, m);
    wireBubble(b, chat, m);
    inner.appendChild(b);
    App.components.bubbles.animateTicks(b);
    scrollBottom();
  }

  /** right-click on a bubble: reply / forward / copy / delete */
  function wireBubble(bubbleEl, chat, m) {
    bubbleEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      msgMenu(e, chat, m, bubbleEl);
    });
  }

  function msgMenu(e, chat, m, bubbleEl) {
    closeMenu();
    const canCopy = m.kind === 'text' && m.text;
    const own = m.from === App.me.username;
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="reply">' + icon('back') + 'Reply</button>' +
        '<button data-a="forward">' + icon('send') + 'Forward</button>' +
        (canCopy ? '<button data-a="copy">' + icon('check') + 'Copy text</button>' : '') +
        (own ? '<hr><button data-a="delete" class="danger">' + icon('close') + 'Delete</button>' : '') +
      '</div>');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      closeMenu();
      if (!btn) return;
      const a = btn.dataset.a;
      if (a === 'reply') {
        const sender = own ? 'You' : (m.sender || chat.name);
        App.components.inputbar.setReply({ mid: m.mid, sender, text: m.text || kindText(m) });
      }
      if (a === 'forward') openForwardPicker(m);
      if (a === 'copy') {
        try { navigator.clipboard.writeText(m.text); App.utils.toast('Copied'); }
        catch (err) { App.utils.toast('Copy failed'); }
      }
      if (a === 'delete') {
        App.store.deleteMessage(chat.id, m.mid).then(() => {
          renderMessages(chat);
          App.components.chatlist.render(App.store.state.filter);
        }).catch(err => App.utils.toast(err.message));
      }
    });
  }

  function kindText(m) {
    return { image: '📷 Photo', file: '📎 ' + (m.fileName || 'File'),
      voice: '🎤 Voice message', sticker: m.text || 'Sticker' }[m.kind] || '';
  }

  /** forward picker modal — forwards through the server */
  function openForwardPicker(m) {
    const back = $('modalback');
    back.classList.add('open');
    back.innerHTML =
      '<div id="fwdmodal"><div class="fhead">Forward to…</div><div class="flist">' +
      App.store.sortedChats().map(c =>
        '<div class="frow" data-id="' + c.id + '">' + avatar(c, 'a44') +
        '<span class="fname">' + esc(c.name) + '</span></div>').join('') +
      '</div></div>';
    back.querySelectorAll('.frow').forEach(row =>
      row.addEventListener('click', async () => {
        const to = App.store.getChat(row.dataset.id);
        const payload = {
          kind: m.kind, text: m.text || '',
          forwardedFrom: m.from === App.me.username ? 'You' : (m.sender || 'peer')
        };
        if (m.data) payload.data = m.data;
        if (m.fileName) payload.fileName = m.fileName;
        if (m.fileSize != null) payload.fileSize = m.fileSize;
        if (m.duration != null) payload.duration = m.duration;
        try {
          const saved = await App.store.sendMessage(to.id, payload);
          App.utils.toast('Forwarded to ' + to.name);
          if (App.store.state.activeId === to.id) appendMessage(to, saved);
          App.components.chatlist.render(App.store.state.filter);
        } catch (err) {
          App.utils.toast(err.message);
        }
        back.classList.remove('open');
      }));
    back.onclick = ev => { if (ev.target === back) back.classList.remove('open'); };
  }

  /* ---------------- typing indicator ---------------- */
  function showTyping(on, realStatus) {
    const s = $('cstatus');
    if (!s) return;
    if (on) { s.textContent = 'typing...'; s.classList.add('typing'); }
    else { s.textContent = realStatus || ''; s.classList.remove('typing'); }
  }

  /* ---------------- in-chat search ---------------- */
  function toggleSearch() {
    const bar = $('chatsearch');
    if (!bar) return;
    bar.classList.toggle('open');
    if (bar.classList.contains('open')) $('csInput').focus();
    else { searchState = null; clearHighlights(); }
  }

  function clearHighlights() {
    App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
    const c = $('csCount');
    if (c) c.textContent = '';
  }

  function runSearch(chat, q) {
    clearHighlights();
    q = q.trim().toLowerCase();
    if (!q) { searchState = null; return; }
    const matches = [];
    App.utils.$$('#msgsInner .msg').forEach(el => {
      const m = App.store.findMessage(chat.id, el.dataset.mid);
      if (m && (m.text || '').toLowerCase().includes(q)) matches.push(el.dataset.mid);
    });
    searchState = { matches, idx: -1 };
    $('csCount').textContent = matches.length ? '0 / ' + matches.length : 'no results';
    if (matches.length) nextMatch(1);
  }

  function nextMatch(dir) {
    if (!searchState || !searchState.matches.length) return;
    searchState.idx = (searchState.idx + dir + searchState.matches.length) % searchState.matches.length;
    App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
    const mid = searchState.matches[searchState.idx];
    const el = document.querySelector('#msgsInner .msg[data-mid="' + mid + '"]');
    if (el) {
      el.classList.add('hl');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      $('csCount').textContent = (searchState.idx + 1) + ' / ' + searchState.matches.length;
    }
  }

  /* ---------------- misc ---------------- */
  function scrollBottom() {
    const box = $('messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function closeMenu() {
    App.utils.$$('.ctxmenu').forEach(x => x.remove());
  }

  // clicking anywhere dismisses open context menus
  document.addEventListener('click', e => {
    if (!e.target.closest('.ctxmenu')) closeMenu();
  });

  return {
    open, renderMessages, appendMessage, showTyping,
    closeMenu, scrollBottom, toggleSearch, stopPoll
  };
})();
