
/*! Hanzi Trace Module – Shim v1.1.3e
 *  Fix: After UNDO, show dots/numbers for the truly ACTIVE stroke only.
 *  Strategy order:
 *   1) window.current (index) → [data-stroke-index="current"]
 *   2) .active / .stroke-active / [data-active="1"]
 *   3) group whose .trace is red (stroke="#f00" or style contains 'stroke:red'/'#ff0000')
 *   4) fallback: latest group that has any .trace children
 *  SAVE behavior unchanged (writes snapshot w/o dots into sg1..sg5).
 *  Load AFTER your working v1.1.2 script.
 */
(function(){
  function ready(fn){ if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---- small-box helpers (unchanged from 1.1.3d) ----
  function getBoxes(){ var ids=['sg1','sg2','sg3','sg4','sg5']; return ids.map(function(id){return document.getElementById(id)}).filter(Boolean); }
  function firstEmptyIdx(boxes){ for (var i=0;i<boxes.length;i++){ if((boxes[i].getAttribute('data-filled')||'0')!=='1') return i; } return -1; }
  function nextOverwriteIdx(){ try{ var n=parseInt(localStorage.getItem('smallBoxNext')||'1',10); if(!isFinite(n)||n<1||n>5) n=1; return n-1; }catch(e){ return 0; } }
  function advanceOverwriteIdx(){ try{ var n=parseInt(localStorage.getItem('smallBoxNext')||'1',10); if(!isFinite(n)||n<1||n>5) n=1; n=(n%5)+1; localStorage.setItem('smallBoxNext', String(n)); }catch(e){} }
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

  // Snapshot WITHOUT dots/numbers
  function snapshotSVGToCanvas_NoDots(svgEl){
    var NS=(window.NS)||"http://www.w3.org/2000/svg";
    var clone=svgEl.cloneNode(true);
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

  // ---- ACTIVE stroke detection ----
  function findActiveStrokeGroup(){
    var root=document.getElementById('tracegrid')||document;
    // 1) window.current index → [data-stroke-index="current"]
    if (typeof window.current === 'number'){
      var g = root.querySelector('[data-stroke-index="'+window.current+'"]');
      if (g) return g;
    }
    // 2) classes/attr
    var g2 = root.querySelector('.active, .stroke-active, .stroke--active, [data-active="1"]');
    if (g2) return g2;
    // 3) group with red .trace
    var groups = root.querySelectorAll('g, .stroke, .stroke-group');
    for (var i=0;i<groups.length;i++){
      var traces = groups[i].querySelectorAll('.trace, path, polyline, line');
      for (var j=0;j<traces.length;j++){
        var el = traces[j];
        var stroke = (el.getAttribute('stroke')||'').toLowerCase();
        var style  = (el.getAttribute('style')||'').toLowerCase();
        if (stroke === '#f00' || stroke === 'red' || style.indexOf('stroke:#f00')>=0 || style.indexOf('stroke:red')>=0 || style.indexOf('stroke:#ff0000')>=0){
          return groups[i];
        }
      }
    }
    // 4) fallback: last group with any .trace
    for (var k=groups.length-1;k>=0;k--){
      if (groups[k].querySelector('.trace')) return groups[k];
    }
    return null;
  }

  function showActiveDotsOnlySmart(){
    var root=document.getElementById('tracegrid')||document;
    // Hide all dots/labels
    var allDots=root.querySelectorAll('.dot,.dotLabel');
    for (var i=0;i<allDots.length;i++){ var el=allDots[i]; el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden'; }
    // Show only those under active group
    var g = findActiveStrokeGroup();
    if (g){
      var vis = g.querySelectorAll('.dot,.dotLabel');
      for (var j=0;j<vis.length;j++){ var d=vis[j]; d.style.display=''; d.style.opacity='1'; d.style.visibility='visible'; }
    }
  }

  ready(function(){
    var root=document.getElementById('tracegrid')||document;

    // Intercept SAVE
    root.addEventListener('click', function(e){
      var btn=e.target.closest && e.target.closest('[aria-label="Save image"], [title="Save image"]');
      if(!btn) return;
      if(getBoxes().length){
        e.preventDefault(); e.stopPropagation();
        saveToBoxes();
      }
    }, true);

    // After UNDO: re-show only active stroke dots/numbers
    root.addEventListener('click', function(e){
      var btn=e.target.closest && e.target.closest('[aria-label="Undo last trace"], [title="Undo last trace"]');
      if(!btn) return;
      setTimeout(showActiveDotsOnlySmart, 0);
    }, true);
  });
})();
