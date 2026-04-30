/* =========================================================
   SOCIALGRAM — App logic (Aurora Noir build)
   ========================================================= */

// ============ STATE ============
let DB = {
  users: [], posts: [], comments: [], notifications: [],
  stories: [], messages: [], conversations: [],
  hashtags: {}, nextId: 1,
};
let currentUser = null;
let pendingMedia = { quick: null, modal: null, edit: null, story: null };
let activeCommentPostId = null;
let replyingToCommentId = null;
let currentPage = 'feed';
let feedFilter = 'all';
let activeStory = null;
let storyTimer = null;

const AVATAR_COLORS = [
  'linear-gradient(135deg,#ff3b8a,#a347ff)',
  'linear-gradient(135deg,#1edcff,#a347ff)',
  'linear-gradient(135deg,#ffb627,#ff4060)',
  'linear-gradient(135deg,#00d68f,#1edcff)',
  'linear-gradient(135deg,#a347ff,#ff3b8a)',
  'linear-gradient(135deg,#1edcff,#0aa4c9)',
  'linear-gradient(135deg,#ff4060,#a347ff)',
  'linear-gradient(135deg,#7ee9ff,#00d68f)',
];

function avatarBg(name){ return AVATAR_COLORS[((name||'?').charCodeAt(0)+(name||'?').length) % AVATAR_COLORS.length]; }

function letterAvatar(name, size, extra='', clickFn=''){
  const click = clickFn ? `onclick="event.stopPropagation();${clickFn}"` : '';
  const letter = (name||'?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${avatarBg(name)};display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.42)}px;font-weight:700;color:#fff;flex-shrink:0;${extra}" ${click}>${letter}</div>`;
}
window.letterAvatar = letterAvatar;

function avatarHTML(user, size=40, extraStyle='', clickFn=''){
  if(!user) return '';
  const click = clickFn ? `onclick="event.stopPropagation();${clickFn}"` : '';
  const cursor = clickFn ? 'cursor:pointer;' : '';
  if (user.avatar && (user.avatar.startsWith('http')||user.avatar.startsWith('data:image'))){
    const fallback = letterAvatar(user.name, size, cursor+extraStyle, clickFn).replace(/"/g,'&quot;');
    return `<img src="${user.avatar}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;${cursor}${extraStyle}" ${click} onerror="this.outerHTML='${fallback.replace(/'/g,"\\'")}'">`;
  }
  return letterAvatar(user.name, size, cursor+extraStyle, clickFn);
}

function isOnline(userId){
  const seed = (userId * 9301 + 49297) % 233280;
  return seed / 233280 < 0.4;
}
function avatarWithDot(user, size=44, clickFn=''){
  const a = avatarHTML(user, size, '', clickFn);
  const online = isOnline(user.id);
  return `<div class="avatar-wrap">${a}${online?`<span class="online-dot"></span>`:''}</div>`;
}

function saveDB(){ try{ localStorage.setItem('sg_db_v3', JSON.stringify(DB)); }catch(e){} }
function loadDB(){
  try{
    const d = localStorage.getItem('sg_db_v3') || localStorage.getItem('sg_db_v2');
    if(d) DB = JSON.parse(d);
  }catch(e){}
  if(!DB.users) DB = { users:[], posts:[], comments:[], notifications:[], stories:[], messages:[], conversations:[], hashtags:{}, nextId:1 };
  if(!DB.messages) DB.messages = [];
  if(!DB.conversations) DB.conversations = [];
  if(!DB.hashtags) DB.hashtags = {};
  // migrate
  DB.posts.forEach(p=>{
    if(!p.reactionsByUser) p.reactionsByUser = {};
    if(!p.bookmarks) p.bookmarks = [];
    if(!p.reposts) p.reposts = [];
  });
  DB.comments.forEach(c=>{ if(!c.likes) c.likes=[]; if(c.parentId===undefined) c.parentId=null; });
  DB.messages.forEach(m=>{ if(m.read===undefined) m.read=true; });
  if(DB.users.length === 0) seedDemo();
}

function seedDemo(){
  const demos = [
    { name:'Sofia Ricci', username:'sofia_r', email:'sofia@demo.it', bio:'Fotografa di paesaggi & ritratti.\nMilano → Tokyo → Lisbona', verified:true, location:'Milano, IT', website:'sofia.studio' },
    { name:'Marco Bianchi', username:'marco_b', email:'marco@demo.it', bio:'Producer · synth nerd · vinyl collector', verified:false, location:'Roma, IT', website:'' },
    { name:'Giulia Verdi', username:'giulia_v', email:'giulia@demo.it', bio:'Yoga teacher · plant parent · slow life', verified:false, location:'Firenze, IT', website:'' },
    { name:'Alex Romano', username:'alex_r', email:'alex@demo.it', bio:'Designer @ studio. Coffee dependent.', verified:true, location:'Torino, IT', website:'alex.design' },
    { name:'Chiara Neri', username:'chiara_n', email:'chiara@demo.it', bio:'Chef privata · dolci & focaccia', verified:false, location:'Napoli, IT', website:'' },
  ];
  const seeds = ['sofia99','marco88','giulia77','alex66','chiara55'];
  demos.forEach((u,i)=>{
    u.id = DB.nextId++; u.password='demo';
    u.avatar = `https://picsum.photos/seed/${seeds[i]}/200/200`;
    u.followers=[]; u.following=[]; u.posts=0;
    u.joinedAt = Date.now() - (90+i*30)*86400000;
    u.coverColor = i;
    DB.users.push(u);
  });
  DB.users[0].following = [2,3,4]; DB.users[1].followers = [1];
  DB.users[1].following = [1,3]; DB.users[2].followers = [1];
  DB.users[2].following = [1,5]; DB.users[3].followers = [1,2];
  DB.users[3].following = [1,5]; DB.users[4].followers = [1,4];
  DB.users[4].following = [1,2,3];

  const seedPosts = [
    { uid:1, text:'Buongiorno Socialgram ☀️ Le luci di Milano alle 7am hanno un che di magico #milano #fotografia #goldenhour', img:`https://picsum.photos/seed/p1/800/600` },
    { uid:2, text:'Demo della prossima traccia in studio 🎛️🔥 Cosa ne pensate?\n\n#music #synthwave #studio', img:`https://picsum.photos/seed/p2music/800/600` },
    { uid:3, text:'Mattina di yoga tra gli ulivi della Toscana 🌿 Ricordatevi di respirare. #mindfulness #yoga', img:`https://picsum.photos/seed/p3yoga/800/600` },
    { uid:1, text:'Weekend in montagna ⛰️ Quando arrivi in cima e capisci perché vale ogni passo.', img:`https://picsum.photos/seed/p4mt/800/600` },
    { uid:4, text:'Mockup nuovo brand identity per cliente fashion ✨ Tre direzioni, una scelta difficile #design #branding', img:`https://picsum.photos/seed/p5design/800/600` },
    { uid:5, text:'Focaccia genovese fatta a mano 🍞 Il segreto è nell\'olio buono e nella pazienza.', img:`https://picsum.photos/seed/p6food/800/600` },
    { uid:2, text:'Studio time 🎹 a volte la canzone migliore arriva quando smetti di cercarla', img:null },
    { uid:3, text:'5 cose che ho imparato quest\'anno:\n\n1. Dormire prima di mezzanotte\n2. Bere più acqua\n3. Dire di no\n4. Camminare ogni giorno\n5. Spegnere il telefono', img:null },
  ];
  const reactKinds = ['like','love','fire','laugh','wow'];
  seedPosts.forEach((p,i)=>{
    const post = {
      id:DB.nextId++, userId:p.uid, text:p.text,
      mediaUrl:p.img, mediaType:p.img?'image':null,
      likes:[], reposts:[], bookmarks:[], reactionsByUser:{},
      timestamp: Date.now() - i*3600000*5,
    };
    const n = Math.floor(Math.random()*4)+1;
    for(let j=0;j<n;j++){
      const r = Math.floor(Math.random()*5)+1;
      if(!post.likes.includes(r)){
        post.likes.push(r);
        post.reactionsByUser[r] = reactKinds[Math.floor(Math.random()*reactKinds.length)];
      }
    }
    DB.posts.push(post);
    DB.users[p.uid-1].posts++;
    extractHashtags(post.text).forEach(h=> DB.hashtags[h]=(DB.hashtags[h]||0)+1);
  });
  DB.comments.push(
    { id:DB.nextId++, postId:DB.posts[0].id, userId:3, text:'Stupenda 😍', likes:[1,2], timestamp:Date.now()-3600000, parentId:null },
    { id:DB.nextId++, postId:DB.posts[0].id, userId:2, text:'Quale obiettivo hai usato?', likes:[], timestamp:Date.now()-1800000, parentId:null },
    { id:DB.nextId++, postId:DB.posts[1].id, userId:4, text:'Synth pad cosmico 🪐', likes:[2], timestamp:Date.now()-7200000, parentId:null },
  );
  DB.users.forEach((u,i)=>{
    DB.stories.push({ id:DB.nextId++, userId:u.id, mediaUrl:`https://picsum.photos/seed/story${i}${Date.now()}/600/1000`, timestamp:Date.now()-i*3600000, viewedBy:[] });
  });
  DB.conversations.push({ id:DB.nextId++, participants:[1,2], lastTs:Date.now()-7200000 });
  DB.messages.push(
    { id:DB.nextId++, convId:DB.conversations[0].id, fromId:2, text:'Hey! Bella la foto nuova', ts:Date.now()-7200000, read:true },
    { id:DB.nextId++, convId:DB.conversations[0].id, fromId:1, text:'Grazie! Era 5am 😴', ts:Date.now()-7100000, read:true },
  );
  saveDB();
}

// ============ AUTH ============
function switchAuth(tab){
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0&&tab==='login')||(i===1&&tab==='register')));
  document.querySelector('.auth-tab-indicator').style.transform = tab==='login'?'translateX(0)':'translateX(100%)';
  document.getElementById('login-form').style.display = tab==='login'?'block':'none';
  document.getElementById('register-form').style.display = tab==='register'?'block':'none';
}
function login(){
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const user = DB.users.find(x=>(x.username===u||x.email===u)&&x.password===p);
  if(!user){ toast('Credenziali non valide','error'); return; }
  currentUser = user; localStorage.setItem('sg_session',user.id); initApp();
}
function loginDemo(){
  if(!DB.users.length) return;
  currentUser = DB.users[0]; localStorage.setItem('sg_session',currentUser.id); initApp();
}
function register(){
  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-user').value.trim().replace(/\s/g,'');
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if(!name||!username||!email||!pass){ toast('Compila tutti i campi','warn'); return; }
  if(pass.length<6){ toast('Password min. 6 caratteri','warn'); return; }
  if(DB.users.find(u=>u.username===username)){ toast('Username già in uso','warn'); return; }
  if(DB.users.find(u=>u.email===email)){ toast('Email già registrata','warn'); return; }
  const user = {
    id:DB.nextId++, name, username, email, password:pass,
    avatar:'', bio:'', website:'', location:'', verified:false,
    followers:[], following:[], posts:0, joinedAt:Date.now(), coverColor:Math.floor(Math.random()*5),
  };
  DB.users.push(user); saveDB();
  currentUser = user; localStorage.setItem('sg_session',user.id);
  initApp();
}
function logout(){
  if(!confirm('Vuoi davvero disconnetterti?')) return;
  currentUser = null;
  localStorage.removeItem('sg_session');
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
}

