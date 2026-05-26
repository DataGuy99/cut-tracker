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
  const get = (id) => {
    const n = foodNutrients?.find(
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
  return data.foods || [];
}
