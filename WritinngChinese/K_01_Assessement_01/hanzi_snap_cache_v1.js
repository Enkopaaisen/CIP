
/*! hanzi_snap_cache_v1.js
    Keeps five snapshot boxes per character in-memory across card switches.
    Requires:
      - window.DECK (array)
      - window._IDX (current index, numeric)
      - five canvases with ids: sg1..sg5 and data-filled="0|1"
      - MiZiGe baseline wanted for empty boxes
    Does NOT touch/require your shim. It just watches for _IDX changes. */
(function(){
  'use strict';

  const BOX_IDS = ['sg1','sg2','sg3','sg4','sg5'];
  const SNAP_CACHE = new Map(); // key -> { images:[dataURL|null x5], next:number }

  function keyForIndex(i){
    try {
      const d=(window.DECK||[])[i|0]||{};
      return d.hanzi || d.pinyin || String(i|0);
    } catch(e){ return String(i|0); }
  }

  function $(id){ return document.getElementById(id); }

  function drawSmallMiZiGe(c){
    if (!c) return;
    const g=c.getContext('2d');
    const W=c.width||120, H=c.height||120;
    g.fillStyle='#fff'; g.fillRect(0,0,W,H);
    // border
    g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=1;
    g.strokeRect(0.5,0.5,W-1,H-1);
    // center lines
    g.beginPath();
    g.moveTo(W/2,0); g.lineTo(W/2,H);
    g.moveTo(0,H/2); g.lineTo(W,H/2);
    g.strokeStyle='rgba(0,0,0,0.18)'; g.stroke();
    // diagonals
    g.beginPath();
    g.moveTo(0,0); g.lineTo(W,H);
    g.moveTo(W,0); g.lineTo(0,H);
    g.strokeStyle='rgba(0,0,0,0.12)'; g.stroke();
  }

  function captureBoxesAt(idx){
    const arr = BOX_IDS.map(id=>{
      const c=$(id); if(!c) return null;
      const filled = c.getAttribute('data-filled')==='1';
      return filled ? c.toDataURL('image/png') : null;
    });
    let next = 1;
    try {
      const v = parseInt(localStorage.getItem('smallBoxNext')||'1',10);
      if (Number.isFinite(v) && v>=1 && v<=5) next = v;
    } catch(e){}
    SNAP_CACHE.set(keyForIndex(idx), { images: arr, next });
  }

  function restoreBoxesFor(idx){
    const entry = SNAP_CACHE.get(keyForIndex(idx)) || null;
    BOX_IDS.forEach((id, pos)=>{
      const c=$(id); if(!c) return;
      const g=c.getContext('2d');
      drawSmallMiZiGe(c);
      const url = entry && entry.images ? entry.images[pos] : null;
      if (url){
        const img = new Image();
        img.onload = () => { g.drawImage(img,0,0,c.width||120,c.height||120); c.setAttribute('data-filled','1'); };
        img.src = url;
      } else {
        c.setAttribute('data-filled','0');
      }
    });
    const next = entry && Number.isFinite(entry.next) ? entry.next : 1;
    try { localStorage.setItem('smallBoxNext', String(next)); } catch(e){}
  }

  function initEmptyBoxes(){
    BOX_IDS.forEach(id=>{
      const c=$(id); if(!c) return;
      drawSmallMiZiGe(c);
      c.setAttribute('data-filled', c.getAttribute('data-filled')||'0');
    });
    try { localStorage.setItem('smallBoxNext','1'); } catch(e){}
  }

  function startWatcher(){
    let last = (window._IDX|0);
    // initial restore for first card
    restoreBoxesFor(last);

    setInterval(()=>{
      const cur = (window._IDX|0);
      if (cur !== last){
        // leaving old card → save
        captureBoxesAt(last);
        // entered new card → restore
        restoreBoxesFor(cur);
        last = cur;
      }
    }, 200);

    // Safety: save on unload
    window.addEventListener('beforeunload', ()=>{
      const cur = (window._IDX|0);
      captureBoxesAt(cur);
    });
  }

  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    } else {
      fn();
    }
  }

  ready(function(){
    initEmptyBoxes();
    startWatcher();
  });
})();
