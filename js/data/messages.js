/* ================= data/messages.js — full conversation histories =================
   Message shape:
     { from:'me'|'them', sender, color,            // sender/color for groups
       kind:'text'|'image'|'file'|'voice'|'sticker',
       text, src, fileName, fileSize, duration,    // kind-specific payload
       replyTo:{sender,text}, forwardedFrom, time }
   store.js assigns a unique `mid` to every message at boot.
*/
'use strict';
window.App = window.App || {};
App.data = App.data || {};

App.data.messages = {

/* ---------------- Arjun Mehta (DM) ---------------- */
arjun: [
  { from:'them', text:'Bro did you see the match last night??', time:'21:14' },
  { from:'me', text:'Only the highlights. That last over was insane', time:'21:20' },
  { from:'them', text:'I was screaming at the TV 😂 Kohli is unreal', time:'21:21' },
  { from:'me', text:'19 needed off 6 and he just... casually does it', time:'21:22' },
  { from:'them', text:'The flick over midwicket for six. I rewound it 4 times', time:'21:23' },
  { from:'me', text:'Okay but the real question — are we watching the final together?', time:'21:25' },
  { from:'them', text:'Obviously. My place, big screen. I\'ll order biryani', time:'21:27' },
  { from:'me', text:'Deal. I\'ll bring the cold drinks', time:'21:28' },
  { from:'them', text:'Btw are we still on for Saturday? Need to book the turf', time:'21:42' },
  { from:'me', text:'Yes! 7-a-side, evening slot?', time:'21:45' },
  { from:'them', text:'Let me check what\'s free', time:'21:46' },
  { from:'them', kind:'voice', duration:14, text:'Voice message', time:'21:52' },
  { from:'me', text:'6 to 8 works. Ask Rahul if he\'s in too', time:'21:55' },
  { from:'them', text:'He said yes. So we\'re 8 now, need 6 more', time:'22:03' },
  { from:'me', text:'I\'ll spam the squad group 😄', time:'22:04' },
  { from:'them', text:'Haha do it. Also bring your own shin pads this time', time:'22:05' },
  { from:'me', text:'Rude but fair 😭', time:'22:06' },
  { from:'them', text:'Booked! Turf 4, Saturday 6-8 PM. ₹2400 split', time:'22:31' },
  { from:'me', text:'Nice, sending you my share now', time:'22:33' },
  { from:'them', text:'👍 see you there', time:'22:34' }
],

/* ---------------- Weekend Squad (group) ---------------- */
squad: [
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'Guys, trek this Sunday? Nandi Hills, sunrise batch 🌄', time:'08:02' },
  { from:'them', sender:'Rahul Verma', color:'#2f80ed', text:'I\'m in! What time do we leave?', time:'08:15' },
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'Pickup at 4:30 AM from Silk Board. Carry water + snacks', time:'08:16' },
  { from:'me', text:'4:30 AM 😭 fine, I\'ll set 3 alarms', time:'08:31' },
  { from:'them', sender:'Sneha Rao', color:'#7b4b94', text:'Haha same. Also who\'s bringing the speaker?', time:'09:05' },
  { from:'them', sender:'Rahul Verma', color:'#2f80ed', text:'I got the speaker + playlist ready 🎶', time:'09:12' },
  { from:'them', sender:'Vikram Shah', color:'#e07b1f', text:'No sad songs at 5 AM please. Only bangers', time:'09:20' },
  { from:'them', sender:'Rahul Verma', color:'#2f80ed', text:'Define bangers', time:'09:21' },
  { from:'them', sender:'Vikram Shah', color:'#e07b1f', text:'Anything I can scream-sing on the highway', time:'09:22' },
  { from:'me', text:'This is going to be a long drive 😂', time:'09:25' },
  { from:'them', sender:'Priya Nair', color:'#d45246', kind:'image',
    src:'https://picsum.photos/seed/nanditrek/600/400', text:'Route map — we start here, sunrise point marked ⭐', time:'09:40' },
  { from:'them', sender:'Sneha Rao', color:'#7b4b94', text:'Ooh nice, the trail looks easy enough', time:'09:44',
    replyTo:{ sender:'Priya Nair', text:'Route map — we start here, sunrise point marked ⭐' } },
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'It\'s moderate. 2 hours up if we don\'t stop for 50 photos', time:'09:46' },
  { from:'them', sender:'Vikram Shah', color:'#e07b1f', text:'We WILL stop for 50 photos', time:'09:47' },
  { from:'me', text:'He\'s not wrong', time:'09:48' },
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'Fine. Budget 3 hours then 😤', time:'09:50' },
  { from:'them', sender:'Rahul Verma', color:'#2f80ed', text:'Cab booked — Innova, fits 6. ₹3600 total', time:'10:15' },
  { from:'me', text:'₹600 each, I\'ll collect on Saturday', time:'10:18' },
  { from:'them', sender:'Sneha Rao', color:'#7b4b94', text:'Can someone bring extra power bank? Mine dies by noon', time:'10:32' },
  { from:'them', sender:'Vikram Shah', color:'#e07b1f', text:'I have a 20000mAh one, covered', time:'10:35' },
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'Final checklist: water, snacks, torch, jacket. It\'s cold at the top!', time:'11:02' },
  { from:'me', text:'Jacket in Bangalore? Bold claim but okay', time:'11:05' },
  { from:'them', sender:'Priya Nair', color:'#d45246', text:'You\'ll thank me at 6 AM 🥶', time:'11:06' },
  { from:'them', kind:'sticker', text:'👍', time:'11:07' }
],

