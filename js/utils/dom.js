/* ================= utils/dom.js — DOM helpers + icon renderer ================= */
'use strict';
window.App = window.App || {};
App.utils = App.utils || {};

/** get element by id */
App.utils.$ = id => document.getElementById(id);

/** query selector all as array */
App.utils.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/** escape HTML to prevent injection from user input */
App.utils.esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Render an icon from the inline sprite (see assets/icons.svg).
 * Usage: App.utils.icon('search') -> '<svg class="ic"><use href="#icon-search"/></svg>'
 */
App.utils.icon = (name, cls) =>
  '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' +
  '<use href="#icon-' + name + '"/></svg>';

/** build an element from an HTML string */
App.utils.el = html => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/** initials from a display name, e.g. "Arjun Mehta" -> "AM" */
App.utils.initials = name =>
  String(name).replace(/[^A-Za-z ]/g, '').trim().split(/\s+/)
    .map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

/** avatar html for a chat object */
App.utils.avatar = (chat, size) =>
  '<div class="avatar ' + chat.grad + ' ' + (size || 'a50') + '">' +
  App.utils.initials(chat.name) + '</div>';

/** small toast notification */
App.utils.toast = msg => {
  let t = App.utils.$('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
};
