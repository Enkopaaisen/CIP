
/* === UNDO LOGIC (rules 1–3) — non-invasive shim ===
   Rule 1) If active is first stroke (0): remove tracing, keep dots/numbers.
   Rule 2) If active > 0 and active stroke is COMPLETED (new stroke is showing):
           - deactivate current (hide dots/numbers)
           - activate last stroke
           - remove its trace and show its dots/numbers.
   Rule 3) If active > 0 and active stroke is NOT completely traced:
           - remove last trace and keep current stroke activated,
             keep dots/numbers visible.
*/
(function(){
  function getCurrentIndex(){
    if (typeof window.current === 'number') return window.current;
    if (typeof window.currentStroke === 'number') return window.currentStroke;
    if (typeof window.getActiveStrokeIndex === 'function') return window.getActiveStrokeIndex();
    var g = document.querySelector('#tracegrid .stroke-active,[data-active="1"]');
    if (g && g.hasAttribute('data-stroke-index')) return +g.getAttribute('data-stroke-index');
    return 0;
  }
  function setActiveIndex(i){
    if (typeof window.activateStroke === 'function') return window.activateStroke(i);
    if (typeof window.setActiveStroke === 'function') return window.setActiveStroke(i);
    window.current = i;
    document.querySelectorAll('#tracegrid [data-stroke-index]').forEach(el=>{
      el.classList.toggle('stroke-active', +el.getAttribute('data-stroke-index')===i);
      el.setAttribute('data-active', (+el.getAttribute('data-stroke-index')===i) ? '1':'0');
    });
  }
  function isComplete(i){
    if (window.strokeDone && typeof window.strokeDone[i] !== 'undefined') return !!window.strokeDone[i];
    if (typeof window.isStrokeComplete === 'function') return !!window.isStrokeComplete(i);
    const g = document.querySelector('#tracegrid [data-stroke-index="'+i+'"]');
    if (g && (g.classList.contains('done') || g.getAttribute('data-done')==='1')) return true;
    if (window.dotHit && window.dotTotal) {
      if (typeof window.dotHit[i] !== 'undefined' && typeof window.dotTotal[i] !== 'undefined') {
        return +window.dotHit[i] >= +window.dotTotal[i];
      }
    }
    return false;
  }
  function removeLastSegment(i){
    if (window.tracePaths && window.tracePaths[i] && window.tracePaths[i].length){
      const el = window.tracePaths[i].pop();
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (typeof window.recomputeHits === 'function') window.recomputeHits(i);
      return true;
    }
    const segs = document.querySelectorAll('#tracegrid [data-stroke-index="'+i+'"] .traceSegment');
    if (segs.length){
      const el = segs[segs.length-1];
      el.parentNode && el.parentNode.removeChild(el);
      return true;
    }
    return false;
  }
  function clearTrace(i){
    if (window.tracePaths && window.tracePaths[i]){
      while(window.tracePaths[i].length){
        const el = window.tracePaths[i].pop();
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      if (typeof window.recomputeHits === 'function') window.recomputeHits(i);
      return;
    }
    document.querySelectorAll('#tracegrid [data-stroke-index="'+i+'"] .trace, #tracegrid [data-stroke-index="'+i+'"] .traceSegment')
      .forEach(n=>n.parentNode && n.parentNode.removeChild(n));
  }
  function showDotsOnly(i){
    document.querySelectorAll('#tracegrid .dot, #tracegrid .dotLabel').forEach(el=>{
      el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden';
    });
    const root = document.querySelector('#tracegrid [data-stroke-index="'+i+'"]') || document.querySelector('#tracegrid .stroke-active,[data-active="1"]');
    if (root){
      root.querySelectorAll('.dot, .dotLabel').forEach(el=>{
        el.style.display=''; el.style.opacity='1'; el.style.visibility='visible';
      });
    }
    if (typeof window.updateDotVisibility === 'function') {
      try { window.updateDotVisibility(); } catch(e){}
    }
  }
  function undoOnce(){
    const idx = getCurrentIndex();
    if (idx === 0){
      const changed = removeLastSegment(0);
      if (!changed) clearTrace(0);
      showDotsOnly(0);
      return;
    }
    if (!isComplete(idx)){
      const changed = removeLastSegment(idx);
      showDotsOnly(idx);
      return;
    }
    const prev = Math.max(0, idx-1);
    setActiveIndex(prev);
    clearTrace(prev);
    showDotsOnly(prev);
  }
  function wireUndo(){
    const root = document.getElementById('tracegrid') || document;
    root.addEventListener('click', function(e){
      const btn = e.target.closest && e.target.closest('[aria-label="Undo last trace"], [title="Undo last trace"]');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      undoOnce();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUndo);
  else wireUndo();
})();