/* ---------------- Tech News (channel) ---------------- */
technews: [
  { from:'them', text:'🚀 Open-source model "Falcon-3" just dropped — beats GPT-4o-mini on MMLU, fully MIT licensed.', time:'10:00' },
  { from:'them', text:'📱 Android 17 beta adds on-device AI summaries for every app. Pixel 10 first in line.', time:'11:30' },
  { from:'them', kind:'image', src:'https://picsum.photos/seed/chipphoto/600/340',
    text:'📸 Die shot of the new 2nm test chip. 40% better perf-per-watt than last gen.', time:'12:00' },
  { from:'them', text:'💻 Reminder: our "Build a database in a weekend" workshop stream starts in 1 hour.', time:'12:45' },
  { from:'them', text:'🔒 Signal rolls out usernames globally — you can finally hide your phone number.', time:'14:20' },
  { from:'them', text:'🛰️ ISRO confirms Gaganyaan crewed mission window: early next year. 4 astronauts in training.', time:'15:05' },
  { from:'them', text:'💾 Postgres 18 beta: 3x faster bulk loads, built-in columnar storage. DBAs, rejoice.', time:'16:40' },
  { from:'them', text:'🌙 That\'s all for today. 7 stories, 0 clickbait. See you tomorrow!', time:'21:00' },
  { from:'them', text:'Pebble is back! The classic smartwatch reboots with 30-day battery.', time:'17:30' },
  { from:'them', text:'Study: AI code assistants boost junior dev output 35%, seniors barely 5%.', time:'18:15' },
  { from:'them', text:'Steam breaks 40M concurrent users during the winter sale. Again.', time:'19:20' },
],

