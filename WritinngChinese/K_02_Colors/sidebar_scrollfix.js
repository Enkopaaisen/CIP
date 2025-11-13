
// sidebar_scrollfix_v2.js
// Keep .sidebar height equal to #maingrid (ID), not the card container.
// Only .charlist scrolls; combine with sidebar_scrollfix.css.
(function(){
  function getMainGridEl(){
    // Prefer ID #maingrid as requested; fallback to .maingrid if needed
    return document.getElementById('maingrid') || document.querySelector('.maingrid');
  }
  function syncSidebarHeight(){
    var mg = getMainGridEl();
    var sb = document.querySelector('.sidebar');
    if (!mg || !sb) return;
    sb.style.height = mg.getBoundingClientRect().height + 'px';
  }
  window.addEventListener('load', syncSidebarHeight);
  window.addEventListener('resize', syncSidebarHeight);
  if (window.ResizeObserver){
    var mg = getMainGridEl();
    if (mg){
      var ro = new ResizeObserver(syncSidebarHeight);
      ro.observe(mg);
    }
  }
})();
