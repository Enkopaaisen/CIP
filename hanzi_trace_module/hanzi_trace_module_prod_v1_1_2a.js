
/* Hanzi Trace Module v1.1.2a – Enhanced Undo Logic
 * Extends v1.1.2 behavior:
 * - If stroke N is completed and N+1 is active but untouched → Undo will deactivate N+1,
 *   reactivate N, and clear N’s trace.
 * - If stroke has partial trace → remove last segment.
 * - If first stroke empty → no-op.
 */

(function(){
  const root = document.getElementById('tracegrid') || document;
  const svg  = root.querySelector('svg') || document.querySelector('#tracegrid svg');
  if (!svg) return;

  // --- helper functions ---
  const hasSeg = (si)=> window.tracePaths && tracePaths[si] && tracePaths[si].length>0;

  const clearAll = (si)=>{
    if (window.tracePaths && tracePaths[si]){
      while(tracePaths[si].length){
        const el = tracePaths[si].pop();
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
    if (window.hitSets && hitSets[si]) hitSets[si].clear();
    if (typeof window.recomputeHits === 'function') recomputeHits(si);
  };

  const undoOnce = ()=>{
    if (typeof window.current !== 'number') return;
    const total = (tracePaths ? tracePaths.length : 0);
    const next = window.current + 1;

    // Case 1: nothing drawn yet on first stroke → no-op
    if (window.current === 0 && !hasSeg(0)) return;

    // Case 2: active stroke has partial trace → remove last segment
    if (hasSeg(window.current)) {
      const el = tracePaths[window.current].pop();
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (typeof recomputeHits === 'function') recomputeHits(window.current);
      return;
    }

    // Case 3: current stroke empty but next stroke active and untouched → revert to previous
    if (next < total && !hasSeg(next) && window.current > 0) {
      window.current -= 1;
      clearAll(window.current);
      if (typeof window.recolor === 'function') recolor();
      if (typeof window.updateDotVisibility === 'function') updateDotVisibility();
      return;
    }
  };

  // Attach Undo handler
  const undoBtn = root.querySelector('[aria-label="Undo last trace"],[title="Undo last trace"]');
  if (undoBtn) undoBtn.onclick = undoOnce;

  // Expose globally
  window.hanziUndoEnhanced = undoOnce;
})();
