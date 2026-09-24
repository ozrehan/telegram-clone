/* ================= components/infopanel.js — chat info slide-over =================
   Right slide-over panel: profile hero, actions (mute, media), group members,
   shared media grid (picsum + sent photos), danger actions.
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.infopanel = (() => {
  const { $, esc, icon, avatar, initials } = App.utils;
  let current = null;

  function ensure() {
    let p = $('infopanel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'infopanel';
      $('chatpane').appendChild(p);
    }
    return p;
  }

  function open(chat) {
    current = chat;
    const p = ensure();
    const msgs = App.store.getMessages(chat.id);
    const photos = msgs.filter(m => m.kind === 'image' && (m.src || m.data)).map(m => m.src || m.data);
    // top up the grid with picsum shots so it feels lived-in
    while (photos.length < 9)
      photos.push('https://picsum.photos/seed/' + chat.id + photos.length + '/300/300');

    let membersHtml = '';
    if (chat.type === 'group' && chat.members) {
      membersHtml = '<div class="psec">' + chat.members.length + ' members</div><div class="members">' +
        chat.members.map(mm =>
          '<div class="member"><div class="avatar a44" style="background:' + esc(mm.color) + '">' +
          initials(mm.name) + '</div><div><div class="mname">' + esc(mm.name) +
          '</div><div class="mrole">' + esc(mm.role) + '</div></div></div>').join('') +
        '</div>';
    }

    p.innerHTML =
      '<div class="phead"><button class="iconbtn" id="ipClose">' + icon('back') + '</button>' +
      '<h3>' + (chat.type === 'group' ? 'Group Info' : chat.type === 'channel' ? 'Channel Info' : 'Contact Info') + '</h3></div>' +
      '<div class="pbody">' +
        '<div class="phero">' + avatar(chat, 'a60') +
          '<h2>' + esc(chat.name) + '</h2>' +
          '<div class="sub">' + esc(chat.status || chat.about || '') + '</div>' +
          (chat.about ? '<div class="sub" style="margin-top:6px">' + esc(chat.about) + '</div>' : '') +
        '</div>' +
        '<div class="prow" data-a="mute">' + icon(chat.muted ? 'check' : 'mute') +
          '<span>' + (chat.muted ? 'Unmute' : 'Mute') + ' notifications</span></div>' +
        '<div class="psec">Shared media</div>' +
        '<div id="mediagrid">' +
          photos.slice(0, 9).map(s => '<img src="' + esc(s) + '" loading="lazy" alt="media">').join('') +
        '</div>' +
        membersHtml +
        '<div class="psec">Actions</div>' +
        (chat.type === 'group'
          ? '<div class="prow danger" data-a="leave">' + icon('close') + '<span>Leave group</span></div>'
          : '<div class="prow danger" data-a="delete">' + icon('close') + '<span>Delete chat</span></div>') +
      '</div>';

    p.classList.add('open');
    $('ipClose').addEventListener('click', close);
    p.querySelectorAll('.prow').forEach(r =>
      r.addEventListener('click', () => action(r.dataset.a, chat)));
  }

  function action(a, chat) {
    if (a === 'mute') {
      App.store.toggleMute(chat.id).then(() => {
        open(chat);
        App.components.chatlist.render(App.store.state.filter);
      });
    }
    if (a === 'leave' || a === 'delete') {
      App.utils.toast(a === 'leave' ? 'You left the group (demo)' : 'Chat deleted (demo)');
      close();
    }
  }

  function close() {
    const p = $('infopanel');
    if (p) p.classList.remove('open');
    current = null;
  }

  return { open, close };
})();
