export const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export const MET_HOURS_TARGET = 40; // weekly target in MET-hours
export const MET_MINS_TARGET = MET_HOURS_TARGET * 60; // 2400

export const USDA_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";

export const DEFAULT_TARGETS = {
  0:{cal:2100,protein:180,carbs:180,fat:70},
  1:{cal:2500,protein:200,carbs:250,fat:78},
  2:{cal:2100,protein:180,carbs:180,fat:70},
  3:{cal:2500,protein:200,carbs:250,fat:78},
  4:{cal:2100,protein:180,carbs:180,fat:70},
  5:{cal:2900,protein:200,carbs:300,fat:90},
  6:{cal:2100,protein:180,carbs:180,fat:70},
};

export function dateKey(d) {
  return d.toISOString().split("T")[0];
}

export function today() {
  return dateKey(new Date());
}

export function dayOfWeekFor(dateStr) {
  return new Date(dateStr + "T12:00:00").getDay();
}

export function shiftDateStr(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function getWeekDates(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const startOff = d.getDay();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - startOff + i);
    dates.push(dateKey(dd));
  }
  return dates;
}

export function extractMacros(foodNutrients) {
  if (!foodNutrients || !Array.isArray(foodNutrients)) {
    return { cal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  }
  const get = (id) => {
    const n = foodNutrients.find(
      n => n.nutrientId === id || n.nutrientNumber === String(id)
    );
    return n ? Math.round(n.value * 10) / 10 : 0;
  };
  return {
    cal: get(1008),
    protein: get(1003),
    fat: get(1004),
    carbs: get(1005),
    fiber: get(1079),
  };
}

export async function searchUSDA(query, apiKey, includeBranded = false) {
  if (!query || query.length < 2) return [];
  const dt = includeBranded
    ? "Foundation,SR%20Legacy,Branded"
    : "Foundation,SR%20Legacy";
  const url = `${USDA_BASE}?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=${dt}&pageSize=15&sortBy=dataType.keyword&sortOrder=asc`;
  const res = await fetch(url);
  const data = await res.json();
  // Extract household servings from foodMeasures
  const MEAT = /chicken|beef|pork|turkey|lamb|steak|ground|thigh|breast|loin|roast|brisket|ribs/i;
  const foods = (data.foods || []).map(f => ({
    ...f,
    servings: (f.foodMeasures || [])
      .filter(m => m.disseminationText && m.gramWeight > 0)
      .map(m => ({ label: m.disseminationText, grams: Math.round(m.gramWeight) }))
  }));
  return foods.sort((a, b) => {
    const aD = (a.description || "").toLowerCase();
    const bD = (b.description || "").toLowerCase();
    const aRawMeat = MEAT.test(aD) && /\braw\b/.test(aD);
    const bRawMeat = MEAT.test(bD) && /\braw\b/.test(bD);
    if (aRawMeat && !bRawMeat) return 1;
    if (bRawMeat && !aRawMeat) return -1;
    return 0;
  });
}

// Open Food Facts - no key needed, has barcodes + household servings
const OFF_BASE = "https://world.openfoodfacts.org";

export async function searchOFF(query) {
  if (!query || query.length < 2) return [];
  const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&search_simple=1&action=process`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.products || []).map(p => {
    const n = p.nutriments || {};
    return {
      description: p.product_name || p.generic_name || "Unknown",
      brandName: p.brands || null,
      dataType: "OpenFoodFacts",
      fdcId: null,
      offCode: p.code || null,
      foodNutrients: null,
      // Pre-extracted macros per 100g
      cal: Math.round(n["energy-kcal_100g"] || 0),
      protein: Math.round((n.proteins_100g || 0) * 10) / 10,
      fat: Math.round((n.fat_100g || 0) * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
      customId: `off-${p.code || p._id}`,
      servings: p.serving_size ? [{ label: p.serving_size, grams: Math.round(p.serving_quantity || 100) }] : [],
      image: p.image_small_url || null,
    };
  }).filter(p => p.description && p.description !== "Unknown" && p.cal > 0);
}

export async function lookupBarcode(code) {
  const url = `${OFF_BASE}/api/v0/product/${code}.json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments || {};
  return {
    description: p.product_name || "Unknown",
    brandName: p.brands || null,
    dataType: "OpenFoodFacts",
    offCode: code,
    customId: `off-${code}`,
    cal: Math.round(n["energy-kcal_100g"] || 0),
    protein: Math.round((n.proteins_100g || 0) * 10) / 10,
    fat: Math.round((n.fat_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
    servings: p.serving_size ? [{ label: p.serving_size, grams: Math.round(p.serving_quantity || 100) }] : [],
  };
}

// ─── Cycling / Cardio calorie estimation ───
// Keytel formula (male): cal/min = (-55.0969 + 0.6309*HR + 0.1988*weight_kg + 0.2017*age) / 4.184
export function caloriesPerMinute(hr, weightKg, age) {
  return Math.max(0, (-55.0969 + 0.6309 * hr + 0.1988 * weightKg + 0.2017 * age) / 4.184);
}

// Steady state: average HR over duration
export function steadyStateBurn(avgHr, durationMin, weightKg, age) {
  const cpm = caloriesPerMinute(avgHr, weightKg, age);
  return Math.round(cpm * durationMin);
}

// HIIT: segments at different HRs + EPOC modifier
// segments: [{hr, minutes}]  e.g. [{hr:170, minutes:4}, {hr:130, minutes:4}]
// rounds: how many times the segment pattern repeats
// warmup/cooldown added separately
export function hiitBurn(segments, rounds, warmupMin, cooldownMin, warmupHr, cooldownHr, weightKg, age) {
  let total = 0;
  // Warmup
  if (warmupMin > 0 && warmupHr > 0) {
    total += caloriesPerMinute(warmupHr, weightKg, age) * warmupMin;
  }
  // Interval rounds
  for (let r = 0; r < rounds; r++) {
    for (const seg of segments) {
      total += caloriesPerMinute(seg.hr, weightKg, age) * seg.minutes;
    }
  }
  // Cooldown
  if (cooldownMin > 0 && cooldownHr > 0) {
    total += caloriesPerMinute(cooldownHr, weightKg, age) * cooldownMin;
  }
  // EPOC: ~15% additional for HIIT
  total *= 1.15;
  return Math.round(total);
}

// Total duration of a HIIT session
export function hiitDuration(segments, rounds, warmupMin, cooldownMin) {
  const intervalMin = segments.reduce((s, seg) => s + seg.minutes, 0) * rounds;
  return warmupMin + intervalMin + cooldownMin;
}

// Estimate MET from calorie burn rate
export function calToMet(calPerMin, weightKg) {
  // 1 MET = 1 kcal/kg/hr = weightKg * 1.0 cal/hr at rest
  const calPerHour = calPerMin * 60;
  return calPerHour / (weightKg * 1.05);
}


let _scanLib = null;
export async function loadBarcodeLib() {
  if (_scanLib) return _scanLib;
  return new Promise((resolve, reject) => {
    if (window.Html5Qrcode) { _scanLib = window.Html5Qrcode; return resolve(_scanLib); }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    s.onload = () => { _scanLib = window.Html5Qrcode; resolve(_scanLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
