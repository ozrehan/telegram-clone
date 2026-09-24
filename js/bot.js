/* ================= bot.js — auto-reply engine =================
   Simulates a live peer: "typing..." indicator, then a rotating
   contextual reply per chat. Group replies rotate through members.
*/
'use strict';
window.App = window.App || {};

App.bot = (() => {
  const cursor = {};   // chatId -> reply index

  const GROUP_MEMBERS = {
    squad: [['Priya Nair', '#d45246'], ['Rahul Verma', '#2f80ed'], ['Sneha Rao', '#7b4b94']],
    designteam: [['Ananya Iyer', '#c93a6e'], ['Rohan Verma', '#2f80ed'], ['Meera Joshi', '#4a9e1e']]
  };

  function nextReply(chat) {
    const pool = chat.replies && chat.replies.length ? chat.replies : ['Got it 👍'];
    const i = (cursor[chat.id] || 0) % pool.length;
    cursor[chat.id] = (cursor[chat.id] || 0) + 1;
    return pool[i];
  }

  /**
   * React to a message the user just sent.
   * Channels and Saved Messages stay silent (like the real app).
   */
  function react(chat, sentMsg) {
    if (chat.type === 'channel' || chat.type === 'saved') return;

    const view = App.components.chatview;
    const realStatus = chat.status;

    // "typing..." after a beat — only if the user is still looking at this chat
    setTimeout(() => {
      if (App.store.state.activeId !== chat.id) return;
      view.showTyping(true);
    }, 700);

    // deliver the reply
    setTimeout(() => {
      const stillHere = App.store.state.activeId === chat.id;
      view.showTyping(false, realStatus);
      const reply = { from: 'them', kind: 'text', text: nextReply(chat) };
      if (chat.type === 'group' && GROUP_MEMBERS[chat.id]) {
        const [nm, col] = GROUP_MEMBERS[chat.id][cursor[chat.id] % GROUP_MEMBERS[chat.id].length];
        reply.sender = nm; reply.color = col;
      }
      if (chat.type === 'bot') reply.text = nextReply(chat);
      App.store.addMessage(chat.id, reply);
      if (stillHere) {
        view.appendMessage(chat, reply);
      } else {
        App.store.bumpUnread(chat.id);
      }
      App.components.chatlist.render(App.store.state.filter);
    }, 2200);
  }

  return { react };
})();
