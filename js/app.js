/* ================= app.js — bootstrap & global wiring ================= */
'use strict';
window.App = window.App || {};

/**
 * App.init — wire the static shell, then gate on auth:
 * no token -> Telegram-styled login/signup screen;
 * token -> verify session and boot the real app.
 */
App.init = function () {
  const { $, icon } = App.utils;

  // hamburger menu -> settings
  $('menuBtn').innerHTML = icon('menu');
  $('menuBtn').addEventListener('click', () => App.components.settings.open());

  // compose button -> new real chat / group
  const ncb = $('newChatBtn');
  if (ncb) {
    ncb.innerHTML = icon('edit');
    ncb.addEventListener('click', () => App.components.newchat.open());
  }

  // search icon inside the search box
  const sw = document.querySelector('#searchWrap .sic');
  if (sw) sw.innerHTML = icon('search');

  // chat list + live search
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

  // auth gate
  if (!App.api.token) {
    App.auth.show();
    return;
  }
  App.boot();
};

/**
 * App.boot — verify the session, load the user's chats from the server,
 * and render the shell. Called after login/signup too.
 */
App.boot = async function () {
  try {
    App.me = await App.api.me();
  } catch (e) {
    App.auth.show('Could not reach the server. Check your connection and try again.');
    return;
  }
  App.auth.hide();
  App.store.state.settings.profileName = App.me.name;
  try {
    await App.store.loadChats();
  } catch (e) {
    App.utils.toast('Failed to load chats: ' + e.message);
  }
  App.components.chatlist.render('');
};

document.addEventListener('DOMContentLoaded', App.init);
