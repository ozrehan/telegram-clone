/* ================= components/bubbles.js — message renderer =================
   Renders one message into a .msg element.
   Kinds: text | image | file | voice | sticker. Supports reply quotes,
   "forwarded from" labels and per-message ticks for outgoing messages.
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.bubbles = (() => {
  const { esc, icon, seeded, fmtDur, fmtSize } = App.utils;

  /** fake waveform: deterministic bars from the message id */
  function waveform(mid, bars) {
    const rnd = seeded(mid || 'x');
    let h = '';
    for (let i = 0; i < (bars || 28); i++)
      h += '<i style="height:' + (5 + Math.round(rnd() * 20)) + 'px"></i>';
    return h;
  }

  function ticksHtml(m) {
    return '<span class="meta">' + esc(m.time) + ' ' +
      '<span class="ticks sent" data-tick>✓</span></span>';
  }
  function metaHtml(m) {
    return '<span class="meta">' + esc(m.time) + '</span>';
  }

  function quoteHtml(q) {
    if (!q) return '';
    return '<div class="quote" data-q><div class="qsender">' + esc(q.sender) +
      '</div><div class="qtext">' + esc(q.text) + '</div></div>';
  }

  function fwdHtml(m) {
    return m.forwardedFrom
      ? '<div class="fwd">Forwarded from ' + esc(m.forwardedFrom) + '</div>' : '';
  }

  function bodyHtml(m) {
    switch (m.kind) {
      case 'image':
        return '<img class="pic" src="' + esc(m.src || m.data) + '" alt="photo" loading="lazy">' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'file':
        return '<div class="file"><div class="fic">' + icon('file') + '</div>' +
          '<div><div class="fname">' + esc(m.fileName || 'file') + '</div>' +
          '<div class="fsize">' + fmtSize(m.fileSize || 0) + '</div></div></div>' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'voice':
        return '<div class="voice"><button class="vplay" data-play>' + icon('play', 'sm') +
          '</button><div class="vwave">' + waveform(m.mid) + '</div>' +
          '<span class="vdur">' + fmtDur(m.duration || 0) + '</span></div>';
      case 'sticker':
        return '<span class="sticker">' + esc(m.text || '👍') + '</span>';
      default:
        return '<span class="body">' + esc(m.text || '') + '</span>';
    }
  }

  /** main entry: build the bubble element for (chat, message) */
  function render(chat, m) {
    const d = document.createElement('div');
    const out = m.from === (App.me && App.me.username);
    d.className = 'msg ' + (out ? 'out' : 'in') + (m.kind === 'sticker' ? ' stickerbox' : '');
    d.dataset.mid = m.mid;

    let head = '';
    if (!out && chat.type === 'group' && m.sender)
      head = '<div class="sender" style="color:' + esc(m.color || '#5682a3') + '">' +
        esc(m.sender) + '</div>';
    if (!out && chat.type === 'bot')
      head = '<div class="sender" style="color:#2f80ed">' + esc(chat.name) + '</div>';

    d.innerHTML = head + fwdHtml(m) + quoteHtml(m.replyTo) + bodyHtml(m) +
      (out ? ticksHtml(m) : metaHtml(m)) + '<div class="clear"></div>';

    // wire fake voice playback
    const play = d.querySelector('[data-play]');
    if (play) play.addEventListener('click', () => {
      const on = play.classList.toggle('on');
      play.innerHTML = icon(on ? 'check' : 'play', 'sm');
      App.utils.toast(on ? 'Playing voice message…' : 'Paused');
      if (on) setTimeout(() => {
        play.classList.remove('on');
        play.innerHTML = icon('play', 'sm');
      }, Math.min(6000, (m.duration || 5) * 1000));
    });
    return d;
  }

  /** animate ticks for a freshly sent message: ✓ -> ✓✓ -> blue */
  function animateTicks(bubbleEl) {
    const t = bubbleEl.querySelector('[data-tick]');
    if (!t) return;
    setTimeout(() => { t.textContent = '✓✓'; }, 450);
    setTimeout(() => { t.classList.remove('sent'); t.classList.add('read'); }, 1400);
  }

  return { render, animateTicks };
})();
