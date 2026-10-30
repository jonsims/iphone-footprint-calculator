const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function computePhoneStats(phone) {
  let rawCost = 0, totalWater = 0, totalCo2 = 0;
  phone.materials.forEach((m) => {
    const info = materials[m.id];
    if (!info) return;
    const kg = m.grams / 1000;
    rawCost += info.pricePerKg * kg;
    totalWater += info.eco.waterPerKg * kg;
    totalCo2 += info.eco.co2PerKg * kg;
  });
  return { rawCost, totalWater, totalCo2 };
}

function renderGrid() {
  const grid = $("#calc-grid");
  grid.innerHTML = phones
    .map(
      (p) => `
    <label class="calc-phone" data-id="${p.id}">
      <input type="checkbox" class="calc-check" value="${p.id}" />
      <span class="calc-phone-name">${p.name}</span>
      <span class="calc-phone-year">${p.year}</span>
      <span class="calc-refurb-toggle">
        <button type="button" class="calc-toggle-btn active" data-condition="new" aria-pressed="true">New</button>
        <button type="button" class="calc-toggle-btn" data-condition="refurb" aria-pressed="false">Refurb</button>
      </span>
    </label>`
    )
    .join("");

  grid.querySelectorAll(".calc-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest(".calc-refurb-toggle");
      parent.querySelectorAll(".calc-toggle-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      // Choosing New or Refurb also checks the phone, so one tap counts it.
      btn.closest(".calc-phone").querySelector(".calc-check").checked = true;
      update();
    });
  });

  grid.querySelectorAll(".calc-check").forEach((cb) => {
    cb.addEventListener("change", update);
  });
}

// Small pictures for the icon rows: a gas can, a bathtub, and a coin.
const ICON = {
  co2: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 4h8l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1.5 2v4h7V6zM18 3l3 3-1.2 1.2-3-3z"/></svg>',
  water: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 11h18v2a6 6 0 0 1-4 5.66V21h-2v-2H9v2H7v-2.34A6 6 0 0 1 3 13zM6 10V5a3 3 0 0 1 6 0h-2a1 1 0 0 0-2 0v5z"/></svg>',
  raw: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7"/></svg>',
};
const MAX_ICONS = 24;

// Draws one icon per unit, with the unit growing (1, 2, 5, 10...) so a row
// never holds more than MAX_ICONS pictures.
function iconRow(kind, amount, noun) {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const unit = steps.find((u) => amount / u <= MAX_ICONS) || 1000;
  const n = Math.max(0, Math.round(amount / unit));
  $(`#${kind}-icons`).innerHTML = ICON[kind].repeat(Math.min(n, MAX_ICONS));
  $(`#${kind}-key`).textContent = n ? `Each picture is ${unit} ${unit === 1 ? noun.one : noun.many}.` : "";
}

function selected() {
  return $$("#calc-grid .calc-check:checked").map((cb) => {
    const phone = phones.find((p) => p.id === cb.value);
    const refurb = cb.closest(".calc-phone").querySelector('.calc-toggle-btn[data-condition="refurb"]').classList.contains("active");
    const f = refurb ? 0.2 : 1.0;
    return { phone, refurb, co2: phone.carbonFootprint * f, water: phone.waterFootprint * f, raw: computePhoneStats(phone).rawCost * f };
  }).filter((x) => x.phone);
}