// ============ INIT ============
function initApp(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='block';
  buildShell();
  updateCurrentUser();
  showPage('feed');
  setTimeout(()=>{ initMagnetic(); init3DTilts(); }, 60);
}

function buildShell(){
  document.getElementById('topbar-avatar').innerHTML = avatarHTML(currentUser, 32);
  document.getElementById('sidebar-user-avatar').innerHTML = avatarHTML(currentUser, 38);
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-handle').textContent = '@'+currentUser.username;
  document.getElementById('creator-avatar').innerHTML = avatarHTML(currentUser, 44);
  document.getElementById('modal-creator-avatar').innerHTML = avatarHTML(currentUser, 44);
  document.getElementById('comment-avatar').innerHTML = avatarHTML(currentUser, 34);
}

function updateCurrentUser(){
  const u = DB.users.find(x=>x.id===currentUser.id);
  if(u) currentUser = u;
  buildShell();
  const unread = DB.notifications.filter(n=>n.targetId===currentUser.id&&!n.read).length;
  const badge = document.getElementById('notif-badge');
  if(unread>0){ badge.textContent = unread>99?'99+':unread; badge.style.display='block'; }
  else badge.style.display='none';
}

// ============ PAGES ============
function showPage(page){
  ['feed','explore','notifications','myprofile','userprofile','search','bookmarks','messages','hashtag'].forEach(p=>{
    const el = document.getElementById('page-'+p);
    if(el) el.style.display = p===page?'block':'none';
  });
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const navEl = document.getElementById('nav-'+page);
  if(navEl) navEl.classList.add('active');
  document.querySelectorAll('.bottom-nav-btn').forEach((b,i)=>{
    const map = ['feed','explore',null,'notifications','myprofile'];
    b.classList.toggle('active', map[i]===page);
  });
  currentPage = page;
  if(page==='feed'){ renderStories(); renderFeed(); renderRightPanel(); }
  if(page==='explore') renderExplore();
  if(page==='notifications') renderNotifications();
  if(page==='myprofile') renderMyProfile();
  if(page==='bookmarks') renderBookmarks();
  if(page==='messages') renderMessages();
  const activePage = document.getElementById('page-'+page);
  if(activePage){
    activePage.classList.remove('page-anim');
    void activePage.offsetWidth;
    activePage.classList.add('page-anim');
  }
  setTimeout(init3DTilts, 60);
  window.scrollTo({top:0, behavior:'smooth'});
}

