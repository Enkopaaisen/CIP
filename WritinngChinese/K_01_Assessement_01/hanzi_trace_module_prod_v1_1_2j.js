
/* Hanzi Trace Module v1.1.2e – Dot toggle persists after Undo */
(function(global){
  'use strict';
  const NS = "http://www.w3.org/2000/svg";
  const DOT_COLORS = ["#1976d2","#ff9800","#fdd835","#ab47bc","#2e7d32","#e91e63","#00acc1","#8d6e63","#7cb342","#5c6bc0"];
  const MAX_DOTS = 10;

  function el(tag, attrs){ const n=document.createElementNS(NS, tag); if(attrs){ for(const k in attrs) n.setAttribute(k, attrs[k]); } return n; }
  function downloadDataURL(filename, dataURL){ const a=document.createElement("a"); a.href=dataURL; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{document.body.removeChild(a);},0); }
  function yyyymmdd_hhmmss(){ const d=new Date(),pad=n=>String(n).padStart(2,"0"); return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"_"+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds()); }

  function drawGrid(g, size){
    const margin=10, inner=size-margin*2;
    const rect = el("rect", {x:margin, y:margin, width:inner, height:inner, class:"border"});
    const gGrid = el("g", {class:"grid"}); gGrid.appendChild(rect);
    const midX=margin+inner/2, midY=margin+inner/2;
    gGrid.appendChild(el("line", {x1:margin, y1:margin, x2:margin+inner, y2:margin+inner}));
    gGrid.appendChild(el("line", {x1:margin+inner, y1:margin, x2:margin, y2:margin+inner}));
    gGrid.appendChild(el("line", {x1:midX, y1:margin, x2:midX, y2:margin+inner}));
    gGrid.appendChild(el("line", {x1:margin, y1:midY, x2:margin+inner, y2:midY}));
    g.appendChild(gGrid);
    return {margin, inner, midX, midY};
  }

  function mount(container, options){
    const opts = Object.assign({
      char: '家',
      basePath: './media/hanzi/',
      size: 320,
      baseWidth: 12,
      strokeIdle: '#9e9e9e',
      strokeActive: '#e53935',
      strokeTrace: '#000',
      dotRadius: 6,
      dotTol: 2,
      strokeTol: 8,
      flipY: true,
      nextDelayMs: 400,
      showDots: "active",
      labelScale: 2.0
    }, options||{});

    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.display="inline-flex"; wrap.style.flexDirection="column"; wrap.style.alignItems="center"; wrap.style.gap="8px";
    container.appendChild(wrap);

    const svg = el("svg", {width:opts.size, height:opts.size, viewBox:`0 0 ${opts.size} ${opts.size}`});
    svg.style.background="#fff"; svg.style.border="1px solid #ccc"; svg.style.touchAction="none";
    // Wrap SVG in its own box so lights stay around the miZiGe grid
    const svgBox = document.createElement("div");
    svgBox.style.display = "inline-block";
    svgBox.style.position = "relative";
    wrap.appendChild(svgBox);
    svgBox.appendChild(svg);

    // Cartoon-style light bubbles all around the miZiGe grid
    const LIGHT_COLORS = ["#ff5252","#ffb300","#ffee58","#69f0ae","#40c4ff","#b388ff"];
    const lightBubbles = [];
    let glowTimer = null;

    function makeLightStrip(pos){
      const strip = document.createElement("div");
      strip.style.position = "absolute";
      strip.style.display = "flex";
      strip.style.gap = "6px";
      strip.style.justifyContent = "center";
      strip.style.alignItems = "center";

      let count;
      if(pos === "top" || pos === "bottom"){
        strip.style.left = "50%";
        strip.style.transform = "translateX(-50%)";
        strip.style[pos] = "4px";
        strip.style.flexDirection = "row";
        count = 6;
      } else {
        strip.style.top = "50%";
        strip.style.transform = "translateY(-50%)";
        strip.style[pos] = "4px";
        strip.style.flexDirection = "column";
        count = 4;
      }

      for(let i=0;i<count;i++){
        const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
        const b = document.createElement("div");
        b.style.width = "14px";
        b.style.height = "14px";
        b.style.borderRadius = "50%";
        b.style.border = "2px solid rgba(0,0,0,0.25)";
        // cartoon light bubble look via gradient + inner highlight
        b.style.backgroundImage = "radial-gradient(circle at 30% 30%, #ffffff, " + color + ")";
        b.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
        b.style.opacity = "0.35";
        b.style.transition = "transform 0.18s ease-out, box-shadow 0.18s ease-out, opacity 0.18s ease-out";
        b.dataset.color = color;
        strip.appendChild(b);
        lightBubbles.push(b);
      }
      svgBox.appendChild(strip);
    }

    // create strips on all four sides
    makeLightStrip("top");
    makeLightStrip("bottom");
    makeLightStrip("left");
    makeLightStrip("right");

    function stopGlow(){
      if(glowTimer){
        clearInterval(glowTimer);
        glowTimer = null;
      }
    }

    function startGlow(){
      if(glowTimer || lightBubbles.length===0) return;
      glowTimer = setInterval(()=>{
        const idx = Math.floor(Math.random() * lightBubbles.length);
        const el = lightBubbles[idx];
        const c = el.dataset.color || "#ffeb3b";
        // small pulse glow
        el.style.transform = "scale(1.25)";
        el.style.boxShadow = "0 0 14px " + c;
        setTimeout(()=>{
          el.style.transform = "scale(1.0)";
          el.style.boxShadow = "0 0 10px " + c;
        }, 200);
      }, 260);
    }

    function setLights(on){
      if(on){
        lightBubbles.forEach(el => {
          const c = el.dataset.color || "#ffeb3b";
          el.style.opacity = "1";
          el.style.boxShadow = "0 0 10px " + c;
        });
        startGlow();
      } else {
        stopGlow();
        lightBubbles.forEach(el => {
          el.style.opacity = "0.35";
          el.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
          el.style.transform = "scale(1.0)";
        });
      }
    }
    // lights start off on initial load
    setLights(false);

    const gGrid = svg.appendChild(el("g",{}));
    const gFill = svg.appendChild(el("g",{}));
    const gTrace = svg.appendChild(el("g",{}));
    const gDots  = svg.appendChild(el("g",{}));

    function iconBtn(svgPathD, titleText){
      const b = document.createElement("button"); b.type="button"; b.title=titleText; b.setAttribute("aria-label", titleText);
      b.style.border="1px solid #bbb"; b.style.borderRadius="10px"; b.style.padding="6px 10px"; b.style.background="#f2f2f2"; b.style.cursor="pointer";
      const s = document.createElementNS(NS,"svg"); s.setAttribute("width","20"); s.setAttribute("height","20"); s.setAttribute("viewBox","0 0 24 24");
      const p = document.createElementNS(NS,"path"); p.setAttribute("d", svgPathD); p.setAttribute("fill","#111");
      s.appendChild(p); b.appendChild(s);
      b.onmouseenter = ()=>{ b.style.background="#eee"; }; b.onmouseleave=()=>{ b.style.background="#f2f2f2"; };
      return b;
    }
    const btnRow = document.createElement("div"); btnRow.style.display="flex"; btnRow.style.gap="10px"; btnRow.style.alignItems="center";
    const btnShowDots = iconBtn("M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z", "Show dots for active stroke");
    const btnHideDots = iconBtn("M18.36 6.64L6.64 18.36 5.23 16.95 16.95 5.23 18.36 6.64z", "Hide all dots");
    const undoBtn  = iconBtn("M12 5v2a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3v2l-4-3 4-3z", "Undo last trace");
    const clearBtn = iconBtn("M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6v3l4-4-4-4v3z", "Refresh tracing");
    const saveBtn  = iconBtn("M5 5h8l4 4v10H5V5zm8 0v4h4", "Save image");
    btnRow.appendChild(btnShowDots);
    btnRow.appendChild(btnHideDots);
    btnRow.appendChild(undoBtn);
    btnRow.appendChild(clearBtn);
    btnRow.appendChild(saveBtn);
    wrap.appendChild(btnRow);

    const style = document.createElementNS(NS, "style");
    style.textContent = `
      .grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}
      .grid .border{stroke-width:1.5}
      .trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}
      .dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}
      .dot{stroke:#333;stroke-width:1}
      .dotLabel{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-weight:700; text-anchor:middle; dominant-baseline:middle;
                paint-order: stroke; stroke:#fff; stroke-width:2px; fill:#111;}
    `;
    svg.insertBefore(style, svg.firstChild);

    let basePaths=[], basePath2D=[], tracePaths=[], S=1, TX=0, TY=0;
    let current=0, pressing=false, strokeDone=false, invalidAbort=false;
    let curPath=null, curD="";
    let dots=[], hitSets=[];
    let dotEls=[];
    const off = document.createElement("canvas"); const ctx = off.getContext("2d");

    function computeBBox(paths){
      if(!paths || !paths.length) return {x:0,y:0,width:100,height:100};
      const tmp = el("g",{visibility:"hidden"}); svg.appendChild(tmp);
      const ps = paths.map(d=>{ const p=el("path",{d}); tmp.appendChild(p); return p; });
      let b=ps[0].getBBox();
      for(let i=1;i<ps.length;i++){
        const bi=ps[i].getBBox();
        const minX = Math.min(b.x, bi.x), minY = Math.min(b.y, bi.y);
        const maxX = Math.max(b.x+b.width, bi.x+bi.width), maxY = Math.max(b.y+b.height, bi.y+bi.height);
        b = {x:minX, y:minY, width:(maxX-minX), height:(maxY-minY)};
      }
      svg.removeChild(tmp); return b;
    }

    function layout(strokes){
      gGrid.innerHTML=""; gFill.innerHTML=""; gTrace.innerHTML=""; gDots.innerHTML="";
      dotEls=[]; basePaths=[]; basePath2D=[]; tracePaths=[];
      current=0; pressing=false; strokeDone=false; invalidAbort=false; curPath=null; curD="";
      const grid = drawGrid(gGrid, opts.size);
      const b = computeBBox(strokes);
      // reset lights when laying out a new character
      setLights(false);
      const safety = 0.90;
      const Sx = (grid.inner / Math.max(1,b.width)) * safety;
      const Sy = (grid.inner / Math.max(1,b.height)) * safety;
      S = Math.min(Sx, Sy);
      const c = {x:b.x+b.width/2, y:b.y+b.height/2};
      TX = grid.midX - S*c.x;
      TY = opts.flipY ? (grid.midY + S*c.y) : (grid.midY - S*c.y);

      off.width = opts.size; off.height = opts.size;
      strokes.forEach((d,i)=>{
        const tr = opts.flipY ? `translate(${TX},${TY}) scale(${S},${-S})` : `translate(${TX},${TY}) scale(${S})`;
        const g = el("g",{transform:tr});
        const p = el("path",{d,class:"stroke-base"});
        p.setAttribute("fill", i<=0 ? opts.strokeActive : opts.strokeIdle);
        g.appendChild(p); gFill.appendChild(g); basePaths.push(p);
        basePath2D.push(new Path2D(d)); tracePaths[i]=[];
      });
      renderDots(); recolor(); updateDotVisibility();
    }

    function recolor(){ basePaths.forEach((p,i)=> p.setAttribute("fill", i<=current?opts.strokeActive:opts.strokeIdle)); }

    function pointWithinStroke(si,x,y){
      if(!basePath2D[si]) return true;
      const ctx2 = ctx;
      ctx2.setTransform(1,0,0,1,0,0);
      ctx2.clearRect(0,0,off.width,off.height);
      ctx2.save();
      ctx2.translate(TX,TY);
      ctx2.scale(S,(opts.flipY?-S:S));
      const path=basePath2D[si];
      const inside=ctx2.isPointInPath(path, x, y);
      let near=false;
      if(!inside && opts.strokeTol>0){ ctx2.lineWidth=opts.strokeTol*2; near=ctx2.isPointInStroke(path, x, y); }
      ctx2.restore();
      return inside||near;
    }
    function isTraced(si){ const arr=dots[si]||[]; return (hitSets[si] && hitSets[si].size>=arr.length && arr.length>=2); }

    function recomputeHits(si){
      const arr=dots[si]||[]; hitSets[si]=new Set();
      const paths=tracePaths[si]||[]; const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(const elp of paths){
        const d=elp.getAttribute("d")||"";
        const tokens=d.trim().split(/[ML]\s*/i).filter(Boolean);
        for(const tk of tokens){
          const nums=tk.trim().split(/[ ,]+/).map(parseFloat);
          for(let i=0;i+1<nums.length;i+=2){
            const x=nums[i], y=nums[i+1];
            for(let j=0;j<arr.length;j++){ if(hitSets[si].has(j)) continue;
              const dd=arr[j]; const dx=x-dd.cx, dy=y-dd.cy; if(dx*dx+dy*dy<=R2) hitSets[si].add(j);
            }
          }
        }
      }
    }

    function renderDots(){
      gDots.innerHTML="";
      dotEls = dots.map((arr, si)=>{
        return (arr||[]).map((d, di)=>{
          const halo = el("circle", {cx:d.cx, cy:d.cy, r:(opts.dotTol+opts.dotRadius), class:"dotHalo"});
          const c    = el("circle", {cx:d.cx, cy:d.cy, r:opts.dotRadius, class:"dot"});
          c.setAttribute("fill", DOT_COLORS[di%DOT_COLORS.length] || "#1976d2");
          const label = document.createElementNS(NS, "text");
          label.setAttribute("x", d.cx); label.setAttribute("y", d.cy);
          label.setAttribute("class", "dotLabel");
          label.setAttribute("font-size", String(Math.max(8, opts.dotRadius*opts.labelScale)));
          label.textContent = String(di+1);
          gDots.appendChild(halo); gDots.appendChild(c); gDots.appendChild(label);
          return {halo, circ:c, label};
        });
      });
    }

    // Visibility helpers
    function hideAllDots(){
      gDots.style.display="block";
      dotEls.forEach(arr => (arr||[]).forEach(el => {
        el.halo.style.display='none';
        el.circ.style.display='none';
        el.label.style.display='none';
      }));
    }
    function showDotsForActiveAlways(){
      const si = current;
      gDots.style.display="block";
      dotEls.forEach((arr, idx) => (arr||[]).forEach(el => {
        const on = (idx === si);
        el.halo.style.display='none';
        el.circ.style.display = on ? 'block' : 'none';
        el.label.style.display = on ? 'block' : 'none';
      }));
    }
    function updateDotVisibility(){
      if(opts.showDots === "off"){ hideAllDots(); return; }
      showDotsForActiveAlways();
    }

    function svgPoint(svg, evt){ const pt=svg.createSVGPoint(); const t=(evt.touches&&evt.touches[0])||(evt.changedTouches&&evt.changedTouches[0]); pt.x=t?t.clientX:evt.clientX; pt.y=t?t.clientY:evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }

    svg.addEventListener("pointerdown", e=>{
      pressing=true; strokeDone=false; invalidAbort=false;
      const p = svgPoint(svg, e);
      if(!pointWithinStroke(current,p.x,p.y)){ invalidAbort=true; }
      curD=`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const path=el("path",{class:"trace"});
      path.setAttribute("d",curD);
      path.setAttribute("stroke", opts.strokeTrace);
      path.setAttribute("stroke-width", Math.max(2, 0.8*opts.baseWidth));
      curPath=path; gTrace.appendChild(curPath);
      tracePaths[current].push(curPath);
      e.preventDefault();
    });
    svg.addEventListener("pointermove", e=>{
      if(!pressing) return;
      const p = svgPoint(svg, e);
      if(!pointWithinStroke(current,p.x,p.y)){ invalidAbort=true; }
      curD += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      curPath.setAttribute("d",curD);
      const si=current, arr=dots[si]||[]; const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(let i=0;i<arr.length;i++){ if(hitSets[si].has(i)) continue; const d=arr[i]; const dx=p.x-d.cx, dy=p.y-d.cy; if(dx*dx+dy*dy<=R2){ hitSets[si].add(i); } }
      if(isTraced(si)) strokeDone=true;
      e.preventDefault();
    });
    function endPress(){
      if(!pressing) return; pressing=false; curPath=null; curD="";
      if(invalidAbort){
        const arr=tracePaths[current]; if(arr && arr.length){ const last=arr.pop(); if(last && last.parentNode) last.parentNode.removeChild(last); }
        hitSets[current].clear(); invalidAbort=false; updateDotVisibility(); return;
      }
      if(strokeDone){ strokeDone=false;
      try{ const wasLast=(current===basePaths.length-1);
        if(wasLast){
          // fire global event as before
          const ev=new CustomEvent('hanzi:last-stroke-complete',{detail:{char:opts.char||''}});
          window.dispatchEvent(ev);
          // light up the color bubbles when the final stroke is confirmed
          setLights(true);
        }
      }catch(e){} setTimeout(()=>{ current=Math.min(current+1, basePaths.length-1); recolor(); updateDotVisibility(); }, opts.nextDelayMs|0); }
      else { updateDotVisibility(); }
    }
    svg.addEventListener("pointerup", endPress); svg.addEventListener("pointerleave", endPress);

    // Button handlers (now call updateDotVisibility())
    btnShowDots.onclick = ()=>{ opts.showDots = "active"; updateDotVisibility(); };
    btnHideDots.onclick = ()=>{ opts.showDots = "off"; updateDotVisibility(); };

    // Undo/Clear/Save
    function hasSeg(si){ return tracePaths && tracePaths[si] && tracePaths[si].length>0; }
    function clearAll(si){
      if (tracePaths && tracePaths[si]){
        while(tracePaths[si].length){
          const el=tracePaths[si].pop();
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      }
      if (hitSets && hitSets[si]) hitSets[si].clear();
      if (typeof recomputeHits === 'function') recomputeHits(si);
    }
    undoBtn.onclick = ()=>{
  // Always turn all lights off on any undo
  setLights(false);

  const total = tracePaths ? tracePaths.length : 0;
  const hasSeg = (si)=> tracePaths && tracePaths[si] && tracePaths[si].length>0;

  // Nothing done at all: first stroke and empty
  if (current === 0 && !hasSeg(0)) { updateDotVisibility(); return; }

  // Case 1: Current stroke has segments -> remove the most recent segment only
  if (hasSeg(current)){
    const el = tracePaths[current].pop();
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (typeof recomputeHits === 'function') recomputeHits(current);
    updateDotVisibility();
    return;
  }

  // Case 2: Current stroke has no segments.
  // Step back to previous stroke if possible and clear ALL its segments,
  // even when current is the last stroke (i.e., current === total-1).
  if (current > 0){
    current -= 1;
    if (typeof clearAll === 'function') clearAll(current);
    recolor();
    updateDotVisibility();
    return;
  }

  updateDotVisibility();
};
    clearBtn.onclick = ()=>{
      gTrace.innerHTML=""; tracePaths = tracePaths.map(()=>[]); hitSets = dots.map(()=> new Set());
      current=0; recolor(); updateDotVisibility();
      // turning lights off when refresh is hit
      setLights(false);
    };
    saveBtn.onclick = ()=>{
      const clone = svg.cloneNode(true);
      const embed = document.createElementNS(NS,"style"); embed.textContent = `.grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}.dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}.dot{stroke:#333;stroke-width:1}.dotLabel{font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;font-weight:700;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;fill:#111;}`;
      clone.insertBefore(embed, clone.firstChild);
      const bg = document.createElementNS(NS,"rect"); bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff"); clone.insertBefore(bg, clone.firstChild);
      const vb=svg.viewBox.baseVal, W=vb&&vb.width?vb.width:(svg.width.baseVal.value||320), H=vb&&vb.height?vb.height:(svg.height.baseVal.value||320);
      const raw = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([raw], {type:"image/svg+xml;charset=utf-8"}));
      const img = new Image();
      img.onload = function(){ const c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d"); g.fillStyle="#ffffff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0); URL.revokeObjectURL(url); downloadDataURL((opts.char||"char")+"_trace_"+yyyymmdd_hhmmss()+".png", c.toDataURL("image/png")); };
      img.src = url;
    };

    // Data
    function applySettings(s){ if(!s) return; if(s.size!=null){ opts.size=s.size; svg.setAttribute("width",opts.size); svg.setAttribute("height",opts.size); svg.setAttribute("viewBox",`0 0 ${opts.size} ${opts.size}`);} if(s.dotTol!=null){ opts.dotTol=s.dotTol; } if(s.strokeTol!=null){ opts.strokeTol=s.strokeTol; } if(s.nextDelaySec!=null){ opts.nextDelayMs=Math.max(0, Math.round(s.nextDelaySec*1000)); } }
    function setDots(d){ dots=(d&&Array.isArray(d.dots))? d.dots.map(a=> (a||[]).slice(0,MAX_DOTS)) : []; hitSets=dots.map(()=> new Set()); renderDots(); updateDotVisibility(); }

    const enc = s=>encodeURIComponent(s);
    async function loadJSON(url){ const r=await fetch(url, {cache:"no-store"}); if(!r.ok) throw new Error(String(r.status)); return r.json(); }
    async function initFromFetch(){
      const base = opts.basePath || "./media/hanzi/"; const ch = opts.char;
      try{ const s=await loadJSON(base+enc(ch)+"_settings.json"); applySettings(s); }catch(_){}
      const strokes = await loadJSON(base+enc(ch)+"_strokes.json");
      const dotsJson = await loadJSON(base+enc(ch)+"_dots.json");
      layout(strokes.strokes||[]); setDots(dotsJson||null); recolor();
    }
    function initFromPreloaded(pre){
      if(pre && pre.settings) applySettings(pre.settings);
      layout(pre && pre.strokes && Array.isArray(pre.strokes.strokes) ? pre.strokes.strokes : []);
      setDots(pre && pre.dots ? pre.dots : null);
      recolor();
    }

    if (opts.preloaded){ initFromPreloaded(opts.preloaded); }
    else { initFromFetch().catch(err=>{ console.warn("HanziTraceModule: failed to load data for", opts.char, err); layout([]); setDots(null); recolor(); }); }

    return { };
  }

  global.HanziTraceModule = { mount };
})(window);
