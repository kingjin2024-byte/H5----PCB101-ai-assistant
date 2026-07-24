(() => {
  let page = 1;
  const shell = document.querySelector(".landing-shell");
  const modal = document.querySelector("#wechatLoginModal");
  const frame = document.querySelector("#prototypeFrame");
  const checkbox = document.querySelector("#agreementCheckbox");
  const hint = document.querySelector("#loginHint");

  function mountPager() {
    window.PCB101_PAGER.init({
      page,
      onPrev: () => { if (page === 2) showLanding(1); },
      onNext: () => { if (page === 1) showLanding(2); else if (page === 2) showAssistant(3); }
    });
  }
  function showLanding(nextPage) {
    page = nextPage;
    shell.hidden = false;
    frame.hidden = true;
    modal.hidden = page !== 2;
    document.body.classList.toggle("wechat-login-locked", page === 2);
    document.body.dataset.prototypePage = String(page);
    mountPager();
  }
  function showAssistant(targetPage) {
    page = targetPage;
    shell.hidden = true;
    document.querySelector(".prototype-pager")?.remove();
    frame.hidden = false;
    frame.src = `./ai-job-assistant/?page=${targetPage}&embedded=1`;
    document.body.classList.remove("wechat-login-locked");
  }

  document.querySelector("#openWechatLogin").addEventListener("click", event => {
    event.preventDefault();
    showLanding(2);
  });
  document.querySelector("#closeWechatLogin").addEventListener("click", () => showLanding(1));
  document.querySelector("#wechatLoginButton").addEventListener("click", () => {
    if (!checkbox.checked) {
      hint.textContent = "请先阅读并勾选服务协议和隐私政策";
      hint.classList.add("login-hint-error");
      checkbox.focus();
      return;
    }
    showAssistant(3);
  });
  checkbox.addEventListener("change", () => {
    hint.textContent = "未注册的微信用户登录后将自动创建 PCB101 账号";
    hint.classList.remove("login-hint-error");
  });
  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || event.data?.source !== "pcb101-prototype") return;
    if (event.data.action === "show-page-2") showLanding(2);
  });
  showLanding(1);
})();
