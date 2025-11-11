
/*! Hanzi Trace Module – Non‑invasive Patch v1.1.3-shim */
(function(){
  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function getBoxes(){
    const ids = ['sg1','sg2','sg3','sg4','sg5'];
    return ids.map(id => document.getElementById(id)).filter(Boolean);
  }
  function firstEmptyIdx(boxes){
    for (let i=0;i<boxes.length;i++){
      if ((boxes[i].getAttribute('data-filled')||'0') !== '1') return i;
    }
    return -1;
  }
  function nextOverwriteIdx(){
    try{
      let n = parseInt(localStorage.getItem('smallBoxNext')||'1',10);
      if (!Number.isFinite(n) || n<1 || n>5) n = 1;
      return n-1;
    }catch(e){ return 0; }
  }
  function advanceOverwriteIdx(){
    try{
      let n = parseInt(localStorage.getItem('smallBoxNext')||'1',10);
      if (!Number.isFinite(n) || n<1 || n>5) n = 1;
      n = (n % 5) + 1;
      localStorage.setItem('smallBoxNext', String(n));
    }catch(e){}
  }
  function drawMiZiGe(ctx, W, H){
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(0.5,0.5,W-1,H-1);
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,H); ctx.moveTo(W,0); ctx.lineTo(0,H);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.stroke();
    ctx.restore();
  }
  function snapshotSVGToCanvas(svgEl){
    var NS = (window.NS) || "http://www.w3.org/2000/svg";
    const clone = svgEl.cloneNode(true);
    const style = document.createElementNS(NS,"style");
    style.textContent = `.grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}.dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}.dot{stroke:#333;stroke-width:1}.dotLabel{font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;font-weight:700;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;fill:#111;}`;
    clone.insertBefore(style, clone.firstChild);
    const bg = document.createElementNS(NS,"rect");
    bg.setAttribute("x","0"); bg.setAttribute("y","0");
    bg.setAttribute("width","100%"); bg.setAttribute("height","100%");
    bg.setAttribute("fill","#ffffff");
    clone.insertBefore(bg, clone.firstChild);
    const vb = (svgEl.viewBox && svgEl.viewBox.baseVal) ? svgEl.viewBox.baseVal : null;
    const W = vb && vb.width ? vb.width : (svgEl.width && svgEl.width.baseVal ? svgEl.width.baseVal.value : 320);
    const H = vb && vb.height ? vb.height : (svgEl.height && svgEl.height.baseVal ? svgEl.height.baseVal.value : 320);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], {type:"image/svg+xml;charset=utf-8"}));
    return new Promise(function(resolve){
      const img = new Image();
      img.onload = function(){
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0,0,W,H);
        g.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.src = url;
    });
  }
  function bindSaveToBoxes(saveButton, svgRoot){
    if (!saveButton || !svgRoot) return;
    saveButton.addEventListener('click', function(e){
      const boxes = getBoxes();
      if (!boxes.length) return; // let original handler download
      e.preventDefault(); e.stopPropagation();
      snapshotSVGToCanvas(svgRoot).then(function(snap){
        let idx = firstEmptyIdx(boxes);
        if (idx < 0){ idx = nextOverwriteIdx(); advanceOverwriteIdx(); }
        const target = boxes[idx] || boxes[0];
        const ctx = target.getContext('2d');
        drawMiZiGe(ctx, target.width||120, target.height||120);
        const pad = 6, W = target.width||120, H = target.height||120;
        const dw = W - pad*2, dh = H - pad*2;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(snap, pad, pad, dw, dh);
        target.setAttribute('data-filled','1');
      });
    }, true);
  }
  function bindUndoKeepDots(undoButton){
    if (!undoButton) return;
    undoButton.addEventListener('click', function(){
      setTimeout(function(){
        if (typeof window.updateDotVisibility === 'function'){ window.updateDotVisibility(); }
      }, 0);
    });
  }
  ready(function(){
    var saveBtn = (window.saveBtn) || document.querySelector('#tracegrid button.save, #tracegrid #saveTraceBtn, #tracegrid [data-btn=save]');
    var undoBtn = (window.undoBtn) || document.querySelector('#tracegrid button.undo, #tracegrid [data-btn=undo]');
    var svgRoot = (window.svg) || document.querySelector('#tracegrid svg');
    bindSaveToBoxes(saveBtn, svgRoot);
    bindUndoKeepDots(undoBtn);
  });
})();
