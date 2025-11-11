
/* Hanzi Trace – UNDO core shim (no dot/number ops) v1.2b
 * Implements your 3 rules only for stroke activation + trace removal.
 * Load AFTER your working tracer (v1.1.2).
 */
(function(){
  var root = document.getElementById('tracegrid') || document;
  var svg  = root.querySelector('svg') || document.querySelector('#tracegrid svg');
  if (!svg) return;

  function getActiveIndex(){
    if (typeof window.current === 'number') return window.current;
    if (typeof window.currentStroke === 'number') return window.currentStroke;
    var act = root.querySelector('[data-active="1"], .stroke-active, .stroke--active');
    if (act && act.hasAttribute('data-stroke-index')) return +act.getAttribute('data-stroke-index');
    return 0;
  }
  function setActiveIndex(i){
    if (typeof window.activateStroke === 'function') return window.activateStroke(i);
    if (typeof window.setActiveStroke === 'function') return window.setActiveStroke(i);
    root.querySelectorAll('[data-stroke-index]').forEach(function(el){
      var on = (+el.getAttribute('data-stroke-index')===i);
      el.classList.toggle('stroke-active', on);
      el.setAttribute('data-active', on?'1':'0');
    });
    window.current = i;
  }

  // Track drawn segments per stroke using MutationObserver
  var stacks = Object.create(null);
  function ensureStack(i){ if (!stacks[i]) stacks[i]=[]; return stacks[i]; }

  function isSegmentNode(n){
    if (!n || n.nodeType!==1) return false;
    if (n.classList && (n.classList.contains('trace') || n.classList.contains('traceSegment'))) return true;
    if ((n.tagName==='path' || n.tagName==='polyline' || n.tagName==='line')){
      var lc = (n.getAttribute('stroke-linecap')||'').toLowerCase();
      var fill = (n.getAttribute('fill')||'').toLowerCase();
      if (lc==='round' || fill==='none' || (n.className && /trace/i.test(n.className))) return true;
    }
    return false;
  }
  var mo = new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function(n){
        if (!isSegmentNode(n)) return;
        var idx = getActiveIndex();
        ensureStack(idx).push(n);
      });
    });
  });
  try{ mo.observe(svg, {childList:true, subtree:true}); }catch(e){}

  function isComplete(i){
    if (window.strokeDone && typeof window.strokeDone[i] !== 'undefined') return !!window.strokeDone[i];
    if (typeof window.isStrokeComplete === 'function') return !!window.isStrokeComplete(i);
    if (window.dotHit && window.dotTotal && typeof window.dotHit[i]!=='undefined' && typeof window.dotTotal[i]!=='undefined'){
      return (+window.dotHit[i] >= +window.dotTotal[i]);
    }
    var g = root.querySelector('[data-stroke-index="'+i+'"]');
    if (g && (g.classList.contains('done') || g.getAttribute('data-done')==='1')) return true;
    return false;
  }

  function hasAnySegments(i){
    var arr = ensureStack(i);
    if (arr.length) return true;
    var candidates = root.querySelectorAll('[data-stroke-index="'+i+'"] .traceSegment, [data-stroke-index="'+i+'"] .trace');
    return candidates.length > 0;
  }

  function removeLastSegment(i){
    var arr = ensureStack(i);
    while (arr.length){
      var el = arr.pop();
      if (el && el.parentNode){
        el.parentNode.removeChild(el);
        if (typeof window.recomputeHits==='function') try{ window.recomputeHits(i); }catch(e){}
        return true;
      }
    }
    var candidates = root.querySelectorAll('[data-stroke-index="'+i+'"] .traceSegment, [data-stroke-index="'+i+'"] .trace');
    if (candidates.length){
      var last = candidates[candidates.length-1];
      last.parentNode && last.parentNode.removeChild(last);
      return true;
    }
    return false;
  }

  function clearTrace(i){
    var arr = ensureStack(i);
    while (arr.length){
      var el = arr.pop();
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    root.querySelectorAll('[data-stroke-index="'+i+'"] .trace, [data-stroke-index="'+i+'"] .traceSegment')
      .forEach(function(n){ n.parentNode && n.parentNode.removeChild(n); });
    if (typeof window.recomputeHits==='function') try{ window.recomputeHits(i); }catch(e){}
  }

  function undoOnce(){
    var idx = getActiveIndex();

    // No-op if first stroke and nothing drawn
    if (idx === 0 && !hasAnySegments(0)) return;

    if (idx === 0){
      if (!removeLastSegment(0)) clearTrace(0);
      return;
    }

    if (!isComplete(idx)){
      removeLastSegment(idx);
      return;
    }

    var prev = Math.max(0, idx-1);
    setActiveIndex(prev);
    clearTrace(prev);
  }

  root.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('[aria-label="Undo last trace"], [title="Undo last trace"]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    undoOnce();
  }, true);
})();