function update() {
  const picks = selected();
  const dash = $("#dash");
  dash.classList.toggle("dash-empty", picks.length === 0);
  const totalCo2 = picks.reduce((t, x) => t + x.co2, 0);
  const totalWater = picks.reduce((t, x) => t + x.water, 0);
  const totalRaw = picks.reduce((t, x) => t + x.raw, 0);
  const gallons = totalCo2 / 8.89;
  const tubs = totalWater / 300;

  $("#calc-co2").textContent = Math.round(totalCo2).toLocaleString();
  $("#calc-water").textContent = Math.round(totalWater).toLocaleString();
  $("#calc-raw").textContent = "$" + totalRaw.toFixed(2);

  if (picks.length) {
    $("#calc-co2-equiv").textContent = `About the same as burning ${gallons.toFixed(1)} gallons of gas.`;
    $("#calc-water-equiv").textContent = `About ${tubs.toFixed(1)} full bathtubs.`;
    $("#calc-raw-equiv").textContent = "Gold, cobalt, and rare earths make up most of this.";
    iconRow("co2", gallons, { one: "gallon of gas", many: "gallons of gas" });
    iconRow("water", tubs, { one: "bathtub", many: "bathtubs" });
    iconRow("raw", totalRaw, { one: "dollar", many: "dollars" });
  } else {
    $("#calc-co2-equiv").textContent = "Carbon from making, shipping, and using your phones.";
    $("#calc-water-equiv").textContent = "Water used over each phone's life cycle.";
    $("#calc-raw-equiv").textContent = "What the metals inside your phones would sell for.";
    for (const k of ["co2", "water", "raw"]) {
      $(`#${k}-icons`).innerHTML = ICON[k].repeat(8);
      $(`#${k}-key`).textContent = "";
    }
  }

  // One bar per phone, oldest first, scaled to the biggest phone checked.
  const chart = $("#chart");
  const sorted = [...picks].sort((x, y) => x.phone.year - y.phone.year || phones.indexOf(x.phone) - phones.indexOf(y.phone));
  if (!sorted.length) {
    chart.innerHTML = '<div class="empty">Your phones will show up here as bars.</div>';
  } else {
    const top = Math.max(...sorted.map((x) => x.co2), 1);
    const keep = new Map([...chart.querySelectorAll(".bar")].map((el) => [el.dataset.id, el]));
    chart.querySelector(".empty")?.remove();
    const frag = document.createDocumentFragment();
    for (const x of sorted) {
      let el = keep.get(x.phone.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "bar";
        el.dataset.id = x.phone.id;
        el.innerHTML = '<div class="plot"><span class="num"></span><div class="fill" style="height:0%"></div></div><div class="label"></div>';
        el.querySelector(".label").textContent = `${x.phone.name.replace("iPhone ", "")} (${x.phone.year})`;
      }
      el.classList.toggle("refurb", x.refurb);
      el.querySelector(".num").textContent = Math.round(x.co2);
      el.title = `${x.phone.name}, ${x.refurb ? "refurbished" : "new"}: ${Math.round(x.co2)} kg CO2`;
      frag.append(el);
    }
    chart.replaceChildren(frag);
    requestAnimationFrame(() => {
      for (const x of sorted) chart.querySelector(`.bar[data-id="${x.phone.id}"] .fill`).style.height = `${(x.co2 / top) * 82}%`;
    });
  }

  const refurbCount = picks.filter((x) => x.refurb).length;
  const newCount = picks.length - refurbCount;
  const parts = [];
  if (newCount) parts.push(`${newCount} new`);
  if (refurbCount) parts.push(`${refurbCount} refurbished`);
  $("#calc-devices-equiv").textContent = picks.length
    ? `${picks.length} ${picks.length === 1 ? "phone" : "phones"}: ${parts.join(", ")}`
    : "Check a phone below to start.";
  $("#mini-text").textContent = picks.length
    ? `${Math.round(totalCo2).toLocaleString()} kg CO₂ · ${Math.round(totalWater).toLocaleString()} L water · ${picks.length} ${picks.length === 1 ? "phone" : "phones"}`
    : "Check your phones to see your footprint.";
  $("#refurb-note").classList.toggle("hidden", !refurbCount);
}

// The slim totals bar shows once the dashboard scrolls out of view.
function watchDash() {
  const mini = $("#mini");
  $("#mini-top").addEventListener("click", () => $("#dash").scrollIntoView({ behavior: "smooth", block: "start" }));
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(([e]) => { mini.hidden = e.isIntersecting; }, { threshold: 0 }).observe($("#dash"));
}

document.addEventListener("DOMContentLoaded", () => {
  renderGrid();
  watchDash();
  update();
});
