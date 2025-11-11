
/* Hanzi Trace – Dots/Numbers toggle UI v1.0
 * Adds two buttons inside #tracegrid to control dot/number visibility:
 *  - "Show dots" → only for the ACTIVE stroke
 *  - "Hide dots" → hide all dots/labels
 * Exposes: window.showDotsForActive(), window.hideAllDots()
 * Load after your tracer.
 */
(function(){
  var root = document.getElementById('tracegrid') || document;
  if (!root) return;

  function getActiveIndex(){
    if (typeof window.current === 'number') return window.current;
    if (typeof window.currentStroke === 'number') return window.currentStroke;
    var act = root.querySelector('[data-active="1"], .stroke-active, .stroke--active');
    if (act && act.hasAttribute('data-stroke-index')) return +act.getAttribute('data-stroke-index');
    return 0;
  }

  function hideAllDots(){
    root.querySelectorAll('.dot,.dotLabel').forEach(function(el){
      el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden';
    });
  }

  function showDotsForActive(){
    var idx = getActiveIndex();
    hideAllDots();
    var g = root.querySelector('[data-stroke-index="'+idx+'"]') || root.querySelector('.stroke-active,[data-active="1"]');
    if (g){
      g.querySelectorAll('.dot,.dotLabel').forEach(function(el){
        el.style.display=''; el.style.opacity='1'; el.style.visibility='visible';
      });
    }
    if (typeof window.updateDotVisibility==='function'){
      try{ window.updateDotVisibility(); }catch(e){}
    }
  }

  // Export globals
  window.hideAllDots = hideAllDots;
  window.showDotsForActive = showDotsForActive;

  // Inject two small icon buttons (top-right inside #tracegrid)
  var bar = document.createElement('div');
  bar.style.position = 'absolute';
  bar.style.top = '6px';
  bar.style.right = '6px';
  bar.style.display = 'flex';
  bar.style.gap = '6px';
  bar.style.zIndex = '9999';
  bar.style.pointerEvents = 'auto';

  function mkBtn(title, pathD){
    var b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    b.style.border = '1px solid #bbb';
    b.style.borderRadius = '8px';
    b.style.padding = '4px 6px';
    b.style.background = '#f2f2f2';
    b.style.cursor = 'pointer';
    b.style.boxShadow = '0 1px 2px rgba(0,0,0,.05)';
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><path d="'+pathD+'" fill="#111"/></svg>';
    return b;
    }

  var showBtn = mkBtn('Show dots for active stroke', 'M12 4C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z');
  var hideBtn = mkBtn('Hide all dots', 'M18.36 6.64L6.64 18.36 5.23 16.95 16.95 5.23 18.36 6.64z M12 4c5 0 9.27 3.11 11 8-.54 1.53-1.39 2.88-2.46 4.01L18.1 15.56C18.69 14.78 19.17 13.92 19.5 13c-1.36-3.84-4.67-6-7.5-6-1.01 0-1.97.18-2.85.5L7.9 5.75C9.17 5.27 10.55 5 12 5c0 0 0 0 0 0z');

  showBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); showDotsForActive(); });
  hideBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); hideAllDots(); });

  var tg = document.getElementById('tracegrid');
  if (tg){
    var cs = window.getComputedStyle(tg);
    if (cs.position === 'static') tg.style.position = 'relative';
    tg.appendChild(bar);
  } else {
    root.appendChild(bar);
  }
  bar.appendChild(showBtn);
  bar.appendChild(hideBtn);
})();
