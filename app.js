const STORAGE_KEY = "plodnee-mvp-v1";

const today = new Date();
const isoDate = (date = today) => date.toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Number(value || 0));
const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(today);
const dateLabel = (value) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`));

const seedState = () => {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return {
    sessionUserId: null,
    strategy: "avalanche",
    budget: 70000,
    users: [
      { id: "u1", name: "คุณวรัญญา", role: "owner", pin: "1234" },
      { id: "u2", name: "คุณแม่", role: "member", pin: "1234" },
      { id: "u3", name: "คุณน้อง", role: "member", pin: "1234" }
    ],
    debts: [
      { id: "d1", name: "ค่าบ้านหลังที่ 1", type: "บ้าน", balance: 1250000, rate: 3.25, minimum: 12500, dueDay: 5, ownerId: "u1" },
      { id: "d2", name: "ค่าบ้านหลังที่ 2", type: "บ้าน", balance: 870000, rate: 3.8, minimum: 9800, dueDay: 28, ownerId: "u1" },
      { id: "d3", name: "ค่าผ่อนรถยนต์", type: "รถยนต์", balance: 368000, rate: 5.9, minimum: 8900, dueDay: 15, ownerId: "u1" },
      { id: "d4", name: "บัตรเครดิตธนาคาร A", type: "บัตรเครดิต", balance: 42000, rate: 18.0, minimum: 2500, dueDay: 10, ownerId: "u1" }
    ],
    expenses: [
      { id: "e1", title: "ค่าบ้านหลังที่ 1", amount: 12500, date: `${year}-${month}-05`, category: "บ้าน", type: "debt", userId: "u1", recurring: true },
      { id: "e2", title: "ค่าผ่อนรถยนต์", amount: 8900, date: `${year}-${month}-15`, category: "รถยนต์", type: "debt", userId: "u1", recurring: true },
      { id: "e3", title: "เติมน้ำมันรถ", amount: 1200, date: `${year}-${month}-20`, category: "รถยนต์", type: "personal", userId: "u1", recurring: false },
      { id: "e4", title: "ค่าโทรศัพท์", amount: 899, date: `${year}-${month}-18`, category: "มือถือ/อินเทอร์เน็ต", type: "essential", userId: "u2", recurring: true },
      { id: "e5", title: "ประกันชีวิต", amount: 3200, date: `${year}-${month}-02`, category: "ประกัน", type: "essential", userId: "u1", recurring: true },
      { id: "e6", title: "ค่าอาหารส่วนตัว", amount: 1560, date: `${year}-${month}-21`, category: "อาหาร", type: "personal", userId: "u3", recurring: false }
    ]
  };
};

let state = loadState();
let currentView = "dashboard";
let toastTimer;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...seedState(), ...JSON.parse(saved) } : seedState();
  } catch {
    return seedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentUser() {
  return state.users.find((user) => user.id === state.sessionUserId) || state.users[0];
}

function userName(id) {
  return state.users.find((user) => user.id === id)?.name || "ไม่ระบุ";
}

function initials(name) {
  return (name || "?").replace("คุณ", "").trim().slice(0, 1) || "?";
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function monthExpenses() {
  const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return state.expenses.filter((expense) => expense.date.startsWith(prefix));
}

function totalDebt() {
  return state.debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
}

function totalMinimum() {
  return state.debts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
}

function monthlySpent() {
  return monthExpenses().reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function debtFreeMonths() {
  const extra = Math.max(0, state.budget - monthlySpent());
  const payment = Math.max(totalMinimum(), totalMinimum() + extra * 0.35);
  return payment ? Math.ceil(totalDebt() / payment) : 0;
}

function sortedPlan() {
  return [...state.debts].sort((a, b) => state.strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate);
}

function dateDueLabel(day) {
  const due = new Date(today.getFullYear(), today.getMonth(), day);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff === 0) return "ครบกำหนดวันนี้";
  if (diff > 0) return `อีก ${diff} วัน`;
  return "ครบกำหนดแล้ว";
}

function debtIcon(type) {
  if (type === "รถยนต์") return "car-front";
  if (type === "บัตรเครดิต") return "credit-card";
  return "home";
}

function gameStats() {
  const score = Math.min(80, state.expenses.length * 2 + state.debts.length * 3);
  const level = Math.min(5, 1 + Math.floor(score / 20));
  const xp = score % 20;
  const titles = ["เริ่มต้น", "ตั้งหลัก", "คุมเกม", "เดินหน้า", "ใกล้ปลดหนี้"];
  const coins = state.expenses.length * 35 + state.debts.length * 120;
  const task = state.expenses.length < 7 ? "บันทึกรายจ่ายให้ครบ 7 รายการ" : "บันทึกการชำระหนี้ก้อนแรก";
  return { score, level, xp, titles, coins, task };
}

function renderAppShell() {
  const user = currentUser();
  document.querySelector("#sidebar-name").textContent = user.name;
  document.querySelector("#sidebar-avatar").textContent = initials(user.name);
  document.querySelector("#page-kicker").textContent = `${currentView === "dashboard" ? "Dashboard" : viewTitle(currentView)} · ${monthLabel}`;
  document.querySelector("#page-title").textContent = pageHeading(currentView);
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === currentView));
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === `view-${currentView}`));
  renderDashboard();
  renderDebts();
  renderExpenses();
  renderPlan();
  renderFamily();
  refreshIcons();
}

function viewTitle(view) {
  return { debts: "หนี้ของฉัน", expenses: "รายจ่าย", plan: "แผนปลดหนี้", family: "ครอบครัว" }[view] || "Dashboard";
}

function pageHeading(view) {
  return { dashboard: `สวัสดีค่ะ ${currentUser().name}`, debts: "หนี้ทั้งหมดของบ้าน", expenses: "รายจ่ายของครอบครัว", plan: "แผนปลดหนี้ที่ทำตามได้", family: "สมาชิกและการมองเห็นข้อมูล" }[view];
}

function renderDashboard() {
  const spent = monthlySpent();
  const remaining = Math.max(0, state.budget - spent);
  const debtProgress = totalDebt() ? Math.max(0, Math.min(100, (1 - totalDebt() / (totalDebt() + 42000)) * 100)) : 0;
  const game = gameStats();
  const categories = [
    ["บ้าน", monthExpenses().filter((e) => e.category === "บ้าน").reduce((s, e) => s + e.amount, 0), "blue"],
    ["รถยนต์", monthExpenses().filter((e) => e.category === "รถยนต์").reduce((s, e) => s + e.amount, 0), ""],
    ["ส่วนตัว", monthExpenses().filter((e) => e.type === "personal").reduce((s, e) => s + e.amount, 0), "amber"]
  ];
  const maxCategory = Math.max(...categories.map((item) => item[1]), 1);
  const recent = [...monthExpenses()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const dueDebts = [...state.debts].sort((a, b) => a.dueDay - b.dueDay).slice(0, 3);
  document.querySelector("#view-dashboard").innerHTML = `
    <div class="view-head"><div><h2>ภาพรวมการเงินของบ้าน</h2><p>วันนี้เราค่อย ๆ จัดการไปทีละก้าวนะ</p></div><button class="btn btn-ghost" type="button" data-action="open-debt"><i data-lucide="plus" aria-hidden="true"></i>เพิ่มหนี้</button></div>
    <section class="game-hero">
      <div class="mascot-stage"><div class="mascot" role="img" aria-label="ตัวการ์ตูนผู้ช่วยปลดหนี้"><span class="mascot-ear left"></span><span class="mascot-ear right"></span><span class="mascot-face"><span class="mascot-eye left"></span><span class="mascot-eye right"></span><span class="mascot-cheek left"></span><span class="mascot-cheek right"></span><span class="mascot-mouth"></span></span><span class="mascot-body"></span></div><span class="mascot-caption">ไปด้วยกันนะ!</span></div>
      <div class="game-content">
        <div class="game-topline"><span class="level-pill">${icon("sparkles")} เลเวล ${game.level} · ${game.titles[game.level - 1]}</span><span class="coin-count">${icon("coins")} ${number(game.coins)} เหรียญ</span></div>
        <h2>ด่านต่อไป: ${game.task}</h2>
        <p>ทุกก้าวเล็ก ๆ ช่วยให้เราเข้าใกล้วันที่ปลดหนี้ได้มากขึ้น</p>
        <div class="xp-head"><span>ประสบการณ์ก่อนขึ้นเลเวลถัดไป</span><strong>${game.xp}/20 XP</strong></div><div class="xp-track"><div class="xp-fill" style="width:${Math.max(8, game.xp * 5)}%"></div></div>
        <div class="game-path">${game.titles.map((title, index) => `<div class="path-node ${index + 1 < game.level ? "is-done" : ""} ${index + 1 === game.level ? "is-current" : ""}"><span class="path-dot">${index + 1 < game.level ? "✓" : index + 1}</span><span>${title}</span></div>`).join("")}</div>
        <div class="quest-row"><span class="quest-chip">${icon("calendar-check")} บันทึกแล้ว ${monthExpenses().length} รายการ</span><span class="quest-chip">${icon("heart")} บ้านนี้มี ${state.users.length} คน</span></div>
      </div>
    </section>
    <section class="metric-grid">
      <article class="metric-card"><div class="metric-label">หนี้คงเหลือทั้งหมด</div><div class="metric-value tabular">${money(totalDebt())}</div><div class="metric-note"><strong>${number(debtProgress)}%</strong> ความคืบหน้าจากยอดเริ่มต้น</div></article>
      <article class="metric-card"><div class="metric-label">ค่างวดขั้นต่ำ/เดือน</div><div class="metric-value tabular">${money(totalMinimum())}</div><div class="metric-note">ต้องกันเงินไว้ก่อนวันครบกำหนด</div></article>
      <article class="metric-card"><div class="metric-label">รายจ่ายเดือนนี้</div><div class="metric-value tabular">${money(spent)}</div><div class="metric-note ${spent > state.budget ? "warn" : ""}"><strong>${spent > state.budget ? "เกินงบ" : `เหลือ ${money(remaining)}`}</strong> จากงบ ${money(state.budget)}</div></article>
      <article class="metric-card"><div class="metric-label">คาดว่าจะปลดหนี้ใน</div><div class="metric-value tabular">${debtFreeMonths()} เดือน</div><div class="metric-note">จากข้อมูลที่บันทึกไว้ตอนนี้</div></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-head"><h3>งบประมาณครอบครัวเดือนนี้</h3><span>กันไว้ ${money(state.budget)}</span></div><div class="budget-line"><span class="budget-spent tabular">${money(spent)}</span><span class="budget-total">ใช้ไป ${Math.min(100, Math.round((spent / state.budget) * 100))}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, (spent / state.budget) * 100)}%"></div></div><div class="budget-foot"><span>คงเหลือ <strong>${money(remaining)}</strong></span><span>ปรับงบได้ในตั้งค่า</span></div></article>
      <article class="panel"><div class="panel-head"><h3>สัดส่วนค่าใช้จ่าย</h3><span>${monthLabel}</span></div><div class="category-bars">${categories.map(([name, value, color]) => `<div class="category-row"><span class="category-name">${name}</span><span class="bar-track"><span class="bar-fill ${color}" style="width:${Math.max(5, (value / maxCategory) * 100)}%"></span></span><span class="category-value tabular">${money(value)}</span></div>`).join("")}</div></article>
    </section>
    <section class="two-column">
      <article class="panel"><div class="section-title"><h2>รายการล่าสุด</h2><button class="text-btn" type="button" data-action="view-expenses">ดูทั้งหมด →</button></div>${recent.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>รายการ</th><th>วันที่</th><th>ผู้บันทึก</th><th>จำนวนเงิน</th></tr></thead><tbody>${recent.map(expenseRow).join("")}</tbody></table></div>` : `<div class="empty-state">ยังไม่มีรายการในเดือนนี้</div>`}</article>
      <div class="stack"><article class="panel"><div class="section-title"><h2>รายการใกล้ถึงกำหนด</h2><button class="text-btn" type="button" data-action="view-debts">จัดการ</button></div><div class="due-list">${dueDebts.map((debt) => `<div class="due-row"><div class="due-copy"><div class="due-name">${debt.name}</div><div class="due-date">วันที่ ${debt.dueDay} · ${dateDueLabel(debt.dueDay)}</div></div><span class="due-badge">${money(debt.minimum)}</span></div>`).join("")}</div></article><div class="next-action">${icon("sparkles")}<div><strong>ก้าวถัดไปที่แนะนำ</strong><p>${sortedPlan()[0] ? `ตรวจสอบ ${sortedPlan()[0].name} และกันเงินเพิ่มอีก ${money(Math.round(Math.max(0, state.budget - spent) * .15))} หากเดือนนี้ยังเหลือ` : "เพิ่มข้อมูลหนี้เพื่อสร้างแผนปลดหนี้"}</p></div></div></div>
    </section>`;
  bindActionButtons();
}

