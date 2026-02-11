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
  const breakdown = $("#calc-breakdown");
  const note = $("#refurb-note");
  const checked = $$("#calc-grid .calc-check:checked");

  if (checked.length === 0) {
    summary.classList.add("hidden");
    breakdown.classList.add("hidden");
    note.classList.add("hidden");
    return;
  }
  summary.classList.remove("hidden");
  breakdown.classList.remove("hidden");

  let totalCo2 = 0, totalWater = 0, totalRaw = 0;
  let totalMatCo2 = 0, totalMatWater = 0;
  let totalBom = 0, totalRetail = 0;
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
    totalWater += phone.waterFootprint * factor;
    totalRaw += stats.rawCost * factor;
    totalMatCo2 += stats.totalCo2 * factor;
    totalMatWater += stats.totalWater * factor;
    totalBom += phone.bomCost * factor;
    totalRetail += phone.retailPrice * factor;
  });

  $("#calc-co2").textContent = Math.round(totalCo2);
  $("#calc-co2-equiv").textContent = `≈ ${(totalCo2 / 8.89).toFixed(1)} gallons of gas burned`;

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

  // Render breakdown bars
  renderBreakdown(totalMatCo2, totalCo2, totalMatWater, totalWater, totalRaw, totalBom, totalRetail);
}

function renderBreakdown(matCo2, lifeCo2, matWater, lifeWater, rawCost, bomCost, retail) {
  const container = $("#calc-breakdown-bars");

  // CO2
  const mfgCo2 = lifeCo2 - matCo2;
  const co2Pct = Math.max((matCo2 / lifeCo2) * 100, 1);
  const co2RealPct = ((matCo2 / lifeCo2) * 100).toFixed(1);

  // Water
  const mfgWater = lifeWater - matWater;
  const waterPct = Math.max((matWater / lifeWater) * 100, 1);
  const waterRealPct = ((matWater / lifeWater) * 100).toFixed(1);

  // Cost
  const mfgCost = bomCost - rawCost;
  const otherCost = retail - bomCost;
  const rawPct = Math.max((rawCost / retail) * 100, 1);
  const bomPct = (mfgCost / retail) * 100;
  const costRealPct = ((rawCost / retail) * 100).toFixed(1);

  container.innerHTML = `
    <div class="bd-metric">
      <div class="bd-title">CO\u2082 Emissions <span class="bd-total">(${Math.round(lifeCo2)} kg total)</span></div>
      <div class="bd-bar">
        <div class="bd-seg bd-seg-extract" style="width:${co2Pct}%">
          <span class="bd-seg-label">${matCo2.toFixed(1)} kg</span>
        </div>
        <div class="bd-seg bd-seg-mfg">
          <span class="bd-seg-label">${mfgCo2.toFixed(0)} kg</span>
        </div>
      </div>
      <div class="bd-labels"><span>Material Extraction</span><span>Manufacturing & Use</span></div>
      <div class="bd-note">Extraction is ${co2RealPct}% of lifecycle CO\u2082</div>
    </div>

    <div class="bd-metric">
      <div class="bd-title">Water Usage <span class="bd-total">(${Math.round(lifeWater).toLocaleString()} L total)</span></div>
      <div class="bd-bar">
        <div class="bd-seg bd-seg-extract" style="width:${waterPct}%">
          <span class="bd-seg-label">${Math.round(matWater)} L</span>
        </div>
        <div class="bd-seg bd-seg-mfg">
          <span class="bd-seg-label">${Math.round(mfgWater).toLocaleString()} L</span>
        </div>
      </div>
      <div class="bd-labels"><span>Material Extraction</span><span>Manufacturing & Use</span></div>
      <div class="bd-note">Extraction is just ${waterRealPct}% of lifecycle water</div>
    </div>

    <div class="bd-metric">
      <div class="bd-title">Cost Breakdown <span class="bd-total">($${Math.round(retail).toLocaleString()} retail)</span></div>
      <div class="bd-bar">
        <div class="bd-seg bd-seg-extract" style="width:${rawPct}%">
          <span class="bd-seg-label">$${rawCost.toFixed(2)}</span>
        </div>
        <div class="bd-seg bd-seg-bom" style="width:${bomPct}%">
          <span class="bd-seg-label">$${Math.round(mfgCost).toLocaleString()}</span>
        </div>
        <div class="bd-seg bd-seg-other">
          <span class="bd-seg-label">$${Math.round(otherCost).toLocaleString()}</span>
        </div>
      </div>
      <div class="bd-labels bd-labels-3"><span>Raw Materials</span><span>Components & Assembly</span><span>R&D, Marketing, Profit</span></div>
      <div class="bd-note">Raw minerals are just ${costRealPct}% of the retail price</div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", renderGrid);