/* ---------------- Design Team (group) ---------------- */
designteam: [
  { from:'them', sender:'Ananya Iyer', color:'#c93a6e', text:'Morning team! Launch is Friday — let\'s lock the homepage hero today 🎯', time:'09:30' },
  { from:'me', text:'On it. Pushing the new hero variant in 10 mins', time:'09:35' },
  { from:'them', sender:'Rohan Verma', color:'#2f80ed', text:'The CTA contrast failed a11y check btw. Fixing now', time:'09:41' },
  { from:'them', sender:'Meera Joshi', color:'#4a9e1e', text:'I reviewed the mobile flow — the checkout stepper is confusing on small screens', time:'10:02' },
  { from:'them', sender:'Ananya Iyer', color:'#c93a6e', text:'Can you drop screenshots in the thread?', time:'10:05' },
  { from:'them', sender:'Meera Joshi', color:'#4a9e1e', kind:'image',
    src:'https://picsum.photos/seed/mobilemock/400/700', text:'See step 2 — the back button overlaps the progress bar', time:'10:11' },
  { from:'me', text:'Yeah that\'s broken. I\'ll rework the stepper layout today', time:'10:15',
    replyTo:{ sender:'Meera Joshi', text:'See step 2 — the back button overlaps the progress bar' } },
  { from:'them', sender:'Dev Patel', color:'#e07b1f', text:'Design tokens PR is merged. Colors, spacing, type scale all live', time:'10:40' },
  { from:'them', sender:'Ananya Iyer', color:'#c93a6e', text:'Amazing. Rehan, can you also update the empty states to use the new illustrations?', time:'10:55' },
  { from:'me', text:'Yep, adding to my list', time:'10:57' },
  { from:'them', sender:'Rohan Verma', color:'#2f80ed', kind:'file',
    fileName:'brand-guidelines-v3.pdf', fileSize:2457600, text:'Updated brand guidelines — please read before Friday 🙏', time:'11:20' },
  { from:'them', sender:'Meera Joshi', color:'#4a9e1e', text:'The new illustrations are SO good btw', time:'11:35' },
  { from:'them', sender:'Dev Patel', color:'#e07b1f', text:'+1, the empty state fox is adorable', time:'11:36' },
  { from:'me', text:'Haha glad. Okay hero variant is up — link in the design channel', time:'12:05' },
  { from:'them', sender:'Ananya Iyer', color:'#c93a6e', text:'Reviewing now...', time:'12:20' },
  { from:'them', sender:'Ananya Iyer', color:'#c93a6e', text:'This is it. Locking this version 🔒 Great work!', time:'12:34' },
  { from:'me', text:'🎉', time:'12:35' },
  { from:'them', sender:'Rohan Verma', color:'#2f80ed', text:'3 days to launch. We got this 💪', time:'12:40' }
],

/* ---------------- Saved Messages ---------------- */
saved: [
  { from:'me', text:'🔖 Renew domain: rehan.dev — expires Oct 12', time:'09:00' },
  { from:'me', text:'📝 Ideas for the portfolio: 1) game engine demo 2) raft visualizer 3) write the blog post', time:'09:05' },
  { from:'me', text:'https://github.com/ozrehan/build-your-own-everything', time:'09:06' },
  { from:'me', kind:'image', src:'https://picsum.photos/seed/whiteboard/600/400',
    text:'Whiteboard from yesterday\'s system design session — don\'t lose this', time:'09:20' },
  { from:'me', text:'Book to read: "Designing Data-Intensive Applications" — ch 5 next', time:'10:15' },
  { from:'me', kind:'file', fileName:'resume-2026.pdf', fileSize:184320,
    text:'Latest resume copy', time:'11:00' },
  { from:'me', text:'Gym: Mon/Wed/Fri. Actually go this time.', time:'18:30' },
  { from:'me', text:'Mom\'s birthday gift ideas: saree? watch? Ask Diya', time:'19:02' },
  { from:'me', text:'Dentist appointment: Oct 3, 11 AM. Don\'t cancel this time', time:'20:10' },
  { from:'me', text:'Read the Raft follow-up paper this weekend', time:'21:44' },
]
}; // end App.data.messages literal — remaining chats assigned below

/* ---------------- Diya Sharma (DM) ---------------- */
App.data.messages.diya = [
  { from:'me', text:'Happy birthday!! 🎂 Hope the cake survived the candles this year', time:'00:01' },
  { from:'them', text:'HAHA thank youu! It did, barely. 24 candles is a fire hazard', time:'09:44' },
  { from:'me', text:'Dinner on me this weekend to celebrate properly?', time:'09:50' },
  { from:'them', text:'You don\'t have to ask twice 😌 Friday?', time:'10:02' },
  { from:'me', text:'Friday it is. That Italian place in Indiranagar?', time:'10:05' },
  { from:'them', text:'Ooooh yes, I\'ve been wanting to try it!', time:'10:07' },
  { from:'me', text:'Table for 2, 8 PM. I\'ll book today', time:'10:10' },
  { from:'them', text:'You\'re the best 🥰', time:'10:12' },
  { from:'them', kind:'sticker', text:'💃', time:'10:13' },
  { from:'me', text:'Haha. Dress code — smart casual, don\'t overthink it', time:'10:20' },
  { from:'them', text:'Too late, already overthinking', time:'10:25' },
  { from:'me', text:'Knew it 😂', time:'10:26' },
  { from:'them', text:'Btw did you see Ananya\'s story? She\'s in Goa AGAIN', time:'11:40' },
  { from:'me', text:'Third time this year. She\'s living my dream life', time:'11:45' },
  { from:'them', text:'We should plan something too. After your launch madness ends', time:'11:50' },
  { from:'me', text:'Yes please. Beach > everything', time:'11:52' },
  { from:'them', text:'Okay focus. Friday, 8 PM, Italian. See you there ❤️', time:'12:00' },
  { from:'me', text:'See you ❤️', time:'12:02' }
];

