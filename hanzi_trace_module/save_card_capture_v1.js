
/*! save_card_capture_v1.js
 * Robust "Save Card" that composites:
 *  - Main grid (SVG or canvas) with hanzi + MiZiGe + pinyin + english
 *  - Tracing area (SVG or canvas) exactly as shown
 *  - Five small boxes (sg1..sg5) if present
 * Excludes menus, buttons, and animated image.
 * Opens PNG in new tab and triggers download.
 */
(function(){
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  /** Convert an element (canvas or svg) to a canvas of given size */
  function elementToCanvas(el, fallbackW, fallbackH){
    if (!el) return null;
    if (el.tagName && el.tagName.toLowerCase()==='canvas'){
      var c = document.createElement('canvas');
      c.width = el.width || fallbackW || 320;
      c.height= el.height|| fallbackH || 320;
      var g = c.getContext('2d');
      g.drawImage(el,0,0,c.width,c.height);
      return c;
    }
    if (el.tagName && el.tagName.toLowerCase()==='svg'){
      var vb = el.viewBox && el.viewBox.baseVal ? el.viewBox.baseVal : null;
      var W = (vb && vb.width) || (el.width && el.width.baseVal && el.width.baseVal.value) || fallbackW || 320;
      var H = (vb && vb.height)|| (el.height&& el.height.baseVal&& el.height.baseVal.value)|| fallbackH || 320;
      var clone = el.cloneNode(true);
      var NS="http://www.w3.org/2000/svg";
      var bg = document.createElementNS(NS,'rect');
      bg.setAttribute('x','0'); bg.setAttribute('y','0');
      bg.setAttribute('width','100%'); bg.setAttribute('height','100%');
      bg.setAttribute('fill','#ffffff');
      clone.insertBefore(bg, clone.firstChild);
      var style = document.createElementNS(NS,'style');
      style.textContent = ".grid line,.grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}";
      clone.insertBefore(style, clone.firstChild);
      if (!clone.getAttribute('viewBox')){
        clone.setAttribute('viewBox', "0 0 "+W+" "+H);
      }
      var xml = new XMLSerializer().serializeToString(clone);
      var url = URL.createObjectURL(new Blob([xml], {type: 'image/svg+xml;charset=utf-8'}));
      var c = document.createElement('canvas'); c.width=W; c.height=H;
      var g = c.getContext('2d');
      return new Promise(function(resolve){
        var img = new Image();
        img.onload = function(){
          g.fillStyle='#ffffff'; g.fillRect(0,0,W,H);
          g.drawImage(img,0,0,W,H);
          URL.revokeObjectURL(url);
          resolve(c);
        };
        img.src = url;
      });
    }
    var inner = el.querySelector('canvas,svg');
    return elementToCanvas(inner, fallbackW, fallbackH);
  }

  function findMainGridEl(){
    return $('#charGridCanvas') ||
           $('#chargrid canvas') ||
           $('#chargrid svg') ||
           $('.chargrid canvas') ||
           $('.chargrid svg') ||
           $('#maingrid canvas') ||
           $('#maingrid svg');
  }
  function findTraceEl(){
    var root = $('#tracegrid') || document;
    return root.querySelector('canvas,svg');
  }
  function getSmallBoxes(){
    return $all('#bottomGrid canvas.smallTrace, .smallTrace');
  }

  async function saveCard(){
    const DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));

    var mainEl = findMainGridEl();
    var traceEl = findTraceEl();
    var smallBoxes = getSmallBoxes();
    var elPy = $('#charPinyin');
    var elEn = $('#charEnglish');

    if (!mainEl || !traceEl){
      alert('Main grid or trace area not found. Check IDs/classes: chargrid/charGridCanvas and tracegrid.');
      return;
    }

    var mainCv = await elementToCanvas(mainEl, 320, 320);
    var traceCv = await elementToCanvas(traceEl, 320, 320);

    if (mainCv instanceof Promise) mainCv = await mainCv;
    if (traceCv instanceof Promise) traceCv = await traceCv;

    var mgW = mainCv.width, mgH = mainCv.height;
    var trW = traceCv.width,  trH = traceCv.height;

    const pad = 24*DPR, gap = 16*DPR, rowGap = 20*DPR;
    const txtH = 64*DPR;
    const smallW = (smallBoxes[0]?.width || 120), smallH = (smallBoxes[0]?.height || 120);

    const topW = mgW + gap + trW;
    const bottomW = smallBoxes.length ? (smallBoxes.length*smallW + (smallBoxes.length-1)*gap) : 0;
    const width = Math.floor(pad*2 + Math.max(topW, bottomW));
    const height= Math.floor(pad*2 + Math.max(mgH, trH) + txtH + rowGap + (smallBoxes.length ? smallH : 0));

    var cvs = document.createElement('canvas');
    cvs.width = width; cvs.height = height;
    var ctx = cvs.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,width,height);

    const groupW = topW;
    let startX = Math.floor((width - groupW)/2);
    const topY = pad;
    ctx.drawImage(mainCv, startX, topY);
    ctx.drawImage(traceCv, startX + mgW + gap, topY);

    const textY = topY + Math.max(mgH, trH) + Math.floor(gap*0.5);
    const centerX = Math.floor(width/2);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const pyText = (elPy && elPy.textContent) ? elPy.textContent : '';
    ctx.font = (22*DPR) + 'px WenKai, KaiTi, "Kaiti SC", STKaiti, serif';
    ctx.fillText(pyText, centerX, textY);

    const enText = (elEn && elEn.textContent) ? elEn.textContent : '';
    ctx.font = (18*DPR) + 'px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';
    ctx.fillText(enText, centerX, textY + 28*DPR);

    if (smallBoxes.length){
      const boxesY = textY + 28*DPR + 24*DPR + rowGap;
      const rowW = smallBoxes.length*smallW + (smallBoxes.length-1)*gap;
      let x = Math.floor((width - rowW)/2);
      smallBoxes.forEach(function(cn){
        ctx.drawImage(cn, x, boxesY);
        x += smallW + gap;
      });
    }

    const now = new Date();
    const ts = now.getFullYear().toString().padStart(4,'0')
             + (now.getMonth()+1).toString().padStart(2,'0')
             + now.getDate().toString().padStart(2,'0') + '-'
             + now.getHours().toString().padStart(2,'0')
             + now.getMinutes().toString().padStart(2,'0')
             + now.getSeconds().toString().padStart(2,'0');
    ctx.fillStyle = '#222';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = (16*DPR)+'px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial';
    ctx.fillText(ts, width - 10*DPR, height - 8*DPR);

    let stem = 'card';
    try {
      const deck = window.DECK || [];
      const cur = deck[(window._IDX|0)] || {};
      stem = (cur.pinyin || cur.hanzi || 'card').toString().replace(/[^\w\-]+/g,'_').slice(0,60);
    } catch(e){}

    const filename = stem + '_' + ts + '.png';
    cvs.toBlob(function(blob){
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    }, 'image/png');
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('btnSave');
    if (btn) btn.addEventListener('click', function(ev){ ev.preventDefault(); saveCard(); });
  });

  window.__saveCardComposite = saveCard;
})();
