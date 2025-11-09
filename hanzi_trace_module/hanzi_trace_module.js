/*! Hanzi Trace Module (minimal) — requires only a container element and a data folder.
 *  Features: trace with tolerance (finish-timed invalidation), dot-driven completion,
 *            Undo, Clear All, Save PNG (white background). No editor UI.
 *  Usage:
 *    <script src="hanzi_trace_module.js"></script>
 *    <div id="card-trace"></div>
 *    <script>
 *      HanziTraceModule.mount(document.getElementById('card-trace'), {
 *        char: '家',
 *        basePath: './media/hanzi/' // folder containing <char>_strokes.json, <char>_dots.json, <char>_settings.json
 *      });
 *    </script>
 */
(function(global){
  'use strict';
  const NS = "http://www.w3.org/2000/svg";
  const DOT_COLORS = ["#1976d2","#ff9800","#fdd835","#ab47bc","#2e7d32","#e91e63","#00acc1","#8d6e63","#7cb342","#5c6bc0"];
  const MAX_DOTS = 10;

  function el(tag, attrs){ const n=document.createElementNS(NS, tag); if(attrs){ for(const k in attrs) n.setAttribute(k, attrs[k]); } return n; }
  function downloadDataURL(filename, dataURL){
    const a = document.createElement("a");
    a.href = dataURL; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); }, 0);
  }
  function yyyymmdd_hhmmss(){
    const d=new Date(), pad=n=>String(n).padStart(2,"0");
    return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"_"+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
  }

  function drawGrid(g, size){
    const margin=10, inner=size-margin*2;
    const rect = el("rect", {x:margin, y:margin, width:inner, height:inner});
    rect.setAttribute("class","border");
    const gGrid = el("g", {class:"grid"});
    gGrid.appendChild(rect);
    const midX=margin+inner/2, midY=margin+inner/2;
    const diag1 = el("line", {x1:margin, y1:margin, x2:margin+inner, y2:margin+inner});
    const diag2 = el("line", {x1:margin+inner, y1:margin, x2:margin, y2:margin+inner});
    const v = el("line", {x1:midX, y1:margin, x2:midX, y2:margin+inner});
    const h = el("line", {x1:margin, y1:midY, x2:margin+inner, y2:midY});
    gGrid.appendChild(diag1); gGrid.appendChild(diag2); gGrid.appendChild(v); gGrid.appendChild(h);
    g.appendChild(gGrid);
    return {margin, inner, midX, midY};
  }

  function mount(container, options){
    const opts = Object.assign({
      char: '家',
      basePath: './media/hanzi/',
      size: 320,
      padding: 0.88,
      baseWidth: 12,
      strokeIdle: '#9e9e9e',
      strokeActive: '#e53935',
      strokeTrace: '#000',
      dotRadius: 6,
      dotTol: 2,
      strokeTol: 8,
      flipY: true,
      nextDelayMs: 400,
      icons: true
    }, options||{});

    // Build UI
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.display="inline-flex"; wrap.style.flexDirection="column"; wrap.style.alignItems="center"; wrap.style.gap="8px";
    container.appendChild(wrap);

    const svg = el("svg", {width:opts.size, height:opts.size, viewBox:`0 0 ${opts.size} ${opts.size}`});
    svg.style.background="#fff"; svg.style.border="1px solid #ccc"; svg.style.touchAction="none";
    wrap.appendChild(svg);

    const gGrid = svg.appendChild(el("g",{}));
    const gFill = svg.appendChild(el("g",{}));
    const gTrace = svg.appendChild(el("g",{}));

    // Icon button row (Undo, Clear, Save)
    const btnRow = document.createElement("div");
    btnRow.style.display="flex"; btnRow.style.gap="10px"; btnRow.style.alignItems="center";
    function iconBtn(svgPathD, titleText){
      const b = document.createElement("button");
      b.type="button"; b.title = titleText; b.setAttribute("aria-label", titleText);
      b.style.border="1px solid #bbb"; b.style.borderRadius="10px"; b.style.padding="6px 10px"; b.style.background="#f2f2f2"; b.style.cursor="pointer";
      const s = document.createElementNS(NS,"svg"); s.setAttribute("width","20"); s.setAttribute("height","20"); s.setAttribute("viewBox","0 0 24 24");
      const p = document.createElementNS(NS,"path"); p.setAttribute("d", svgPathD); p.setAttribute("fill","#111");
      s.appendChild(p); b.appendChild(s);
      b.onmouseenter = ()=>{ b.style.background="#eee"; }; b.onmouseleave = ()=>{ b.style.background="#f2f2f2"; };
      return b;
    }
    const undoBtn  = iconBtn("M12 5v2a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3v2l-4-3 4-3z", "Undo last trace");
    const clearBtn = iconBtn("M6 7h12l-1 12H7L6 7zm3-3h6l1 2H8l1-2z", "Clear all");
    const saveBtn  = iconBtn("M5 5h8l4 4v10H5V5zm8 0v4h4", "Save image");
    btnRow.appendChild(undoBtn); btnRow.appendChild(clearBtn); btnRow.appendChild(saveBtn);
    wrap.appendChild(btnRow);

    // Styles inside <svg> when exporting
    const style = document.createElementNS(NS, "style");
    style.textContent = `
      .grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}
      .grid .border{stroke-width:1.5}
      .trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}
    `;
    svg.insertBefore(style, svg.firstChild);

    let basePaths=[], basePath2D=[], tracePaths=[], S=1, TX=0, TY=0;
    let current=0, pressing=false, strokeDone=false, invalidAbort=false;
    let curPath=null, curD="";
    let dots=[], hitSets=[];

    // Offscreen canvas for tolerance checks
    const off = document.createElement("canvas");
    const ctx = off.getContext("2d");

    function layout(strokes){
      gFill.innerHTML=""; gTrace.innerHTML=""; basePaths=[]; basePath2D=[]; tracePaths=[];
      current=0; pressing=false; strokeDone=false; invalidAbort=false; curPath=null; curD="";
      const grid = drawGrid(gGrid, opts.size);
      const b = computeBBox(strokes);
      const innerBox = grid.inner*opts.padding;
      S = Math.min(innerBox/Math.max(1,b.width), innerBox/Math.max(1,b.height));
      const c = {x:b.x+b.width/2, y:b.y+b.height/2};
      TX = grid.midX - S*c.x;
      TY = opts.flipY ? (grid.midY + S*c.y) : (grid.midY - S*c.y);

      off.width = opts.size; off.height = opts.size;

      strokes.forEach((d,i)=>{
        const tr = opts.flipY ? `translate(${TX},${TY}) scale(${S},${-S})` : `translate(${TX},${TY}) scale(${S})`;
        const g = el("g",{transform:tr});
        const p = el("path",{d,class:"stroke-base"});
        p.setAttribute("fill", i===0 ? opts.strokeActive : opts.strokeIdle);
        g.appendChild(p); gFill.appendChild(g); basePaths.push(p);
        basePath2D.push(new Path2D(d));
        tracePaths[i]=[];
      });
    }

    function computeBBox(paths){
      if(!paths || !paths.length) return {x:0,y:0,width:100,height:100};
      // temporarily add to measure
      const tmp = el("g",{visibility:"hidden"});
      svg.appendChild(tmp);
      const ps = paths.map(d=>{ const p=el("path",{d}); tmp.appendChild(p); return p; });
      let b=ps[0].getBBox();
      for(let i=1;i<ps.length;i++){
        const bi=ps[i].getBBox();
        const x=Math.min(b.x,bi.x), y=Math.min(b.y,bi.y), r=Math.max(b.x+b.width,bi.x+bi.width), t=Math.max(b.y+b.height,bi.y+bi.height);
        b={x,y,width:r-x,height:t-y};
      }
      svg.removeChild(tmp);
      return b;
    }

    function recolor(){ basePaths.forEach((p,i)=> p.setAttribute("fill", i<=current?opts.strokeActive:opts.strokeIdle)); }

    function pointWithinStroke(si,x,y){
      if(!basePath2D[si]) return true;
      ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,off.width,off.height);
      ctx.save(); ctx.translate(TX,TY); ctx.scale(S,(opts.flipY?-S:S));
      const path=basePath2D[si];
      const insideFill = ctx.isPointInPath(path, x, y);
      let nearCenter=false;
      if(!insideFill && opts.strokeTol>0){ ctx.lineWidth=opts.strokeTol*2; nearCenter=ctx.isPointInStroke(path, x, y); }
      ctx.restore();
      return insideFill || nearCenter;
    }

    function isTraced(si){ const arr=dots[si]||[]; return (hitSets[si] && hitSets[si].size>=arr.length && arr.length>=2); }

    function recomputeHits(si){
      const arr=dots[si]||[]; hitSets[si]=new Set();
      const paths=tracePaths[si]||[];
      const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(const elp of paths){
        const d=elp.getAttribute("d")||"";
        const tokens=d.trim().split(/[ML]\s*/i).filter(Boolean);
        for(const tk of tokens){
          const nums=tk.trim().split(/[ ,]+/).map(parseFloat);
          for(let i=0;i+1<nums.length;i+=2){
            const x=nums[i], y=nums[i+1];
            for(let j=0;j<arr.length;j++){
              if(hitSets[si].has(j)) continue;
              const dd=arr[j]; const dx=x-dd.cx, dy=y-dd.cy;
              if(dx*dx+dy*dy<=R2) hitSets[si].add(j);
            }
          }
        }
      }
    }

    // Interaction: draw even when starting outside tolerance; invalidate on release
    svg.addEventListener("pointerdown", e=>{
      pressing=true; strokeDone=false; invalidAbort=false;
      const p = svgPoint(svg, e);
      if(!pointWithinStroke(current,p.x,p.y)){ invalidAbort=true; }
      curD = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const path = el("path",{class:"trace"});
      path.setAttribute("d",curD);
      path.setAttribute("stroke", opts.strokeTrace);
      path.setAttribute("stroke-width", Math.max(2, opts.baseWidth*0.8));
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
      // dot hits
      const si=current, arr=dots[si]||[]; const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(let i=0;i<arr.length;i++){
        if(hitSets[si].has(i)) continue;
        const d=arr[i]; const dx=p.x-d.cx, dy=p.y-d.cy;
        if(dx*dx+dy*dy<=R2){ hitSets[si].add(i); }
      }
      if(isTraced(si)) strokeDone=true;
      e.preventDefault();
    });
    function endPress(){
      if(!pressing) return;
      pressing=false; curPath=null; curD="";
      if(invalidAbort){
        const arr = tracePaths[current];
        if(arr && arr.length){ const last = arr.pop(); if(last && last.parentNode) last.parentNode.removeChild(last); }
        hitSets[current].clear();
        invalidAbort=false;
        return;
      }
      if(strokeDone){
        strokeDone=false;
        setTimeout(()=>{
          current = Math.min(current+1, basePaths.length-1);
          recolor();
        }, opts.nextDelayMs|0);
      }
    }
    svg.addEventListener("pointerup", endPress);
    svg.addEventListener("pointerleave", endPress);

    function svgPoint(svg, evt){
      const pt = svg.createSVGPoint();
      const t=(evt.touches&&evt.touches[0])||(evt.changedTouches&&evt.changedTouches[0]);
      pt.x = t?t.clientX:evt.clientX; pt.y = t?t.clientY:evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    // Public controls
    undoBtn.onclick = ()=>{
      if(tracePaths[current] && tracePaths[current].length){
        const el=tracePaths[current].pop(); if(el&&el.parentNode) el.parentNode.removeChild(el);
        recomputeHits(current);
        return;
      }
      if(current>0){
        current-=1; recolor();
        if(tracePaths[current] && tracePaths[current].length){
          const el=tracePaths[current].pop(); if(el&&el.parentNode) el.parentNode.removeChild(el);
          recomputeHits(current);
        }
      }
    };
    clearBtn.onclick = ()=>{
      gTrace.innerHTML="";
      tracePaths = tracePaths.map(()=>[]);
      hitSets = dots.map(()=> new Set());
      current = 0; recolor();
    };
    saveBtn.onclick = ()=>{
      // clone SVG, embed styles and white bg, rasterize
      const clone = svg.cloneNode(true);
      const embed = document.createElementNS(NS,"style");
      embed.textContent = `.grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}`;
      clone.insertBefore(embed, clone.firstChild);
      const bg = document.createElementNS(NS,"rect");
      bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff");
      clone.insertBefore(bg, clone.firstChild);
      const vb = svg.viewBox.baseVal; const W = vb && vb.width ? vb.width : (svg.width.baseVal.value||320); const H = vb && vb.height ? vb.height : (svg.height.baseVal.value||320);
      const raw = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([raw], {type:"image/svg+xml;charset=utf-8"}));
      const img = new Image();
      img.onload = function(){
        const c = document.createElement("canvas"); c.width=W; c.height=H;
        const g = c.getContext("2d"); g.fillStyle="#ffffff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        downloadDataURL((opts.char||"char")+"_trace_"+yyyymmdd_hhmmss()+".png", c.toDataURL("image/png"));
      };
      img.src = url;
    };

    // Data loading
    const enc = s=>encodeURIComponent(s);
    async function loadJSON(url){
      const r = await fetch(url, {cache:"no-store"});
      if(!r.ok) throw new Error(String(r.status));
      return r.json();
    }
    async function initData(){
      const base = opts.basePath || "./media/hanzi/";
      const char = opts.char;
      try{
        const settings = await loadJSON(base + enc(char) + "_settings.json");
        if(settings){
          if(settings.size!=null){ opts.size = settings.size; svg.setAttribute("width", opts.size); svg.setAttribute("height", opts.size); svg.setAttribute("viewBox", `0 0 ${opts.size} ${opts.size}`); }
          if(settings.dotTol!=null){ opts.dotTol = settings.dotTol; }
          if(settings.strokeTol!=null){ opts.strokeTol = settings.strokeTol; }
          if(settings.nextDelaySec!=null){ opts.nextDelayMs = Math.max(0, Math.round(settings.nextDelaySec*1000)); }
        }
      }catch(_){/* optional */}
      const strokes = await loadJSON(base + enc(char) + "_strokes.json");
      const dotsCfg = await loadJSON(base + enc(char) + "_dots.json");
      layout(strokes.strokes||[]);
      dots = (dotsCfg && Array.isArray(dotsCfg.dots)) ? dotsCfg.dots : [];
      dots = dots.map(a=> (a||[]).slice(0, MAX_DOTS));
      hitSets = dots.map(()=> new Set());
      recolor();
    }
    initData().catch(err=>{
      // fallback if files missing
      layout(["M 160 40 L 100 200","M 160 40 L 220 200"]);
      dots = [ [ {cx:100,cy:200}, {cx:160,cy:40} ], [ {cx:160,cy:40}, {cx:220,cy:200} ] ];
      hitSets = dots.map(()=> new Set());
      recolor();
      console.warn("HanziTraceModule: using fallback; error:", err);
    });

    // public API (optional exposure)
    return {
      clear: ()=> clearBtn.onclick(),
      undo: ()=> undoBtn.onclick(),
      save: ()=> saveBtn.onclick()
    };
  }

  function mountInto(el, opts){ return mount(el, opts||{}); }

  global.HanziTraceModule = { mount: mountInto };
})(window);