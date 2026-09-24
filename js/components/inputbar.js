/* ================= components/inputbar.js — message composer =================
   Send box with: emoji picker (inserts at cursor), attach menu
   (photo -> picsum image message, file -> fake file bubble),
   fake voice recorder with timer, and reply-to quoting.
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.inputbar = (() => {
  const { $, esc, icon } = App.utils;
  let currentChat = null;
  let recTimer = null, recSecs = 0;

  /* ---------------- mount ---------------- */
  function mount(container, chat) {
    currentChat = chat;
    container.innerHTML =
      '<button class="iconbtn" id="bAttach" title="Attach">' + icon('attach') + '</button>' +
      '<div id="recorder"><span class="rdot"></span><span class="rtime">0:00</span>' +
        '<div class="rwaves">' + waves() + '</div>' +
        '<span class="rhint">recording… tap mic to stop</span></div>' +
      '<input id="msgInput" placeholder="Write a message..." autocomplete="off">' +
      '<button class="iconbtn" id="bEmoji" title="Emoji">' + icon('emoji') + '</button>' +
      '<button class="iconbtn" id="bMic" title="Voice message">' + icon('mic') + '</button>' +
      '<button class="iconbtn" id="sendBtn" title="Send" style="display:none">' + icon('send') + '</button>' +
      '<div id="emojipick"><div class="etabs"></div><div class="egrid"></div></div>' +
      '<div id="attachmenu">' +
        '<button data-a="photo">' + icon('image') + 'Photo</button>' +
        '<button data-a="file">' + icon('file') + 'File</button>' +
      '</div>';

    buildEmojiPicker();
    const input = $('msgInput');
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && App.store.state.enterToSend) sendText();
    });
    input.addEventListener('input', () => {
      const has = input.value.trim().length > 0;
      $('sendBtn').style.display = has ? 'flex' : 'none';
      $('bMic').style.display = has ? 'none' : 'flex';
    });
    $('sendBtn').addEventListener('click', sendText);
    $('bEmoji').addEventListener('click', e => {
      e.stopPropagation();
      $('attachmenu').classList.remove('open');
      $('emojipick').classList.toggle('open');
    });
    $('bAttach').addEventListener('click', e => {
      e.stopPropagation();
      $('emojipick').classList.remove('open');
      $('attachmenu').classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#emojipick') && !e.target.closest('#attachmenu')) {
        $('emojipick') && $('emojipick').classList.remove('open');
        $('attachmenu') && $('attachmenu').classList.remove('open');
      }
    });
    $('attachmenu').addEventListener('click', e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (a) sendAttachment(a);
      $('attachmenu').classList.remove('open');
    });
    $('bMic').addEventListener('click', toggleRecorder);
    if (App.store.state.replyTo) showReplyBar(App.store.state.replyTo);
  }

  function waves() {
    let h = '';
    for (let i = 0; i < 40; i++)
      h += '<i style="animation-delay:' + (i * 37 % 500) + 'ms"></i>';
    return h;
  }

  /* ---------------- sending ---------------- */
  function baseMsg() {
    const r = App.store.state.replyTo;
    const msg = { from: 'me', kind: 'text' };
    if (r) msg.replyTo = { sender: r.sender, text: r.text };
    return msg;
  }

  function sendText() {
    const input = $('msgInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    input.value = '';
    $('sendBtn').style.display = 'none';
    $('bMic').style.display = 'flex';
    const msg = baseMsg();
    msg.text = text;
    deliver(msg);
  }

  function sendSticker(emoji) {
    if (!currentChat) return;
    const msg = baseMsg();
    msg.kind = 'sticker';
    msg.text = emoji;
    $('emojipick').classList.remove('open');
    deliver(msg);
  }

  function sendAttachment(kind) {
    if (!currentChat) return;
    const msg = baseMsg();
    if (kind === 'photo') {
      const seed = 'up' + Date.now() % 100000;
      msg.kind = 'image';
      msg.src = 'https://picsum.photos/seed/' + seed + '/600/400';
      msg.text = '';
    } else {
      msg.kind = 'file';
      msg.fileName = 'document-' + (App.store.getMessages(currentChat.id).length + 1) + '.pdf';
      msg.fileSize = 200000 + Math.floor(Math.random() * 3000000);
      msg.text = '';
    }
    deliver(msg);
    App.utils.toast(kind === 'photo' ? 'Photo sent' : 'File sent');
  }

  function deliver(msg) {
    const chat = currentChat;
    App.store.addMessage(chat.id, msg);
    App.store.setReplyTo(null);
    hideReplyBar();
    App.components.chatview.appendMessage(chat, msg);
    App.components.chatlist.render(App.store.state.filter);
    App.bot.react(chat, msg);
  }

  /* ---------------- emoji picker ---------------- */
  function buildEmojiPicker() {
    const tabs = document.querySelector('#emojipick .etabs');
    const grid = document.querySelector('#emojipick .egrid');
    App.data.stickerPacks.forEach((pack, i) => {
      const t = document.createElement('button');
      t.textContent = pack.emojis[0];
      t.title = pack.name;
      if (i === 0) t.classList.add('on');
      t.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
        fillGrid(pack);
      });
      tabs.appendChild(t);
    });
    fillGrid(App.data.stickerPacks[0]);

    function fillGrid(pack) {
      grid.innerHTML = '';
      pack.emojis.forEach(e => {
        const b = document.createElement('button');
        b.textContent = e;
        b.title = pack.name;
        b.addEventListener('click', () => insertAtCursor(e));
        b.addEventListener('dblclick', () => sendSticker(e));
        grid.appendChild(b);
      });
    }
  }

  /** insert emoji at the caret position of the input */
  function insertAtCursor(emoji) {
    const input = $('msgInput');
    if (!input) return;
    const s = input.selectionStart || 0, e = input.selectionEnd || 0;
    input.value = input.value.slice(0, s) + emoji + input.value.slice(e);
    input.focus();
    input.selectionStart = input.selectionEnd = s + emoji.length;
    input.dispatchEvent(new Event('input'));
  }

  /* ---------------- fake voice recorder ---------------- */
  function toggleRecorder() {
    const rec = $('recorder'), input = $('msgInput');
    const open = rec.classList.toggle('open');
    input.style.display = open ? 'none' : '';
    $('bEmoji').style.display = open ? 'none' : 'flex';
    if (open) {
      recSecs = 0;
      rec.querySelector('.rtime').textContent = '0:00';
      App.utils.toast('Recording… tap the mic again to send');
      recTimer = setInterval(() => {
        recSecs++;
        const t = rec.querySelector('.rtime');
        if (t) t.textContent = App.utils.fmtDur(recSecs);
      }, 1000);
    } else {
      clearInterval(recTimer);
      if (recSecs > 0 && currentChat) {
        const msg = baseMsg();
        msg.kind = 'voice';
        msg.duration = recSecs;
        msg.text = '';
        deliver(msg);
      }
    }
  }

  /* ---------------- reply quoting ---------------- */
  function setReply(q) {
    App.store.setReplyTo(q);
    showReplyBar(q);
    const input = $('msgInput');
    if (input) input.focus();
  }
  function clearReply() {
    App.store.setReplyTo(null);
    hideReplyBar();
  }
  function showReplyBar(q) {
    const bar = $('replybar');
    if (!bar) return;
    $('rsSender').textContent = q.sender;
    $('rsText').textContent = q.text;
    bar.classList.add('open');
  }
  function hideReplyBar() {
    const bar = $('replybar');
    if (bar) bar.classList.remove('open');
  }

  return { mount, setReply, clearReply };
})();
