
/*! Hanzi Trace Module v1.1.1
 *  Adds: dot rendering with option showDots: "off" | "active" | "always" (default: "active" here in demo).
 *  Works with preloaded local JSON (file inputs) or fetch() from a folder.
 */
(function(global){
  'use strict';
  const NS = "http://www.w3.org/2000/svg";
  const MAX_DOTS = 10;
  const DOT_COLORS = ["#1976d2","#ff9800","#fdd835","#ab47bc","#2e7d32","#e91e63","#00acc1","#8d6e63","#7cb342","#5c6bc0"];

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
      showDots: "off", // "off" | "active" | "always"
      preloaded: null // {strokes:{strokes:[]}, dots:{dots:[]}, settings:{...}}
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
    const gDots  = svg.appendChild(el("g",{})); // rendered dots

    // Buttons (icons with titles)
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
    const undoBtn  = iconBtn("M12 5v2a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3v2l-4-3 4-3z", "Undo last trace");
    const clearBtn = iconBtn("M6 7h12l-1 12H7L6 7zm3-3h6l1 2H8l1-2z", "Clear all");
    const saveBtn  = iconBtn("M5 5h8l4 4v10H5V5zm8 0v4h4", "Save image");
    btnRow.appendChild(undoBtn); btnRow.appendChild(clearBtn); btnRow.appendChild(saveBtn);
    wrap.appendChild(btnRow);

    // Styles in <svg> (also copied to export)
    const style = document.createElementNS(NS, "style");
    style.textContent = `
      .grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}
      .grid .border{stroke-width:1.5}
      .trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}
      .dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}
      .dot{stroke:#333;stroke-width:1}
    `;
    svg.insertBefore(style, svg.firstChild);

    let basePaths=[], basePath2D=[], tracePaths=[], S=1, TX=0, TY=0;
    let current=0, pressing=false, strokeDone=false, invalidAbort=false;
    let curPath=null, curD="";
    let dots=[], hitSets=[]; // logical dots
    let dotEls=[]; // rendered elements {halo,circle}

    const off = document.createElement("canvas"); const ctx = off.getContext("2d");

    function computeBBox(paths){
      if(!paths || !paths.length) return {x:0,y:0,width:100,height:100};
      const tmp = el("g",{visibility:"hidden"}); svg.appendChild(tmp);
      const ps = paths.map(d=>{ const p=el("path",{d}); tmp.appendChild(p); return p; });
      let b=ps[0].getBBox();
      for(let i=1;i<ps.length;i++){ const bi=ps[i].getBBox(); b={x:Math.min(b.x,bi.x), y:Math.min(b.y,bi.y), width:Math.max(b.x+b.width,bi.x+bi.width)-Math.min(b.x,bi.x), height:Math.max(b.y+b.height,bi.y+bi.height)-Math.min(b.y,bi.y)}; }
      svg.removeChild(tmp); return b;
    }

    function layout(strokes){
      gGrid.innerHTML=""; gFill.innerHTML=""; gTrace.innerHTML=""; gDots.innerHTML="";
      dotEls=[]; // clear rendered
      basePaths=[]; basePath2D=[]; tracePaths=[];
      current=0; pressing=false; strokeDone=false; invalidAbort=false; curPath=null; curD="";
      const grid = drawGrid(gGrid, opts.size);
      const b = computeBBox(strokes);
      const innerBox = grid.inner*opts.padding;
      S = Math.min(innerBox/Math.max(1,b.width), innerBox/Math.max(1,b.height));
      const c = {x:b.x+b.width/2, y:b.y+b.height/2};
      TX = grid.midX - S*c.x; TY = opts.flipY ? (grid.midY + S*c.y) : (grid.midY - S*c.y);
      off.width = opts.size; off.height = opts.size;
      strokes.forEach((d,i)=>{
        const tr = opts.flipY ? `translate(${TX},${TY}) scale(${S},${-S})` : `translate(${TX},${TY}) scale(${S})`;
        const g = el("g",{transform:tr});
        const p = el("path",{d,class:"stroke-base"});
        p.setAttribute("fill", i===0 ? opts.strokeActive : opts.strokeIdle);
        g.appendChild(p); gFill.appendChild(g); basePaths.push(p);
        basePath2D.push(new Path2D(d)); tracePaths[i]=[];
      });
      renderDots(); recolor(); updateDotVisibility();
    }

    function recolor(){ basePaths.forEach((p,i)=> p.setAttribute("fill", i<=current?opts.strokeActive:opts.strokeIdle)); }

    function pointWithinStroke(si,x,y){ if(!basePath2D[si]) return true; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,off.width,off.height); ctx.save(); ctx.translate(TX,TY); ctx.scale(S,(opts.flipY?-S:S)); const path=basePath2D[si]; const inside=ctx.isPointInPath(path, x, y); let near=false; if(!inside && opts.strokeTol>0){ ctx.lineWidth=opts.strokeTol*2; near=ctx.isPointInStroke(path, x, y); } ctx.restore(); return inside||near; }
    function isTraced(si){ const arr=dots[si]||[]; return (hitSets[si] && hitSets[si].size>=arr.length && arr.length>=2); }

    function recomputeHits(si){
      const arr=dots[si]||[]; hitSets[si]=new Set();
      const paths=tracePaths[si]||[]; const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(const elp of paths){
        const d=elp.getAttribute("d")||""; const tokens=d.trim().split(/[ML]\s*/i).filter(Boolean);
        for(const tk of tokens){
          const nums=tk.trim().split(/[ ,]+/).map(parseFloat);
          for(let i=0;i+1<nums.length;i+=2){
            const x=nums[i], y=nums[i+1];
            for(let j=0;j<arr.length;j++){ if(hitSets[si].has(j)) continue; const dd=arr[j]; const dx=x-dd.cx, dy=y-dd.cy; if(dx*dx+dy*dy<=R2) hitSets[si].add(j); }
          }
        }
      }
    }

    // Dot rendering (non-editable)
    function renderDots(){
      gDots.innerHTML=""; dotEls = dots.map((arr, si)=>{
        return (arr||[]).map((d, di)=>{
          const halo = el("circle", {cx:d.cx, cy:d.cy, r:(opts.dotTol+opts.dotRadius), class:"dotHalo"});
          const c    = el("circle", {cx:d.cx, cy:d.cy, r:opts.dotRadius, class:"dot"});
          c.setAttribute("fill", DOT_COLORS[di%DOT_COLORS.length] || "#1976d2");
          gDots.appendChild(halo); gDots.appendChild(c);
          return {halo,circ:c};
        });
      });
    }
    function updateDotVisibility(){
      const mode = opts.showDots; // "off" | "active" | "always"
      if(mode==="off"){ gDots.style.display="none"; return; }
      gDots.style.display="block";
      if(mode==="always"){
        // all visible
        return;
      }
      // active only
      dotEls.forEach((arr, si)=>{
        const on = (si===current && !isTraced(si));
        (arr||[]).forEach(el=>{
          el.halo.style.display = on ? "block" : "none";
          el.circ.style.display = on ? "block" : "none";
        });
      });
    }

    // Interaction: draw even when starting outside tolerance; invalidate on release
    svg.addEventListener("pointerdown", e=>{
      pressing=true; strokeDone=false; invalidAbort=false;
      const p = svgPoint(svg, e);
      if(!pointWithinStroke(current,p.x,p.y)){ invalidAbort=true; }
      curD=`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      const path=el("path",{class:"trace"});
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
      const si=current, arr=dots[si]||[]; const R=(opts.dotTol+opts.dotRadius), R2=R*R;
      for(let i=0;i<arr.length;i++){ if(hitSets[si].has(i)) continue; const d=arr[i]; const dx=p.x-d.cx, dy=p.y-d.cy; if(dx*dx+dy*dy<=R2){ hitSets[si].add(i); } }
      if(isTraced(si)) strokeDone=true;
      e.preventDefault();
    });
    function endPress(){
      if(!pressing) return; pressing=false; curPath=null; curD="";
      if(invalidAbort){
        const arr=tracePaths[current]; if(arr && arr.length){ const last=arr.pop(); if(last && last.parentNode) last.parentNode.removeChild(last); }
        hitSets[current].clear(); invalidAbort=false; return;
      }
      if(strokeDone){ strokeDone=false; setTimeout(()=>{ current=Math.min(current+1, basePaths.length-1); recolor(); updateDotVisibility(); }, opts.nextDelayMs|0); }
    }
    svg.addEventListener("pointerup", endPress); svg.addEventListener("pointerleave", endPress);

    function svgPoint(svg, evt){ const pt=svg.createSVGPoint(); const t=(evt.touches&&evt.touches[0])||(evt.changedTouches&&evt.changedTouches[0]); pt.x=t?t.clientX:evt.clientX; pt.y=t?t.clientY:evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }

    // Controls
    const btns = wrap.querySelectorAll("button");
    btns[0].onclick = ()=>{ // undo
      if(tracePaths[current] && tracePaths[current].length){ const el=tracePaths[current].pop(); if(el&&el.parentNode) el.parentNode.removeChild(el); recomputeHits(current); return; }
      if(current>0){ current-=1; recolor(); updateDotVisibility(); if(tracePaths[current] && tracePaths[current].length){ const el=tracePaths[current].pop(); if(el&&el.parentNode) el.parentNode.removeChild(el); recomputeHits(current); } }
    };
    btns[1].onclick = ()=>{ // clear
      gTrace.innerHTML=""; tracePaths = tracePaths.map(()=>[]); hitSets = dots.map(()=> new Set()); current=0; recolor(); updateDotVisibility();
    };
    btns[2].onclick = ()=>{ // save
      const clone = svg.cloneNode(true);
      const embed = document.createElementNS(NS,"style"); embed.textContent = `.grid line, .grid rect{stroke:#cfcfcf;stroke-width:1.2;fill:none}.grid .border{stroke-width:1.5}.trace{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}.dotHalo{fill:rgba(76,175,80,0.10);stroke:rgba(76,175,80,0.25)}.dot{stroke:#333;stroke-width:1}`;
      clone.insertBefore(embed, clone.firstChild);
      const bg = document.createElementNS(NS,"rect"); bg.setAttribute("x","0"); bg.setAttribute("y","0"); bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff"); clone.insertBefore(bg, clone.firstChild);
      const vb=svg.viewBox.baseVal, W=vb&&vb.width?vb.width:(svg.width.baseVal.value||320), H=vb&&vb.height?vb.height:(svg.height.baseVal.value||320);
      const raw = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([raw], {type:"image/svg+xml;charset=utf-8"}));
      const img = new Image();
      img.onload = function(){ const c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d"); g.fillStyle="#ffffff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0); URL.revokeObjectURL(url); downloadDataURL((opts.char||"char")+"_trace_"+yyyymmdd_hhmmss()+".png", c.toDataURL("image/png")); };
      img.src = url;
    };

    // Init data
    function applySettings(s){ if(!s) return; if(s.size!=null){ opts.size=s.size; svg.setAttribute("width",opts.size); svg.setAttribute("height",opts.size); svg.setAttribute("viewBox",`0 0 ${opts.size} ${opts.size}`);} if(s.dotTol!=null){ opts.dotTol=s.dotTol; } if(s.strokeTol!=null){ opts.strokeTol=s.strokeTol; } if(s.nextDelaySec!=null){ opts.nextDelayMs=Math.max(0, Math.round(s.nextDelaySec*1000)); } }
    function setDots(d){ dots=(d&&Array.isArray(d.dots))? d.dots.map(a=> (a||[]).slice(0,MAX_DOTS)) : []; hitSets=dots.map(()=> new Set()); renderDots(); updateDotVisibility(); }

    const enc = s=>encodeURIComponent(s);
    async function loadJSON(url){ const r=await fetch(url, {cache:"no-store"}); if(!r.ok) throw new Error(String(r.status)); return r.json(); }
    async function initFromFetch(){
      const base = opts.basePath || "./media/hanzi/"; const ch = opts.char;
      try{ const s=await loadJSON(base+enc(ch)+"_settings.json"); applySettings(s); }catch(_){}
      const strokes = await loadJSON(base+enc(ch)+"_strokes.json");
      const dots = await loadJSON(base+enc(ch)+"_dots.json");
      layout(strokes.strokes||[]); setDots(dots||null); recolor();
    }
    function initFromPreloaded(pre){
      if(pre && pre.settings) applySettings(pre.settings);
      layout(pre && pre.strokes && Array.isArray(pre.strokes.strokes) ? pre.strokes.strokes : []);
      setDots(pre && pre.dots ? pre.dots : null);
      recolor();
    }

    if (opts.preloaded){ initFromPreloaded(opts.preloaded); }
    else { initFromFetch().catch(err=>{ layout(["M 160 40 L 100 200","M 160 40 L 220 200"]); dots=[[{cx:100,cy:200},{cx:160,cy:40}],[{cx:160,cy:40},{cx:220,cy:200}]]; hitSets=dots.map(()=> new Set()); renderDots(); updateDotVisibility(); recolor(); console.warn("HanziTraceModule: using fallback; error:", err); }); }

    return { /* public API if needed later */ };
  }

  global.HanziTraceModule = { mount };
})(window);