/* ---------------- Startup India (channel) ---------------- */
App.data.messages.startupindia = [
  { from:'them', text:'💰 Fintech startup "ZepPay" raises $40M Series B led by Peak XV. UPI-adjacent, 12M users.', time:'09:00' },
  { from:'them', text:'🚀 Bengaluru-based AI devtools startup "Koder" hits $10M ARR in 14 months. Fully remote team of 22.', time:'10:30' },
  { from:'them', kind:'image', src:'https://picsum.photos/seed/startupoffice/600/340',
    text:'📸 Inside Koder\'s new Koramangala office — the "no-meeting Wednesdays" wall is real.', time:'11:00' },
  { from:'them', text:'📉 Edtech continues to cool: two more layoffs this week. Deep-dive thread below.', time:'13:15' },
  { from:'them', text:'🏆 National Startup Awards: applications open till Oct 31. 5 categories, ₹5L grant each.', time:'15:45' },
  { from:'them', text:'💡 Idea of the day: "Calendly for government offices". Someone please build this.', time:'17:20' },
  { from:'them', text:'📊 Weekly funding report: $212M across 18 deals. Fintech + AI took 70%.', time:'19:00' },
  { from:'them', text:'Big merger: two D2C skincare brands combine to take on the giants.', time:'19:40' },
  { from:'them', text:'IIT Madras incubates its 100th startup this year. The pipeline is unreal.', time:'20:15' },
];

/* ---------------- Kabir Singhania (DM, work) ---------------- */
App.data.messages.kabir = [
  { from:'them', text:'Standup moved to 10:30 tomorrow, client call at 11', time:'18:20' },
  { from:'me', text:'Got it, I\'ll have the API docs ready by then', time:'18:35' },
  { from:'them', text:'Also the staging deploy failed. Can you check the logs?', time:'18:40' },
  { from:'me', text:'Looking now', time:'18:52' },
  { from:'me', text:'It\'s the migration — new column has no default and the table isn\'t empty', time:'19:10' },
  { from:'them', text:'Classic. Fix forward or rollback?', time:'19:12' },
  { from:'me', text:'Fix forward, 2-line change. Pushing in 5', time:'19:13' },
  { from:'them', text:'Cool. Ping me when staging is green', time:'19:15' },
  { from:'me', text:'Green ✅ deploy going through', time:'19:31' },
  { from:'them', text:'Nice. Thanks for the quick turnaround', time:'19:33' },
  { from:'me', text:'Anytime. See you at standup', time:'19:34' },
  { from:'them', text:'👍', time:'19:35' }
];

/* ---------------- Mom (DM) ---------------- */
App.data.messages.mom = [
  { from:'them', text:'Did you eat properly today?', time:'13:05' },
  { from:'me', text:'Yes maa, had dal and rice 😊', time:'13:20' },
  { from:'them', text:'Good. Your cousin is coming to Bangalore next week, you should meet him', time:'13:22' },
  { from:'me', text:'Sure, when exactly?', time:'13:30' },
  { from:'them', text:'Wednesday. I\'ll send his number', time:'13:35' },
  { from:'me', text:'Okay. How is papa\'s knee now?', time:'13:40' },
  { from:'them', text:'Much better! He walked to the park yesterday without the stick', time:'13:45' },
  { from:'me', text:'That\'s great news 🎉 Tell him I said hi', time:'13:47' },
  { from:'them', text:'I will. Don\'t skip breakfast beta, you always do', time:'13:50' },
  { from:'me', text:'I won\'t, promise 😄', time:'13:52' },
  { from:'them', text:'And drink water. It\'s hot there', time:'13:53' },
  { from:'me', text:'Yes maa 😂 love you', time:'13:55' },
  { from:'them', text:'Love you too. Come home for Diwali, tickets book kar lena', time:'14:02' },
  { from:'them', text:'Forwarded many times ⏩\n🌟 *Amazing health tips for 2026* 🌟\n1. Drink warm water...\n(15 more messages)', forwardedFrom:'Family Group', time:'14:05' }
];

