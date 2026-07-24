window.PCB101_PAGER = (() => {
  const TOTAL_PAGES = 5;
  let startX = 0;
  let startY = 0;

  function init({ page, onPrev, onNext }) {
    document.querySelector(".prototype-pager")?.remove();
    const pager = document.createElement("aside");
    pager.className = "prototype-pager";
    pager.setAttribute("aria-label", `原型第 ${page} 页，共 ${TOTAL_PAGES} 页`);
    pager.innerHTML = `<button class="pager-prev" type="button" aria-label="上一页" ${page === 1 ? "disabled" : ""}>‹</button><strong>${page}</strong><span>/ ${TOTAL_PAGES}</span><button class="pager-next" type="button" aria-label="下一页" ${page === TOTAL_PAGES ? "disabled" : ""}>›</button>`;
    document.body.append(pager);
    const runPrev = () => { if (page > 1 && onPrev) onPrev(); };
    const runNext = () => { if (page < TOTAL_PAGES && onNext) onNext(); };
    pager.querySelector(".pager-prev").addEventListener("click", runPrev);
    pager.querySelector(".pager-next").addEventListener("click", runNext);
    document.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") runPrev();
      if (event.key === "ArrowRight") runNext();
    });
    document.addEventListener("touchstart", event => {
      startX = event.changedTouches[0].clientX;
      startY = event.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener("touchend", event => {
      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
        deltaX < 0 ? runNext() : runPrev();
      }
    }, { passive: true });
  }
  return { init, total: TOTAL_PAGES };
})();
