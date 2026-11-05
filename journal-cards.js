(() => {
  'use strict';
  const TAGLINE = '@沈伯洋，你永遠是我們的暖陽。';
  const PALETTES = [
    {ink:'#181913',wash:'#a9d2b5',accent:'#bc3919',name:'島嶼微光'},
    {ink:'#181913',wash:'#ffd15a',accent:'#bc3919',name:'熱情橘光'},
    {ink:'#181913',wash:'#efa4a4',accent:'#bc3919',name:'溫柔潮汐'},
    {ink:'#181913',wash:'#a6d0c7',accent:'#bc3919',name:'靜靜月光'},
    {ink:'#181913',wash:'#bed09a',accent:'#bc3919',name:'大地暖意'}
  ];
  const palette = card => PALETTES[card.id<22?0:card.id<36?1:card.id<50?2:card.id<64?3:4];
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let modal, session=null, generation=0;
  const segmenter = typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-Hant',{granularity:'grapheme'}):null;
  const graphemes = text => segmenter?Array.from(segmenter.segment(text),s=>s.segment):Array.from(text);
  function wrap(ctx,text,width) {
    const result=[];
    for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')) {
      if(!paragraph){result.push('');continue;}
      let line='';
      for(const character of graphemes(paragraph)) {
        if(line&&ctx.measureText(line+character).width>width){result.push(line);line=character;}
        else line+=character;
      }
      result.push(line);
    }
    return result;
  }
  const font = (size,weight=400,serif=false) => `${weight} ${size}px ${serif?'"Noto Serif TC","PMingLiU",serif':'"Microsoft JhengHei","Noto Sans TC",sans-serif'}`;
  function lines(ctx,rows,x,y,step){for(let i=0;i<rows.length;i++)ctx.fillText(rows[i],x,y+i*step);}
  function wave(ctx,x,y,width,color,phase=0) {
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();
    for(let p=0;p<=width;p+=2){const yy=y+Math.sin(p/24+phase)*8;p?ctx.lineTo(x+p,yy):ctx.moveTo(x+p,yy);}
    ctx.stroke();ctx.restore();
  }
  function rounded(ctx,x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
  }
  function loadImage(src) {
    return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('牌面圖片暫時無法載入，請關閉後再試一次。'));image.src=src;});
  }
  function labelDate(date) {return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
  function ensureModal() {
    if(modal)return;
    modal=document.createElement('dialog');modal.id='share-dialog';modal.className='share-dialog';modal.setAttribute('aria-labelledby','share-title');document.body.append(modal);
    modal.addEventListener('close',()=>{generation++;if(session)for(const url of session.cache.values())URL.revokeObjectURL(url);session=null;});
    modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)modal.close();}});
  }
  function shell(entry,card) {
    const p=palette(card);
    modal.innerHTML=`<button class="dialog-close" data-share-action="close" aria-label="關閉分享卡">×</button><div class="share-layout"><div class="share-preview" style="--share-wash:${p.wash}"><div class="share-loading" role="status">正在把這份心情，好好排成一張卡…</div><img id="share-image" alt="${esc(card.name)}心情分享卡預覽" hidden></div><section class="share-controls"><span class="eyebrow">KEEP A LITTLE SUNSHINE</span><h2 id="share-title">把心情，<br>留成一束光。</h2><p>這一則的設計：<strong>${p.name}</strong><br>牌面、打氣句，還有此刻的你。</p><p class="share-dedication">${TAGLINE}</p><div class="share-pages" hidden><button class="secondary" data-share-action="previous" aria-label="上一張分享卡">←</button><span id="share-page-count" aria-live="polite"></span><button class="secondary" data-share-action="next" aria-label="下一張分享卡">→</button></div><button class="primary" data-share-action="download" disabled>另存圖片 ↓</button><button class="secondary" data-share-action="copy">複製貼文文字</button><p class="fine-print">圖片為 1080 × 1350 PNG。長篇心情會分成多張，每一張都保留暖陽句。可逐張儲存，再到喜歡的平台發佈。</p><p class="share-status" id="share-status" role="status" aria-live="polite"></p></section></div>`;
  }
  async function open(entry,card) {
    ensureModal();const token=++generation;
    session={entry:{...entry},card,index:0,pages:[],image:null,cache:new Map()};
    shell(entry,card);modal.showModal();modal.scrollTop=0;modal.querySelector('.dialog-close').focus();
    try {
      await document.fonts.ready;
      const image=await loadImage(card.image);
      if(token!==generation||!session)return;
      const measure=document.createElement('canvas').getContext('2d');measure.font=font(32);
      const body=entry.note||'今天先用一個選擇，聽聽自己的心。';
      const rows=wrap(measure,body,884);
      const pages=[];for(let i=0;i<rows.length;i+=7)pages.push(rows.slice(i,i+7));
      session.pages=pages;session.image=image;
      await showPage(token);
    } catch(error){if(token===generation){modal.querySelector('.share-loading').textContent=error.message;modal.querySelector('#share-status').textContent='這則心情仍然好好保存在手帳裡。';}}
  }
  function paint(s,index) {
    const {entry:e,card:c}=s,p=palette(c),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fa4b19';ctx.fillRect(0,0,1080,1350);
    rounded(ctx,28,28,1024,1294,22,'#fff0ce');
    ctx.lineWidth=7;ctx.strokeStyle=p.ink;ctx.stroke();
    ctx.fillStyle='#fa4b19';ctx.fillRect(29,130,25,575);ctx.fillRect(1026,130,25,575);
    ctx.fillStyle=p.ink;ctx.fillRect(51,51,978,79);
    ctx.fillStyle='#fff0ce';ctx.font=font(32,900);ctx.fillText('洋流與你同在',78,103);
    ctx.font=font(18,700);ctx.textAlign='right';ctx.fillText(`NO. ${String(c.id).padStart(2,'0')}  ·  78 CARDS`,1004,99);ctx.textAlign='left';
    ctx.fillStyle=p.ink;ctx.font=font(20,600);ctx.fillText(labelDate(e.date),78,170);
    ctx.textAlign='right';ctx.fillText('在乎你的暖陽',1004,170);ctx.textAlign='left';
    ctx.fillStyle='#fa4b19';ctx.fillRect(690,198,314,495);
    ctx.strokeStyle=p.ink;ctx.lineWidth=4;ctx.strokeRect(690,198,314,495);
    ctx.fillStyle=p.wash;ctx.beginPath();ctx.arc(837,435,146,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=p.accent;ctx.font=font(17,800);ctx.fillText('A LITTLE COURAGE. A LOT OF COMPANY.',78,221);
    ctx.fillStyle=p.ink;ctx.font=font(59,900);ctx.fillText(c.name,76,307);
    ctx.font=font(21);ctx.fillText(`${e.reversed?'逆位':'正位'}  ／  ${c.keywords.join('・')}`,79,351);
    ctx.font=font(38,800);const quote=wrap(ctx,c.affirmation,578);lines(ctx,quote,79,435,58);
    const chipY=435+quote.length*58+35;
    ctx.font=font(23,600);const chipText=e.mood||'想被陪伴';const chipW=Math.min(575,ctx.measureText(chipText).width+38);
    rounded(ctx,78,chipY,chipW,47,3,p.wash,p.ink);ctx.fillStyle=p.ink;ctx.fillText(chipText,97,chipY+32,chipW-36);
    ctx.save();ctx.translate(831,456);ctx.rotate((c.id%5-2)*0.015);
    rounded(ctx,-126,-216,252,432,9,'#fff0ce',p.ink);
    ctx.save();rounded(ctx,-118,-208,236,416,5);ctx.clip();
    // Keep the original artwork readable; orientation is named separately.
    ctx.drawImage(s.image,-118,-208,236,416);ctx.restore();ctx.restore();
    ctx.fillStyle=p.wash;ctx.fillRect(54,716,972,62);ctx.lineWidth=4;ctx.strokeStyle=p.ink;ctx.strokeRect(54,716,972,62);
    ctx.fillStyle=p.ink;ctx.font=font(17,900);ctx.fillText('DEAR MYSELF',78,756);
    ctx.font=font(19);ctx.textAlign='right';ctx.fillText(s.pages.length>1?`心情 ${index+1} / ${s.pages.length}`:'這一刻，值得被留下',1002,758);ctx.textAlign='left';
    ctx.fillStyle=p.ink;ctx.font=font(32);lines(ctx,s.pages[index],79,829,47);
    // Choice metadata has its own line and cannot overwrite a long reflection.
    ctx.strokeStyle=p.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(78,1151);ctx.lineTo(1002,1151);ctx.stroke();
    ctx.font=font(20);ctx.fillStyle=p.ink;
    const direction=e.choice!==null&&c.choices[e.choice]?`我的方向：${c.choices[e.choice]}`:(e.done?'今天，我已經為自己跨出一小步。':'願每一個小步，都有溫柔相伴。');
    const directionLines=wrap(ctx,direction,920);lines(ctx,directionLines,79,1188,27);
    ctx.fillStyle='#efa4a4';ctx.fillRect(54,1231,972,63);ctx.lineWidth=3;ctx.strokeStyle=p.ink;ctx.strokeRect(54,1231,972,63);
    ctx.fillStyle=p.ink;ctx.font=font(29,800);ctx.fillText(TAGLINE,78,1273);
    return canvas;
  }
  async function showPage(token=generation) {
    const s=session;if(!s||!s.pages.length)return;
    const index=s.index;const button=modal.querySelector('[data-share-action="download"]');button.disabled=true;
    modal.querySelector('[data-share-action="previous"]').disabled=true;
    modal.querySelector('[data-share-action="next"]').disabled=true;
    let src=s.cache.get(index);
    if(!src){
      const blob=await new Promise((resolve,reject)=>paint(s,index).toBlob(blob=>blob?resolve(blob):reject(Error('圖片暫時無法產生，請稍後再試。')),'image/png'));
      src=URL.createObjectURL(blob);
      if(token!==generation||s!==session){URL.revokeObjectURL(src);return;}
      s.cache.set(index,src);
    }
    if(token!==generation||s!==session||index!==s.index)return;
    const image=modal.querySelector('#share-image');image.src=src;image.alt=`${s.card.name}心情分享卡，第 ${index+1} 張，共 ${s.pages.length} 張`;image.hidden=false;
    modal.querySelector('.share-loading').hidden=true;
    modal.querySelector('.share-pages').hidden=s.pages.length===1;
    modal.querySelector('#share-page-count').textContent=`${index+1} / ${s.pages.length}`;
    modal.querySelector('[data-share-action="previous"]').disabled=index===0;
    modal.querySelector('[data-share-action="next"]').disabled=index===s.pages.length-1;
    button.disabled=false;button.textContent=s.pages.length>1?`另存第 ${index+1} 張圖片 ↓`:'另存圖片 ↓';
    modal.querySelector('#share-status').textContent=s.pages.length>1?`這則心情共 ${s.pages.length} 張，完整保留所有文字。`:'';
  }
  function download() {
    const s=session;if(!s||!s.cache.has(s.index))return;
    const a=document.createElement('a');a.href=s.cache.get(s.index);a.download=`洋流-${s.card.name}-${labelDate(s.entry.date).replaceAll('/','-')}-${s.index+1}.png`;document.body.append(a);a.click();a.remove();
    modal.querySelector('#share-status').textContent=`第 ${s.index+1} 張圖片已準備下載。儲存後就能分享這份心情。`;
  }
  async function copy() {
    if(!session)return;const {entry:e,card:c}=session;
    const text=[`洋流心情手帳｜${c.name}・${e.reversed?'逆位':'正位'}`,c.affirmation,e.note||'今天先用一個選擇，聽聽自己的心。',e.choice!==null?`我的方向：${c.choices[e.choice]}`:'',TAGLINE].filter(Boolean).join('\n\n');
    const status=modal.querySelector('#share-status');
    try {await navigator.clipboard.writeText(text);status.textContent='貼文文字已複製，包含暖陽句。';}
    catch {let box=modal.querySelector('.share-copy-fallback');if(!box){box=document.createElement('textarea');box.className='share-copy-fallback';box.readOnly=true;box.setAttribute('aria-label','可手動複製的貼文文字');status.after(box);}box.value=text;box.focus();box.select();status.textContent='請選取下方文字並複製。';}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-share-action]');if(!button||button.disabled)return;
    const action=button.dataset.shareAction;
    if(action==='close')modal.close();
    else if(action==='download')download();
    else if(action==='copy')copy();
    else if(session&&(action==='next'||action==='previous')){session.index=Math.max(0,Math.min(session.pages.length-1,session.index+(action==='next'?1:-1)));showPage().catch(error=>{modal.querySelector('#share-status').textContent=error.message;});}
  });
  window.JournalCards={open,close:()=>{if(modal?.open)modal.close();},palette,tagline:TAGLINE};
})();