// ============ HASHTAGS / MENTIONS ============
function extractHashtags(text){
  const m = String(text||'').match(/#[\w\u00C0-\u017F]+/g) || [];
  return m.map(h=>h.slice(1).toLowerCase());
}
function linkifyText(text){
  return escHTML(text)
    .replace(/#([\w\u00C0-\u017F]+)/g, '<span class="hashtag" onclick="viewHashtag(\'$1\')">#$1</span>')
    .replace(/@([\w]+)/g, (m,h)=>{
      const u = DB.users.find(x=>x.username===h);
      return u ? `<span class="mention" onclick="viewProfile(${u.id})">@${h}</span>` : m;
    });
}

// ============ FEED ============
function renderFeed(){
  const container = document.getElementById('posts-container');
  let posts = [...DB.posts];
  if(feedFilter==='following'){
    const followed = currentUser.following||[];
    posts = posts.filter(p => followed.includes(p.userId) || p.userId===currentUser.id);
  }
  posts.sort((a,b)=>b.timestamp-a.timestamp);
  if(posts.length===0){
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.sparkles}</div>
          <div class="empty-state-title">${feedFilter==='following'?'Inizia a seguire qualcuno':'Niente da mostrare'}</div>
          <p>${feedFilter==='following'?'Esplora per scoprire creator interessanti':'Sii il primo a pubblicare!'}</p>
        </div>
      </div>`;
    return;
  }
  container.innerHTML = posts.map(p=>renderPostHTML(p)).join('');
  setTimeout(init3DTilts, 50);
}
function setFeedFilter(filter){
  feedFilter = filter;
  document.querySelectorAll('.feed-tab').forEach(t=>t.classList.toggle('active', t.dataset.filter===filter));
  renderFeed();
}

// ============ REACTIONS ============
const REACTION_EMOJI = { like:'❤️', love:'😍', fire:'🔥', laugh:'😂', wow:'😮' };
const REACTION_LABEL = { like:'Mi piace', love:'Adoro', fire:'Forte', laugh:'Divertente', wow:'Wow' };

function reactionsSummary(post){
  const r = post.reactionsByUser || {};
  const counts = {};
  Object.values(r).forEach(k=>{ counts[k]=(counts[k]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);
  if(!top.length) return '';
  return `<div class="reactions-summary"><span class="stack">${top.map(k=>`<span>${REACTION_EMOJI[k]}</span>`).join('')}</span></div>`;
}

function renderPostHTML(post){
  const user = DB.users.find(u=>u.id===post.userId);
  if(!user) return '';
  const liked = post.likes.includes(currentUser.id);
  const myReaction = (post.reactionsByUser||{})[currentUser.id];
  const bookmarked = (post.bookmarks||[]).includes(currentUser.id);
  const reposted = (post.reposts||[]).includes(currentUser.id);
  const commentCount = DB.comments.filter(c=>c.postId===post.id).length;
  const repostCount = (post.reposts||[]).length;
  const timeAgo = getTimeAgo(post.timestamp);
  let mediaHTML = '';
  if(post.mediaUrl && post.mediaType==='image'){
    mediaHTML = `<div class="post-media-wrap" ondblclick="doubleTapLike(${post.id}, this)">
      <img class="post-media" src="${post.mediaUrl}" loading="lazy" alt="" onerror="this.parentElement.style.display='none'">
      <div class="heart-burst">${ICONS.heart.replace('fill="none"','fill="#ff3b8a"').replace('stroke="currentColor"','stroke="#fff"')}</div>
    </div>`;
  } else if(post.mediaUrl && post.mediaType==='video'){
    mediaHTML = `<div class="post-media-wrap"><video class="post-media-video" controls preload="metadata"><source src="${post.mediaUrl}"></video></div>`;
  }
  const verifiedBadge = user.verified ? `<span class="verified-badge">${ICONS.check}</span>` : '';
  const likeIconInner = myReaction ? `<span style="font-size:1.05rem;line-height:1">${REACTION_EMOJI[myReaction]}</span>` : ICONS.heart;
  return `<article class="card" id="post-${post.id}" data-tilt>
    <div class="post">
      <div class="post-header">
        <div class="post-user" onclick="viewProfile(${user.id})">
          ${avatarWithDot(user, 44)}
          <div style="min-width:0">
            <div class="post-username">${escHTML(user.name)}${verifiedBadge}</div>
            <div class="post-handle">@${escHTML(user.username)}<span class="dot">·</span>${timeAgo}</div>
          </div>
        </div>
        <div style="position:relative">
          <button class="post-menu" onclick="togglePostMenu(event, ${post.id})">${ICONS.more}</button>
          <div class="dropdown" id="menu-${post.id}">
            ${user.id===currentUser.id ? `
              <button class="dropdown-item danger" onclick="deletePost(${post.id})">${ICONS.trash}<span>Elimina post</span></button>
            ` : `
              <button class="dropdown-item" onclick="toggleFollow(${user.id})">${ICONS.user}<span>${(currentUser.following||[]).includes(user.id)?'Smetti di seguire':'Segui'} @${escHTML(user.username)}</span></button>
            `}
            <button class="dropdown-item" onclick="copyLink(${post.id})">${ICONS.link}<span>Copia link</span></button>
          </div>
        </div>
      </div>
      ${post.text ? `<div class="post-content">${linkifyText(post.text)}</div>` : ''}
      ${mediaHTML}
      ${reactionsSummary(post)}
      <div class="post-footer">
        <button class="reaction-btn comment" onclick="openComments(${post.id})" aria-label="Commenta">
          <span class="reaction-icon">${ICONS.comment}</span>
          <span>${commentCount||''}</span>
        </button>
        <button class="reaction-btn repost ${reposted?'active':''}" onclick="toggleRepost(${post.id})" aria-label="Ripubblica">
          <span class="reaction-icon">${ICONS.repost}</span>
          <span>${repostCount||''}</span>
        </button>
        <div style="position:relative" onmouseenter="showReactionPicker(${post.id})" onmouseleave="hideReactionPicker(${post.id})">
          <button class="reaction-btn like ${liked?'active':''}" onclick="quickLike(${post.id}, this)" aria-label="Mi piace">
            <span class="reaction-icon">${likeIconInner}</span>
            <span>${post.likes.length||''}</span>
          </button>
          <div class="reaction-picker" id="picker-${post.id}">
            ${Object.keys(REACTION_EMOJI).map(k=>`<button onclick="setReaction(${post.id},'${k}',this)" title="${REACTION_LABEL[k]}">${REACTION_EMOJI[k]}</button>`).join('')}
          </div>
        </div>
        <button class="reaction-btn share" onclick="copyLink(${post.id})" aria-label="Condividi">
          <span class="reaction-icon">${ICONS.share}</span>
        </button>
        <button class="reaction-btn bookmark ${bookmarked?'active':''}" onclick="toggleBookmark(${post.id})" aria-label="Salva">
          <span class="reaction-icon">${ICONS.bookmark}</span>
        </button>
      </div>
    </div>
  </article>`;
}

function togglePostMenu(e, postId){
  e.stopPropagation();
  document.querySelectorAll('.dropdown.open').forEach(d=>{ if(d.id!==`menu-${postId}`) d.classList.remove('open'); });
  document.getElementById('menu-'+postId).classList.toggle('open');
}
document.addEventListener('click', ()=> document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open')) );

const pickerTimers = {};
function showReactionPicker(postId){
  clearTimeout(pickerTimers['hide-'+postId]);
  pickerTimers['show-'+postId] = setTimeout(()=>{
    const p = document.getElementById('picker-'+postId);
    if(p) p.classList.add('open');
  }, 360);
}
function hideReactionPicker(postId){
  clearTimeout(pickerTimers['show-'+postId]);
  pickerTimers['hide-'+postId] = setTimeout(()=>{
    const p = document.getElementById('picker-'+postId);
    if(p) p.classList.remove('open');
  }, 220);
}
function setReaction(postId, kind, btn){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  if(!post.reactionsByUser) post.reactionsByUser = {};
  if(!post.likes.includes(currentUser.id)){
    post.likes.push(currentUser.id);
    if(post.userId!==currentUser.id) addNotification(post.userId,'like',`<strong>${escHTML(currentUser.name)}</strong> ha reagito al tuo post ${REACTION_EMOJI[kind]}`);
  }
  post.reactionsByUser[currentUser.id] = kind;
  saveDB();
  if(btn){
    const r = btn.getBoundingClientRect();
    spawnFloatEmoji(REACTION_EMOJI[kind], r.left + r.width/2, r.top);
  }
  document.getElementById('picker-'+postId)?.classList.remove('open');
  rerenderPost(postId);
}
function quickLike(postId, btn){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  const liked = post.likes.includes(currentUser.id);
  if(liked){
    post.likes = post.likes.filter(x=>x!==currentUser.id);
    if(post.reactionsByUser) delete post.reactionsByUser[currentUser.id];
  } else {
    post.likes.push(currentUser.id);
    if(!post.reactionsByUser) post.reactionsByUser = {};
    post.reactionsByUser[currentUser.id] = 'like';
    if(post.userId!==currentUser.id) addNotification(post.userId,'like',`<strong>${escHTML(currentUser.name)}</strong> ha messo mi piace al tuo post`);
    if(btn){
      const r = btn.getBoundingClientRect();
      spawnFloatEmoji('❤️', r.left + r.width/2, r.top);
    }
  }
  saveDB();
  rerenderPost(postId);
}
function spawnFloatEmoji(emoji, x, y){
  const el = document.createElement('div');
  el.className = 'float-emoji';
  el.textContent = emoji;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1100);
}
function rerenderPost(postId){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  const el = document.getElementById('post-'+postId);
  if(el){
    el.outerHTML = renderPostHTML(post);
    setTimeout(init3DTilts, 30);
  }
}

// ============ STORIES ============
function renderStories(){
  const bar = document.getElementById('stories-bar');
  if(!bar) return;
  let html = `<div class="story-item" onclick="openPostModal()">
    <div class="story-ring viewed" style="position:relative">
      <div class="story-inner">${avatarHTML(currentUser, 56)}</div>
      <div class="story-add-btn">${ICONS.plus}</div>
    </div>
    <div class="story-name">La tua storia</div>
  </div>`;
  const seen = new Set();
  const uniqueStories = [];
  DB.stories.sort((a,b)=>b.timestamp-a.timestamp).forEach(s=>{
    if(!seen.has(s.userId)){ seen.add(s.userId); uniqueStories.push(s); }
  });
  uniqueStories.forEach(s=>{
    const u = DB.users.find(x=>x.id===s.userId);
    if(!u || u.id===currentUser.id) return;
    const viewed = (s.viewedBy||[]).includes(currentUser.id);
    html += `<div class="story-item" onclick="openStory(${u.id})">
      <div class="story-ring ${viewed?'viewed':''}">
        <div class="story-inner">${avatarHTML(u, 56)}</div>
      </div>
      <div class="story-name">${escHTML(u.name.split(' ')[0])}</div>
    </div>`;
  });
  bar.innerHTML = html;
}

function openStory(userId){
  const userStories = DB.stories.filter(s=>s.userId===userId).sort((a,b)=>a.timestamp-b.timestamp);
  if(!userStories.length) return;
  activeStory = { userId, stories: userStories, index:0, paused:false };
  renderStoryViewer();
  document.getElementById('story-modal').classList.add('open');
}
function renderStoryViewer(){
  if(!activeStory) return;
  const s = activeStory.stories[activeStory.index];
  const u = DB.users.find(x=>x.id===activeStory.userId);
  if(!s || !u){ closeStory(); return; }
  if(!s.viewedBy.includes(currentUser.id)){ s.viewedBy.push(currentUser.id); saveDB(); }
  const segments = activeStory.stories.map((_,i)=>{
    let cls='';
    if(i<activeStory.index) cls='done';
    if(i===activeStory.index) cls='active';
    return `<div class="story-progress-segment ${cls}"><div class="story-progress-segment-fill"></div></div>`;
  }).join('');
  document.getElementById('story-content').innerHTML = `
    <div class="story-viewer" id="story-viewer-el">
      <div class="story-progress-bar">${segments}</div>
      <div class="story-header">
        ${avatarHTML(u, 32, 'border:2px solid #fff;')}
        <div style="flex:1">
          <div class="story-header-name">${escHTML(u.name)}</div>
          <div class="story-header-time">${getTimeAgo(s.timestamp)}</div>
        </div>
        <button class="story-close" onclick="closeStory()">${ICONS.close}</button>
      </div>
      <img class="story-img" src="${s.mediaUrl}" alt="">
      <div class="story-nav-zone left" onclick="prevStory()"></div>
      <div class="story-nav-zone right" onclick="nextStory()"></div>
    </div>`;
  // hold to pause
  const v = document.getElementById('story-viewer-el');
  if(v){
    v.addEventListener('mousedown', pauseStory);
    v.addEventListener('mouseup', resumeStory);
    v.addEventListener('mouseleave', resumeStory);
    v.addEventListener('touchstart', pauseStory, {passive:true});
    v.addEventListener('touchend', resumeStory);
  }
  clearTimeout(storyTimer);
  storyTimer = setTimeout(()=> nextStory(), 5000);
}
function pauseStory(){
  if(!activeStory) return;
  activeStory.paused = true;
  document.getElementById('story-viewer-el')?.classList.add('story-paused');
  clearTimeout(storyTimer);
}
function resumeStory(){
  if(!activeStory || !activeStory.paused) return;
  activeStory.paused = false;
  document.getElementById('story-viewer-el')?.classList.remove('story-paused');
  storyTimer = setTimeout(()=> nextStory(), 2500);
}
function nextStory(){
  if(!activeStory) return;
  if(activeStory.index < activeStory.stories.length-1){
    activeStory.index++;
    renderStoryViewer();
  } else closeStory();
}
function prevStory(){
  if(!activeStory) return;
  if(activeStory.index>0){ activeStory.index--; renderStoryViewer(); }
}
function closeStory(){
  clearTimeout(storyTimer);
  activeStory = null;
  document.getElementById('story-modal').classList.remove('open');
  renderStories();
}

// ============ EXPLORE ============
function renderExplore(){
  const el = document.getElementById('explore-grid');
  const mediaPosts = DB.posts.filter(p=>p.mediaUrl);
  if(!mediaPosts.length){ el.innerHTML = `<div class="card empty-state"><div class="empty-state-icon">${ICONS.compass}</div><p>Nessun media da esplorare</p></div>`; return; }
  const sorted = [...mediaPosts].sort((a,b)=>(b.likes.length+b.reposts.length*2)-(a.likes.length+a.reposts.length*2));
  el.innerHTML = `<div class="card" style="overflow:hidden;padding:0"><div class="media-grid">${sorted.map(p=>{
    const isVid = p.mediaType==='video';
    const c = DB.comments.filter(x=>x.postId===p.id).length;
    return `<div class="media-grid-item" onclick="openComments(${p.id})">
      ${isVid ? `<video src="${p.mediaUrl}" muted></video><span class="video-badge">▶ Video</span>` : `<img src="${p.mediaUrl}" loading="lazy" onerror="this.style.display='none'">`}
      <div class="media-grid-overlay">
        <span>${ICONS.heart} ${p.likes.length}</span>
        <span>${ICONS.comment} ${c}</span>
      </div>
    </div>`;
  }).join('')}</div></div>`;
}

// ============ HASHTAG VIEW ============
function viewHashtag(tag){
  const el = document.getElementById('page-hashtag');
  const posts = DB.posts.filter(p=>extractHashtags(p.text).includes(tag.toLowerCase())).sort((a,b)=>b.timestamp-a.timestamp);
  el.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:14px">
      <div class="empty-state-icon" style="margin:0;width:52px;height:52px;border-radius:14px;animation:none">${ICONS.hash}</div>
      <div><h1>#${escHTML(tag)}</h1><p>${posts.length} post</p></div>
    </div>
    ${posts.length ? posts.map(p=>renderPostHTML(p)).join('') : `<div class="card empty-state"><div class="empty-state-icon">${ICONS.hash}</div><p>Nessun post con questo tag</p></div>`}
  `;
  showPage('hashtag');
}

// ============ PROFILE ============
function renderMyProfile(){
  document.getElementById('my-profile-content').innerHTML = buildProfileHTML(currentUser, true);
  renderProfilePosts(currentUser.id, 'my-profile-posts');
  setTimeout(()=>{ animateStats(document.getElementById('my-profile-content')); initMagnetic(); init3DTilts(); }, 60);
}
function viewProfile(userId){
  const u = DB.users.find(x=>x.id===userId);
  if(!u) return;
  if(userId===currentUser.id){ showPage('myprofile'); return; }
  document.getElementById('user-profile-content').innerHTML = buildProfileHTML(u, false);
  renderProfilePosts(userId, 'user-profile-posts');
  showPage('userprofile');
  setTimeout(()=>{ animateStats(document.getElementById('user-profile-content')); initMagnetic(); init3DTilts(); }, 60);
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#ff3b8a,#a347ff,#1edcff)',
  'linear-gradient(135deg,#ffb627,#ff4060,#a347ff)',
  'linear-gradient(135deg,#00d68f,#1edcff,#a347ff)',
  'linear-gradient(135deg,#a347ff,#ff3b8a,#ff4060)',
  'linear-gradient(135deg,#1edcff,#a347ff,#ff3b8a)',
];

function buildProfileHTML(u, isMe){
  const isFollowing = (currentUser.following||[]).includes(u.id);
  const postCount = DB.posts.filter(p=>p.userId===u.id).length;
  const followerCount = (u.followers||[]).length;
  const followingCount = (u.following||[]).length;
  const cover = COVER_GRADIENTS[u.coverColor||0];
  const verifiedBadge = u.verified ? `<span class="verified-badge" style="width:22px;height:22px">${ICONS.check}</span>` : '';
  const joinDate = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('it-IT',{month:'long',year:'numeric'}) : '';
  const safeLetter = (u.name||'?')[0].toUpperCase();
  const avatarMarkup = (u.avatar && (u.avatar.startsWith('http')||u.avatar.startsWith('data:image')))
    ? `<img class="profile-avatar" src="${u.avatar}" alt="" onerror="this.outerHTML='&lt;div class=&quot;profile-avatar-letter&quot; style=&quot;background:${avatarBg(u.name)}&quot;&gt;${safeLetter}&lt;/div&gt;'">`
    : `<div class="profile-avatar-letter" style="background:${avatarBg(u.name)}">${safeLetter}</div>`;
  return `<div class="card" style="overflow:visible;padding:0">
    <div class="profile-cover" style="background:${cover}"></div>
    <div class="profile-info">
      <div class="profile-actions">
        ${isMe ? `<button class="btn-edit" onclick="openEditProfile()" data-magnetic="soft">${ICONS.edit}<span>Modifica</span></button>` : `
          <button class="btn-msg" onclick="openConv(${u.id})" data-magnetic="soft">${ICONS.message}</button>
          <button class="btn-follow ${isFollowing?'following':''}" onclick="toggleFollow(${u.id})">
            <span class="follow-text"><span class="follow-text-inner"><span>${isFollowing?'Seguito':'+ Segui'}</span></span></span>
          </button>
        `}
      </div>
      <div class="profile-avatar-wrap">
        ${avatarMarkup}
        ${isMe ? `<label class="profile-edit-overlay">${ICONS.image}<input type="file" accept="image/*" style="display:none" onchange="quickAvatar(this)"></label>` : ''}
      </div>
      <div class="profile-name">${escHTML(u.name)}${verifiedBadge}</div>
      <div class="profile-handle">@${escHTML(u.username)}${isOnline(u.id)?' · <span style="color:var(--green)">● online</span>':''}</div>
      ${u.bio ? `<div class="profile-bio">${linkifyText(u.bio)}</div>` : ''}
      <div class="profile-meta">
        ${u.location ? `<span class="profile-meta-item">${ICONS.mapPin}${escHTML(u.location)}</span>` : ''}
        ${u.website ? `<span class="profile-meta-item">${ICONS.link}<a href="https://${u.website.replace(/^https?:\/\//,'')}" target="_blank" rel="noopener">${escHTML(u.website)}</a></span>` : ''}
        ${joinDate ? `<span class="profile-meta-item">${ICONS.calendar}Iscritto da ${joinDate}</span>` : ''}
      </div>
      <div class="profile-stats">
        <div class="profile-stat" onclick="showFollowers(${u.id},'following')"><span class="stat-num" data-target="${followingCount}">0</span><span class="stat-label">seguiti</span></div>
        <div class="profile-stat" onclick="showFollowers(${u.id},'followers')"><span class="stat-num" data-target="${followerCount}">0</span><span class="stat-label">follower</span></div>
        <div class="profile-stat"><span class="stat-num" data-target="${postCount}">0</span><span class="stat-label">post</span></div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchProfileTab(this,'posts',${u.id},${isMe})">Post</button>
      <button class="tab-btn" onclick="switchProfileTab(this,'media',${u.id},${isMe})">Media</button>
      <button class="tab-btn" onclick="switchProfileTab(this,'likes',${u.id},${isMe})">Mi piace</button>
    </div>
    <div id="${isMe?'my':'user'}-profile-posts" style="padding:16px"></div>
  </div>`;
}

function animateStats(root){
  if(!root) return;
  root.querySelectorAll('.stat-num[data-target]').forEach(el=>{
    const target = parseInt(el.dataset.target||'0',10);
    const dur = 700;
    const start = performance.now();
    const tick = (now)=>{
      const t = Math.min((now-start)/dur, 1);
      const eased = 1 - Math.pow(1-t, 3);
      el.textContent = Math.floor(target * eased);
      if(t<1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  });
}

function renderProfilePosts(userId, containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const posts = DB.posts.filter(p=>p.userId===userId).sort((a,b)=>b.timestamp-a.timestamp);
  if(!posts.length){ el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.edit}</div><p>Nessun post ancora</p></div>`; return; }
  el.innerHTML = posts.map(p=>renderPostHTML(p)).join('');
}
function switchProfileTab(btn, tab, userId, isMe){
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const cId = isMe ? 'my-profile-posts' : 'user-profile-posts';
  const el = document.getElementById(cId); if(!el) return;
  if(tab==='posts'){ renderProfilePosts(userId, cId); return; }
  if(tab==='media'){
    const m = DB.posts.filter(p=>p.userId===userId && p.mediaUrl);
    if(!m.length){ el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.image}</div><p>Nessun media</p></div>`; return; }
    el.innerHTML = `<div class="media-grid">${m.map(p=>`<div class="media-grid-item" onclick="openComments(${p.id})">${p.mediaType==='video'?`<video src="${p.mediaUrl}"></video><span class="video-badge">▶</span>`:`<img src="${p.mediaUrl}" loading="lazy">`}<div class="media-grid-overlay"><span>${ICONS.heart} ${p.likes.length}</span></div></div>`).join('')}</div>`;
  }
  if(tab==='likes'){
    const liked = DB.posts.filter(p=>p.likes.includes(userId)).sort((a,b)=>b.timestamp-a.timestamp);
    if(!liked.length){ el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.heart}</div><p>Nessun mi piace ancora</p></div>`; return; }
    el.innerHTML = liked.map(p=>renderPostHTML(p)).join('');
  }
}

// ============ EDIT PROFILE ============
function openEditProfile(){
  const u = currentUser;
  const eprev = document.getElementById('edit-avatar-preview');
  if(u.avatar && (u.avatar.startsWith('http')||u.avatar.startsWith('data:image'))){
    eprev.innerHTML = `<img src="${u.avatar}" style="width:100px;height:100px;border-radius:50%;object-fit:cover">`;
  } else {
    eprev.innerHTML = letterAvatar(u.name, 100);
  }
  document.getElementById('edit-name').value = u.name;
  document.getElementById('edit-username').value = u.username;
  document.getElementById('edit-bio').value = u.bio||'';
  document.getElementById('edit-location').value = u.location||'';
  document.getElementById('edit-website').value = u.website||'';
  pendingMedia.edit = null;
  document.getElementById('edit-profile-modal').classList.add('open');
}
function previewEditAvatar(input){
  const f = input.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = e => {
    document.getElementById('edit-avatar-preview').innerHTML = `<img src="${e.target.result}" style="width:100px;height:100px;border-radius:50%;object-fit:cover">`;
    pendingMedia.edit = e.target.result;
  };
  r.readAsDataURL(f);
}
function quickAvatar(input){
  const f = input.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = e => {
    const idx = DB.users.findIndex(u=>u.id===currentUser.id);
    DB.users[idx].avatar = e.target.result;
    currentUser = DB.users[idx];
    saveDB(); buildShell(); renderMyProfile();
    toast('Foto aggiornata!');
  };
  r.readAsDataURL(f);
}
function saveProfile(){
  const name = document.getElementById('edit-name').value.trim();
  const username = document.getElementById('edit-username').value.trim().replace(/\s/g,'');
  const bio = document.getElementById('edit-bio').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  const website = document.getElementById('edit-website').value.trim();
  if(!name||!username){ toast('Nome e username obbligatori','warn'); return; }
  const conflict = DB.users.find(u=>u.username===username && u.id!==currentUser.id);
  if(conflict){ toast('Username già in uso','warn'); return; }
  const idx = DB.users.findIndex(u=>u.id===currentUser.id);
  DB.users[idx] = {...DB.users[idx], name, username, bio, location, website};
  if(pendingMedia.edit) DB.users[idx].avatar = pendingMedia.edit;
  currentUser = DB.users[idx];
  saveDB(); buildShell();
  closeModal('edit-profile-modal');
  toast('Profilo aggiornato!');
  renderMyProfile();
}

// ============ FOLLOW ============
function toggleFollow(targetId){
  if(targetId===currentUser.id) return;
  const myI = DB.users.findIndex(u=>u.id===currentUser.id);
  const tI = DB.users.findIndex(u=>u.id===targetId);
  const isFollowing = DB.users[myI].following.includes(targetId);
  if(isFollowing){
    DB.users[myI].following = DB.users[myI].following.filter(x=>x!==targetId);
    DB.users[tI].followers = DB.users[tI].followers.filter(x=>x!==currentUser.id);
  } else {
    DB.users[myI].following.push(targetId);
    DB.users[tI].followers.push(currentUser.id);
    addNotification(targetId,'follow', `<strong>${escHTML(currentUser.name)}</strong> ha iniziato a seguirti`);
    toast('Ora segui '+DB.users[tI].name);
  }
  currentUser = DB.users[myI];
  saveDB();
  if(currentPage==='userprofile') viewProfile(targetId);
  else if(currentPage==='myprofile') renderMyProfile();
  else { renderRightPanel(); renderFeed(); }
}
function showFollowers(userId, type){
  const u = DB.users.find(x=>x.id===userId);
  const ids = type==='followers' ? (u.followers||[]) : (u.following||[]);
  document.getElementById('followers-modal-title').textContent = type==='followers' ? `Follower (${ids.length})` : `Seguiti (${ids.length})`;
  const list = ids.map(id=>{
    const fu = DB.users.find(x=>x.id===id); if(!fu) return '';
    const isF = (currentUser.following||[]).includes(fu.id);
    const isMe = fu.id===currentUser.id;
    return `<div class="suggest-user">
      ${avatarHTML(fu, 44, '', `viewProfile(${fu.id});closeModal('followers-modal')`)}
      <div class="suggest-info" onclick="viewProfile(${fu.id});closeModal('followers-modal')">
        <div class="suggest-name">${escHTML(fu.name)}${fu.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}</div>
        <div class="suggest-handle">@${escHTML(fu.username)}</div>
      </div>
      ${!isMe?`<button class="btn-follow ${isF?'following':''}" onclick="toggleFollow(${fu.id});showFollowers(${userId},'${type}')"><span class="follow-text"><span class="follow-text-inner"><span>${isF?'Seguito':'+ Segui'}</span></span></span></button>`:''}
    </div>`;
  }).join('') || `<div class="empty-state"><div class="empty-state-icon">${ICONS.user}</div><p>Nessuno qui</p></div>`;
  document.getElementById('followers-list').innerHTML = list;
  document.getElementById('followers-modal').classList.add('open');
}

// ============ POSTS CRUD ============
function openPostModal(){
  document.getElementById('modal-post-text').value = '';
  clearMedia('modal');
  document.getElementById('post-modal').classList.add('open');
  setTimeout(()=>document.getElementById('modal-post-text').focus(), 200);
}
function previewMedia(input, type, source){
  const f = input.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = e => {
    pendingMedia[source] = { url: e.target.result, type };
    const preview = document.getElementById(`${source}-media-preview`);
    preview.style.display = 'block';
    preview.innerHTML = type==='image'
      ? `<img src="${e.target.result}"><button class="media-preview-remove" onclick="clearMedia('${source}')">${ICONS.close}</button>`
      : `<video src="${e.target.result}" controls></video><button class="media-preview-remove" onclick="clearMedia('${source}')">${ICONS.close}</button>`;
  };
  r.readAsDataURL(f);
}
function clearMedia(source){
  pendingMedia[source] = null;
  const el = document.getElementById(`${source}-media-preview`);
  if(el){ el.style.display='none'; el.innerHTML=''; }
}
function updateCounter(textareaId, counterId){
  const ta = document.getElementById(textareaId);
  const c = document.getElementById(counterId);
  if(!ta||!c) return;
  const len = ta.value.length;
  const max = 500;
  c.textContent = `${len}/${max}`;
  c.className = 'post-counter' + (len>max*0.9?' warn':'') + (len>max?' danger':'');
}
function autoGrow(ta){
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
}
const EMOJIS = ['😀','😂','🥰','😎','🤩','🥳','🤔','😴','🙌','👏','💪','🔥','✨','💖','❤️','💔','🌟','⭐','🎉','🎊','🚀','💡','📸','🎵','🎬','🍕','☕','🌿','🌸','🌅','🏔️','🌊','✈️','🎨','📚','💭'];
function toggleEmojiPicker(textareaId, btn){
  let picker = btn.parentElement.querySelector('.emoji-picker');
  if(!picker){
    picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = EMOJIS.map(e=>`<button onclick="addEmoji('${textareaId}','${e}')">${e}</button>`).join('');
    btn.parentElement.appendChild(picker);
  }
  picker.classList.toggle('open');
}
function addEmoji(textareaId, e){
  const ta = document.getElementById(textareaId);
  if(!ta) return;
  ta.value += e;
  ta.focus();
  if(textareaId==='quick-post-text') updateCounter('quick-post-text','quick-counter');
  if(textareaId==='modal-post-text') updateCounter('modal-post-text','modal-counter');
}
function createPost(source){
  const textId = source==='quick' ? 'quick-post-text' : 'modal-post-text';
  const text = document.getElementById(textId).value.trim();
  const media = pendingMedia[source];
  if(!text && !media){ toast('Scrivi qualcosa o aggiungi un media','warn'); return; }
  if(text.length>500){ toast('Massimo 500 caratteri','warn'); return; }
  const post = {
    id:DB.nextId++, userId:currentUser.id, text,
    mediaUrl: media?media.url:null, mediaType: media?media.type:null,
    likes:[], reposts:[], bookmarks:[], reactionsByUser:{},
    timestamp: Date.now(),
  };
  DB.posts.unshift(post);
  extractHashtags(text).forEach(h=> DB.hashtags[h]=(DB.hashtags[h]||0)+1);
  const mentions = (text.match(/@([\w]+)/g)||[]).map(m=>m.slice(1));
  mentions.forEach(uname=>{
    const mu = DB.users.find(x=>x.username===uname);
    if(mu && mu.id!==currentUser.id) addNotification(mu.id,'mention',`<strong>${escHTML(currentUser.name)}</strong> ti ha menzionato in un post`);
  });
  const idx = DB.users.findIndex(u=>u.id===currentUser.id);
  DB.users[idx].posts = (DB.users[idx].posts||0)+1;
  saveDB();
  document.getElementById(textId).value = '';
  if(source==='quick') { updateCounter('quick-post-text','quick-counter'); autoGrow(document.getElementById(textId)); }
  clearMedia(source);
  if(source==='modal') closeModal('post-modal');
  renderFeed(); renderStories();
  toast('Post pubblicato! ✨');
  fireConfetti();
}
function deletePost(postId){
  if(!confirm('Eliminare questo post?')) return;
  DB.posts = DB.posts.filter(p=>p.id!==postId);
  DB.comments = DB.comments.filter(c=>c.postId!==postId);
  const idx = DB.users.findIndex(u=>u.id===currentUser.id);
  if(idx>=0) DB.users[idx].posts = Math.max(0,(DB.users[idx].posts||1)-1);
  saveDB(); renderFeed();
  if(currentPage==='myprofile') renderMyProfile();
  toast('Post eliminato');
}
function doubleTapLike(postId, mediaEl){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  if(!post.likes.includes(currentUser.id)){
    post.likes.push(currentUser.id);
    if(!post.reactionsByUser) post.reactionsByUser = {};
    post.reactionsByUser[currentUser.id] = 'like';
    if(post.userId!==currentUser.id) addNotification(post.userId,'like',`<strong>${escHTML(currentUser.name)}</strong> ha messo mi piace al tuo post`);
    saveDB();
  }
  const heart = mediaEl.querySelector('.heart-burst');
  heart.classList.remove('active'); void heart.offsetWidth; heart.classList.add('active');
  setTimeout(()=>rerenderPost(postId), 800);
}
function toggleBookmark(postId){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  post.bookmarks = post.bookmarks||[];
  const saved = post.bookmarks.includes(currentUser.id);
  if(saved){ post.bookmarks = post.bookmarks.filter(x=>x!==currentUser.id); toast('Rimosso dai salvati'); }
  else { post.bookmarks.push(currentUser.id); toast('Salvato!'); }
  saveDB();
  rerenderPost(postId);
}
function toggleRepost(postId){
  const post = DB.posts.find(p=>p.id===postId); if(!post) return;
  post.reposts = post.reposts||[];
  const reposted = post.reposts.includes(currentUser.id);
  if(reposted){ post.reposts = post.reposts.filter(x=>x!==currentUser.id); toast('Ripubblicazione annullata'); }
  else {
    post.reposts.push(currentUser.id);
    if(post.userId!==currentUser.id) addNotification(post.userId,'repost',`<strong>${escHTML(currentUser.name)}</strong> ha ripubblicato il tuo post`);
    toast('Ripubblicato!');
  }
  saveDB();
  rerenderPost(postId);
}
function copyLink(postId){
  if(navigator.clipboard) navigator.clipboard.writeText(`socialgram.app/post/${postId}`);
  toast('Link copiato!');
}

// ============ COMMENTS (with threading) ============
function openComments(postId){
  activeCommentPostId = postId;
  replyingToCommentId = null;
  renderCommentsList();
  document.getElementById('comment-input').value = '';
  document.getElementById('comment-input').placeholder = 'Aggiungi un commento...';
  document.getElementById('reply-context-bar').classList.remove('show');
  document.getElementById('reply-context-bar').innerHTML = '';
  document.getElementById('comments-modal').classList.add('open');
  setTimeout(()=>document.getElementById('comment-input').focus(), 250);
}
function renderCommentsList(){
  const post = DB.posts.find(p=>p.id===activeCommentPostId);
  const u = DB.users.find(x=>x.id===post.userId);
  const all = DB.comments.filter(c=>c.postId===activeCommentPostId);
  const top = all.filter(c=>!c.parentId).sort((a,b)=>a.timestamp-b.timestamp);
  let html = `<div style="padding:16px 22px;border-bottom:1px solid var(--hairline)">
    <div class="post-user" onclick="closeModal('comments-modal');viewProfile(${u.id})" style="margin-bottom:8px">
      ${avatarHTML(u,36)}
      <div><div class="post-username" style="font-size:.9rem">${escHTML(u.name)}${u.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}</div><div class="post-handle">@${escHTML(u.username)}</div></div>
    </div>
    <div style="font-size:.92rem;color:var(--text-1);line-height:1.5">${linkifyText(post.text||'')}</div>
  </div>`;
  html += '<div class="comments-list">';
  if(!top.length){
    html += `<div class="empty-state" style="padding:30px 0"><div class="empty-state-icon">${ICONS.comment}</div><p>Nessun commento. Inizia tu!</p></div>`;
  } else {
    html += top.map(c=>renderCommentBlock(c, all)).join('');
  }
  html += '</div>';
  document.getElementById('comments-content').innerHTML = html;
}
function renderCommentBlock(c, all){
  const cu = DB.users.find(x=>x.id===c.userId); if(!cu) return '';
  const cliked = (c.likes||[]).includes(currentUser.id);
  const replies = all.filter(x=>x.parentId===c.id).sort((a,b)=>a.timestamp-b.timestamp);
  return `<div class="comment">
    ${avatarHTML(cu,36,'',`closeModal('comments-modal');viewProfile(${cu.id})`)}
    <div style="flex:1;min-width:0">
      <div class="comment-bubble">
        <div class="comment-user">${escHTML(cu.name)}${cu.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}<span class="comment-time">${getTimeAgo(c.timestamp)}</span></div>
        <div class="comment-text">${linkifyText(c.text)}</div>
      </div>
      <div class="comment-actions">
        <button class="comment-action ${cliked?'liked':''}" onclick="toggleCommentLike(${c.id})">${cliked?'❤️':'🤍'} ${(c.likes||[]).length||''}</button>
        <button class="comment-action" onclick="startReply(${c.id})">Rispondi</button>
        ${cu.id===currentUser.id?`<button class="comment-action" onclick="deleteComment(${c.id})">Elimina</button>`:''}
      </div>
      ${replies.length ? `<div class="comment-replies">${replies.map(r=>renderCommentBlock(r, all)).join('')}</div>` : ''}
    </div>
  </div>`;
}
function startReply(commentId){
  const c = DB.comments.find(x=>x.id===commentId); if(!c) return;
  const u = DB.users.find(x=>x.id===c.userId); if(!u) return;
  replyingToCommentId = c.parentId || c.id; // always reply to top-level
  const bar = document.getElementById('reply-context-bar');
  bar.innerHTML = `<div class="reply-context"><div>Rispondi a <strong>@${escHTML(u.username)}</strong></div><button onclick="cancelReply()">Annulla</button></div>`;
  bar.classList.add('show');
  const input = document.getElementById('comment-input');
  input.placeholder = `Rispondi a @${u.username}...`;
  input.focus();
}
function cancelReply(){
  replyingToCommentId = null;
  document.getElementById('reply-context-bar').classList.remove('show');
  document.getElementById('reply-context-bar').innerHTML = '';
  const input = document.getElementById('comment-input');
  input.placeholder = 'Aggiungi un commento...';
}
function submitComment(){
  const text = document.getElementById('comment-input').value.trim();
  if(!text||!activeCommentPostId) return;
  DB.comments.push({ id:DB.nextId++, postId:activeCommentPostId, userId:currentUser.id, text, likes:[], timestamp:Date.now(), parentId: replyingToCommentId });
  const post = DB.posts.find(p=>p.id===activeCommentPostId);
  if(post && post.userId!==currentUser.id) addNotification(post.userId,'comment',`<strong>${escHTML(currentUser.name)}</strong> ha commentato il tuo post`);
  if(replyingToCommentId){
    const parent = DB.comments.find(c=>c.id===replyingToCommentId);
    if(parent && parent.userId!==currentUser.id) addNotification(parent.userId,'comment',`<strong>${escHTML(currentUser.name)}</strong> ha risposto al tuo commento`);
  }
  saveDB();
  document.getElementById('comment-input').value = '';
  cancelReply();
  renderCommentsList();
  rerenderPost(activeCommentPostId);
}
function toggleCommentLike(cId){
  const c = DB.comments.find(x=>x.id===cId); if(!c) return;
  c.likes = c.likes||[];
  const liked = c.likes.includes(currentUser.id);
  if(liked) c.likes = c.likes.filter(x=>x!==currentUser.id); else c.likes.push(currentUser.id);
  saveDB(); renderCommentsList();
}
function deleteComment(cId){
  if(!confirm('Elimina commento?')) return;
  // delete comment + its replies
  DB.comments = DB.comments.filter(c=>c.id!==cId && c.parentId!==cId);
  saveDB(); renderCommentsList();
  rerenderPost(activeCommentPostId);
}

// ============ NOTIFICATIONS ============
function addNotification(targetId, type, text){
  DB.notifications.push({ id:DB.nextId++, targetId, type, text, timestamp:Date.now(), read:false });
  saveDB(); updateCurrentUser();
}
function renderNotifications(){
  const list = document.getElementById('notifications-list');
  const notifs = DB.notifications.filter(n=>n.targetId===currentUser.id).sort((a,b)=>b.timestamp-a.timestamp);
  if(!notifs.length){
    list.innerHTML = `<div class="card empty-state"><div class="empty-state-icon">${ICONS.bell}</div><div class="empty-state-title">Tutto tranquillo</div><p>Le tue notifiche compariranno qui</p></div>`;
    return;
  }
  list.innerHTML = `<div class="card" style="overflow:hidden">${notifs.map(n=>{
    const iconMap = {like:ICONS.heart, comment:ICONS.comment, follow:ICONS.user, repost:ICONS.repost, mention:ICONS.at};
    return `<div class="notif-item ${n.read?'':'unread'}">
      <div class="notif-icon ${n.type}">${iconMap[n.type]||ICONS.bell}</div>
      <div class="notif-body"><div class="notif-text">${n.text}</div><div class="notif-time">${getTimeAgo(n.timestamp)}</div></div>
      ${!n.read?'<div class="notif-dot"></div>':''}
    </div>`;
  }).join('')}</div>`;
  setTimeout(()=>{ notifs.forEach(n=>n.read=true); saveDB(); updateCurrentUser(); }, 1500);
}

// ============ BOOKMARKS ============
function renderBookmarks(){
  const el = document.getElementById('bookmarks-list');
  const saved = DB.posts.filter(p=>(p.bookmarks||[]).includes(currentUser.id)).sort((a,b)=>b.timestamp-a.timestamp);
  if(!saved.length){
    el.innerHTML = `<div class="card empty-state"><div class="empty-state-icon">${ICONS.bookmark}</div><div class="empty-state-title">Nessun salvato</div><p>I post che salvi appaiono qui, solo per te</p></div>`;
    return;
  }
  el.innerHTML = saved.map(p=>renderPostHTML(p)).join('');
}

// ============ MESSAGES ============
function renderMessages(){
  const el = document.getElementById('messages-content');
  const myConvs = DB.conversations.filter(c=>c.participants.includes(currentUser.id)).sort((a,b)=>b.lastTs-a.lastTs);
  if(!myConvs.length){
    el.innerHTML = `<div class="card empty-state"><div class="empty-state-icon">${ICONS.message}</div><div class="empty-state-title">Nessuna conversazione</div><p>Apri il profilo di qualcuno per scrivergli</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card" style="padding:0;overflow:hidden">
    <div class="messages-layout">
      <div class="messages-sidebar">${myConvs.map(c=>{
        const other = DB.users.find(u=>u.id===c.participants.find(x=>x!==currentUser.id));
        if(!other) return '';
        const lastMsg = DB.messages.filter(m=>m.convId===c.id).sort((a,b)=>b.ts-a.ts)[0];
        return `<div class="conv-item" onclick="openConv(${other.id})" id="conv-${c.id}">
          <div class="avatar-wrap">${avatarHTML(other,40)}${isOnline(other.id)?'<span class="online-dot"></span>':''}</div>
          <div class="conv-info"><div class="conv-name">${escHTML(other.name)}</div><div class="conv-last">${lastMsg?escHTML(lastMsg.text.slice(0,40)):'—'}</div></div>
        </div>`;
      }).join('')}</div>
      <div class="messages-conv" id="messages-conv-pane"><div class="empty-state" style="margin:auto"><div class="empty-state-icon">${ICONS.message}</div><p>Seleziona una conversazione</p></div></div>
    </div>
  </div>`;
}
function openConv(otherId){
  if(otherId===currentUser.id) return;
  let conv = DB.conversations.find(c=> c.participants.includes(currentUser.id) && c.participants.includes(otherId));
  if(!conv){
    conv = { id:DB.nextId++, participants:[currentUser.id,otherId], lastTs:Date.now() };
    DB.conversations.push(conv);
    saveDB();
  }
  showPage('messages');
  setTimeout(()=>{
    const other = DB.users.find(u=>u.id===otherId);
    const msgs = DB.messages.filter(m=>m.convId===conv.id).sort((a,b)=>a.ts-b.ts);
    // mark inbound msgs as read
    DB.messages.forEach(m=>{ if(m.convId===conv.id && m.fromId!==currentUser.id) m.read = true; });
    saveDB();
    document.getElementById('messages-conv-pane').innerHTML = `
      <div class="conv-header">
        <div class="avatar-wrap">${avatarHTML(other,40,'',`viewProfile(${other.id})`)}${isOnline(other.id)?'<span class="online-dot"></span>':''}</div>
        <div style="flex:1;cursor:pointer" onclick="viewProfile(${other.id})">
          <div style="font-weight:600">${escHTML(other.name)}${other.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}</div>
          <div style="font-size:.78rem;color:var(--text-2)">${isOnline(other.id)?'<span style="color:var(--green)">● online ora</span>':'@'+escHTML(other.username)}</div>
        </div>
      </div>
      <div class="conv-messages" id="conv-msgs-${conv.id}">
        ${msgs.map(m=>renderMsgBubble(m)).join('') || `<div style="text-align:center;color:var(--text-2);font-size:.85rem;padding:40px 20px">Inizia la conversazione con ${escHTML(other.name.split(' ')[0])}!</div>`}
      </div>
      <div class="conv-input-row">
        <input class="comment-input" id="msg-input-${conv.id}" placeholder="Scrivi un messaggio..." oninput="onMsgTyping(${conv.id},${otherId})" onkeydown="if(event.key==='Enter')sendMsg(${conv.id},${otherId})">
        <button class="btn-submit" onclick="sendMsg(${conv.id},${otherId})" data-magnetic="soft">${ICONS.send}</button>
      </div>`;
    const m = document.getElementById('conv-msgs-'+conv.id);
    if(m) m.scrollTop = m.scrollHeight;
    initMagnetic();
  }, 50);
}
function renderMsgBubble(m){
  const isMe = m.fromId===currentUser.id;
  const readMark = isMe ? `<span class="msg-read">${m.read?'✓✓':'✓'}</span>` : '';
  return `<div class="msg-bubble ${isMe?'me':'them'}">${escHTML(m.text)}<div class="msg-time">${getTimeAgo(m.ts)}${readMark}</div></div>`;
}
function onMsgTyping(convId, otherId){
  // (placeholder for future real-time)
}
function sendMsg(convId, otherId){
  const input = document.getElementById('msg-input-'+convId);
  const t = input.value.trim(); if(!t) return;
  DB.messages.push({ id:DB.nextId++, convId, fromId:currentUser.id, text:t, ts:Date.now(), read:false });
  const c = DB.conversations.find(x=>x.id===convId); if(c) c.lastTs = Date.now();
  saveDB();
  input.value = '';
  openConv(otherId);
  // typing indicator + simulated reply
  setTimeout(()=>{
    const pane = document.getElementById('conv-msgs-'+convId);
    if(pane && currentPage==='messages'){
      const ti = document.createElement('div');
      ti.className = 'typing-indicator';
      ti.id = 'typing-'+convId;
      ti.innerHTML = '<span></span><span></span><span></span>';
      pane.appendChild(ti);
      pane.scrollTop = pane.scrollHeight;
    }
  }, 600);
  setTimeout(()=>{
    const replies = ['Ok!','Bello! 👀','Davvero?','Concordo','Ti scrivo poi','😂','Forte!','Wow','Interessante','Ci sto pensando 🤔'];
    DB.messages.push({ id:DB.nextId++, convId, fromId:otherId, text:replies[Math.floor(Math.random()*replies.length)], ts:Date.now(), read:false });
    if(c) c.lastTs = Date.now();
    // mark our last as read (they "saw" it)
    DB.messages.filter(m=>m.convId===convId && m.fromId===currentUser.id).forEach(m=>m.read=true);
    saveDB();
    if(currentPage==='messages') openConv(otherId);
  }, 1400+Math.random()*1600);
}

// ============ RIGHT PANEL ============
function renderRightPanel(){
  const list = document.getElementById('suggestions-list');
  if(list){
    const others = DB.users.filter(u=>u.id!==currentUser.id && !(currentUser.following||[]).includes(u.id)).slice(0,4);
    list.innerHTML = others.length ? others.map(u=>`
      <div class="suggest-user">
        ${avatarHTML(u,40,'',`viewProfile(${u.id})`)}
        <div class="suggest-info" onclick="viewProfile(${u.id})">
          <div class="suggest-name">${escHTML(u.name)}${u.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}</div>
          <div class="suggest-handle">@${escHTML(u.username)}</div>
        </div>
        <button class="btn-follow" onclick="toggleFollow(${u.id})"><span class="follow-text"><span class="follow-text-inner"><span>+ Segui</span></span></span></button>
      </div>`).join('') : `<p style="color:var(--text-2);font-size:.85rem">Segui già tutti! 🎉</p>`;
  }
  const trend = document.getElementById('trending-list');
  if(trend){
    const tags = Object.entries(DB.hashtags).sort((a,b)=>b[1]-a[1]).slice(0,5);
    trend.innerHTML = tags.length ? tags.map(([t,n],i)=>`
      <div class="trend-item" onclick="viewHashtag('${t}')">
        <div class="trend-cat">Tendenza · #${i+1}</div>
        <div class="trend-tag">#${escHTML(t)}</div>
        <div class="trend-count">${n} post</div>
      </div>`).join('') : '<p style="color:var(--text-2);font-size:.85rem">Nessuna tendenza ancora</p>';
  }
}

// ============ SEARCH ============
let searchDebounce;
function liveSearch(q){
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(()=>doSearch(q.trim()), 220);
}
function doSearch(q){
  if(!q){ if(currentPage==='search') showPage('feed'); return; }
  showPage('search');
  const lq = q.toLowerCase();
  let results = '';
  if(q.startsWith('#')){
    const tag = q.slice(1).toLowerCase();
    const matches = Object.keys(DB.hashtags).filter(t=>t.includes(tag));
    if(matches.length) results += `<div class="card" style="padding:18px;margin-bottom:14px"><div class="widget-title" style="margin-bottom:10px">Hashtag</div>${matches.map(t=>`<div class="trend-item" onclick="viewHashtag('${t}')"><div class="trend-tag">#${escHTML(t)}</div><div class="trend-count">${DB.hashtags[t]} post</div></div>`).join('')}</div>`;
  }
  const users = DB.users.filter(u=>u.name.toLowerCase().includes(lq)||u.username.toLowerCase().includes(lq));
  if(users.length){
    results += `<div class="card" style="padding:18px;margin-bottom:14px"><div class="widget-title" style="margin-bottom:14px">Persone</div>${users.map(u=>`
      <div class="suggest-user">
        ${avatarHTML(u,44,'',`viewProfile(${u.id})`)}
        <div class="suggest-info" onclick="viewProfile(${u.id})">
          <div class="suggest-name">${escHTML(u.name)}${u.verified?`<span class="verified-badge">${ICONS.check}</span>`:''}</div>
          <div class="suggest-handle">@${escHTML(u.username)}</div>
        </div>
        ${u.id!==currentUser.id?`<button class="btn-follow ${(currentUser.following||[]).includes(u.id)?'following':''}" onclick="toggleFollow(${u.id})"><span class="follow-text"><span class="follow-text-inner"><span>${(currentUser.following||[]).includes(u.id)?'Seguito':'+ Segui'}</span></span></span></button>`:''}
      </div>`).join('')}</div>`;
  }
  const posts = DB.posts.filter(p=>p.text.toLowerCase().includes(lq));
  if(posts.length){ results += posts.map(p=>renderPostHTML(p)).join(''); }
  if(!results) results = `<div class="card empty-state"><div class="empty-state-icon">${ICONS.search}</div><div class="empty-state-title">Nessun risultato</div><p>Per "${escHTML(q)}"</p></div>`;
  document.getElementById('search-results').innerHTML = results;
  setTimeout(init3DTilts, 50);
}

// ============ MODALS ============
function closeModal(id){ const m = document.getElementById(id); if(m) m.classList.remove('open'); }
document.addEventListener('click', e => {
  if(e.target.classList && e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// ============ THEME ============
function toggleTheme(){
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme')==='dark';
  html.setAttribute('data-theme', isDark?'light':'dark');
  localStorage.setItem('sg_theme', isDark?'light':'dark');
  document.getElementById('theme-knob').innerHTML = isDark ? ICONS.sun : ICONS.moon;
  // update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = isDark ? '#f9f6f0' : '#050310';
}

// ============ TOAST ============
function toast(msg, kind='success'){
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').innerHTML = kind==='success' ? ICONS.check : (kind==='warn'?'<span style="font-weight:800">!</span>':'<span style="font-weight:800">✕</span>');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2600);
}

// ============ CONFETTI ============
function fireConfetti(){
  const colors = ['#ff3b8a','#a347ff','#1edcff','#ffb627','#00d68f'];
  for(let i=0;i<28;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = (50 + (Math.random()-0.5)*40) + '%';
    c.style.top = '20vh';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDelay = (Math.random()*200) + 'ms';
    c.style.transform = 'rotate('+(Math.random()*360)+'deg)';
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 2000);
  }
}

// ============ UTILS ============
function escHTML(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function getTimeAgo(ts){
  const d = Date.now()-ts, m=60000, h=3600000, day=86400000;
  if(d<m) return 'adesso';
  if(d<h) return Math.floor(d/m)+'m';
  if(d<day) return Math.floor(d/h)+'h';
  if(d<day*7) return Math.floor(d/day)+'g';
  return new Date(ts).toLocaleDateString('it-IT',{day:'numeric',month:'short'});
}

// ============ CUSTOM CURSOR ============
(function initCursor(){
  if(matchMedia('(hover: none), (max-width: 900px)').matches) return;
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if(!dot || !ring) return;
  let mx = -100, my = -100, rx = -100, ry = -100;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  function tick(){
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
  // hover state on interactive elements
  const hoverSel = 'a, button, .nav-item, .post-user, .story-item, .conv-item, .suggest-user, .trend-item, .media-grid-item, .topbar-logo, .topbar-avatar, .post-menu, .reaction-btn, .post-action-btn, .feed-tab, .auth-tab, .tab-btn, [data-magnetic], .dropdown-item, .modal-close, .theme-toggle, .icon-btn';
  document.addEventListener('mouseover', e => {
    if(e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest(hoverSel) && !e.relatedTarget?.closest?.(hoverSel)) document.body.classList.remove('cursor-hover');
  });
  document.addEventListener('mousedown', ()=>document.body.classList.add('cursor-press'));
  document.addEventListener('mouseup', ()=>document.body.classList.remove('cursor-press'));
  // text input cursor
  const textSel = 'input[type="text"], input[type="email"], input[type="password"], input:not([type]), textarea';
  document.addEventListener('focusin', e => { if(e.target.matches(textSel)) document.body.classList.add('cursor-text'); });
  document.addEventListener('focusout', e => { if(e.target.matches(textSel)) document.body.classList.remove('cursor-text'); });
})();

// ============ MAGNETIC BUTTONS ============
function initMagnetic(){
  if(matchMedia('(hover: none), (max-width: 900px)').matches) return;
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    if(el._magnetic) return;
    el._magnetic = true;
    const strength = el.dataset.magnetic === 'strong' ? 0.35 : 0.18;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      el.style.transform = `translate(${x*strength}px, ${y*strength}px)`;
    });
    el.addEventListener('mouseleave', ()=>{ el.style.transform = ''; });
  });
}

// ============ 3D CARD TILT ============
function init3DTilts(){
  if(matchMedia('(hover: none), (max-width: 900px)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach(card => {
    if(card._tilted) return;
    card._tilted = true;
    let raf;
    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(()=>{
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1200px) rotateY(${x*3}deg) rotateX(${-y*3}deg) translateY(-2px)`;
      });
    });
    card.addEventListener('mouseleave', ()=>{
      cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  });
}

