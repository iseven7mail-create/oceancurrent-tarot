(() => {
  'use strict';
  const cards = window.CARDS;
  const main = document.querySelector('#main');
  if (!cards || cards.length !== 78) {
    main.innerHTML = '<div class="load-error"><h1>牌卡還在路上</h1><p>請重新整理頁面，讓洋流再試一次。</p></div>';
    return;
  }
  const KEY = 'oceancurrent-companion-v1';
  const fresh = () => ({version:1, favorites:[], progress:{}, entries:[]});
  let state = fresh(), storageOK = true, route = '', mood = '想被陪伴', mode = 1;
  let allowReversed = false, draw = null, shuffling = false, drawTimer;
  let filter = '全部', query = '', favoritesOnly = false;
  let current = null, quiz = null, toastTimer;
  const dialog = document.querySelector('#card-dialog');
  const about = document.querySelector('#about-dialog');
  const $ = (selector, base = document) => base.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validId = n => Number.isInteger(n) && n >= 0 && n < 78;
  function normalize(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.favorites) || !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) throw Error('格式不符');
    const clean = fresh();
    clean.favorites = [...new Set(data.favorites.filter(validId))];
    for (const c of cards) {
      const p = data.progress[c.id];
      if (p && typeof p === 'object') clean.progress[c.id] = {read:!!p.read,done:!!p.done,choice:Number.isInteger(p.choice)&&p.choice>=0&&p.choice<3?p.choice:null,draft:typeof p.draft==='string'?p.draft.slice(0,2000):''};
    }
    if (data.entries.length > 1000) throw Error('紀錄超過可匯入數量');
    clean.entries = data.entries.filter(e=>e && validId(e.cardId) && typeof e.id==='string' && typeof e.date==='string' && !Number.isNaN(Date.parse(e.date))).map(e=>({id:e.id.slice(0,100),cardId:e.cardId,date:new Date(e.date).toISOString(),reversed:!!e.reversed,mood:typeof e.mood==='string'?e.mood.slice(0,50):'想被陪伴',choice:Number.isInteger(e.choice)&&e.choice>=0&&e.choice<3?e.choice:null,note:typeof e.note==='string'?e.note.slice(0,2000):'',done:!!e.done,context:typeof e.context==='string'?e.context.slice(0,100):''}));
    return clean;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = normalize(JSON.parse(raw));
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { storageOK = false; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; return true; }
    catch { storageOK = false; toast('這個瀏覽器暫時無法儲存，紀錄目前只保留在此頁。可以把想留下的心情另存圖片。'); return false; }
  }
  function progress(id) { return state.progress[id] ||= {read:false,done:false,choice:null,draft:''}; }
  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'),3500);
  }
  const storageNote = () => storageOK ? '' : '<p class="storage-note">此瀏覽器的儲存功能目前無法使用。探索仍可進行，想保留的心情可以逐則另存圖片。</p>';
  const isFav = id => state.favorites.includes(id);
  function randomInt(max) {
    if (globalThis.crypto?.getRandomValues) {
      const limit = Math.floor(4294967296 / max) * max;
      const arr = new Uint32Array(1); do { crypto.getRandomValues(arr); } while(arr[0]>=limit);
      return arr[0] % max;
    }
    return Math.floor(Math.random()*max);
  }
  function shuffled(array) {
    const a = [...array];
    for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function miniCard(c) {
    return `<button class="mini-card" data-action="open-card" data-id="${c.id}" aria-label="探索${c.name}的牌意與陪伴練習"><div class="image-wrap"><img src="${c.thumb}" width="260" height="446" alt="${c.name}洋流塔羅牌" loading="lazy">${progress(c.id).done?'<span class="completed-mark">練習 ✓</span>':''}${isFav(c.id)?'<span class="saved-heart" aria-label="已收藏">♥</span>':''}</div><h3><span class="card-no">${String(c.id).padStart(2,'0')}</span>${c.name}</h3><p>${c.keywords.join('・')}</p></button>`;
  }
  function updateCounters() { $('#journal-count').textContent = state.entries.length; }
  function home() {
    main.innerHTML = `${storageNote()}<div class="wrap"><section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="dot">●</span> OCEANCURRENT TAROT CLUB</span><h1>每一道洋流，<br>都<em>接得住你。</em></h1><p>78 張牌，78 種陪伴你的方式。<br>把心事輕輕放下，讓一張牌陪你整理心情，<br>再帶著一點點勇氣，往前走。</p><div class="hero-actions"><a class="primary" href="#draw">抽一張，陪陪我 <span>↗</span></a><button class="text-btn" data-action="daily">遇見今日的牌 →</button></div><div class="hero-fine">不用想好問題，今天的你就值得被陪伴。</div></div><div class="hero-art" aria-label="洋流愚者、星星與太陽牌"><div class="art-circle"></div><div class="art-orbit"></div><img class="art-card left" src="assets/17.webp" alt="星星：修復與希望" width="760" height="1303"><img class="art-card right" src="assets/19.webp" alt="太陽：清晰與喜悅" width="760" height="1303"><img class="art-card center" src="assets/00.webp" alt="愚者・洋流：一起開始新的旅程" width="760" height="1303"><span class="art-star" aria-hidden="true">✳</span><span class="art-small-star" aria-hidden="true">✦</span><div class="art-stamp">給今天的你<strong>慢慢來</strong>我們一起走</div><span class="art-label">A LITTLE COURAGE. A LOT OF COMPANY.</span></div></section></div><div class="ticker" aria-hidden="true"><span>溫柔，也有力量</span><span>✳</span><span>把自己放進照顧裡</span><span>✳</span><span>你的步伐，值得被等待</span><span>✳</span><span>一起慢慢走</span></div><div class="wrap"><section class="section"><div class="section-heading"><div><span class="eyebrow">A MOMENT FOR YOURSELF</span><h2>留一點時間，給自己。</h2></div><p>不急著找到答案，先聽見自己的聲音。</p></div><div class="journey-grid"><div class="journey-item"><span class="journey-num">01</span><div><h3>帶著今天的心情</h3><p>累累的、卡住了，或想找點勇氣。<br>什麼心情，都可以來。</p></div></div><div class="journey-item"><span class="journey-num">02</span><div><h3>讓一張牌陪你聊聊</h3><p>認識牌意，讀一段溫柔的陪伴。<br>再為自己選一個小練習。</p></div></div><div class="journey-item"><span class="journey-num">03</span><div><h3>帶走一點往前的力量</h3><p>記下一句話，完成一個小行動。<br>一點點，也已經很好。</p></div></div></div></section><section class="section" style="padding-top:0"><div class="section-heading"><div><span class="eyebrow">78 CARDS · 78 COMPANIONS</span><h2>每張牌，都有話想對你說。</h2></div><a class="text-btn" href="#collection">走進 78種暖流 ↗</a></div><div class="preview-grid">${[0,8,17,36,53,76].map(id=>miniCard(cards[id])).join('')}</div><div class="home-note"><span aria-hidden="true">♥</span><div><h3>你不用一直很堅強，才值得被喜歡。</h3><p>走快走慢都沒關係。願我們有照顧彼此的勇氣，也有好好照顧自己的溫柔。</p></div></div></section></div>`;
  }
  function drawPage() {
    main.innerHTML = `<div class="wrap">${storageNote()}<div class="page-heading"><span class="eyebrow">YOUR LITTLE PAUSE</span><h1>先坐一下，洋流陪你。</h1><p>深呼吸，把心事帶來就好。抽出的牌是整理自己的線索。</p></div><div class="draw-layout"><section class="draw-settings" aria-label="抽牌設定"><h2 class="step-heading"><span>01</span>今天的你，感覺如何？</h2><div class="mood-list">${['想被陪伴','有點累了','心裡卡卡','需要勇氣','想找方向','想分享快樂'].map(m=>`<button class="chip ${mood===m?'selected':''}" data-action="mood" data-mood="${m}" aria-pressed="${mood===m}">${m}</button>`).join('')}</div><h2 class="step-heading"><span>02</span>想要哪一種陪伴？</h2><div class="mode-options"><button class="mode-option ${mode===1?'selected':''}" data-action="mode" data-mode="1" aria-pressed="${mode===1}"><strong>簡單的提醒</strong><small>給現在的你，一段剛好的陪伴。</small></button><button class="mode-option ${mode===3?'selected':''}" data-action="mode" data-mode="3" aria-pressed="${mode===3}"><strong>多點陪伴</strong><small>看見當下 → 找到支持 → 跨出小步。</small></button></div><label class="check-label"><input type="checkbox" id="allow-reversed" ${allowReversed?'checked':''}>也探索逆位的提醒</label><p class="fine-print">心情只用於你的手帳紀錄，不影響隨機抽牌。逆位不是壞運，而是另一個理解自己的角度。</p><button class="primary" data-action="draw" ${shuffling?'disabled':''}>${shuffling?'洋流正在洗牌…':'準備好了，開始流行'} <span>✳</span></button></section><section class="deck-stage" id="deck-stage" aria-label="抽牌區" aria-busy="${shuffling}"></section></div></div>`;
    renderStage();
  }
  function renderStage() {
    const stage = $('#deck-stage'); if(!stage) return;
    stage.classList.toggle('shuffling',shuffling);
    stage.setAttribute('aria-busy',String(shuffling));
    if(!draw || shuffling) {
      stage.innerHTML=`<span class="eyebrow">A CARD IS WAITING FOR YOU</span><div class="deck-fan" aria-hidden="true">${Array.from({length:5},()=>'<div class="fan-card"><img src="assets/78-thumb.webp" alt="" width="260" height="446"></div>').join('')}</div><h2>${shuffling?'讓心慢慢安定下來。':'有些話，正在等你。'}</h2><p role="status">${shuffling?'正在洗牌，稍等一下就好。':'選好左邊的陪伴方式，再輕輕按下抽牌。'}</p>`;
      return;
    }
    const all = draw.cards.every(c=>c.revealed);
    const labels = draw.cards.length===3?['看見當下','找到支持','跨出小步']:['給現在的你'];
    stage.innerHTML = `<span class="eyebrow">${draw.daily?'YOUR DAILY COMPANION':'A LITTLE MESSAGE FOR YOU'}</span><h2>${all?'謝謝你，願意聽聽自己。':'憑直覺，輕輕翻開。'}</h2><p class="result-mood">帶著「${escape(draw.mood)}」的心情，來到這裡。</p><div class="spread">${draw.cards.map((s,i)=>`<div class="spread-slot"><p>0${i+1} ／ ${labels[i]}</p><button class="spread-card ${s.revealed?'revealed':''} ${s.revealed&&s.reversed?'reversed':''}" data-action="${s.revealed?'read-draw':'reveal'}" data-index="${i}" aria-label="${s.revealed?'閱讀'+cards[s.id].name+'的陪伴':'翻開第'+(i+1)+'張牌'}"><img src="${s.revealed?cards[s.id].image:'assets/78.webp'}" alt="${s.revealed?cards[s.id].name:'洋流牌背'}" width="760" height="1303"></button>${s.revealed?`<h3>${cards[s.id].name}</h3><small>${s.reversed?'逆位・向內的提醒':'正位・此刻的線索'}</small><br><button class="spread-read" data-action="read-draw" data-index="${i}">讀陪伴・做練習 ↗</button>`:''}</div>`).join('')}</div>${all?`<div class="spread-summary"><strong>${draw.cards.length===3?'把三張牌，連成自己的小地圖。':'帶走今天的一句話。'}</strong>${draw.cards.map((s,i)=>`<p>${draw.cards.length===3?labels[i]+'｜':''}${escape(cards[s.id].affirmation)}</p>`).join('')}<p class="fine-print">這是一組反思提問，可以從最有感的一張開始，不必把所有牌意套進生活。</p></div>`:'<p role="status">每一張都可以點開。沒有抽錯，只有慢慢認識。</p>'}<div class="stage-actions">${!all?'<button class="secondary" data-action="reveal-all">一起翻開</button>':''}<button class="text-btn" data-action="draw">再洗一次牌 ↻</button><a class="text-btn" href="#collection">看看其他的牌 →</a></div>`;
  }
  function startDraw(daily=false) {
    if(shuffling) return;
    clearTimeout(drawTimer);
    shuffling=true;
    if(route!=='draw') {location.hash='draw';} else drawPage();
    drawTimer=setTimeout(()=>{
      let ids, orientations;
      if(daily) {
        const date = new Date();
        const key = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
        let hash=2166136261; for(const ch of key){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
        ids=[hash%78]; orientations=[false];
      } else { ids=shuffled(cards.map(c=>c.id)).slice(0,mode); orientations=ids.map(()=>allowReversed&&randomInt(2)===1); }
      draw={daily,mood,cards:ids.map((id,i)=>({id,reversed:orientations[i],revealed:false}))};
      shuffling=false;
      if(route==='draw'){drawPage();$('#deck-stage').scrollIntoView({behavior:'smooth',block:'nearest'});$('#deck-stage .spread-card')?.focus({preventScroll:true});}
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?120:900);
  }
  function reveal(index) {
    if(!draw?.cards[index]) return;
    draw.cards[index].revealed=true;renderStage();
    $(`[data-action="read-draw"][data-index="${index}"]`)?.focus({preventScroll:true});
  }
  function collectionPage() {
    const done=cards.filter(c=>progress(c.id).done).length;
    main.innerHTML=`<div class="wrap">${storageNote()}<div class="page-heading"><span class="eyebrow">THE WHOLE LITTLE UNIVERSE</span><h1>78 張牌，78 種相遇。</h1><p>跟著好奇心走，每一張都能翻開、讀牌意、做練習。不用照順序，也沒有完成期限。</p></div><div class="collection-tools"><div class="progress-copy"><strong>${done} / 78</strong> 張完成小練習<div class="progress-track" role="progressbar" aria-label="牌卡練習進度" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="78"><span style="width:${done/78*100}%"></span></div></div><a class="secondary" style="text-decoration:none" href="#quiz">玩一回牌意小挑戰 ↗</a></div><label class="sr-only" for="card-search">搜尋牌名或關鍵字</label><input class="search" id="card-search" type="search" placeholder="搜尋牌名、關鍵字……例如：力量、希望、休息" value="${escape(query)}" maxlength="100"><div class="filters" aria-label="牌卡分類">${['全部','大阿爾克那','權杖','聖杯','寶劍','錢幣'].map(f=>`<button class="chip ${filter===f?'selected':''}" data-action="filter" data-filter="${f}" aria-pressed="${filter===f}">${f}</button>`).join('')}<button class="chip ${favoritesOnly?'selected':''}" data-action="filter-favorites" aria-pressed="${favoritesOnly}">♥ 我的收藏</button></div><p class="result-count" id="result-count" aria-live="polite"></p><div class="collection-grid" id="collection-grid"></div></div>`;
    renderCollection();
  }
  function renderCollection() {
    const list = cards.filter(c=>(filter==='全部'||c.suit===filter)&&(!favoritesOnly||isFav(c.id))&&[c.name,...c.keywords,c.upright].join(' ').includes(query.trim()));
    $('#result-count').textContent=`共 ${list.length} 張牌${favoritesOnly?'・只看收藏':''}`;
    $('#collection-grid').innerHTML=list.length?list.map(miniCard).join(''):'<div class="no-results"><h2>還沒有遇見這張牌。</h2><p>換個關鍵字，或看看完整的牌卡旅程。</p><button class="secondary" data-action="reset-filters">顯示全部 78 張</button></div>';
  }
  function openCard(id, reversed=false, context='', sourceMood=mood) {
    if(!validId(id)) return;
    const p = progress(id); p.read=true; persist();
    current={id,reversed,context,mood:sourceMood};
    renderCard();
    if(!dialog.open) dialog.showModal();
    dialog.scrollTop=0;
    $('.dialog-close',dialog)?.focus({preventScroll:true});
  }
  function renderCard() {
    const {id,reversed,context}=current,c=cards[id],p=progress(id);
    $('#card-dialog-content').innerHTML=`<button class="dialog-close" data-action="close-card" aria-label="關閉牌卡">×</button><article class="card-detail"><div class="detail-art"><img class="${reversed?'is-reversed':''}" src="${c.image}" alt="${c.name}原始牌面${reversed?'，逆位顯示':''}" width="760" height="1303"><p>${c.suit} ／ OCEANCURRENT NO.${String(c.id).padStart(2,'0')}</p><button class="favorite" data-action="favorite" aria-pressed="${isFav(id)}">${isFav(id)?'♥ 已收藏這份陪伴':'♡ 收藏這份陪伴'}</button></div><div class="detail-content">${context?`<p class="detail-context">${escape(context)}・帶著「${escape(current.mood)}」的心情</p>`:''}<span class="eyebrow">A MESSAGE, JUST FOR YOU</span><h2 id="card-title">${c.name}</h2><div class="detail-meta">${c.keywords.map(k=>`<span class="tag">${k}</span>`).join('')}</div><div class="orientation" aria-label="選擇牌位解讀"><button class="${reversed?'':'active'}" data-action="orientation" data-reversed="false" aria-pressed="${!reversed}">正位</button><button class="${reversed?'active':''}" data-action="orientation" data-reversed="true" aria-pressed="${reversed}">逆位</button></div><p class="meaning-label">${reversed?'向內看看，或調整一下':'這張牌，想提醒你的事'}</p><p class="meaning">${reversed?c.reversed:c.upright}</p>${reversed?'<p class="reverse-note">逆位是另一種思考角度，可以留意受阻、過度或內在的需要。</p>':''}<div class="companion"><h3>♥ 洋流想陪你說</h3><p>${c.companion}</p></div><blockquote class="affirmation">「${c.affirmation}」</blockquote><section class="exercise"><span class="eyebrow">YOUR LITTLE PRACTICE · 01</span><h3>${c.question}</h3><div class="exercise-choices">${c.choices.map((choice,i)=>`<button class="choice ${p.choice===i?'selected':''}" data-action="choice" data-choice="${i}" aria-pressed="${p.choice===i}">${choice}</button>`).join('')}</div><div class="choice-feedback" id="choice-feedback" aria-live="polite">${choiceFeedback(c,p.choice)}</div><div class="action-box"><h4>02 ／ 把力量帶進生活</h4><p>${c.action}</p><button class="action-done ${p.done?'done':''}" data-action="complete" aria-pressed="${p.done}">${p.done?'✓ 我已經為自己做了這一步':'我做到了，記下這一小步 ✓'}</button><p class="fine-print">可以今天做，也可以改天回來。暫時做不到，不會減少你的價值。</p></div><form class="journal-form" id="journal-form"><label for="reflection">03 ／ 想留給現在的自己一句什麼話？</label><textarea id="reflection" maxlength="2000" placeholder="可以是一個感受、一個決定，或只是：今天已經很努力了。">${escape(p.draft)}</textarea><div class="form-bottom"><small>只存在此瀏覽器，最多 2,000 字。</small><button class="primary" type="submit">存進心情手帳 <span>↗</span></button></div></form></section><div class="detail-bottom"><button class="text-btn" data-action="previous-card">← 前一張</button><button class="text-btn next-card" data-action="next-card">下一張陪伴 →</button></div></div></article>`;
  }
  function choiceFeedback(c,choice) {
    return choice===null?'這裡沒有標準答案，選一個最貼近現在的你。':`你選了「${escape(c.choices[choice])}」。謝謝你願意聽聽自己。${escape(c.affirmation)} 先從這個方向開始，一小步就好。`;
  }
  function refreshBackground() {
    if(route==='collection') collectionPage();
    else if(route==='home') home();
    else if(route==='journal') journalPage();
    updateCounters();
  }
  function closeCard() {dialog.close();current=null;refreshBackground();}
  function saveEntry() {
    if(!current) return;
    const p=progress(current.id), note=$('#reflection').value.trim();p.draft=note;
    if(!note&&p.choice===null&&!p.done){toast('可以先選一個心情方向，或寫一句話，再把這份陪伴留下。');return;}
    if(state.entries.length>=1000){toast('手帳已累積 1,000 則。可以先將想保留的心情另存圖片，再整理舊紀錄。');return;}
    const last = state.entries[0];
    if(last&&last.cardId===current.id&&last.note===note&&last.choice===p.choice&&last.done===p.done&&last.reversed===current.reversed&&Date.now()-Date.parse(last.date)<60000){toast('這份心情已經好好收進手帳了。');return;}
    state.entries.unshift({id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${randomInt(1000000)}`,date:new Date().toISOString(),cardId:current.id,reversed:current.reversed,mood:current.mood,choice:p.choice,note,done:p.done,context:current.context});
    const ok = persist();updateCounters();
    if(ok) toast('收好了。謝謝你今天願意陪陪自己 ♥');
  }
  const dateLabel = date => new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(date));
  function journalPage() {
    main.innerHTML=`<div class="wrap">${storageNote()}<div class="journal-header"><div class="page-heading"><span class="eyebrow">SMALL STEPS, KEPT WITH LOVE</span><h1>那些，走過的小步。</h1><p>每一則心情，都是一張值得留下的風景。</p></div></div>${state.entries.length?`<p class="result-count">共 ${state.entries.length} 則心情・選一則，另存屬於你的暖陽分享卡。</p><div class="journal-list">${state.entries.map(e=>{const c=cards[e.cardId],p=window.JournalCards.palette(c);return `<article class="journal-entry journal-postcard" style="--post-ink:${p.ink};--post-wash:${p.wash};--post-accent:${p.accent}"><div class="postcard-top"><span>${p.name}</span><time datetime="${e.date}">${dateLabel(e.date)}</time></div><div class="postcard-hero"><img src="${c.thumb}" alt="${c.name}" loading="lazy" width="260" height="446"><div><span class="eyebrow">NO. ${String(c.id).padStart(2,'0')} ／ ${c.suit}</span><h2>${c.name} <span class="tag">${e.reversed?'逆位':'正位'}</span></h2><p class="postcard-affirm">${c.affirmation}</p><span class="postcard-mood">${escape(e.mood)}${e.done?'・小步完成 ✓':''}</span></div></div><div class="entry-body"><p class="postcard-note">${escape(e.note||'今天先用一個選擇，聽聽自己的心。')}</p>${e.choice!==null?`<p class="fine-print">我的方向：${escape(c.choices[e.choice])}</p>`:''}<p class="postcard-dedication">${window.JournalCards.tagline}</p><div class="entry-actions"><button class="primary" data-action="entry-image" data-entry="${escape(e.id)}">另存心情圖片 ↗</button><button class="text-btn" data-action="entry-open" data-entry="${escape(e.id)}">再讀陪伴</button><button class="text-btn" data-action="entry-delete" data-entry="${escape(e.id)}">刪除這則</button></div></div></article>`;}).join('')}</div>`:'<div class="journal-empty"><span class="empty-symbol">∿</span><h2>這裡，會慢慢長出你的故事。</h2><p>讀一張牌、選一個方向，或留下一句話。<br>每一則，都能設計成屬於你的暖陽分享卡。</p><a href="#draw" class="primary">從一張陪伴開始 ↗</a></div>'}</div>`;
  }
  function startQuiz() {quiz={ids:shuffled(cards.map(c=>c.id)).slice(0,5),index:0,correct:0,answered:false,options:[]};quizPage();}
  function quizPage() {
    if(!quiz){startQuiz();return;}
    if(quiz.index>=quiz.ids.length){main.innerHTML=`<div class="wrap"><div class="page-heading"><span class="eyebrow">EVERY TRY COUNTS</span><h1>把好奇心，留給自己。</h1></div><div class="quiz-panel quiz-complete"><span class="eyebrow">你剛剛認識了 5 張牌</span><div class="quiz-score">${quiz.correct}<small style="font-size:23px"> / 5</small></div><h2>願意學習的你，已經很棒。</h2><p>記住一點點就有收穫。牌意不是拿來評分人生，而是幫我們多看見一個角度。</p><div class="stage-actions"><button class="primary" data-action="quiz-restart">再玩一回 ✳</button><a class="text-btn" href="#collection">回到牌卡旅程 →</a></div></div></div>`;return;}
    const c=cards[quiz.ids[quiz.index]];
    if(!quiz.options.length) quiz.options=shuffled([c,...shuffled(cards.filter(x=>x.id!==c.id)).slice(0,3)]).map(x=>x.id);
    main.innerHTML=`<div class="wrap"><div class="page-heading"><span class="eyebrow">LEARN WITH A LITTLE PLAY</span><h1>猜猜看，這張牌的心意。</h1><p>一回五題，輕鬆認識正位主題。答錯也沒關係，洋流會陪你一起看懂。</p></div><section class="quiz-panel"><div class="quiz-top"><span class="eyebrow">0${quiz.index+1} / 05</span><a href="#collection" class="text-btn">先休息一下 →</a></div><div class="quiz-body"><img src="${c.image}" alt="${c.name}牌面" width="760" height="1303"><div><h2>${c.name}</h2><p>哪一組關鍵字，最接近這張牌的正位主題？</p><div class="quiz-options">${quiz.options.map(id=>`<button data-action="quiz-answer" data-id="${id}" ${quiz.answered?'disabled':''} class="${quiz.answered&&id===c.id?'correct':quiz.answered&&id===quiz.selected?'wrong':''}">${cards[id].keywords.join('・')}${quiz.answered&&id===c.id?' ✓':''}</button>`).join('')}</div>${quiz.answered?`<div class="quiz-feedback" role="status"><p><strong>${quiz.selected===c.id?'你抓到這張牌的重點了！':'這題一起學起來就好。'}</strong><br>${c.upright}</p><button class="primary" data-action="quiz-next">${quiz.index===4?'看看這次的收穫':'下一個相遇'} →</button></div>`:''}</div></div></section></div>`;
  }
  function renderRoute() {
    route=location.hash.slice(1).split('?')[0]||'home';
    if(!['home','draw','collection','journal','quiz'].includes(route)) route='home';
    if(dialog.open) dialog.close(); current=null;
    window.JournalCards.close();
    if(about.open) about.close();
    document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(route==='draw'?'home':route==='quiz'?'collection':route);a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    ({home,draw:drawPage,collection:collectionPage,journal:journalPage,quiz:quizPage})[route]();
    updateCounters();window.scrollTo({top:0,behavior:'instant'});
    const titles={home:'在乎你的暖陽',draw:'抽一張陪伴',collection:'78種暖流',journal:'我的心情手帳',quiz:'牌意小挑戰'};document.title=`洋流與你同在｜${titles[route]}`;
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.skip')){e.preventDefault();main.focus();main.scrollIntoView({block:'start'});return;}
    const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
    const a=button.dataset.action;
    if(a==='about')about.showModal();
    else if(a==='close-about')about.close();
    else if(a==='daily')startDraw(true);
    else if(a==='mood'){mood=button.dataset.mood;drawPage();}
    else if(a==='mode'){mode=Number(button.dataset.mode);drawPage();}
    else if(a==='draw')startDraw();
    else if(a==='reveal')reveal(Number(button.dataset.index));
    else if(a==='reveal-all'){draw?.cards.forEach(s=>s.revealed=true);renderStage();$('#deck-stage h2')?.setAttribute('tabindex','-1');$('#deck-stage h2')?.focus({preventScroll:true});}
    else if(a==='read-draw'){const i=Number(button.dataset.index),s=draw?.cards[i];if(s?.revealed)openCard(s.id,s.reversed,draw.daily?'今日的牌':draw.cards.length===3?['看見當下','找到支持','跨出小步'][i]:'簡單的提醒',draw.mood);}
    else if(a==='open-card')openCard(Number(button.dataset.id));
    else if(a==='close-card')closeCard();
    else if(a==='orientation'&&current){current.reversed=button.dataset.reversed==='true';renderCard();$(`[data-action="orientation"][data-reversed="${current.reversed}"]`)?.focus({preventScroll:true});}
    else if(a==='favorite'&&current){const id=current.id;state.favorites=isFav(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist();button.setAttribute('aria-pressed',String(isFav(id)));button.textContent=isFav(id)?'♥ 已收藏這份陪伴':'♡ 收藏這份陪伴';toast(isFav(id)?'這份陪伴，已放進你的收藏。':'已從收藏移除，隨時都能再回來。');}
    else if(a==='choice'&&current){const c=cards[current.id],p=progress(c.id);p.choice=Number(button.dataset.choice);persist();document.querySelectorAll('.exercise-choices .choice').forEach((b,i)=>{b.classList.toggle('selected',i===p.choice);b.setAttribute('aria-pressed',String(i===p.choice));});$('#choice-feedback').innerHTML=choiceFeedback(c,p.choice);}
    else if(a==='complete'&&current){const p=progress(current.id);p.done=!p.done;persist();button.classList.toggle('done',p.done);button.setAttribute('aria-pressed',String(p.done));button.textContent=p.done?'✓ 我已經為自己做了這一步':'我做到了，記下這一小步 ✓';toast(p.done?'這一小步，值得替自己拍拍手 ♥':'沒關係，你可以照自己的步調再回來。');}
    else if((a==='previous-card'||a==='next-card')&&current){openCard((current.id+(a==='next-card'?1:77))%78);}
    else if(a==='filter'){filter=button.dataset.filter;collectionPage();$(`[data-action="filter"][data-filter="${filter}"]`)?.focus({preventScroll:true});}
    else if(a==='filter-favorites'){favoritesOnly=!favoritesOnly;collectionPage();$('[data-action="filter-favorites"]')?.focus({preventScroll:true});}
    else if(a==='reset-filters'){filter='全部';query='';favoritesOnly=false;collectionPage();$('#card-search')?.focus({preventScroll:true});}
    else if(a==='entry-image'){const entry=state.entries.find(x=>x.id===button.dataset.entry);if(entry)window.JournalCards.open(entry,cards[entry.cardId]);}
    else if(a==='entry-open'){const entry=state.entries.find(x=>x.id===button.dataset.entry);if(entry)openCard(entry.cardId,entry.reversed,'回看一份陪伴',entry.mood);}
    else if(a==='entry-delete'){button.dataset.action='entry-delete-confirm';button.textContent='確定刪除這則？';button.setAttribute('aria-label','再次點選以刪除這則心情紀錄');}
    else if(a==='entry-delete-confirm'){state.entries=state.entries.filter(x=>x.id!==button.dataset.entry);persist();journalPage();updateCounters();toast('已刪除這則心情紀錄。');}
    else if(a==='quiz-answer'&&quiz&&!quiz.answered){const id=Number(button.dataset.id);if(!quiz.options.includes(id))return;quiz.answered=true;quiz.selected=id;if(id===quiz.ids[quiz.index])quiz.correct++;quizPage();$('[data-action="quiz-next"]')?.focus({preventScroll:true});}
    else if(a==='quiz-next'&&quiz?.answered){quiz.index++;quiz.answered=false;quiz.options=[];quizPage();}
    else if(a==='quiz-restart')startQuiz();
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='card-search'){query=e.target.value;renderCollection();}
    if(e.target.id==='reflection'&&current){progress(current.id).draft=e.target.value;persist();}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='allow-reversed')allowReversed=e.target.checked;
  });
  document.addEventListener('submit',e=>{if(e.target.id==='journal-form'){e.preventDefault();saveEntry();}});
  dialog.addEventListener('cancel',()=>{current=null;refreshBackground();});
  for(const d of [dialog,about]) d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d===dialog)closeCard();else about.close();}}});
  window.addEventListener('hashchange',renderRoute);
  renderRoute();
})();
