// ======= Simple front-end "database" with JSON file support =======
// Notes:
// - This is a front-end demo (no server). For real-world use add server auth & database.
// - Data persists in your browser via localStorage. You can Export/Import db.json from Settings.

const DB_KEY = "bismillahDB_v3"; // bumped key to force fresh seed

// Safe UUID for older browsers
const uuid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

// A tiny seeded default dataset - mirrored in db.json
const defaultDB = {
  version: 3, // bump version so old local data won't override the new categories
  admin: { username: "admin", password: "admin123" }, // demo only
  // Comprehensive categories for a mobile repairing shop (deduped & title-cased)
  categories: [
   "Display",
  "Touchscreen Digitizer",
  "Front Glass",
  "Battery",
  "Charging Port",
  "Power IC / PMIC",
  "Audio IC",
  "RF / Baseband / Wi-Fi IC",
  "Storage (eMMC / UFS / NAND)",
  "RAM / DRAM",
  "Speakers",
  "Microphones",
  "Vibration Motor",
  "Front Camera",
  "Rear Camera",
  "Proximity / Light Sensors",
  "Gyroscope / Accelerometer",
  "Fingerprint Sensor",
  "Antenna",
  "SIM Tray & Slot",
  "Frame & Housing",
  "Back Cover",
  "Side Buttons (Power, Volume, Mute)"
  ],
  brands: [
    "Apple", "Samsung", "Xiaomi", "Oppo", "Vivo",
    "Infinix", "Realme", "Nokia", "Tecno",
    "OnePlus", "Huawei", "Motorola", "Generic"
  ],
  inventory: [
    {
      id: uuid(),
      name: "iPhone 13 Display (OEM)",
      sku: "IP13-DSP-OEM",
      category: "Displays",
      brand: "Apple",
      cost_price: 28000,
      sale_price: 35000,
      stock: 4,
      low_stock_threshold: 2,
      compatibility: ["iPhone 13"],
      last_updated: new Date().toISOString()
    },
    {
      id: uuid(),
      name: "Samsung Galaxy S21 Battery",
      sku: "SMG-S21-BATT",
      category: "Batteries",
      brand: "Samsung",
      cost_price: 9000,
      sale_price: 12500,
      stock: 12,
      low_stock_threshold: 3,
      compatibility: ["Galaxy S21", "Galaxy S21 5G"],
      last_updated: new Date().toISOString()
    },
    {
      id: uuid(),
      name: "Fast Charger 25W (Type-C)",
      sku: "GEN-CHG-25W",
      category: "Chargers",
      brand: "Generic",
      cost_price: 1200,
      sale_price: 2200,
      stock: 35,
      low_stock_threshold: 8,
      compatibility: ["Universal", "Galaxy S Series", "iPhone 15"],
      last_updated: new Date().toISOString()
    }
  ]
};

// --- State
let DB = null;
let state = {
  filters: {
    category: "",
    brand: "",
    compat: "",
    lowOnly: false,
    globalSearch: ""
  },
  loggedIn: false
};

// --- Elements
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const loginScreen = $("#login-screen");
const appRoot = $("#app");

const navLinks = $$(".nav-link");
const views = $$(".view");

const statSKUs = $("#stat-skus");
const statUnits = $("#stat-units");
const statCost = $("#stat-cost");
const statSales = $("#stat-sales");
const statLow = $("#stat-low");

const tableBody = $("#inventory-body");
const emptyState = $("#empty-state");

// --- Utils
function money(num){
  return "Rs " + (Number(num) || 0).toLocaleString();
}
function tryParseJSON(text){
  try { return JSON.parse(text); } catch(e){ return null; }
}
function saveDB(){
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  // Also update the JSON file
  downloadJSONFile();
}

