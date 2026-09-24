/* ================= app.js — bootstrap & global wiring ================= */
'use strict';
window.App = window.App || {};

/**
 * App.init — wire the static shell, render the chat list,
 * and install global key handlers.
 */
App.init = function () {
  const { $, icon } = App.utils;

  // hamburger menu -> settings
  $('menuBtn').innerHTML = icon('menu');
  $('menuBtn').addEventListener('click', () => App.components.settings.open());

  // search icon inside the search box
  const sw = document.querySelector('#searchWrap .sic');
  if (sw) sw.innerHTML = icon('search');

  // chat list + live search
  App.components.chatlist.render('');
  App.components.chatlist.bindSearch();

  // Escape closes topmost layer: context menu -> info panel -> in-chat search
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const menus = document.querySelectorAll('.ctxmenu');
    if (menus.length) { App.components.chatview.closeMenu(); return; }
    const ip = $('infopanel');
    if (ip && ip.classList.contains('open')) { App.components.infopanel.close(); return; }
    const cs = $('chatsearch');
    if (cs && cs.classList.contains('open')) { App.components.chatview.toggleSearch(); return; }
    const mb = $('modalback');
    if (mb && mb.classList.contains('open')) { mb.classList.remove('open'); }
  });

  // welcome placeholder logo
  const ball = document.querySelector('#welcome .ball');
  if (ball) ball.innerHTML = icon('logo', 'lg');
};

document.addEventListener('DOMContentLoaded', App.init);
