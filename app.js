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
      <div class="calc-refurb-toggle">
        <button class="calc-toggle-btn active" data-condition="new">New</button>
        <button class="calc-toggle-btn" data-condition="refurb">Refurb</button>
      </div>
    </label>`
    )
    .join("");

  grid.querySelectorAll(".calc-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest(".calc-refurb-toggle");
      parent.querySelectorAll(".calc-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      update();
    });
  });

  grid.querySelectorAll(".calc-check").forEach((cb) => {
    cb.addEventListener("change", update);
  });
}

function update() {
  const summary = $("#calc-summary");
  const note = $("#refurb-note");
  const checked = $$("#calc-grid .calc-check:checked");

  if (checked.length === 0) {
    summary.classList.add("hidden");
    note.classList.add("hidden");
    return;
  }
  summary.classList.remove("hidden");

  let totalCo2 = 0, totalWater = 0, totalRaw = 0;
  let hasRefurb = false;

  checked.forEach((cb) => {
    const phone = phones.find((p) => p.id === cb.value);
    if (!phone) return;

    const label = cb.closest(".calc-phone");
    const isRefurb = label.querySelector('.calc-toggle-btn[data-condition="refurb"]').classList.contains("active");
    if (isRefurb) hasRefurb = true;
    const factor = isRefurb ? 0.2 : 1.0;

    const stats = computePhoneStats(phone);
    totalCo2 += phone.carbonFootprint * factor;
    totalWater += stats.totalWater * factor;
    totalRaw += stats.rawCost * factor;
  });

  $("#calc-co2").textContent = Math.round(totalCo2);
  $("#calc-co2-equiv").textContent = `≈ ${Math.round(totalCo2 * 2.3)} miles driven`;

  $("#calc-water").textContent = Math.round(totalWater).toLocaleString();
  $("#calc-water-equiv").textContent = `≈ ${(totalWater / 300).toFixed(1)} bathtubs`;

  $("#calc-raw").textContent = "$" + totalRaw.toFixed(2);
  $("#calc-raw-equiv").textContent = "in raw minerals";

  $("#calc-devices").textContent = checked.length;
  const refurbCount = checked.filter((cb) => {
    const label = cb.closest(".calc-phone");
    return label.querySelector('.calc-toggle-btn[data-condition="refurb"]').classList.contains("active");
  }).length;
  const newCount = checked.length - refurbCount;
  const parts = [];
  if (newCount > 0) parts.push(`${newCount} new`);
  if (refurbCount > 0) parts.push(`${refurbCount} refurbished`);
  $("#calc-devices-equiv").textContent = parts.join(", ");

  note.classList.toggle("hidden", !hasRefurb);
}

document.addEventListener("DOMContentLoaded", renderGrid);