function downloadJSONFile(){
  const blob = new Blob([JSON.stringify(DB, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "db.json";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

// Normalize + dedupe lists (case-insensitive), keep first seen casing, then sort
function normalizeListCaseInsensitive(arr){
  const seen = new Map();
  for (const raw of arr || []) {
    const v = String(raw || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (!seen.has(key)) seen.set(key, v);
  }
  return Array.from(seen.values()).sort((a,b)=> a.localeCompare(b));
}
function normalizeTaxonomies(){
  DB.categories = normalizeListCaseInsensitive(DB.categories || []);
  DB.brands = normalizeListCaseInsensitive(DB.brands || []);
}

// Load order: localStorage (if version matches) → db.json (if available) → defaults
async function loadDB(){
  const fromLocal = tryParseJSON(localStorage.getItem(DB_KEY));
  if (fromLocal && fromLocal.version === defaultDB.version){
    DB = fromLocal;
  } else {
    try {
      const res = await fetch("db.json", { cache: "no-store" });
      if (res.ok) {
        DB = await res.json();
      } else {
        DB = structuredClone(defaultDB);
      }
    } catch(e){
      DB = structuredClone(defaultDB);
    }
    normalizeTaxonomies();
    saveDB();
  }
  normalizeTaxonomies();
}

function ensureLists(){
  // Keep what the user selected
  const prevCat = state.filters.category || "";
  const prevBrand = state.filters.brand || "";

  const catSel = $("#filter-category");
  const brSel = $("#filter-brand");
  const catList = $("#category-list");
  const brList = $("#brand-list");

  // Rebuild options/datalists
  catSel.innerHTML = `<option value="">All</option>`;
  brSel.innerHTML = `<option value="">All</option>`;
  catList.innerHTML = "";
  brList.innerHTML = "";

  for(const c of DB.categories){
    const opt1 = document.createElement("option");
    opt1.value = c; opt1.textContent = c;
    catSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = c;
    catList.appendChild(opt2);
  }
  for(const b of DB.brands){
    const opt1 = document.createElement("option");
    opt1.value = b; opt1.textContent = b;
    brSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = b;
    brList.appendChild(opt2);
  }

  // Restore selection if still present; else default to "All"
  const hasCat = [...catSel.options].some(opt => opt.value === prevCat);
  const hasBrand = [...brSel.options].some(opt => opt.value === prevBrand);
  catSel.value = hasCat ? prevCat : "";
  brSel.value = hasBrand ? prevBrand : "";
}

// --- Auth (demo only)
function login(username, password){
  if(username === DB.admin.username && password === DB.admin.password){
    state.loggedIn = true;
    localStorage.setItem("bm_logged_in", "1");
    showApp();
  } else {
    alert("Invalid credentials");
  }
}
function logout(){
  state.loggedIn = false;
  localStorage.removeItem("bm_logged_in");
  showLogin();
}

// --- Routing
function switchView(targetId){
  for(const link of navLinks){
    const selected = link.dataset.target === targetId;
    link.classList.toggle("active", selected);
    link.setAttribute("aria-selected", String(selected));
  }
  for(const v of views){
    const active = v.id === targetId;
    v.classList.toggle("hidden", !active);
    v.setAttribute("aria-hidden", String(!active));
  }
  if(targetId === "dashboard") renderDashboard();
  if(targetId === "inventory") renderInventory();
}

// --- Render Dashboard
function renderDashboard(){
  const inv = DB.inventory || [];
  const totalSKUs = inv.length;
  const totalUnits = inv.reduce((s,i)=> s + (Number(i.stock)||0), 0);
  const totalCost = inv.reduce((s,i)=> s + ((Number(i.cost_price)||0) * (Number(i.stock)||0)), 0);
  const totalSales = inv.reduce((s,i)=> s + ((Number(i.sale_price)||0) * (Number(i.stock)||0)), 0);
  const lowCount = inv.filter(i => Number(i.stock) <= Number(i.low_stock_threshold)).length;

  statSKUs.textContent = totalSKUs;
  statUnits.textContent = totalUnits.toLocaleString();
  statCost.textContent = money(totalCost);
  statSales.textContent = money(totalSales);
  statLow.textContent = lowCount;

  // Chart: stock per category
  const byCat = {};
  for(const i of inv){
    const cat = i.category || "Uncategorized";
    byCat[cat] = (byCat[cat] || 0) + Number(i.stock || 0);
  }
  const labels = Object.keys(byCat);
  const values = Object.values(byCat);

  drawBarChart($("#category-chart"), labels, values);
}

// Plain Canvas bar chart (no external libs)
function drawBarChart(canvas, labels, values){
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  // Keep the explicit attribute height from HTML, match width to CSS box
  const W = canvas.width = canvas.clientWidth;
  const H = canvas.height; // honor provided height attribute
  ctx.clearRect(0,0,W,H);

  const margin = {top: 20, right: 20, bottom: 44, left: 46};
  const w = Math.max(0, W - margin.left - margin.right);
  const h = Math.max(0, H - margin.top - margin.bottom);

  const maxVal = Math.max(1, ...values);
  const barW = values.length ? Math.max(18, Math.min(80, w / values.length * 0.6)) : 40;
  const gap = values.length > 1 ? (w - barW * values.length) / (values.length - 1) : 0;

  // Axes
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, H - margin.bottom);
  ctx.lineTo(W - margin.right, H - margin.bottom);
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, H - margin.bottom);
  ctx.stroke();

  // Bars
  for(let i=0;i<values.length;i++){
    const x = margin.left + i * (barW + gap);
    const bh = Math.round((values[i] / maxVal) * (h - 2));
    const y = H - margin.bottom - bh;
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, "rgba(58,168,255,0.9)");
    grad.addColorStop(1, "rgba(58,168,255,0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, bh);
  }

  // Labels (x)
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  for(let i=0;i<labels.length;i++){
    const x = margin.left + i * (barW + gap) + barW/2;
    const label = String(labels[i] ?? "");
    const trimmed = label.length > 16 ? label.slice(0,15)+"…" : label;
    ctx.fillText(trimmed, x, H - margin.bottom + 16);
  }

  // Labels (y)
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  const steps = 4;
  for(let s=0; s<=steps; s++){
    const val = Math.round(maxVal * s/steps);
    const y = H - margin.bottom - (h * s/steps);
    ctx.fillText(String(val), margin.left - 6, y + 4);
  }
}

// --- Render Inventory
function matchesFilters(item){
  const f = state.filters;
  const search = (f.globalSearch || "").toLowerCase();
  const compatQ = (f.compat || "").toLowerCase();

  if(f.category && item.category !== f.category) return false;
  if(f.brand && item.brand !== f.brand) return false;
  if(f.lowOnly && Number(item.stock) > Number(item.low_stock_threshold)) return false;

  const compatStr = (item.compatibility || []).join(", ").toLowerCase();
  const core = [item.name, item.sku, item.brand, item.category].join(" ").toLowerCase();

  if(compatQ && !compatStr.includes(compatQ)) return false;
  if(search && !core.includes(search) && !compatStr.includes(search)) return false;

  return true;
}

function renderInventory(){
  ensureLists(); // make sure filter select + datalists are populated
  const items = (DB.inventory || []).filter(matchesFilters);
  tableBody.innerHTML = "";

  if(items.length === 0){
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  for(const item of items){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div><strong>${escapeHTML(item.name)}</strong></div>
        <div class="muted tiny">${new Date(item.last_updated).toLocaleString()}</div>
      </td>
      <td>${escapeHTML(item.sku)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td>${escapeHTML(item.brand)}</td>
      <td>${Number(item.sale_price).toLocaleString()}</td>
      <td>${item.stock}</td>
      <td>${item.low_stock_threshold}</td>
      <td>
        <div class="badges">
          ${(item.compatibility||[]).map(c => `<span class="badge">${escapeHTML(c)}</span>`).join("")}
        </div>
      </td>
      <td>
        <div class="actions">
          <button class="icon-btn" title="Increase stock" aria-label="Increase stock" data-act="inc" data-id="${item.id}">▲</button>
          <button class="icon-btn" title="Decrease stock" aria-label="Decrease stock" data-act="dec" data-id="${item.id}">▼</button>
          <button class="icon-btn" title="Edit item" aria-label="Edit item" data-act="edit" data-id="${item.id}">✎</button>
          <button class="icon-btn" title="Delete item" aria-label="Delete item" data-act="del" data-id="${item.id}">🗑</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  }
}

function escapeHTML(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// --- CRUD helpers
function getItem(id){ return (DB.inventory || []).find(i => i.id === id); }

function pushTaxonomyValue(listName, value){
  const v = String(value || "").trim();
  if (!v) return;
  const exists = (DB[listName] || []).some(x => String(x).trim().toLowerCase() === v.toLowerCase());
  if (!exists) DB[listName].push(v);
}

function addItem(payload){
  const item = {
    id: uuid(),
    name: payload.name,
    sku: payload.sku,
    category: payload.category,
    brand: payload.brand,
    cost_price: Number(payload.cost_price || 0),
    sale_price: Number(payload.sale_price || 0),
    stock: Number(payload.stock || 0),
    low_stock_threshold: Number(payload.low_stock_threshold || 0),
    compatibility: payload.compatibility || [],
    last_updated: new Date().toISOString()
  };
  DB.inventory.unshift(item);

  pushTaxonomyValue("categories", item.category);
  pushTaxonomyValue("brands", item.brand);

  normalizeTaxonomies();
  saveDB();
}

function updateItem(id, payload){
  const it = getItem(id);
  if(!it) return;

  Object.assign(it, {
    name: payload.name,
    sku: payload.sku,
    category: payload.category,
    brand: payload.brand,
    cost_price: Number(payload.cost_price || 0),
    sale_price: Number(payload.sale_price || 0),
    stock: Number(payload.stock || 0),
    low_stock_threshold: Number(payload.low_stock_threshold || 0),
    compatibility: payload.compatibility || [],
    last_updated: new Date().toISOString()
  });

  pushTaxonomyValue("categories", it.category);
  pushTaxonomyValue("brands", it.brand);

  normalizeTaxonomies();
  saveDB();
}

function deleteItem(id){
  DB.inventory = (DB.inventory || []).filter(i => i.id !== id);
  saveDB();
}

function adjustStock(id, delta){
  const it = getItem(id);
  if(!it) return;
  it.stock = Math.max(0, Number(it.stock || 0) + delta);
  it.last_updated = new Date().toISOString();
  saveDB();
  renderInventory();
  renderDashboard();
}

// --- Modal
const modal = $("#modal");
const modalTitle = $("#modal-title");
const modalClose = $("#modal-close");
const modalCancel = $("#modal-cancel");
const itemForm = $("#item-form");

function openModal(mode, item){
  ensureLists(); // make sure datalists are filled *before* user types
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  modalTitle.textContent = mode === "add" ? "Add Item" : "Edit Item";

  $("#item-id").value = item?.id || "";
  $("#item-name").value = item?.name || "";
  $("#item-sku").value = item?.sku || "";
  $("#item-category").value = item?.category || "";
  $("#item-brand").value = item?.brand || "";
  $("#item-cost").value = item?.cost_price ?? "";
  $("#item-sale").value = item?.sale_price ?? "";
  $("#item-stock").value = item?.stock ?? "";
  $("#item-low").value = item?.low_stock_threshold ?? 5;
  $("#item-compat").value = (item?.compatibility || []).join(", ");
}
function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  itemForm.reset();
}

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(); });

itemForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const payload = {
    name: $("#item-name").value.trim(),
    sku: $("#item-sku").value.trim(),
    category: $("#item-category").value.trim(),
    brand: $("#item-brand").value.trim(),
    cost_price: Number($("#item-cost").value),
    sale_price: Number($("#item-sale").value),
    stock: Number($("#item-stock").value),
    low_stock_threshold: Number($("#item-low").value),
    compatibility: $("#item-compat").value.split(",").map(s => s.trim()).filter(Boolean)
  };
  const id = $("#item-id").value;
  if(id){ updateItem(id, payload); }
  else  { addItem(payload); }
  closeModal();
  renderInventory();
  renderDashboard();
});

// --- Settings: Export / Import
$("#export-json").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(DB, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "db.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
});

