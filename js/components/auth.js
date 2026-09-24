/* ================= components/auth.js — login / signup screen =================
   Telegram-styled auth gate. Shown when there is no valid token.
   On success: stores the token and boots the app.
*/
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.auth = (() => {
  const { $, esc, icon } = App.utils;
  let mode = 'login'; // 'login' | 'signup'

  function ensure() {
    let r = $('authroot');
    if (!r) {
      r = document.createElement('div');
      r.id = 'authroot';
      document.body.appendChild(r);
    }
    return r;
  }

  function show(notice) {
    const r = ensure();
    r.classList.add('open');
    r.innerHTML =
      '<div class="authcard">' +
        '<div class="authlogo">' + icon('logo', 'lg') + '</div>' +
        '<h1>Telegram</h1>' +
        '<p class="authsub">Log in or create a real account.<br>Messages sync across every device you log in on.</p>' +
        '<div class="authtabs">' +
          '<button data-m="login" class="' + (mode === 'login' ? 'on' : '') + '">Log in</button>' +
          '<button data-m="signup" class="' + (mode === 'signup' ? 'on' : '') + '">Sign up</button>' +
        '</div>' +
        (mode === 'signup'
          ? '<input id="aName" placeholder="Display name" maxlength="40" autocomplete="name">'
          : '') +
        '<input id="aUser" placeholder="username" maxlength="20" autocomplete="username" autocapitalize="off" spellcheck="false">' +
        '<input id="aPass" type="password" placeholder="Password (min 4 chars)" autocomplete="' +
          (mode === 'login' ? 'current-password' : 'new-password') + '">' +
        '<div class="autherr" id="aErr">' + (notice ? esc(notice) : '') + '</div>' +
        '<button class="authbtn" id="aGo">' + (mode === 'login' ? 'Log in' : 'Create account') + '</button>' +
        '<p class="authhint">Demo contacts (arjun, diya, mom…) use password <b>password</b></p>' +
      '</div>';

    r.querySelectorAll('.authtabs button').forEach(b =>
      b.addEventListener('click', () => { mode = b.dataset.m; show(); $('aUser').focus(); }));
    const go = () => submit().catch(e => fail(e.message));
    $('aGo').addEventListener('click', go);
    r.querySelectorAll('input').forEach(i =>
      i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    setTimeout(() => { const u = $('aUser'); if (u) u.focus(); }, 50);
  }

  function fail(msg) {
    const e = $('aErr');
    if (e) { e.textContent = msg; e.classList.add('show'); }
    const btn = $('aGo');
    if (btn) { btn.disabled = false; btn.textContent = mode === 'login' ? 'Log in' : 'Create account'; }
  }

  async function submit() {
    const username = $('aUser').value.trim().toLowerCase();
    const password = $('aPass').value;
    const name = mode === 'signup' ? $('aName').value.trim() : '';
    if (!username) return fail('Enter a username.');
    if (password.length < 4) return fail('Password must be at least 4 characters.');
    if (mode === 'signup' && !name) return fail('Enter a display name.');
    const btn = $('aGo');
    btn.disabled = true; btn.textContent = 'Please wait…';
    const data = mode === 'login'
      ? await App.api.login(username, password)
      : await App.api.signup(username, password, name);
    App.api.setToken(data.token);
    App.me = data.user;
    hide();
    App.boot();
  }

  function hide() {
    const r = $('authroot');
    if (r) { r.classList.remove('open'); r.innerHTML = ''; }
  }

  return { show, hide };
})();
