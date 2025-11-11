
/*! Hanzi Trace Module – Shim v1.1.3b
 *  Fixes:
 *   - Intercepts SAVE to write into sg1..sg5 (first empty → overwrite 1..5)
 *   - After UNDO, forces dots + numbers visible again
 *  Load AFTER your working v1.1.2 PROD script.
 */
(function(){
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // -------- Small boxes + MiZiGe helpers --------
  function getBoxes(){
    var ids = ['sg1','sg2','sg3','sg4','sg5'];
    return ids.map(function(id){ return document.getElementById(id); }).filter(Boolean);
  }
  function firstEmptyIdx(boxes){
    for (var i=0;i<boxes.length;i++){
      if ((boxes[i].getAttribute('data-filled')||'0') !== '1') return i;
    }
    return -1;
  }
  function nextOverwriteIdx(){
    try{
      var n = parseInt(localStorage.getItem('smallBoxNext')||'1',10);
      if (!isFinite(n) || n<1 || n>5) n = 1;
      return n-1;
    }catch(e){ return 0; }
  }
  function advanceOverwriteIdx(){
    try{
      var n = parseInt(localStorage.getItem('smallBoxNext')||'1',10);
      if (!isFinite(n) || n<1 || n>5) n = 1;
      n = (n % 5) + 1;
      localStorage.setItem('smallBoxNext', String(n));
    }catch(e){}
  }
  function drawMiZiGeOn(canvas){
    var W = canvas.width||120, H = canvas.height||120;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5,0.5,W-1,H-1);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,H); ctx.moveTo(W,0); ctx.lineTo(0,H);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.stroke();
    ctx.restore();
    return ctx;
  }

  function snapshotTraceToCanvas(svgEl){
    var NS = (window.NS) || "http://www.w3.org/2000/svg";
    var clone = svgEl.cloneNode(true);
    var style = document.createElementNS(NS,"style");
    style.textContent = ".grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}.dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}.dot{stroke:#333;stroke-width:1}.dotLabel{font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;font-weight:700;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;fill:#111;}";
    clone.insertBefore(style, clone.firstChild);
    var bg = document.createElementNS(NS,"rect");
    bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff");
    clone.insertBefore(bg, clone.firstChild);

    var vb = (svgEl.viewBox && svgEl.viewBox.baseVal) ? svgEl.viewBox.baseVal : null;
    var W = vb && vb.width ? vb.width : (svgEl.width && svgEl.width.baseVal ? svgEl.width.baseVal.value : 320);
    var H = vb && vb.height ? vb.height : (svgEl.height && svgEl.height.baseVal ? svgEl.height.baseVal.value : 320);

    var xml = new XMLSerializer().serializeToString(clone);
    var url = URL.createObjectURL(new Blob([xml], {type:"image/svg+xml;charset=utf-8"}));

    return new Promise(function(resolve){
      var img = new Image();
      img.onload = function(){
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0,0,W,H);
        g.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.src = url;
    });
  }

  // -------- Interceptors (robust selectors + capture) --------
  function findTraceSVG(){
    // Prefer an SVG inside #tracegrid; fall back to first tracer svg
    return document.querySelector('#tracegrid svg, svg[data-tracer-root], .tracer svg');
  }
  function saveToBoxes(){
    var boxes = getBoxes();
    if (!boxes.length) return false; // nothing to do
    var svg = findTraceSVG();
    if (!svg) return false;
    snapshotTraceToCanvas(svg).then(function(snap){
      var idx = firstEmptyIdx(boxes);
      if (idx < 0){ idx = nextOverwriteIdx(); advanceOverwriteIdx(); }
      var target = boxes[idx] || boxes[0];
      var ctx = drawMiZiGeOn(target);
      var pad = 6, W = target.width||120, H = target.height||120;
      var dw = W - pad*2, dh = H - pad*2;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(snap, pad, pad, dw, dh);
      target.setAttribute('data-filled','1');
    });
    return true;
  }

  function forceDotsVisible(){
    // Make all dots and labels visible; safest universal fix
    var dots = document.querySelectorAll('#tracegrid .dot, #tracegrid .dotLabel');
    for (var i=0;i<dots.length;i++){
      var el = dots[i];
      el.style.display = ''; 
      el.style.opacity = '1';
      el.style.visibility = 'visible';
    }
  }

  ready(function(){
    // Capture Save clicks anywhere in tracegrid (works even if base replaces the button)
    var tracegrid = document.getElementById('tracegrid') || document;
    tracegrid.addEventListener('click', function(e){
      var t = e.target;
      // match save button or icon near it
      var isSave = false;
      if (t.closest) {
        isSave = !!(t.closest('#saveTraceBtn,[data-btn=save],button.save,.save-btn,[title*="Save"],[aria-label*="Save"]'));
      } else {
        // fallback: check id/class on target
        isSave = (t.id === 'saveTraceBtn') || (/\bsave\b/.test(t.className||''));
      }
      if (isSave){
        // If small boxes exist, intercept and save there
        if (getBoxes().length){
          e.preventDefault(); e.stopPropagation();
          saveToBoxes();
        }
      }
    }, true); // capture

    // After UNDO completes, restore dots visibility
    tracegrid.addEventListener('click', function(e){
      var t = e.target;
      var isUndo = false;
      if (t.closest){
        isUndo = !!(t.closest('[data-btn=undo],button.undo,.undo-btn,[title*="Undo"],[aria-label*="Undo"]'));
      } else {
        isUndo = (/\bundo\b/.test(t.className||''));
      }
      if (isUndo){
        // let base handler run, then restore
        setTimeout(forceDotsVisible, 0);
      }
    }, true);

    // Also restore dots once at load (covers initial hidden state)
    setTimeout(forceDotsVisible, 50);
  });
})();