/* ---------------- Sneha Kulkarni (DM) ---------------- */
App.data.messages.sneha = [
  { from:'them', text:'MY SOURDOUGH FINALLY ROSE PROPERLY 🍞', time:'16:20' },
  { from:'me', text:'NO WAY. After the 3 flat disasters?', time:'16:25' },
  { from:'them', text:'The fourth one is BEAUTIFUL. I\'m basically a baker now', time:'16:26' },
  { from:'them', kind:'image', src:'https://picsum.photos/seed/sourdough/600/400',
    text:'Look at this crumb 😍', time:'16:28' },
  { from:'me', text:'Okay that actually looks professional??', time:'16:35' },
  { from:'them', text:'Right?? Bringing you a loaf this weekend', time:'16:36' },
  { from:'me', text:'Best news I\'ve heard all week', time:'16:37' },
  { from:'them', text:'Also — new monstera leaf unfurled. She\'s thriving 🌿', time:'17:02' },
  { from:'me', text:'Your plants have a better life than me', time:'17:05' },
  { from:'them', text:'They get watered regularly, so yes', time:'17:06' },
  { from:'me', text:'Attacked for no reason 😭', time:'17:07' },
  { from:'them', text:'Hahaha. Coffee Saturday? I\'ll bring the bread', time:'17:15' },
  { from:'me', text:'Obviously yes. Third wave, 4 PM?', time:'17:18' },
  { from:'them', text:'Perfect ☕', time:'17:20' }
];

/* ---------------- PollBot (bot) ---------------- */
App.data.messages.pollbot = [
  { from:'me', text:'/start', time:'10:00' },
  { from:'them', text:'👋 Hi! I\'m PollBot.\n\nSend me /newpoll to create a poll, or just type your question and I\'ll turn it into one.', time:'10:00' },
  { from:'me', text:'/newpoll', time:'10:05' },
  { from:'me', text:'North Indian, Chinese, Cafe', time:'10:07' },
  { from:'them', text:'Options added! Send /done when finished, or keep adding.', time:'10:07' },
  { from:'me', text:'/done', time:'10:08' },
  { from:'them', text:'Poll is live! Voters can pick multiple options. Use /results anytime.', time:'10:08' },
  { from:'them', text:'Great! What\'s your poll question?', time:'10:05' },
  { from:'me', text:'Where should we go for the team lunch?', time:'10:06' },
  { from:'them', text:'📊 Poll created: "Where should we go for the team lunch?"\n\nNow send me the options, one per line. Send /done when finished.', time:'10:06' }
];

/* ---------------- Rohan Verma (DM, gaming) ---------------- */
App.data.messages.rohan = [
  { from:'them', text:'YO. Ranked tonight?', time:'20:15' },
  { from:'me', text:'Give me 20 mins, finishing dinner', time:'20:18' },
  { from:'them', text:'Bet. I\'ll warm up in deathmatch', time:'20:19' },
  { from:'me', text:'Online. Invite me', time:'20:40' },
  { from:'them', text:'Sent. We need one more, Kabir?', time:'20:42' },
  { from:'me', text:'He said he\'s busy. Just duo queue', time:'20:44' },
  { from:'them', text:'Fine. I\'m playing duelist, you smoke', time:'20:45' },
  { from:'me', text:'Always me on smokes 😤', time:'20:46' },
  { from:'them', text:'Because you\'re actually good at it', time:'20:47' },
  { from:'me', text:'...fair', time:'20:48' },
  { from:'them', text:'THAT 1v3 WAS DISGUSTING 🔥🔥', time:'21:30' },
  { from:'me', text:'I SAW my life flash before my eyes', time:'21:31' },
  { from:'them', text:'Clipped it. Posting in the squad group', time:'21:32' },
  { from:'me', text:'GG. Same time tomorrow?', time:'21:50' }
];
