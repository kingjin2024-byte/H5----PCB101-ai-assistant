(() => {
  const { regions, regionGroups, careers, jobs, voiceDemo, profile } = window.PCB101_DATA;
  const conversation = document.querySelector("#conversation");
  const input = document.querySelector("#messageInput");
  const send = document.querySelector("#sendButton");
  const mic = document.querySelector("#micButton");
  const listening = document.querySelector("#listening");
  const policyModal = document.querySelector("#policyModal");
  const policyAccept = document.querySelector("#policyAccept");
  const policyReject = document.querySelector("#policyReject");
  const personalInfoModal = document.querySelector("#personalInfoModal");
  const personalInfoForm = document.querySelector("#personalInfoForm");
  const personalInfoHint = document.querySelector("#personalInfoHint");
  const jobDetail = document.querySelector("#jobDetail");
  const jobShareCard = new JobShareCard();
  let activeJobShareData = null;
  let stage = "region";
  let busy = false;
  let selectedCareer = profile.career;
  let selectedJobs = profile.jobs;
  let selectedLocations = profile.regions;
  let personalInfoComplete = false;
  const requestedPage = Number(new URLSearchParams(window.location.search).get("page"));
  const prototypePage = requestedPage === 5 ? 5 : requestedPage === 4 ? 4 : 3;
  const embedded = window.parent !== window;
  const returnToLogin = () => {
    if (embedded) window.parent.postMessage({ source: "pcb101-prototype", action: "show-page-2" }, window.location.origin);
    else window.location.href = "../index.html";
  };

  document.body.dataset.prototypePage = String(prototypePage);
  if (prototypePage >= 4) {
    policyModal.hidden = true;
  } else {
    document.body.classList.add("policy-locked");
  }
  policyAccept.addEventListener("click", () => {
    window.location.href = "./index.html?page=4";
  });
  policyReject.addEventListener("click", () => {
    returnToLogin();
  });
  window.PCB101_PAGER.init({
    page: prototypePage,
    onPrev: () => { prototypePage === 3 ? returnToLogin() : window.location.href = prototypePage === 4 ? "./index.html?page=3&embedded=1" : "./index.html?page=4&embedded=1"; },
    onNext: () => { window.location.href = prototypePage === 3 ? "./index.html?page=4" : "./index.html?page=5"; }
  });

  const aiAvatar = `<span class="avatar ai-avatar"><img src="../assets/yaodi-avatar.png" alt="幺弟" /></span>`;
  const userAvatar = `<span class="avatar user-avatar"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="11" r="6"/><path d="M5 29c1-8 5-12 11-12s10 4 11 12z"/></svg></span>`;
  const escapeHtml = value => value.replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const scrollLatest = () => requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }));

  function addMessage(role, text) {
    const item = document.createElement("div");
    item.className = `message ${role}`;
    item.innerHTML = `${role === "ai" ? aiAvatar : ""}<div class="bubble">${escapeHtml(text)}</div>${role === "user" ? userAvatar : ""}`;
    conversation.append(item); scrollLatest();
  }
  function addChips(label, values) {
    const card = document.createElement("div"); card.className = "reference-card";
    card.innerHTML = `<span class="card-label">${label}</span><div class="chips">${values.map(v => `<button class="chip" type="button">${v}</button>`).join("")}</div>`;
    card.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { input.value = btn.textContent; input.focus(); }));
    conversation.append(card); scrollLatest();
  }
  function addCareerList() {
    const card = document.createElement("div"); card.className = "reference-card";
    card.innerHTML = `<span class="card-label">十大职业类别</span><ol class="number-list">${careers.map((v,i)=>`<li><b>${i+1}</b><span>${v}</span></li>`).join("")}</ol>`;
    conversation.append(card); scrollLatest();
  }
  function addDataCard(final = false) {
    if (!final) {
      const card = document.createElement("div");
      card.className = "match-summary-card";
      card.innerHTML = `<h3>根据您之前提供的信息：</h3><div class="match-fact"><i>⌖</i><span>期望地区：</span><b>${selectedLocations}</b></div><div class="match-fact"><i>⌘</i><span>工种方向：</span><b>${selectedCareer}</b></div><p>我为您匹配到合适的岗位：</p><div class="match-result"><span class="match-target" aria-hidden="true">◎</span><div><small>适合您的岗位数量</small><strong>353 <em>个</em></strong><p>这些岗位可能对您感兴趣</p></div></div>`;
      conversation.append(card); scrollLatest();
      return;
    }
    const rows = [
      ["期望地区", selectedLocations], [final ? "职业方向" : "岗位方向", selectedCareer], ["细分岗位", selectedJobs],
      ...(final ? [["从业经验",profile.experience],["目前公司",profile.company],["目前岗位",profile.currentJob]] : [])
    ];
    const card = document.createElement("div"); card.className = "data-card";
    card.innerHTML = `<h3>信息确认</h3><div class="data-rows">${rows.map(([k,v])=>`<div class="data-row"><span>${k}</span><b>${v}</b></div>`).join("")}</div>`;
    conversation.append(card); scrollLatest();
  }
  const normalizeIntent = text => text.trim().toLowerCase().replace(/[\s，,。.!！?？、~～]/g, "").replace(/^(嗯|恩|额|哦|好)+/, "");
  const yesWords = new Set(["是", "是的", "对", "对的", "正确", "没错", "是这样", "就是这样", "可以", "确认", "确定", "好的", "好", "没问题", "yes", "y"]);
  const noWords = new Set(["不是", "不是的", "不对", "不正确", "错误", "错了", "有误", "否", "否认", "不是这样", "不要", "不愿意", "不用", "不需要", "直接看岗位", "no", "n"]);
  const yes = text => {
    const value = normalizeIntent(text).replace(/[啊呀吧呢啦]$/g, "");
    return yesWords.has(value) || /^(是的|对的)?(没错|正确)$/.test(value) || value.split(/[和及]/).every(part => yesWords.has(part));
  };
  const no = text => {
    const value = normalizeIntent(text).replace(/[啊呀吧呢啦]$/g, "");
    return noWords.has(value) || /^(不是|不对)(的)?$/.test(value) || value.split(/[和及]/).every(part => noWords.has(part));
  };
  const allCitiesAccepted = text => new Set(["都可", "都可以", "可以"]).has(normalizeIntent(text));
  const willing = text => /愿意|可以|好的|好啊|继续/.test(text);
  const delay = (fn, ms=420) => { busy=true; setTimeout(() => { fn(); busy=false; }, ms); };
  const careerJobs = {
    "CAM/MI/设计类": ["CAM工程师", "MI工程师", "DFMT工程师", "Gerber工程师", "PCB设计工程师", "Layout工程师", "阻抗设计工程师", "拼版工程师", "菲林工程师", "工程资料工程师", "CAM主管", "MI主管", "CAM经理", "工程部经理", "工程总监"],
    "工艺/制程/制造工程类": jobs
  };
  const regionAliases = {
    "华南":"华南地区", "华南地区":"华南地区", "华东":"华东地区", "华东地区":"华东地区", "华中":"华中地区", "华中地区":"华中地区",
    "西南":"西南地区", "西南地区":"西南地区", "华北":"华北及东北地区", "东北":"华北及东北地区", "华北东北":"华北及东北地区",
    "华北及东北地区":"华北及东北地区", "港澳台":"港澳台地区", "港澳台地区":"港澳台地区", "马来西亚":"马来西亚", "泰国":"泰国",
    "越南":"越南", "新加坡":"新加坡", "墨西哥":"墨西哥", "欧洲":"欧洲", "美国":"美国",
    "海外":"海外机会", "海外机会":"海外机会", "不限":"不限地区", "不限地区":"不限地区", "全国":"不限地区"
  };
  const resolveRegion = text => {
    const value = normalizeIntent(text).replace(/(都可以看?|优先|发展|工作|求职|机会)$/g, "");
    const exact = regionAliases[value];
    if (exact) return exact;
    const alias = Object.keys(regionAliases).sort((a,b) => b.length - a.length).find(key => value.includes(key));
    return alias ? regionAliases[alias] : "";
  };
  const extractCities = text => [...new Set(Object.values(regionGroups).flat().filter(city => text.includes(city)))];
  function askSpecificJob() {
    const camHint = selectedCareer === careers[1] ? "\n可以直接说岗位关键词，例如：抗阻、菲林、MI、Gerber、拼版等。" : "\n直接说岗位名称或关键词即可。";
    addMessage("ai",`请告诉我您目前具体负责哪些岗位，或者哪些岗位可以接受。${camHint}`);
    addChips("细分岗位参考", careerJobs[selectedCareer] || ["工程师", "主管", "经理"]);
  }
  function extractCamJobs(text) {
    const rules = [
      [/cam工程师|\bcam\b(?!主管|经理)/i, "CAM工程师"], [/mi工程师|\bmi\b(?!主管)/i, "MI工程师"], [/dfmt|dfm/i, "DFMT工程师"],
      [/gerber/i, "Gerber工程师"], [/pcb设计/i, "PCB设计工程师"], [/layout/i, "Layout工程师"],
      [/阻抗|抗阻/i, "阻抗设计工程师"], [/拼版/i, "拼版工程师"], [/菲林/i, "菲林工程师"], [/工程资料|资料/i, "工程资料工程师"],
      [/cam主管/i, "CAM主管"], [/mi主管/i, "MI主管"], [/cam经理/i, "CAM经理"], [/工程部经理/i, "工程部经理"], [/工程总监/i, "工程总监"]
    ];
    return [...new Set(rules.filter(([pattern]) => pattern.test(text)).map(([,job]) => job))];
  }
  function addCategoryMatchCard() {
    const card = document.createElement("div");
    card.className = "category-match-card";
    card.innerHTML = `<span class="category-target" aria-hidden="true">◎</span><div><small>根据地区和工种初步匹配</small><strong>535 <em>个岗位</em></strong><p>继续补充信息，推荐会更精准</p></div><img class="match-yaodi-like" src="../assets/yaodi-thumbs-up.png" alt="幺弟点赞" />`;
    conversation.append(card); scrollLatest();
  }
  function showCategoryMatches() {
    stage = "refineChoice";
    addCategoryMatchCard();
    addMessage("ai","目前已为您匹配到535个岗位。\n是否愿意继续提供信息，以便推荐更精准的岗位？");
  }
  function addPreciseMatchCard() {
    const card = document.createElement("div");
    card.className = "precise-match-card";
    card.innerHTML = `<span class="precise-icon" aria-hidden="true">◎</span><div><small>根据细分岗位精准匹配</small><strong>48 <em>个岗位</em></strong></div><img class="match-yaodi-like" src="../assets/yaodi-thumbs-up.png" alt="幺弟点赞" />`;
    conversation.append(card); scrollLatest();
  }
  function showPreciseMatches() {
    stage = "personalInfoChoice";
    addPreciseMatchCard();
    addMessage("ai","已为您精准匹配到48个岗位。\n为方便投递后HR第一时间联系您，是否愿意填写个人基本信息？");
  }
  function openPersonalInfoModal(reminder = false) {
    personalInfoHint.textContent = reminder ? "填写基本信息后可以查阅并投递所有岗位" : "方便投递职位后，HR 第一时间联系您";
    personalInfoHint.classList.toggle("personal-reminder", reminder);
    personalInfoModal.hidden = false;
  }
  function closePersonalInfoModal() { personalInfoModal.hidden = true; }
  function openJobDetail(article) {
    const salaryCity = article.querySelector(".job-card-top>b").textContent.split("｜");
    const experienceEducation = article.querySelector(".job-experience").textContent.split("·").map(value => value.trim());
    const company = article.querySelector(".job-company").textContent;
    const title = article.querySelector("h3").textContent;
    document.querySelector("#jobDetailTitle").textContent = title;
    document.querySelector("#detailSalary").innerHTML = `${escapeHtml(salaryCity[0].trim())} <em>/ 月</em>`;
    document.querySelector("#detailCity").textContent = (salaryCity[1] || selectedLocations).trim();
    document.querySelector("#detailExperience").textContent = experienceEducation[0] || "经验不限";
    document.querySelector("#detailEducation").textContent = experienceEducation[1] || "学历不限";
    document.querySelector("#detailCompany").textContent = company;
    document.querySelector("#detailCompanyAgain").textContent = company;
    document.querySelector("#detailCompanyLogo").innerHTML = escapeHtml(company.slice(0,4).replace(/(.{2})/, "$1<br>"));
    document.querySelector("#detailTags").innerHTML = [...article.querySelectorAll(".job-card-footer span")].map(tag => `<span>${escapeHtml(tag.textContent)}</span>`).join("");
    document.querySelector("#detailIntro").textContent = `负责${title}岗位相关工作，推动PCB工程资料处理、制造衔接与交付效率持续改善。`;
    activeJobShareData = {jobName:title,company,companyIntro:company.includes("股份")?"上市公司 · PCB行业领先企业":"PCB行业优质招聘企业",salary:salaryCity[0].trim(),location:(salaryCity[1]||selectedLocations).trim(),experience:experienceEducation[0]||"经验不限",education:experienceEducation[1]||"学历不限",tags:[...article.querySelectorAll(".job-card-footer span")].map(tag=>tag.textContent)};
    document.querySelector("#applyJob").textContent = "一键投递";
    document.querySelector("#contactHr").textContent = "立即沟通";
    jobDetail.hidden = false;
    jobDetail.querySelector(".job-detail-scroll").scrollTop = 0;
  }
  function closeJobDetail() { jobDetail.hidden = true; }
  function addJobResults(restricted = false) {
    const camResults = [
      ["CAM工程师", "15–22K｜深圳", "深圳景旺电子股份有限公司", "3-5年 · 大专", ["CAM", "工程设计"]],
      ["MI工程师", "13–20K｜东莞", "广东生益电子股份有限公司", "3-5年 · 大专", ["MI制作", "PCB设计"]],
      ["CAM高级工程师", "18–26K｜惠州", "惠州中京电子科技有限公司", "5-10年 · 本科", ["CAM", "技术骨干"]],
      ["MI主管", "20–30K｜广州", "广州兴森快捷电路科技有限公司", "5-10年 · 本科", ["MI管理", "团队管理"]],
      ["线路设计工程师", "14–21K｜佛山", "广东依顿电子科技股份有限公司", "3-5年 · 大专", ["线路设计", "PCB制造"]],
      ["阻抗设计工程师", "17–25K｜深圳", "深南电路股份有限公司", "3-5年 · 本科", ["阻抗设计", "高速板"]],
      ["菲林工程师", "12–18K｜东莞", "东莞市五株电子科技有限公司", "1-3年 · 大专", ["菲林", "工程资料"]],
      ["CAM经理", "25–38K｜广州", "广州广合科技股份有限公司", "10年以上 · 本科", ["CAM管理", "部门管理"]]
    ];
    const processResults = [
      ["工艺工程师", "16–24K｜深圳", "深南电路股份有限公司", "3-5年 · 本科", ["PCB制造", "工艺技术"]],
      ["制程工程师", "14–21K｜东莞", "广东生益电子股份有限公司", "3-5年 · 大专", ["制程改善", "良率提升"]],
      ["阻焊工程师", "15–23K｜惠州", "惠州中京电子科技有限公司", "3-5年 · 大专", ["阻焊", "工艺改善"]],
      ["工艺主管", "20–30K｜苏州", "苏州东山精密制造股份有限公司", "5-10年 · 本科", ["工艺管理", "团队管理"]],
      ["制程经理", "25–35K｜上海", "上海美维科技有限公司", "10年以上 · 本科", ["制程管理", "PCB制造"]],
      ["电镀工程师", "15–23K｜深圳", "深圳景旺电子股份有限公司", "3-5年 · 大专", ["电镀", "工艺技术"]],
      ["蚀刻工程师", "14–22K｜东莞", "东莞市五株电子科技有限公司", "3-5年 · 大专", ["蚀刻", "制程改善"]],
      ["工艺经理", "25–36K｜广州", "广州广合科技股份有限公司", "10年以上 · 本科", ["工艺管理", "部门管理"]]
    ];
    const results = selectedCareer === careers[1] ? camResults : processResults;
    const wrap = document.createElement("div");
    wrap.className = "job-results";
    wrap.innerHTML = `<div class="job-results-title"><b>为您推荐的岗位</b><span>精准匹配48个</span></div>${results.map(([title,salary,company,experience,tags],index)=>`<article class="${restricted && index >= 3 ? "job-locked" : ""}"><div class="job-card-top"><h3>${title}</h3><b>${salary}</b></div><strong class="job-company">${company}</strong><p class="job-experience">${experience}</p><div class="job-card-footer"><div>${tags.map(tag=>`<span>${tag}</span>`).join("")}</div><time>今天</time></div>${restricted && index >= 3 ? `<span class="job-lock-cover">🔒 填写信息后查看</span>` : ""}</article>`).join("")}`;
    wrap.querySelectorAll("article").forEach(article => article.addEventListener("click", () => {
      if (restricted) openPersonalInfoModal(true);
      else openJobDetail(article);
    }));
    conversation.append(wrap); scrollLatest();
  }
  function askCareerDirection() {
    addMessage("ai","接下来，请告诉我您目前主要从事哪个PCB岗位方向。\n您可以回复数字，也可以直接描述工作内容。");
    addCareerList();
  }

  function intro() {
    conversation.innerHTML = ""; stage = "region"; busy = false; selectedCareer = profile.career; selectedJobs = profile.jobs; selectedLocations = profile.regions;
    addMessage("ai", "您好，我是幺弟。您希望在哪些地区或城市发展？\n可以直接输入，也可以点击麦克风告诉我。\n例如：深圳和苏州、华南优先、不限地区。");
    addChips("参考表达", regions);
  }
  function regionIntro() {
    conversation.innerHTML = ""; stage = "region"; busy = false; selectedCareer = profile.career; selectedJobs = profile.jobs; selectedLocations = profile.regions;
    addMessage("ai", "您好，我是幺弟。您希望在哪些地区或城市发展？\n可以直接说大区、国家或具体城市，也可以选择多个地点。");
    addChips("例如", ["华南地区", "华东地区", "华中地区", "海外机会", "深圳", "苏州", "不限地区"]);
  }
  function southChinaFollowup() {
    conversation.innerHTML = ""; stage = "regionCity"; busy = false; selectedLocations = "华南地区";
    const originalRegionInput = sessionStorage.getItem("pcb101_region_input") || "华南";
    addMessage("ai", "您希望在哪些地区或城市发展？\n可以说大区，也可以直接说具体城市。");
    addMessage("user", originalRegionInput);
    addMessage("ai", "已识别您希望在华南地区发展。\n以下城市您有优先选择，还是都可以看？\n如果都可以，直接回复“都可以”。");
    addChips("华南地区城市", regionGroups["华南地区"]);
  }
  function handle(text) {
    const value = text.trim(); if (!value || busy) return;
    addMessage("user", value); input.value = "";
    if (stage === "regionCity") {
      const cityChoices = extractCities(value);
      const acceptsAllCities = allCitiesAccepted(value);
      selectedLocations = acceptsAllCities ? selectedLocations : (cityChoices.length ? cityChoices.join("、") : value);
      stage="career";
      delay(() => askCareerDirection());
    }
    else if (stage === "region") {
      const resolvedRegion = resolveRegion(value);
      const resolvedCities = extractCities(value);
      if (resolvedRegion) { selectedLocations = resolvedRegion; stage="career"; delay(() => askCareerDirection()); }
      else if (resolvedCities.length) { selectedLocations = resolvedCities.join("、"); stage="career"; delay(() => askCareerDirection()); }
      else { delay(()=>addMessage("ai","暂未识别到预设地区或城市，请换一种方式描述。")); }
    }
    else if (stage === "confirmRegion") {
      if (yes(value)) { stage="career"; delay(() => askCareerDirection()); }
      else if (no(value)) { stage="region"; delay(()=>addMessage("ai","好的，请重新描述您期望发展的地区或城市。")); }
      else delay(()=>addMessage("ai","请回复“是”或“不是”，帮助我确认地区。"));
    } else if (stage === "career") {
      const careerNumber = /^(10|[1-9])$/.test(value) ? Number(value) : 0;
      if (careerNumber) {
        selectedCareer = careers[careerNumber - 1];
        delay(() => showCategoryMatches());
      } else {
        selectedCareer = /^(cam|mi|cammi|mi设计)$/i.test(normalizeIntent(value)) || /\b(cam|mi)\b/i.test(value) ? careers[1] : careers[2];
        stage="confirmCareer";
        delay(()=>addMessage("ai",`我理解您的方向是：${selectedCareer}。\n请问是否正确？`));
      }
    }
    else if (stage === "confirmCareer") {
      if (yes(value)) { delay(() => showCategoryMatches()); }
      else if (no(value)) { stage="career"; delay(()=>{addMessage("ai","好的，请重新描述您的PCB岗位方向。");addCareerList();}); }
      else delay(()=>addMessage("ai","请回复“是”或“不是”，帮助我确认方向。"));
    } else if (stage === "refineChoice") {
      if (willing(value) || yes(value) || /精准|继续问|补充/.test(value)) { stage="job"; delay(() => askSpecificJob()); }
      else if (no(value) || /直接看|看岗位|先看看/.test(value)) { stage="browseJobs"; delay(()=>{addMessage("ai","好的，先为您展示当前匹配度较高的岗位。");addJobResults();}); }
      else delay(()=>addMessage("ai","您可以回复“愿意”继续精准匹配，或回复“直接看岗位”。"));
    } else if (stage === "job") {
      if (selectedCareer === careers[1]) {
        const camJobs = extractCamJobs(value);
        selectedJobs = camJobs.length ? camJobs.join("、") : value;
      } else selectedJobs = profile.jobs;
      delay(() => showPreciseMatches());
    }
    else if (stage === "personalInfoChoice") {
      if (willing(value) || yes(value) || /填写|提供/.test(value)) openPersonalInfoModal(false);
      else if (no(value) || /暂不|先看|跳过/.test(value)) { stage="browseJobs"; delay(()=>{addMessage("ai","可以，先为您开放前3个岗位，其余岗位填写基本信息后即可查看。");addJobResults(true);}); }
      else delay(()=>addMessage("ai","您可以回复“是”填写信息，或回复“暂不填写”先看前3个岗位。"));
    }
    else if (stage === "confirmJob") {
      if (yes(value)) { stage="refine"; delay(()=>{addDataCard();addMessage("ai","是否愿意提供更多信息，方便我为您推荐更精准的岗位？");}); }
      else if (no(value)) { stage="job"; delay(()=>addMessage("ai","好的，请重新说说您负责或可以接受的岗位。")); }
      else delay(()=>addMessage("ai","请回复“是”或“不是”，帮助我确认岗位。"));
    } else if (stage === "refine") {
      if (willing(value) || yes(value)) { stage="experience"; delay(()=>addMessage("ai","您在PCB行业有多少年从业经验？")); }
      else delay(()=>addMessage("ai","您可以回复“愿意”，继续完善匹配信息。"));
    } else if (stage === "experience") { stage="company"; delay(()=>addMessage("ai","您目前在哪家公司，担任什么岗位？")); }
    else if (stage === "company") { stage="finalConfirm"; delay(()=>{addDataCard(true);addMessage("ai","以上信息是否正确？");}); }
    else if (stage === "finalConfirm") {
      if (yes(value)) { stage="done"; delay(()=>{addMessage("ai","已为您进一步筛选出45个更匹配的岗位。");const b=document.createElement("button");b.className="restart-link";b.textContent="重新开始对话";b.onclick=intro;conversation.append(b);scrollLatest();}); }
      else if (no(value)) { stage="region"; delay(()=>{addMessage("ai","没问题，我们重新确认。请告诉我您期望发展的地区或城市。");addChips("参考表达",regions);}); }
      else delay(()=>addMessage("ai","请回复“是”或“不是”，确认以上信息。"));
    } else if (stage === "done" && /重新|开始/.test(value)) intro();
  }
  send.addEventListener("click",()=>handle(input.value));
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing)handle(input.value);});
  mic.addEventListener("click",()=>{
    if (mic.classList.contains("listening-active") || busy) return;
    mic.classList.add("listening-active"); listening.hidden=false;
    setTimeout(()=>{mic.classList.remove("listening-active");listening.hidden=true;input.value=voiceDemo[stage]||"是";input.focus();},1500);
  });
  const showLimitedJobs = () => {
    closePersonalInfoModal();
    if (!conversation.querySelector(".job-results")) {
      stage = "browseJobs";
      addMessage("ai","您可以先查看前3个岗位，填写基本信息后可查阅全部岗位。");
      addJobResults(true);
    }
  };
  document.querySelector("#closePersonalInfo").addEventListener("click", showLimitedJobs);
  document.querySelector("#skipPersonalInfo").addEventListener("click", showLimitedJobs);
  personalInfoForm.addEventListener("submit", event => {
    event.preventDefault();
    personalInfoComplete = true;
    closePersonalInfoModal();
    conversation.querySelector(".job-results")?.remove();
    stage = "browseJobs";
    addMessage("ai","个人信息已确认，全部48个精准岗位已为您解锁。");
    addJobResults(false);
  });
  document.querySelector("#closeJobDetail").addEventListener("click", closeJobDetail);
  document.querySelector("#backToJobs").addEventListener("click", closeJobDetail);
  document.querySelector("#shareJob").addEventListener("click", () => jobShareCard.open(activeJobShareData || {}));
  document.querySelector("#applyJob").addEventListener("click", event => { event.currentTarget.textContent = "已投递"; });
  document.querySelector("#contactHr").addEventListener("click", event => { event.currentTarget.textContent = "已发起沟通"; });
  prototypePage === 5 ? southChinaFollowup() : regionIntro();
})();
