/* ================= components/newchat.js — start a real conversation =================
   "New chat" modal: search registered users -> 1:1 DM,
   or create a group (name + picked members).
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.newchat = (() => {
  const { $, esc, icon, initials } = App.utils;
  let groupMode = false;
  let picked = []; // usernames selected for a group

  function open() {
    groupMode = false;
    picked = [];
    const back = $('modalback');
    back.classList.add('open');
    back.innerHTML =
      '<div id="newchatmodal">' +
        '<div class="fhead">' +
          '<span>New chat</span>' +
          '<button class="nctoggle" id="ncToggle">New group</button>' +
        '</div>' +
        '<div id="ncGroupName" style="display:none">' +
          '<input id="ncName" placeholder="Group name" maxlength="60">' +
        '</div>' +
        '<div class="ncsearch"><input id="ncSearch" placeholder="Search people…" autocomplete="off"></div>' +
        '<div class="flist" id="ncResults"><div class="ncempty">Type to search registered users</div></div>' +
        '<div class="ncfoot" id="ncFoot" style="display:none">' +
          '<span id="ncCount">0 selected</span>' +
          '<button class="authbtn" id="ncCreate">Create group</button>' +
        '</div>' +
      '</div>';

    $('ncToggle').addEventListener('click', () => {
      groupMode = !groupMode;
      picked = [];
      $('ncToggle').textContent = groupMode ? 'New DM' : 'New group';
      $('ncGroupName').style.display = groupMode ? '' : 'none';
      $('ncFoot').style.display = groupMode ? '' : 'none';
      renderResults([]);
      $('ncSearch').value = '';
      $('ncSearch').focus();
    });
    $('ncSearch').addEventListener('input', e => search(e.target.value.trim()));
    $('ncCreate').addEventListener('click', createGroup);
    back.onclick = ev => { if (ev.target === back) close(); };
    setTimeout(() => $('ncSearch').focus(), 50);
  }

  function close() {
    const back = $('modalback');
    back.classList.remove('open');
    back.innerHTML = '';
  }

  let searchTimer = null;
  function search(q) {
    clearTimeout(searchTimer);
    if (!q) { renderResults([]); return; }
    searchTimer = setTimeout(async () => {
      try {
        const d = await App.api.userSearch(q);
        renderResults(d.users || []);
      } catch (e) { /* ignore blips */ }
    }, 250);
  }

  function renderResults(users) {
    const list = $('ncResults');
    if (!list) return;
    if (!users.length) {
      list.innerHTML = '<div class="ncempty">No users found</div>';
      return;
    }
    list.innerHTML = '';
    users.forEach(u => {
      const row = App.utils.el(
        '<div class="nrow' + (picked.includes(u.username) ? ' picked' : '') + '" data-u="' + esc(u.username) + '">' +
          '<div class="avatar a44" style="background:' + esc(u.color || '#5682a3') + '">' +
            initials(u.name) + '</div>' +
          '<div class="ninfo"><div class="nname">' + esc(u.name) +
            (u.bot ? ' <span class="botbadge">bot</span>' : '') + '</div>' +
            '<div class="nsub">@' + esc(u.username) + '</div></div>' +
          (groupMode ? '<span class="ncheck">' + icon('check', 'sm') + '</span>' : '') +
        '</div>');
      row.addEventListener('click', () => {
        if (groupMode) {
          const i = picked.indexOf(u.username);
          if (i >= 0) picked.splice(i, 1); else picked.push(u.username);
          $('ncCount').textContent = picked.length + ' selected';
          renderResults(users);
        } else {
          startDm(u.username);
        }
      });
      list.appendChild(row);
    });
  }

  async function startDm(username) {
    try {
      const d = await App.api.createChat({ type: 'dm', username });
      await App.store.loadChats();
      App.components.chatlist.render(App.store.state.filter);
      close();
      App.components.chatview.open(d.chat.id);
    } catch (e) {
      App.utils.toast(e.message);
    }
  }

  async function createGroup() {
    const name = $('ncName').value.trim();
    if (!name) { App.utils.toast('Enter a group name'); return; }
    if (!picked.length) { App.utils.toast('Pick at least one member'); return; }
    try {
      const d = await App.api.createChat({ type: 'group', name, memberUsernames: picked });
      await App.store.loadChats();
      App.components.chatlist.render(App.store.state.filter);
      close();
      App.components.chatview.open(d.chat.id);
      App.utils.toast('Group created');
    } catch (e) {
      App.utils.toast(e.message);
    }
  }

  return { open, close };
})();