// ============ AURORA PARALLAX (cursor) ============
(function auroraParallax(){
  if(matchMedia('(hover: none), (max-width: 900px)').matches) return;
  const orbs = document.querySelectorAll('.aurora-orb');
  if(!orbs.length) return;
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  });
  function tick(){
    orbs.forEach((o, i) => {
      const k = (i+1) * 6;
      o.style.translate = `${mx*k}px ${my*k}px`;
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

// ============ RIPPLE ============
document.addEventListener('click', e=>{
  const b = e.target.closest('.btn-primary,.btn-post,.btn-submit');
  if(!b) return;
  const r = b.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(r.width,r.height);
  ripple.style.width = ripple.style.height = size+'px';
  ripple.style.left = (e.clientX-r.left-size/2)+'px';
  ripple.style.top = (e.clientY-r.top-size/2)+'px';
  b.style.position = b.style.position||'relative';
  b.style.overflow = 'hidden';
  b.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 720);
});

// ============ KEYBOARD ============
document.addEventListener('keydown', e=>{
  if(activeStory){
    if(e.key==='ArrowRight') nextStory();
    if(e.key==='ArrowLeft') prevStory();
    if(e.key==='Escape') closeStory();
  }
  if(e.key==='Escape'){ document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); }
  // cmd/ctrl+k focus search
  if((e.ctrlKey||e.metaKey) && e.key==='k'){ e.preventDefault(); document.getElementById('search-input')?.focus(); }
});

// ============ BOOT ============
(function(){
  loadDB();
  const theme = localStorage.getItem('sg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.addEventListener('DOMContentLoaded', ()=>{
    const k = document.getElementById('theme-knob');
    if(k) k.innerHTML = theme==='dark' ? ICONS.moon : ICONS.sun;
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.content = theme==='dark' ? '#050310' : '#f9f6f0';
  });
  const sid = localStorage.getItem('sg_session');
  if(sid){
    const u = DB.users.find(x=>x.id===parseInt(sid));
    if(u){ currentUser = u; setTimeout(initApp, 0); return; }
  }
})();
