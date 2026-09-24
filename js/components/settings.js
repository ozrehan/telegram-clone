/* ================= components/settings.js — settings view =================
   Replaces the chat pane: profile (editable name), notification toggles,
   enter-to-send toggle, accent color picker. Persisted to localStorage.
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.settings = (() => {
  const { $, esc, icon } = App.utils;

  const ACCENTS = ['#5682a3', '#2f80ed', '#4a9e1e', '#7b4b94', '#d45246', '#e07b1f', '#c93a6e', '#2a9e76'];

  function open() {
    App.store.setActive(null);
    if (App.components.chatview.stopPoll) App.components.chatview.stopPoll();
    App.components.chatlist.render(App.store.state.filter);
    App.components.infopanel.close();
    const s = App.store.state.settings;
    const p = $('chatpane');
    p.classList.add('open');
    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>Settings</h2></div>' +
      '<div class="sbody">' +
        '<div class="scard"><div class="srow">' +
          '<div class="avatar g2 a60">' + App.utils.initials(s.profileName) + '</div>' +
          '<div style="flex:1;min-width:0"><input id="profilename" value="' + esc(s.profileName) + '" maxlength="40">' +
          '<div class="desc">Tap to edit your display name</div></div>' +
          '<button class="iconbtn" id="nameEdit">' + icon('edit') + '</button>' +
        '</div></div>' +
        '<div class="scard">' +
          togRow('notifications', 'Notifications', 'Show unread badges and alerts', s.notifications) +
          togRow('sounds', 'Message sounds', 'Play a sound on new messages', s.sounds) +
          togRow('enterToSend', 'Enter sends message', 'Press Enter to send, Shift+Enter for newline', s.enterToSend) +
        '</div>' +
        '<div class="scard"><div class="srow"><div class="lab">Accent color' +
          '<div class="desc">Applies to headers, links and controls</div></div></div>' +
          '<div class="srow"><div class="swatchrow">' +
          ACCENTS.map(c =>
            '<div class="swatch' + (s.accent === c ? ' on' : '') + '" data-c="' + c +
            '" style="background:' + c + '" title="' + c + '"></div>').join('') +
          '</div></div></div>' +
        '<div class="scard"><div class="srow"><div class="lab">About this clone' +
          '<div class="desc">Telegram Web UI clone · vanilla JS · real backend (Netlify Functions + Blobs)</div></div>' +
          icon('logo') + '</div></div>' +
        '<div class="scard"><div class="srow danger-row" id="logoutRow"><div class="lab">Log out' +
          '<div class="desc">Sign out of this account on this device</div></div>' +
          icon('back') + '</div></div>' +
      '</div></div>';

    $('setBack').addEventListener('click', close);
    $('logoutRow').addEventListener('click', () => {
      App.api.setToken(null);
      location.reload();
    });
    $('nameEdit').addEventListener('click', () => $('profilename').focus());
    $('profilename').addEventListener('change', e => {
      const name = e.target.value.trim() || 'Rehan';
      App.store.updateSettings({ profileName: name });
      App.utils.toast('Name updated');
      open(); // re-render with new initials
    });
    p.querySelectorAll('.toggle').forEach(t =>
      t.addEventListener('click', () => {
        const key = t.dataset.k;
        const on = !t.classList.contains('on');
        t.classList.toggle('on', on);
        t.setAttribute('aria-checked', on);
        App.store.updateSettings({ [key]: on });
        App.utils.toast(label(key) + (on ? ' on' : ' off'));
      }));
    p.querySelectorAll('.swatch').forEach(sw =>
      sw.addEventListener('click', () => {
        App.store.updateSettings({ accent: sw.dataset.c });
        p.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
        sw.classList.add('on');
      }));
  }

  function togRow(key, lab, desc, on) {
    return '<div class="srow"><div class="lab">' + esc(lab) +
      '<div class="desc">' + esc(desc) + '</div></div>' +
      '<button class="toggle' + (on ? ' on' : '') + '" data-k="' + key +
      '" role="switch" aria-checked="' + on + '"></button></div>';
  }
  function label(k) {
    return { notifications: 'Notifications', sounds: 'Sounds', enterToSend: 'Enter-to-send' }[k] || k;
  }

  /** back to the welcome placeholder */
  function close() {
    const p = $('chatpane');
    p.classList.remove('open');
    p.innerHTML =
      '<div id="welcome"><div class="ball">' + icon('logo', 'lg') + '</div>' +
      '<p>Select a chat to start messaging</p></div>';
  }

  return { open, close };
})();