$("#import-json").addEventListener("change", async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const text = await file.text();
    const obj = tryParseJSON(text);
    if(!obj?.inventory || !obj?.admin) return alert("Invalid db.json file.");
    DB = obj;
    normalizeTaxonomies();
    saveDB();
    ensureLists();
    renderDashboard();
    renderInventory();
    alert("Data imported.");
  } catch(err){
    alert("Failed to import db.json");
  }
});

// --- Actions
$("#add-item-btn").addEventListener("click", ()=> openModal("add"));

tableBody.addEventListener("click", (e)=>{
  const btn = e.target.closest("button[data-act]");
  if(!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  if(act === "inc") adjustStock(id, +1);
  if(act === "dec") adjustStock(id, -1);
  if(act === "edit") openModal("edit", getItem(id));
  if(act === "del"){
    if(confirm("Delete this item?")){ deleteItem(id); renderInventory(); renderDashboard(); }
  }
});

// Filters
$("#filter-category").addEventListener("change", e => { state.filters.category = e.target.value; renderInventory(); });
$("#filter-brand").addEventListener("change", e => { state.filters.brand = e.target.value; renderInventory(); });
$("#filter-compat").addEventListener("input", e => { state.filters.compat = e.target.value; renderInventory(); });
$("#filter-low").addEventListener("change", e => { state.filters.lowOnly = e.target.checked; renderInventory(); });
$("#clear-filters").addEventListener("click", ()=>{
  state.filters = {...state.filters, category:"", brand:"", compat:"", lowOnly:false};
  $("#filter-category").value = "";
  $("#filter-brand").value = "";
  $("#filter-compat").value = "";
  $("#filter-low").checked = false;
  renderInventory();
});

// Global search
$("#global-search").addEventListener("input", (e)=>{ state.filters.globalSearch = e.target.value; renderInventory(); });

// Nav
for(const link of navLinks){
  link.addEventListener("click", ()=> switchView(link.dataset.target));
}

// Login form
$("#login-form").addEventListener("submit", (e)=>{
  e.preventDefault();
  const u = $("#login-username").value.trim();
  const p = $("#login-password").value;
  login(u,p);
});

$("#logout-btn").addEventListener("click", logout);

function showApp(){
  loginScreen.classList.add("hidden");
  appRoot.classList.remove("hidden");
  appRoot.setAttribute("aria-hidden", "false");
  switchView("dashboard");
}
function showLogin(){
  appRoot.classList.add("hidden");
  appRoot.setAttribute("aria-hidden", "true");
  loginScreen.classList.remove("hidden");
}

// --- Initialize
(async function init(){
  await loadDB();
  ensureLists();            // <-- populate Category/Brand filter + datalists on startup
  const wasLogged = localStorage.getItem("bm_logged_in") === "1";
  if(wasLogged){ showApp(); } else { showLogin(); }
  renderDashboard();
  renderInventory();
})();
