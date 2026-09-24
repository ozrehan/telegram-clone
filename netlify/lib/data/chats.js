/* ================= data/chats.js — chat directory (12 chats) =================
   type: dm | group | channel | saved | bot
   grad: avatar gradient class (g1..g8, see css/base.css)
*/
'use strict';
window.App = window.App || {};
App.data = App.data || {};

App.data.chats = [
  {
    id: 'arjun', name: 'Arjun Mehta', type: 'dm', grad: 'g1',
    status: 'online', muted: false, pinned: true, unread: 2,
    about: 'Cricket enjoyer 🏏',
    replies: [
      'Haha exactly 😂', 'Sounds good, let me check and get back to you',
      'No way, send me the link!', 'Okay cool, talk later then 👍',
      'Deal. See you there!', 'Broooo that\'s actually insane'
    ]
  },
  {
    id: 'squad', name: 'Weekend Squad', type: 'group', grad: 'g2',
    status: '5 members', muted: false, pinned: true, unread: 4,
    members: [
      { name: 'Priya Nair', color: '#d45246', role: 'admin' },
      { name: 'Rahul Verma', color: '#2f80ed', role: 'member' },
      { name: 'Sneha Rao', color: '#7b4b94', role: 'member' },
      { name: 'You', color: '#4a9e1e', role: 'member' },
      { name: 'Vikram Shah', color: '#e07b1f', role: 'member' }
    ],
    replies: ['+1 for that', 'I\'m in, count me 🙋', 'lol classic',
      'Can we do Sunday instead?', 'On my way, 10 mins']
  },
  {
    id: 'technews', name: 'Tech News', type: 'channel', grad: 'g6',
    status: '128K subscribers', muted: true, pinned: false, unread: 0,
    about: 'Daily tech headlines. No spam, ever.',
    replies: []
  },
  {
    id: 'designteam', name: 'Design Team 🎨', type: 'group', grad: 'g4',
    status: '8 members', muted: false, pinned: false, unread: 3,
    members: [
      { name: 'Ananya Iyer', color: '#c93a6e', role: 'admin' },
      { name: 'Rohan Verma', color: '#2f80ed', role: 'member' },
      { name: 'Meera Joshi', color: '#4a9e1e', role: 'member' },
      { name: 'You', color: '#7b4b94', role: 'member' },
      { name: 'Dev Patel', color: '#e07b1f', role: 'member' }
    ],
    replies: ['Looking good! 👍', 'Can you share the Figma link?',
      'Left a few comments on the mockup', 'Ship it 🚀']
  },
  {
    id: 'saved', name: 'Saved Messages', type: 'saved', grad: 'g4',
    status: '', muted: false, pinned: false, unread: 0,
    replies: []
  },
  {
    id: 'diya', name: 'Diya Sharma', type: 'dm', grad: 'g7',
    status: 'last seen recently', muted: false, pinned: false, unread: 0,
    about: '☕ > everything',
    replies: ['Aww thanks! 🥰', 'Let\'s do it, Friday works for me',
      'Sending it now, one sec', 'Haha you always say that',
      'Omg yes, I was just thinking the same']
  },
  {
    id: 'startupindia', name: 'Startup India', type: 'channel', grad: 'g5',
    status: '86K subscribers', muted: true, pinned: false, unread: 0,
    about: 'Funding news, launches & ecosystem updates.',
    replies: []
  },
  {
    id: 'kabir', name: 'Kabir Singhania', type: 'dm', grad: 'g5',
    status: 'last seen 2 hours ago', muted: true, pinned: false, unread: 0,
    about: 'Work first. Mostly.',
    replies: ['noted', 'will do', 'ok', 'on it']
  },
  {
    id: 'mom', name: 'Mom ❤️', type: 'dm', grad: 'g8',
    status: 'online', muted: false, pinned: false, unread: 1,
    replies: ['Beta, khana kha liya? 🍛', 'Call when free, papa wants to talk',
      'Good night, take care 😘', 'Send me that photo na']
  },
  {
    id: 'sneha', name: 'Sneha Kulkarni', type: 'dm', grad: 'g3',
    status: 'last seen 10 minutes ago', muted: false, pinned: false, unread: 0,
    about: 'Plant mom 🌿 | sourdough era',
    replies: ['Yesss finally!!', 'Haha stoppp 😭', 'Okay but why is this so relatable',
      'Call me tonight?', 'Sending pics in a sec 📸']
  },
  {
    id: 'pollbot', name: 'PollBot', type: 'bot', grad: 'g2',
    status: 'bot', muted: false, pinned: false, unread: 0,
    about: 'I make polls. That\'s literally it.',
    replies: ['Poll created! Share it with your group 📊',
      'Got it — adding "maybe" as an option 😄',
      'Results are in! Check the poll above 👆']
  },
  {
    id: 'rohan', name: 'Rohan Verma', type: 'dm', grad: 'g6',
    status: 'last seen yesterday', muted: false, pinned: false, unread: 0,
    about: 'GG only 🎮',
    replies: ['GG bro', 'One more game?', 'That clutch was unreal 🔥',
      'You carrying or am I dreaming', 'Lobby in 5']
  }
];
