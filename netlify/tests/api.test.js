/* ================= netlify/tests/api.test.js =================
   Backend tests: pure node, in-memory blob store shim.
   Flow: signup two users -> A creates DM with B -> A sends -> B polls
   and sees it -> B replies -> A sees reply -> typing visible ->
   unauthorized blocked -> bot replies scheduled server-side.

   Run: node netlify/tests/api.test.js   (must exit 0)
*/
'use strict';

const assert = require('node:assert');
const path = require('node:path');
const { createApp } = require('../functions/api.js');

/* in-memory @netlify/blobs-compatible shim */
function memStore() {
  const m = new Map();
  return {
    async get(k, opts) {
      const v = m.get(k);
      if (v === undefined) return null;
      return opts && opts.type === 'json' ? JSON.parse(JSON.stringify(v)) : v;
    },
    async setJSON(k, v) { m.set(k, JSON.parse(JSON.stringify(v))); },
    async delete(k) { m.delete(k); },
    async list({ prefix }) {
      const blobs = [...m.keys()].filter(k => k.startsWith(prefix)).map(k => ({ key: k }));
      return { blobs };
    }
  };
}

async function main() {
  let t = Date.now();                   // controllable clock (starts at real now)
  const app = createApp(memStore(), { now: () => t });
  const H = (token) => token ? { authorization: 'Bearer ' + token } : {};
  const call = (method, p, q, b, headers) => app.handle(method, p, q || {}, b || {}, headers || {});

  // 1. signup two real users
  let r = await call('POST', '/auth/signup', 0, { username: 'alice', password: 'secret1', name: 'Alice' });
  assert.strictEqual(r.status, 200, 'alice signup: ' + JSON.stringify(r.json));
  const aliceTok = r.json.token;
  assert.ok(aliceTok, 'alice gets token');

  r = await call('POST', '/auth/signup', 0, { username: 'bob', password: 'secret2', name: 'Bob' });
  assert.strictEqual(r.status, 200, 'bob signup');
  const bobTok = r.json.token;

  // duplicate username rejected
  r = await call('POST', '/auth/signup', 0, { username: 'alice', password: 'secret1', name: 'Alice2' });
  assert.strictEqual(r.status, 409, 'duplicate signup rejected');

  // bad login rejected
  r = await call('POST', '/auth/login', 0, { username: 'alice', password: 'wrong' });
  assert.strictEqual(r.status, 401, 'bad login rejected');

  // good login works
  r = await call('POST', '/auth/login', 0, { username: 'alice', password: 'secret1' });
  assert.strictEqual(r.status, 200, 'login works');

  // 2. seeded workspace: alice got demo chats incl. arjun DM
  r = await call('GET', '/chats', 0, 0, H(aliceTok));
  assert.strictEqual(r.status, 200, 'get chats');
  assert.ok(r.json.chats.length >= 10, 'seeded chats present, got ' + r.json.chats.length);
  const arjunChat = r.json.chats.find(c => c.name === 'Arjun Mehta');
  assert.ok(arjunChat, 'arjun DM seeded');
  assert.ok(arjunChat.unread >= 1, 'seeded unread badges work');

  // 3. alice creates a real DM with bob (a real registered user)
  r = await call('POST', '/chats', 0, { type: 'dm', username: 'bob' }, H(aliceTok));
  assert.strictEqual(r.status, 201, 'dm created: ' + JSON.stringify(r.json));
  const dmId = r.json.chat.id;

  // bob sees the chat too
  r = await call('GET', '/chats', 0, 0, H(bobTok));
  assert.ok(r.json.chats.some(c => c.id === dmId), 'bob sees the dm');

  // 4. alice sends -> bob polls and sees it
  t += 1000; // time passes between chat creation and send
  r = await call('POST', '/chats/' + dmId + '/messages', 0, { text: 'hey bob, real message!' }, H(aliceTok));
  assert.strictEqual(r.status, 201, 'send works');
  const mid1 = r.json.message.mid;

  r = await call('GET', '/chats/' + dmId + '/messages', { after: '0' }, 0, H(bobTok));
  assert.ok(r.json.messages.some(m => m.mid === mid1 && m.text === 'hey bob, real message!'),
    'bob polls and sees alice message');

  // unread badge for bob
  r = await call('GET', '/chats', 0, 0, H(bobTok));
  const bobView = r.json.chats.find(c => c.id === dmId);
  assert.strictEqual(bobView.unread, 1, 'bob has 1 unread, got ' + bobView.unread);

  // 5. bob replies -> alice sees it
  t += 1000;
  r = await call('POST', '/chats/' + dmId + '/messages', 0,
    { text: 'hey alice! working prototype ftw', replyTo: { mid: mid1 } }, H(bobTok));
  assert.strictEqual(r.status, 201, 'bob reply sent');
  assert.ok(r.json.message.replyTo, 'reply quote attached');

  r = await call('GET', '/chats/' + dmId + '/messages', { after: '0' }, 0, H(aliceTok));
  assert.ok(r.json.messages.some(m => m.from === 'bob' && m.text.includes('working prototype')),
    'alice sees bob reply');

  // 6. typing indicator: alice typing -> bob sees it
  await call('POST', '/chats/' + dmId + '/typing', 0, {}, H(aliceTok));
  r = await call('GET', '/chats/' + dmId + '/typing', 0, 0, H(bobTok));
  assert.ok(r.json.typing.some(x => x.username === 'alice'), 'bob sees alice typing');

  // typing expires after TTL
  t += 10000;
  r = await call('GET', '/chats/' + dmId + '/typing', 0, 0, H(bobTok));
  assert.strictEqual(r.json.typing.length, 0, 'typing expired');

  // 7. read receipts reset unread
  await call('POST', '/chats/' + dmId + '/read', 0, {}, H(bobTok));
  r = await call('GET', '/chats', 0, 0, H(bobTok));
  assert.strictEqual(r.json.chats.find(c => c.id === dmId).unread, 0, 'unread cleared after read');

  // 8. unauthorized blocked everywhere
  for (const [m, p] of [['GET', '/chats'], ['GET', '/me'], ['POST', '/chats/' + dmId + '/messages']]) {
    r = await call(m, p, 0, m === 'POST' ? { text: 'x' } : 0, {});
    assert.strictEqual(r.status, 401, m + ' ' + p + ' blocked without token');
  }
  // bob cannot read alice's other chats
  r = await call('GET', '/chats/' + arjunChat.id + '/messages', { after: '0' }, 0, H(bobTok));
  assert.strictEqual(r.status, 404, "bob can't open alice's seeded chat");

  // 9. server-side bot: alice messages seeded arjun (bot user)
  t += 1000;
  r = await call('GET', '/chats/' + arjunChat.id + '/messages', { after: '0' }, 0, H(aliceTok));
  const before = r.json.messages.length;
  r = await call('POST', '/chats/' + arjunChat.id + '/messages', 0, { text: 'yo arjun' }, H(aliceTok));
  assert.strictEqual(r.status, 201, 'message to bot chat sent');
  // poll immediately: no bot reply yet (scheduled in the future)
  r = await call('GET', '/chats/' + arjunChat.id + '/messages', { after: '0' }, 0, H(aliceTok));
  assert.strictEqual(r.json.messages.length, before + 1, 'no instant bot reply');
  // ...but arjun shows as typing (pending future message)
  r = await call('GET', '/chats/' + arjunChat.id + '/typing', 0, 0, H(aliceTok));
  assert.ok(r.json.typing.some(x => x.username === 'arjun'), 'bot shows typing while reply pending');
  // advance clock past the bot delay: reply arrives
  t += 5000;
  r = await call('GET', '/chats/' + arjunChat.id + '/messages', { after: '0' }, 0, H(aliceTok));
  const botMsgs = r.json.messages.filter(m => m.from === 'arjun');
  assert.ok(botMsgs.length >= 1, 'server-side bot reply arrived');
  assert.ok(botMsgs[botMsgs.length - 1].text.length > 0, 'bot reply has text');

  // 10. user search finds real users
  r = await call('GET', '/users/search', { q: 'ali' }, 0, H(bobTok));
  assert.ok(r.json.users.some(u => u.username === 'alice' && !u.bot), 'search finds alice');

  // 11. group creation with real members
  r = await call('POST', '/chats', 0, { type: 'group', name: 'Test Group', memberUsernames: ['bob'] }, H(aliceTok));
  assert.strictEqual(r.status, 201, 'group created');
  const grpId = r.json.chat.id;
  r = await call('POST', '/chats/' + grpId + '/messages', 0, { text: 'hello group' }, H(bobTok));
  assert.strictEqual(r.status, 201, 'bob can post to group');

  // 12. delete: own message ok, other's forbidden
  r = await call('POST', '/chats/' + dmId + '/messages', 0, { text: 'delete me' }, H(aliceTok));
  const delMid = r.json.message.mid;
  r = await call('POST', '/messages/' + delMid + '/delete', 0, {}, H(bobTok));
  assert.strictEqual(r.status, 403, "can't delete other's message");
  r = await call('POST', '/messages/' + delMid + '/delete', 0, {}, H(aliceTok));
  assert.strictEqual(r.status, 200, 'own message deleted');
  r = await call('GET', '/chats/' + dmId + '/messages', { after: '0' }, 0, H(aliceTok));
  assert.ok(!r.json.messages.some(m => m.mid === delMid), 'message gone');

  // 13. oversized attachment rejected
  r = await call('POST', '/chats/' + dmId + '/messages', 0,
    { kind: 'image', data: 'x'.repeat(2100000) }, H(aliceTok));
  assert.strictEqual(r.status, 413, 'oversized attachment rejected');

  // 14. channel is read-only
  const chan = (await call('GET', '/chats', 0, 0, H(aliceTok))).json.chats.find(c => c.type === 'channel');
  assert.ok(chan, 'channel seeded');
  r = await call('POST', '/chats/' + chan.id + '/messages', 0, { text: 'spam' }, H(aliceTok));
  assert.strictEqual(r.status, 403, 'channel read-only');

  // 15. pin/mute toggles persist
  r = await call('POST', '/chats/' + dmId + '/pin', 0, {}, H(aliceTok));
  assert.strictEqual(r.json.pinned, true, 'pinned');
  r = await call('GET', '/chats', 0, 0, H(aliceTok));
  assert.strictEqual(r.json.chats.find(c => c.id === dmId).pinned, true, 'pin persisted');

  console.log('ALL 15 TEST GROUPS PASSED');
}

main().then(() => process.exit(0)).catch(e => {
  console.error('TEST FAILED:', e.message);
  console.error(e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
});
