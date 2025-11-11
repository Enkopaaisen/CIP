
/*! Hanzi Trace Module – Shim v1.1.3d
 *  - SAVE → small boxes (sg1..sg5), snapshot EXCLUDES dots/numbers
 *  - UNDO → only ACTIVE stroke shows dots/numbers (uses base updateDotVisibility if present)
 *  Load AFTER your working v1.1.2 PROD script.
 */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ----- small boxes helpers -----
  function getBoxes(){
    var ids=['sg1','sg2','sg3','sg4','sg5'];
    return ids.map(function(id){return document.getElementById(id)}).filter(Boolean);
  }
  function firstEmptyIdx(boxes){
    for (var i=0;i<boxes.length;i++){ if((boxes[i].getAttribute('data-filled')||'0')!=='1') return i; }
    return -1;
  }
  function nextOverwriteIdx(){
    try{ var n=parseInt(localStorage.getItem('smallBoxNext')||'1',10);
         if(!isFinite(n)||n<1||n>5) n=1; return n-1; }catch(e){ return 0; }
  }
  function advanceOverwriteIdx(){
    try{ var n=parseInt(localStorage.getItem('smallBoxNext')||'1',10);
         if(!isFinite(n)||n<1||n>5) n=1; n=(n%5)+1; localStorage.setItem('smallBoxNext', String(n)); }catch(e){}
  }
  function drawMiZiGeOn(canvas){
    var W=canvas.width||120, H=canvas.height||120, ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1; ctx.strokeRect(0.5,0.5,W-1,H-1);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2);
    ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,H); ctx.moveTo(W,0); ctx.lineTo(0,H);
    ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.stroke();
    ctx.restore();
    return ctx;
  }

  // Snapshot of tracer SVG WITHOUT dots/numbers
  function snapshotSVGToCanvas_NoDots(svgEl){
    var NS=(window.NS)||"http://www.w3.org/2000/svg";
    var clone=svgEl.cloneNode(true);
    // drop dots & labels & halos BEFORE serializing
    (clone.querySelectorAll('.dot,.dotLabel,.dotHalo')||[]).forEach(function(n){ if(n&&n.parentNode){ n.parentNode.removeChild(n); } });
    var style=document.createElementNS(NS,"style");
    style.textContent=".grid line,.grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}";
    clone.insertBefore(style, clone.firstChild);
    var bg=document.createElementNS(NS,"rect"); bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff");
    clone.insertBefore(bg, clone.firstChild);
    var vb=(svgEl.viewBox&&svgEl.viewBox.baseVal)?svgEl.viewBox.baseVal:null;
    var W=vb&&vb.width?vb.width:(svgEl.width&&svgEl.width.baseVal?svgEl.width.baseVal.value:320);
    var H=vb&&vb.height?vb.height:(svgEl.height&&svgEl.height.baseVal?svgEl.height.baseVal.value:320);
    var xml=new XMLSerializer().serializeToString(clone);
    var url=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml;charset=utf-8"}));
    return new Promise(function(resolve){
      var img=new Image();
      img.onload=function(){
        var c=document.createElement('canvas'); c.width=W; c.height=H;
        var g=c.getContext('2d'); g.fillStyle='#ffffff'; g.fillRect(0,0,W,H); g.drawImage(img,0,0);
        URL.revokeObjectURL(url); resolve(c);
      };
      img.src=url;
    });
  }

  function findTraceSVG(){ return document.querySelector('#tracegrid svg, .tracer svg, svg[data-tracer-root]'); }

  function saveToBoxes(){
    var boxes=getBoxes(); if(!boxes.length) return false;
    var svg=findTraceSVG(); if(!svg) return false;
    snapshotSVGToCanvas_NoDots(svg).then(function(snap){
      var idx=firstEmptyIdx(boxes); if(idx<0){ idx=nextOverwriteIdx(); advanceOverwriteIdx(); }
      var target=boxes[idx]||boxes[0]; var ctx=drawMiZiGeOn(target);
      var pad=6, W=target.width||120, H=target.height||120, dw=W-pad*2, dh=H-pad*2;
      ctx.imageSmoothingEnabled=true; ctx.drawImage(snap, pad, pad, dw, dh);
      target.setAttribute('data-filled','1');
    });
    return true;
  }

  // Dots/labels visibility: only show for ACTIVE stroke
  function showActiveDotsOnly(){
    // Prefer the base function if provided
    if (typeof window.updateDotVisibility === 'function'){
      try { window.updateDotVisibility(); return; } catch(e){ /* fallback below */ }
    }
    var root=document.getElementById('tracegrid')||document;
    var allDots=root.querySelectorAll('.dot,.dotLabel');
    for (var i=0;i<allDots.length;i++){
      var el=allDots[i]; el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden';
    }
    // Heuristic: show dots that are inside an "active" stroke group
    var actives=root.querySelectorAll('.active, .stroke-active, .stroke--active, [data-active="1"]');
    for (var j=0;j<actives.length;j++){
      var group=actives[j];
      var dots=group.querySelectorAll ? group.querySelectorAll('.dot,.dotLabel') : [];
      for (var k=0;k<dots.length;k++){
        var d=dots[k]; d.style.display=''; d.style.opacity='1'; d.style.visibility='visible';
      }
    }
  }

  ready(function(){
    var root=document.getElementById('tracegrid')||document;

    // Intercept SAVE (aria-label/title) and write to boxes; snapshot excludes dots/numbers
    root.addEventListener('click', function(e){
      var btn=e.target.closest && e.target.closest('[aria-label="Save image"], [title="Save image"]');
      if(!btn) return;
      if(getBoxes().length){
        e.preventDefault(); e.stopPropagation();
        saveToBoxes();
      }
    }, true);

    // After UNDO (aria-label/title): ensure only active stroke dots are visible
    root.addEventListener('click', function(e){
      var btn=e.target.closest && e.target.closest('[aria-label="Undo last trace"], [title="Undo last trace"]');
      if(!btn) return;
      setTimeout(showActiveDotsOnly, 0);
    }, true);

    // Also refresh once on load
    setTimeout(showActiveDotsOnly, 50);
  });
})();
