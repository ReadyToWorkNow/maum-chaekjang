// Tabs/slider behavior for the dual input forms (정보 입력 / 내 이야기 하기)
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.story-tabs');
    if (!root) return;

    const btnInfo = document.getElementById('tab-info');
    const btnFree = document.getElementById('tab-free');
    const track = document.getElementById('tabTrack');
    const panelInfo = document.getElementById('panel-info');
    const panelFree = document.getElementById('panel-free');

    function activate(tab) {
      const goFree = tab === 'free';

      // Buttons state
      btnInfo.classList.toggle('is-active', !goFree);
      btnFree.classList.toggle('is-active', goFree);
      btnInfo.setAttribute('aria-selected', String(!goFree));
      btnFree.setAttribute('aria-selected', String(goFree));

      // Panels accessibility state
      panelInfo.setAttribute('aria-hidden', String(goFree));
      panelFree.setAttribute('aria-hidden', String(!goFree));
      panelInfo.tabIndex = goFree ? -1 : 0;
      panelFree.tabIndex = goFree ? 0 : -1;

      // Slide
      if (track) {
        track.style.transform = goFree ? 'translateX(-100%)' : 'translateX(0%)';
      }
    }

    // Initial
    activate('info');

    // Events
    if (btnInfo) btnInfo.addEventListener('click', function () { activate('info'); });
    if (btnFree) btnFree.addEventListener('click', function () { activate('free'); });

    // Keyboard support (Left/Right)
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { activate('info'); }
      if (e.key === 'ArrowRight') { activate('free'); }
    });
  });
})();