function expenseRow(expense) {
  const iconName = expense.category === "บ้าน" ? "home" : expense.category === "รถยนต์" ? "car-front" : expense.category === "มือถือ/อินเทอร์เน็ต" ? "smartphone" : expense.type === "personal" ? "user-round" : "receipt";
  const iconClass = expense.category === "บ้าน" ? "house" : expense.category === "รถยนต์" ? "car" : expense.type === "personal" ? "personal" : "phone";
  return `<tr><td><span class="icon-square ${iconClass}">${icon(iconName)}</span>${expense.title}<small>${expense.category}${expense.recurring ? " · ประจำ" : ""}</small></td><td>${dateLabel(expense.date)}</td><td>${userName(expense.userId)}</td><td class="right tabular">${money(expense.amount)}</td></tr>`;
}

function renderDebts() {
  const rows = [...state.debts].sort((a, b) => b.balance - a.balance).map((debt) => `<tr><td><span class="icon-square ${debt.type === "รถยนต์" ? "car" : "house"}">${icon(debtIcon(debt.type))}</span>${debt.name}<small>${debt.type} · ดอกเบี้ย ${debt.rate}%/ปี</small></td><td class="tabular">${money(debt.balance)}</td><td class="tabular">${money(debt.minimum)}</td><td><span class="status ${debt.dueDay < today.getDate() ? "warn" : ""}">วันที่ ${debt.dueDay}</span></td><td><button class="icon-btn" type="button" data-action="pay-debt" data-id="${debt.id}" aria-label="บันทึกการชำระ ${debt.name}">${icon("circle-check")}</button></td></tr>`).join("");
  document.querySelector("#view-debts").innerHTML = `<div class="view-head"><div><h2>หนี้ทั้งหมดของบ้าน</h2><p>เก็บข้อมูลให้ครบ เพื่อให้แผนปลดหนี้แม่นขึ้น</p></div><button class="btn btn-primary" type="button" data-action="open-debt"><i data-lucide="plus" aria-hidden="true"></i>เพิ่มหนี้</button></div><div class="two-column"><article class="panel"><div class="section-title"><h2>รายการหนี้</h2><span class="muted">${state.debts.length} รายการ</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>หนี้</th><th>ยอดคงเหลือ</th><th>ขั้นต่ำ/เดือน</th><th>กำหนดจ่าย</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="empty-state">ยังไม่มีข้อมูลหนี้</div></td></tr>`}</tbody></table></div></article><div class="stack"><article class="panel"><div class="panel-head"><h3>ภาพรวมหนี้</h3><span>ทุกประเภท</span></div><div class="debt-progress"><div class="debt-progress-row"><span>ยอดรวม</span><strong class="tabular">${money(totalDebt())}</strong></div><div class="debt-progress-row"><span>ขั้นต่ำรวมต่อเดือน</span><strong class="tabular">${money(totalMinimum())}</strong></div><div class="debt-progress-row"><span>ดอกเบี้ยสูงสุด</span><strong>${Math.max(...state.debts.map((debt) => debt.rate), 0)}%/ปี</strong></div></div></article><div class="next-action">${icon("shield-alert")}<div><strong>อย่าสร้างหนี้ใหม่โดยไม่คำนวณก่อน</strong><p>ใช้ตัวจำลองในหน้าแผนปลดหนี้เพื่อดูผลต่อกระแสเงินสดก่อนตัดสินใจ</p></div></div></div></div>`;
  bindActionButtons();
}

function renderExpenses() {
  const expenses = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector("#view-expenses").innerHTML = `<div class="view-head"><div><h2>รายจ่ายของครอบครัว</h2><p>รายการของสมาชิกทุกคนจะแสดงตามสิทธิ์ของบ้าน</p></div><button class="btn btn-primary" type="button" data-action="open-expense"><i data-lucide="plus" aria-hidden="true"></i>เพิ่มรายจ่าย</button></div><article class="panel"><div class="section-title"><h2>รายการทั้งหมด</h2><span class="muted">${expenses.length} รายการ</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>รายการ</th><th>วันที่</th><th>ผู้บันทึก</th><th>จำนวนเงิน</th></tr></thead><tbody>${expenses.map(expenseRow).join("") || `<tr><td colspan="4"><div class="empty-state">ยังไม่มีรายการค่าใช้จ่าย</div></td></tr>`}</tbody></table></div></article>`;
  bindActionButtons();
}

function renderPlan() {
  const plan = sortedPlan();
  const extra = Math.max(0, state.budget - monthlySpent());
  const steps = plan.map((debt, index) => `<div class="plan-step"><span class="step-number">${index + 1}</span><div><strong>${debt.name}</strong><small>ยอด ${money(debt.balance)} · ดอกเบี้ย ${debt.rate}% · ขั้นต่ำ ${money(debt.minimum)}</small></div><span class="step-amount">${money(debt.minimum + (index === 0 ? Math.round(extra * .35) : 0))}</span></div>`).join("");
  document.querySelector("#view-plan").innerHTML = `<div class="view-head"><div><h2>แผนปลดหนี้ที่ทำตามได้</h2><p>เลือกวิธีจัดลำดับหนี้ แล้วดูจำนวนเงินที่ควรกันไว้</p></div><div class="strategy-switch" role="group" aria-label="วิธีจัดลำดับหนี้"><button type="button" class="${state.strategy === "snowball" ? "is-active" : ""}" data-strategy="snowball">ยอดเล็กก่อน</button><button type="button" class="${state.strategy === "avalanche" ? "is-active" : ""}" data-strategy="avalanche">ดอกเบี้ยสูงก่อน</button></div></div><div class="two-column"><article class="panel"><div class="panel-head"><h3>${state.strategy === "snowball" ? "Snowball · ปิดยอดเล็กก่อน" : "Avalanche · ลดดอกเบี้ยก่อน"}</h3><span>เงินเหลือสำหรับโปะ ${money(extra)}</span></div><div>${steps || `<div class="empty-state">เพิ่มหนี้ก่อน เพื่อให้ระบบสร้างแผน</div>`}</div></article><div class="stack"><article class="panel"><div class="panel-head"><h3>เป้าหมายของแผน</h3><span>เดือนนี้</span></div><div class="debt-progress"><div class="debt-progress-row"><span>ขั้นต่ำที่ต้องจ่าย</span><strong class="tabular">${money(totalMinimum())}</strong></div><div class="debt-progress-row"><span>เงินโปะที่แนะนำ</span><strong class="tabular">${money(Math.round(extra * .35))}</strong></div><div class="debt-progress-row"><span>คาดการณ์ปลดหนี้</span><strong>${debtFreeMonths()} เดือน</strong></div></div></article><div class="next-action">${icon("info")}<div><strong>แผนนี้เป็นตัวช่วยวางงบ</strong><p>ก่อนเพิ่มค่างวด ควรกันเงินฉุกเฉินและตรวจสอบเงื่อนไขกับเจ้าหนี้ของคุณ</p></div></div></div></div>`;
  document.querySelectorAll("[data-strategy]").forEach((button) => button.addEventListener("click", () => { state.strategy = button.dataset.strategy; saveState(); renderAppShell(); }));
  refreshIcons();
}

function renderFamily() {
  const user = currentUser();
  const members = state.users.map((member) => { const total = state.expenses.filter((expense) => expense.userId === member.id).reduce((sum, expense) => sum + expense.amount, 0); return `<div class="member-row"><span class="avatar">${initials(member.name)}</span><div class="member-copy"><div class="member-name">${member.name}${member.id === user.id ? " (คุณ)" : ""}</div><div class="member-role">${member.role === "owner" ? "เจ้าของบ้าน" : "สมาชิก"} · เข้าสู่ระบบด้วย PIN</div></div><div class="member-total tabular">${money(total)}</div></div>`; }).join("");
  document.querySelector("#view-family").innerHTML = `<div class="view-head"><div><h2>สมาชิกและการมองเห็นข้อมูล</h2><p>ทุกคนเพิ่มรายการของตัวเองได้ โดยข้อมูลจะรวมใน Dashboard ของบ้าน</p></div><button class="btn btn-primary" type="button" data-action="open-member"><i data-lucide="user-plus" aria-hidden="true"></i>เพิ่มสมาชิก</button></div><div class="two-column"><article class="panel"><div class="section-title"><h2>สมาชิกในบ้าน</h2><span class="muted">${state.users.length} คน</span></div><div class="member-list">${members}</div><div class="family-invite"><p>เพิ่มสมาชิกใหม่ได้โดยตั้ง PIN สำหรับทดลองใช้งาน</p><button class="btn btn-ghost" type="button" data-action="open-member">เชิญสมาชิก</button></div></article><div class="stack"><article class="panel"><div class="panel-head"><h3>สิทธิ์ของคุณ</h3><span>${user.role === "owner" ? "เจ้าของบ้าน" : "สมาชิก"}</span></div><div class="debt-progress"><div class="debt-progress-row"><span>บันทึกรายจ่ายของตัวเอง</span><strong>เปิด</strong></div><div class="debt-progress-row"><span>ดูยอดรวมของบ้าน</span><strong>เปิด</strong></div><div class="debt-progress-row"><span>จัดการสมาชิก</span><strong>${user.role === "owner" ? "เปิด" : "จำกัด"}</strong></div></div></article><div class="next-action">${icon("lock-keyhole")}<div><strong>ข้อมูลนี้เป็นโหมดทดลอง</strong><p>เวอร์ชันแรกเก็บข้อมูลไว้ในเบราว์เซอร์เครื่องนี้ ยังไม่ควรใส่เลขบัญชีหรือข้อมูลสำคัญจริง</p></div></div></div></div>`;
  bindActionButtons();
}

function bindActionButtons() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.action;
      if (action === "open-expense" || action === "view-expenses") action === "view-expenses" ? navigate("expenses") : openModal("expense-modal");
      if (action === "open-debt" || action === "view-debts") action === "view-debts" ? navigate("debts") : openModal("debt-modal");
      if (action === "open-member") openModal("member-modal");
      if (action === "pay-debt") handleDebtPayment(button.dataset.id);
    };
  });
}

function navigate(view) {
  currentView = view;
  renderAppShell();
}

function openModal(id) {
  document.querySelector("#modal-backdrop").hidden = false;
  document.querySelectorAll(".modal").forEach((modal) => { modal.hidden = modal.id !== id; });
  if (id === "expense-modal") document.querySelector("#expense-form [name=date]").value = isoDate();
  refreshIcons();
}

function closeModal() {
  document.querySelector("#modal-backdrop").hidden = true;
  document.querySelectorAll(".modal").forEach((modal) => { modal.hidden = true; });
}

function handleDebtPayment(id) {
  const debt = state.debts.find((item) => item.id === id);
  if (!debt) return;
  const payment = Math.min(debt.minimum, debt.balance);
  debt.balance -= payment;
  state.expenses.push({ id: `e-${Date.now()}`, title: `ชำระ ${debt.name}`, amount: payment, date: isoDate(), category: debt.type, type: "debt", userId: currentUser().id, recurring: false });
  saveState();
  renderAppShell();
  showToast(`บันทึกการชำระ ${money(payment)} แล้ว`);
}

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const user = state.users.find((item) => item.id === document.querySelector("#login-user").value);
  const pin = document.querySelector("#login-pin").value;
  if (!user || user.pin !== pin) { showToast("รหัสผ่านไม่ถูกต้อง"); return; }
  state.sessionUserId = user.id;
  saveState();
  document.querySelector("#login-screen").hidden = true;
  document.querySelector("#app-screen").hidden = false;
  renderAppShell();
  showToast(`ยินดีต้อนรับ ${user.name}`);
});

document.querySelector("#logout-btn").addEventListener("click", () => {
  state.sessionUserId = null;
  saveState();
  document.querySelector("#app-screen").hidden = true;
  document.querySelector("#login-screen").hidden = false;
  showToast("ออกจากระบบแล้ว");
});

document.querySelector("#main-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) navigate(button.dataset.view);
});

document.querySelector("#add-expense-btn").addEventListener("click", () => openModal("expense-modal"));
document.querySelector("#notification-btn").addEventListener("click", () => showToast("มี 3 รายการใกล้ถึงกำหนดชำระ"));
document.querySelectorAll(".close-modal").forEach((button) => button.addEventListener("click", closeModal));
document.querySelector("#modal-backdrop").addEventListener("click", (event) => { if (event.target.id === "modal-backdrop") closeModal(); });

document.querySelector("#expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.expenses.push({ id: `e-${Date.now()}`, title: data.get("title"), amount: Number(data.get("amount")), date: data.get("date"), category: data.get("category"), type: data.get("type"), userId: currentUser().id, recurring: data.get("recurring") === "on" });
  saveState(); closeModal(); event.currentTarget.reset(); renderAppShell(); showToast("บันทึกรายจ่ายแล้ว");
});

document.querySelector("#debt-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.debts.push({ id: `d-${Date.now()}`, name: data.get("name"), type: data.get("type"), balance: Number(data.get("balance")), rate: Number(data.get("rate")), minimum: Number(data.get("minimum")), dueDay: Number(data.get("dueDay")), ownerId: currentUser().id });
  saveState(); closeModal(); event.currentTarget.reset(); renderAppShell(); showToast("เพิ่มหนี้เข้าแผนแล้ว");
});

document.querySelector("#member-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const newUser = { id: `u-${Date.now()}`, name: data.get("name"), role: data.get("role"), pin: data.get("pin") };
  state.users.push(newUser);
  saveState(); closeModal(); event.currentTarget.reset(); renderAppShell(); populateLoginUsers(); showToast(`เพิ่ม ${newUser.name} แล้ว`);
});

function populateLoginUsers() {
  document.querySelector("#login-user").innerHTML = state.users.map((user) => `<option value="${user.id}">${user.name}</option>`).join("");
}

populateLoginUsers();
if (state.sessionUserId) {
  document.querySelector("#login-screen").hidden = true;
  document.querySelector("#app-screen").hidden = false;
  renderAppShell();
}
refreshIcons();
