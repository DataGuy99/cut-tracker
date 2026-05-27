import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EXERCISES, BLOCKED_DEFAULT, CATEGORIES } from "./data/exercises";
import { load, save, exportAll, clearAll, ALL_KEYS } from "./lib/storage";
import {
  DAYS, SHORT_DAYS, DEFAULT_TARGETS, MET_HOURS_TARGET, MET_MINS_TARGET,
  today, dateKey, dayOfWeekFor, shiftDateStr, getWeekDates,
  extractMacros, searchUSDA, searchOFF,
  steadyStateBurn, hiitBurn, hiitDuration, calToMet, caloriesPerMinute,
} from "./lib/utils";
import "./App.css";

// ─── Shared components ───
function Bar({ label, cur, max, color, suffix = "" }) {
  const pct = max > 0 ? Math.min((cur / max) * 100, 100) : 0;
  const over = cur > max;
  return (
    <div className="bar">
      <div className="bar-header">
        <span className={over ? "bar-label over" : "bar-label"}>{label}</span>
        <span>{Math.round(cur)}/{max}{suffix}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: over ? "#ff6b6b" : color }} />
      </div>
    </div>
  );
}

function FoodRow({ food, onAdd, onFav, isFav }) {
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("g"); // "g" or index into servings
  const m = food.customId ? food : extractMacros(food.foodNutrients);
  const servingOptions = food.servings || [];

  // Calculate grams from amount + unit
  const grams = unit === "g" ? (+amount || 0) : (+amount || 0) * (servingOptions[+unit]?.grams || 100);
  const mult = grams / 100;

  return (
    <div className="food-row">
      <div className="food-row-top">
        <div className="food-info">
          <div className="food-name">{food.description || food.name}</div>
          <div className="food-source">{food.dataType || "Custom"}{food.brandName ? ` - ${food.brandName}` : ""}</div>
          <div className="food-macros">per 100g: {m.cal}cal P:{m.protein} C:{m.carbs} F:{m.fat}</div>
        </div>
        <button className={isFav ? "fav-btn active" : "fav-btn"} onClick={() => onFav(food)}>&#9733;</button>
      </div>
      <div className="food-row-bottom">
        <input type="number" value={amount} placeholder={unit === "g" ? "grams" : "how many"}
          onChange={e => setAmount(e.target.value)} className="num-input" style={{width:70}} />
        <select value={unit} onChange={e => { setUnit(e.target.value); setAmount(""); }}
          className="num-input" style={{width:"auto",minWidth:50,textAlign:"left",padding:"5px 4px"}}>
          <option value="g">grams</option>
          {servingOptions.slice(0, 5).map((s, i) => (
            <option key={i} value={i}>{s.label} ({s.grams}g)</option>
          ))}
        </select>
        <div className="food-cal-preview">{grams > 0 ? `${Math.round(m.cal * mult)}cal` : ""}</div>
        <button className="add-btn" onClick={() => { if (grams > 0) onAdd(food, grams, 1); setAmount(""); }}>+</button>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [tab, setTab] = useState("home");
  const [targets, setTargets] = useState(() => load("targets", DEFAULT_TARGETS));
  const [tdee, setTdee] = useState(() => load("tdee", 2400));
  const [foodLogs, setFoodLogs] = useState(() => load("food", {}));
  const [workLogs, setWorkLogs] = useState(() => load("work", {}));
  const [favorites, setFavorites] = useState(() => load("favs", []));
  const [customFoods, setCustomFoods] = useState(() => load("custom", []));
  const [weightLog, setWeightLog] = useState(() => load("weight", {}));
  const [blocked, setBlocked] = useState(() => load("blocked", BLOCKED_DEFAULT));
  const [apiKey, setApiKey] = useState(() => load("apikey", "DEMO_KEY"));
  const [userWeightLbs, setUserWeightLbs] = useState(() => load("user_wt", 200));
  const [userAge, setUserAge] = useState(() => load("user_age", 30));
  const [viewDate, setViewDate] = useState(today());

  // Food search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
    const [showFavs, setShowFavs] = useState(false);
  const searchTimer = useRef(null);
  const [scanActive, setScanActive] = useState(false);
  const scanRef = useRef(null);

  // Workout entry
  const [selExercise, setSelExercise] = useState(null);
  const [setData, setSetData] = useState([{ w: 135, r: 10 }, { w: 135, r: 10 }, { w: 135, r: 10 }]);
  const [wRir, setWRir] = useState(2);
  const [showExList, setShowExList] = useState(false);
  const [exFilter, setExFilter] = useState("All");

  // Cardio entry
  const [cardioMode, setCardioMode] = useState("steady");
  const [cAvgHr, setCAvgHr] = useState(140);
  const [cDur, setCDur] = useState(45);
  const [cHighHr, setCHighHr] = useState(170);
  const [cLowHr, setCLowHr] = useState(130);
  const [cHighMin, setCHighMin] = useState(4);
  const [cLowMin, setCLowMin] = useState(4);
  const [cRounds, setCRounds] = useState(4);
  const [cWarmup, setCWarmup] = useState(5);
  const [cCooldown, setCCooldown] = useState(5);

  // Weight + setup
  const [weightIn, setWeightIn] = useState("");
  const [setupPanel, setSetupPanel] = useState(null);
  const [editDay, setEditDay] = useState(null);
  const [customForm, setCustomForm] = useState({ name: "", cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  // ─── Save wrapper ───
  const sv = (key, val, setter) => { setter(val); save(key, val); };

  // ─── Derived data ───
  const dow = dayOfWeekFor(viewDate);
  const dayTarget = targets[dow] || DEFAULT_TARGETS[0];
  const dayFood = foodLogs[viewDate] || [];
  const dayWork = workLogs[viewDate] || [];

  const foodTotals = useMemo(() => dayFood.reduce((a, e) => ({
    cal: a.cal + e.cal, protein: a.protein + e.protein,
    carbs: a.carbs + e.carbs, fat: a.fat + e.fat,
  }), { cal: 0, protein: 0, carbs: 0, fat: 0 }), [dayFood]);

  const workBurn = useMemo(() => dayWork.reduce((s, e) => s + e.burn, 0), [dayWork]);
  const dayMetMin = useMemo(() => dayWork.reduce((s, e) => s + (e.metMin || 0), 0), [dayWork]);
  const deficit = tdee + workBurn - foodTotals.cal;

  // Weekly data
  const weekDates = useMemo(() => getWeekDates(viewDate), [viewDate]);
  const weekData = useMemo(() => weekDates.map((key, i) => {
    const fl = foodLogs[key] || [];
    const wl = workLogs[key] || [];
    const intake = fl.reduce((s, e) => s + e.cal, 0);
    const burn = wl.reduce((s, e) => s + e.burn, 0);
    const mets = wl.reduce((s, e) => s + (e.metMin || 0), 0);
    return { key, dow: i, intake, burn, mets, deficit: tdee + burn - intake, logged: fl.length > 0 };
  }), [weekDates, foodLogs, workLogs, tdee]);

  const weekTotalMetMin = weekData.reduce((s, r) => s + r.mets, 0);
  const weekMetHours = weekTotalMetMin / 60;
  const weekAvgDeficit = (() => {
    const logged = weekData.filter(r => r.logged);
    return logged.length > 0 ? logged.reduce((s, r) => s + r.deficit, 0) / logged.length : 0;
  })();

  // Muscle volume
  const dayVolume = useMemo(() => {
    const vol = {};
    dayWork.forEach(e => e.muscles?.forEach(m => { vol[m.muscle] = (vol[m.muscle] || 0) + m.sets * m.pct; }));
    return Object.entries(vol).sort((a, b) => b[1] - a[1]);
  }, [dayWork]);

  // Exercise helpers
  const activeExercises = useMemo(() => EXERCISES.filter(e => !blocked.includes(e.id)), [blocked]);
  const filteredEx = exFilter === "All" ? activeExercises : activeExercises.filter(e => e.cat === exFilter);

  const suggestedWorkout = useMemo(() => {
    const pick = (cat, n = 1) => {
      const pool = activeExercises.filter(e => e.cat === cat);
      return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    };
    return [...pick("Legs", 2), ...pick("Push", 2), ...pick("Pull", 2), ...pick("Arms", 1)];
  }, [activeExercises]);

  // Editing food
  const [editingFood, setEditingFood] = useState(null); // entry id being edited

  // ─── Food search ───
  const doSearch = useCallback(async (q) => {
    setSearching(true);
    try {
      const [usda, off] = await Promise.allSettled([searchUSDA(q, apiKey, false), searchOFF(q)]);
      // USDA first (research-grade), then OFF (community, may have errors)
      const usdaResults = usda.status === "fulfilled" ? (usda.value || []) : [];
      const offResults = off.status === "fulfilled" ? (off.value || []).filter(f => {
        // Validate OFF data - reject obvious garbage
        const c = f.cal || 0, p = f.protein || 0;
        if (c > 900) return false; // nothing is >900 cal/100g
        if (c > 0 && p === 0 && !/sugar|candy|oil|butter|soda/i.test(f.description)) return false;
        return true;
      }) : [];
      // Dedupe: USDA wins over OFF for same food
      const seen = new Set();
      const all = [...usdaResults, ...offResults].filter(f => {
        const key = (f.description || f.name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 25);
        if (!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setResults(all);
    } catch { setResults([]); }
    setSearching(false);
  }, [apiKey]);

  const startScan = async () => {
    const { loadBarcodeLib, lookupBarcode: lb } = await import("./lib/utils");
    const Html5Qrcode = await loadBarcodeLib();
    setScanActive(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("barcode-reader");
        scanRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } },
          async (code) => { await scanner.stop(); setScanActive(false); const food = await lb(code); if (food) { setResults([food]); setShowFavs(false); } }
        );
      } catch (e) { console.error(e); setScanActive(false); }
    }, 100);
  };
  const stopScan = async () => { if (scanRef.current) try { await scanRef.current.stop(); } catch {} setScanActive(false); };

  const onQueryChange = (v) => {
    setQuery(v); setShowFavs(false);
    clearTimeout(searchTimer.current);
    if (v.length >= 2) searchTimer.current = setTimeout(() => doSearch(v), 250);
    else setResults([]);
  };

  // ─── Food actions ───
  const addFood = (food, grams, svgs) => {
    const m = food.customId ? food : extractMacros(food.foodNutrients);
    const mult = (svgs * grams) / 100;
    const entry = {
      id: Date.now(), name: food.description || food.name,
      servingG: grams, servings: svgs,
      cal: m.cal * mult, protein: m.protein * mult,
      carbs: m.carbs * mult, fat: m.fat * mult,
    };
    sv("food", { ...foodLogs, [viewDate]: [...(foodLogs[viewDate] || []), entry] }, setFoodLogs);
    setQuery(""); setResults([]);
  };

  const removeFood = (id) => {
    sv("food", { ...foodLogs, [viewDate]: (foodLogs[viewDate] || []).filter(e => e.id !== id) }, setFoodLogs);
  };

  const toggleFav = (food) => {
    const key = food.fdcId || food.customId || food.description;
    const exists = favorites.find(f => (f.fdcId || f.customId || f.description) === key);
    if (exists) {
      sv("favs", favorites.filter(f => (f.fdcId || f.customId || f.description) !== key), setFavorites);
    } else {
      const m = food.customId ? food : extractMacros(food.foodNutrients);
      sv("favs", [...favorites, {
        description: food.description || food.name, fdcId: food.fdcId || null,
        customId: food.customId || null, foodNutrients: food.foodNutrients || null,
        cal: m.cal, protein: m.protein, carbs: m.carbs, fat: m.fat,
        dataType: food.dataType || "Custom",
      }], setFavorites);
    }
  };

  const isFav = (food) => {
    const k = food.fdcId || food.customId || food.description;
    return !!favorites.find(f => (f.fdcId || f.customId || f.description) === k);
  };

  // ─── Workout actions ───
  const addExercise = () => {
    if (!selExercise || setData.length === 0) return;
    const ex = EXERCISES.find(e => e.id === selExercise);
    if (!ex) return;
    const nSets = setData.length;
    const entry = {
      id: Date.now(), exId: ex.id, name: ex.name,
      sets: setData.map(s => ({ w: s.w, r: s.r })),
      rir: wRir, burn: ex.cps * nSets, metMin: ex.mpm * nSets,
      muscles: Object.entries(ex.muscles).map(([m, p]) => ({ muscle: m, sets: nSets, pct: p })),
    };
    sv("work", { ...workLogs, [viewDate]: [...(workLogs[viewDate] || []), entry] }, setWorkLogs);
    setSelExercise(null);
  };

  const removeExercise = (id) => {
    sv("work", { ...workLogs, [viewDate]: (workLogs[viewDate] || []).filter(e => e.id !== id) }, setWorkLogs);
  };

  // ─── Cardio actions ───
  const userWtKg = userWeightLbs * 0.4536;
  const addCardio = () => {
    let burn, dur, name, details;
    if (cardioMode === "steady") {
      burn = steadyStateBurn(cAvgHr, cDur, userWtKg, userAge);
      dur = cDur;
      name = "Cycling (steady)";
      details = `${cDur}min avg ${cAvgHr}bpm`;
    } else {
      const segs = [{ hr: cHighHr, minutes: cHighMin }, { hr: cLowHr, minutes: cLowMin }];
      burn = hiitBurn(segs, cRounds, cWarmup, cCooldown, cLowHr, cLowHr, userWtKg, userAge);
      dur = hiitDuration(segs, cRounds, cWarmup, cCooldown);
      name = "Cycling (HIIT)";
      details = `${cRounds}x (${cHighMin}min@${cHighHr} / ${cLowMin}min@${cLowHr}) +w/c`;
    }
    const avgCpm = burn / dur;
    const met = calToMet(avgCpm, userWtKg);
    const metMin = Math.round(met * dur);
    const entry = {
      id: Date.now(), exId: "cardio", name, type: "cardio",
      sets: [], rir: null, burn, metMin, details, duration: dur,
      muscles: [],
    };
    sv("work", { ...workLogs, [viewDate]: [...(workLogs[viewDate] || []), entry] }, setWorkLogs);
  };

  // Date nav
  const shiftDate = (n) => setViewDate(shiftDateStr(viewDate, n));

  const displayFoods = showFavs
    ? [...favorites, ...customFoods.map(c => ({ ...c, description: c.name, foodNutrients: null, dataType: "Custom" }))]
    : results;

  return (
    <div className="app">
      {/* NAV */}
      <nav className="tabs">
        {[["home", "Dash"], ["eat", "Eat"], ["lift", "Lift"], ["setup", "Setup"]].map(([k, l]) => (
          <button key={k} className={tab === k ? "tab active" : "tab"} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* DATE NAV */}
      {tab !== "setup" && (
        <div className="date-nav">
          <button className="btn-sm" onClick={() => shiftDate(-1)}>&#8249;</button>
          <div className="date-center">
            <span className="date-day">{DAYS[dow]}</span>
            <span className="date-str">{viewDate}{viewDate === today() ? " (today)" : ""}</span>
          </div>
          <button className="btn-sm" onClick={() => shiftDate(1)}>&#8250;</button>
        </div>
      )}

      {/* ═══ DASHBOARD ═══ */}
      {tab === "home" && (
        <div className="section">
          {/* Deficit gauge */}
          <div className="card">
            <div className="gauge-row">
              <div><div className="label">TDEE (base)</div><div className="big-num">{tdee}</div></div>
              <div className="center"><div className="label">Eaten</div><div className="big-num gold">{Math.round(foodTotals.cal)}</div></div>
              <div className="right"><div className="label">Exercise</div><div className="big-num blue">+{workBurn}</div></div>
            </div>
            <div className="gauge-total">
              <div className="label">Daily balance</div>
              <div className={deficit > 0 ? "deficit-num green" : "deficit-num red"}>
                {deficit > 0 ? "-" : "+"}{Math.abs(Math.round(deficit))} cal
              </div>
            </div>
            <div className="gauge-sub">
              {deficit > 0
                ? `deficit = ~${(deficit / 3500 * 7).toFixed(2)} lb/wk loss`
                : `surplus = ~${(Math.abs(deficit) / 3500 * 7).toFixed(2)} lb/wk gain`}
            </div>
          </div>

          {/* Macros */}
          <Bar label="Calories" cur={foodTotals.cal} max={dayTarget.cal} color="#c9a227" />
          <Bar label="Protein" cur={foodTotals.protein} max={dayTarget.protein} color="#2d6a4f" suffix="g" />
          <Bar label="Carbs" cur={foodTotals.carbs} max={dayTarget.carbs} color="#4a7fb5" suffix="g" />
          <Bar label="Fat" cur={foodTotals.fat} max={dayTarget.fat} color="#b05c3b" suffix="g" />

          <div className="remaining-row">
            <span>Rem: {Math.round(dayTarget.cal - foodTotals.cal)}cal</span>
            <span>P:{Math.round(dayTarget.protein - foodTotals.protein)}</span>
            <span>C:{Math.round(dayTarget.carbs - foodTotals.carbs)}</span>
            <span>F:{Math.round(dayTarget.fat - foodTotals.fat)}</span>
          </div>

          {/* Workout summary */}
          {dayWork.length > 0 && (
            <div className="day-section">
              <div className="label">Workout ({dayWork.length} exercises, ~{workBurn} cal, {Math.round(dayMetMin)} MET-min)</div>
              {dayWork.map(e => {
                const sets = Array.isArray(e.sets) ? e.sets : [];
                return <div key={e.id} className="workout-summary-line">{e.name}: {sets.map((s, i) => `${s.w}x${s.r}`).join(", ")}</div>;
              })}
            </div>
          )}

          {/* Muscle volume */}
          {dayVolume.length > 0 && (
            <div className="day-section">
              <div className="label">Effective sets by muscle</div>
              {dayVolume.map(([m, v]) => (
                <div key={m} className="vol-row"><span>{m}</span><span>{v.toFixed(1)} sets</span></div>
              ))}
            </div>
          )}

          {/* MET-hours gauge */}
          <div className="day-section">
            <div className="met-gauge-header">
              <div className="label">Weekly MET-hours</div>
              <div className={weekMetHours >= MET_HOURS_TARGET ? "met-total green" : weekMetHours > 0 ? "met-total gold" : "met-total dim"}>
                {weekMetHours.toFixed(1)} / {MET_HOURS_TARGET} hrs {weekMetHours >= MET_HOURS_TARGET ? "\u2713" : ""}
              </div>
            </div>
            <div className="bar-track met-bar">
              <div className="bar-fill" style={{
                width: `${Math.min((weekMetHours / MET_HOURS_TARGET) * 100, 100)}%`,
                background: weekMetHours >= MET_HOURS_TARGET ? "#2d6a4f" : "#c9a227",
              }} />
            </div>
          </div>

          {/* Weekly grid */}
          <div className="day-section">
            <div className="label">This week</div>
            <div className="week-grid">
              {weekData.map(r => (
                <div key={r.key}
                  className={r.key === viewDate ? "week-cell active" : "week-cell"}
                  onClick={() => setViewDate(r.key)}>
                  <div className="week-day">{SHORT_DAYS[r.dow]}</div>
                  {r.logged
                    ? <div className={r.deficit > 0 ? "week-val green" : "week-val red"}>{r.deficit > 0 ? "-" : "+"}{Math.abs(Math.round(r.deficit))}</div>
                    : <div className="week-val dim">--</div>}
                  {r.mets > 0 && <div className="week-met">{(r.mets / 60).toFixed(1)}h</div>}
                </div>
              ))}
            </div>
            {weekData.filter(r => r.logged).length > 0 && (
              <div className="week-footer">
                <span>Avg deficit: <span className={weekAvgDeficit > 0 ? "green" : "red"}>{Math.round(weekAvgDeficit)} cal</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ EAT TAB ═══ */}
      {tab === "eat" && (
        <div className="section">
          <Bar label="Calories" cur={foodTotals.cal} max={dayTarget.cal} color="#c9a227" />
          <div className="remaining-row compact">
            <span>P:{Math.round(foodTotals.protein)}/{dayTarget.protein}</span>
            <span>C:{Math.round(foodTotals.carbs)}/{dayTarget.carbs}</span>
            <span>F:{Math.round(foodTotals.fat)}/{dayTarget.fat}</span>
          </div>

          <div className="search-wrap">
            {scanActive && <div id="barcode-reader" style={{marginBottom:8,borderRadius:6,overflow:"hidden"}}></div>}
            <input type="text" placeholder="Search food..." value={query} onChange={e => onQueryChange(e.target.value)} className="input" />
            {searching && <div className="search-spinner">...</div>}
            <button className={scanActive ? "scan-btn active" : "scan-btn"} onClick={scanActive ? stopScan : startScan}>{scanActive ? "X" : "📷"}</button>
          </div>
          <div className="search-controls">
            <button className={showFavs ? "btn-sm gold" : "btn-sm"} onClick={() => setShowFavs(!showFavs)}>
              &#9733;{favorites.length > 0 ? ` ${favorites.length}` : ""}
            </button>
            <div className="result-count">{results.length > 0 ? `${results.length} results` : ""}</div>
          </div>

          {displayFoods.length > 0 && (
            <div className="food-results">
              {displayFoods.map((f, i) => <FoodRow key={f.fdcId || f.customId || i} food={f} onAdd={addFood} onFav={toggleFav} isFav={isFav(f)} />)}
            </div>
          )}

          <div className="label">Logged ({dayFood.length})</div>
          {dayFood.length === 0 && <div className="empty">No entries</div>}
          {dayFood.map(e => {
            const isEditing = editingFood === e.id;
            return (
              <div key={e.id} className={isEditing ? "log-entry editing" : "log-entry"}>
                <div className="log-entry-info" onClick={() => setEditingFood(isEditing ? null : e.id)} style={{cursor:"pointer"}}>
                  <div className="log-entry-name">{e.name}</div>
                  <div className="log-entry-detail">{e.servingG}g x{e.servings} = {Math.round(e.cal||0)}cal P:{Math.round(e.protein||0)} C:{Math.round(e.carbs||0)} F:{Math.round(e.fat||0)}</div>
                </div>
                {isEditing ? (
                  <div className="edit-row">
                    <input type="number" value={e.servingG} className="num-input"
                      onChange={ev => {
                        const g = +ev.target.value||"";
                        const ratio = e.servingG > 0 ? g / e.servingG : 1;
                        const updated = dayFood.map(f => f.id === e.id ? {
                          ...f, servingG: g,
                          cal: f.cal * ratio, protein: f.protein * ratio,
                          carbs: f.carbs * ratio, fat: f.fat * ratio,
                        } : f);
                        sv("food", { ...foodLogs, [viewDate]: updated }, setFoodLogs);
                      }} />
                    <span className="unit">g x</span>
                    <input type="number" value={e.servings} step="0.25" className="num-input sm"
                      onChange={ev => {
                        const s = +ev.target.value||"";
                        const ratio = e.servings > 0 ? s / e.servings : 1;
                        const updated = dayFood.map(f => f.id === e.id ? {
                          ...f, servings: s,
                          cal: f.cal * ratio, protein: f.protein * ratio,
                          carbs: f.carbs * ratio, fat: f.fat * ratio,
                        } : f);
                        sv("food", { ...foodLogs, [viewDate]: updated }, setFoodLogs);
                      }} />
                    <button className="remove-btn" onClick={() => { removeFood(e.id); setEditingFood(null); }}>&times;</button>
                  </div>
                ) : (
                  <button className="remove-btn" onClick={() => removeFood(e.id)}>&times;</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ LIFT TAB ═══ */}
      {tab === "lift" && (
        <div className="section">
          <div className="card">
            <button className="btn full-w" onClick={() => setShowExList(!showExList)}>
              {selExercise ? EXERCISES.find(e => e.id === selExercise)?.name : "Select exercise"}
            </button>

            {showExList && (
              <div className="ex-picker">
                <div className="cat-filters">
                  {["All", ...CATEGORIES].map(c => (
                    <button key={c} className={exFilter === c ? "btn-sm green" : "btn-sm"} onClick={() => setExFilter(c)}>{c}</button>
                  ))}
                </div>
                <div className="ex-list">
                  {filteredEx.map(e => (
                    <div key={e.id} className={selExercise === e.id ? "ex-item selected" : "ex-item"}
                      onClick={() => { setSelExercise(e.id); setShowExList(false); }}>
                      {e.name} <span className="ex-equip">{e.equip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selExercise && !showExList && (
              <div className="set-entry">
                <div className="set-entry-header">
                  <span className="label-inline">RIR</span>
                  <input type="number" value={wRir} onChange={e => setWRir(+e.target.value||"")} className="num-input sm" />
                  <div className="spacer" />
                  <button className="btn-sm green" onClick={() => setSetData([...setData, { w: setData[setData.length - 1]?.w || 135, r: setData[setData.length - 1]?.r || 10 }])}>+ Set</button>
                  {setData.length > 1 && <button className="btn-sm red" onClick={() => setSetData(setData.slice(0, -1))}>- Set</button>}
                </div>
                <div className="set-grid">
                  <div className="set-grid-header"><span></span><span>LBS</span><span>REPS</span></div>
                  {setData.map((s, i) => (
                    <div key={i} className="set-grid-row">
                      <span className="set-label">S{i + 1}</span>
                      <input type="number" value={s.w} step={5} className="num-input"
                        onChange={e => { const d = [...setData]; d[i] = { ...d[i], w: +e.target.value||"" }; setSetData(d); }} />
                      <input type="number" value={s.r} className="num-input"
                        onChange={e => { const d = [...setData]; d[i] = { ...d[i], r: +e.target.value||"" }; setSetData(d); }} />
                    </div>
                  ))}
                </div>
                <button className="btn full-w" onClick={addExercise}>Log Exercise ({setData.length} sets)</button>
              </div>
            )}
          </div>

          <details className="suggested">
            <summary>Suggested full-body</summary>
            <div className="suggested-list">
              {suggestedWorkout.map(e => (
                <div key={e.id} className="suggested-item">
                  <div><span className="ex-name">{e.name}</span> <span className="ex-equip">{e.cat}</span></div>
                  <button className="btn-sm" onClick={() => { setSelExercise(e.id); setShowExList(false); }}>Select</button>
                </div>
              ))}
            </div>
          </details>

          <div className="label">Logged ({dayWork.length} exercises, ~{workBurn} cal, {Math.round(dayMetMin)} MET-min)</div>
          {dayWork.length === 0 && <div className="empty">No exercises logged</div>}
          {dayWork.map(e => {
            const sets = Array.isArray(e.sets) ? e.sets : [];
            return (
              <div key={e.id} className="log-entry">
                <div className="log-entry-info">
                  <div className="log-entry-name">{e.name}</div>
                  <div className="log-entry-detail">{sets.map((s, i) => `S${i + 1}: ${s.w}x${s.r}`).join(" | ")} | RIR:{e.rir} | ~{e.burn}cal</div>
                </div>
                <button className="remove-btn" onClick={() => removeExercise(e.id)}>&times;</button>
              </div>
            );
          })}

          {dayVolume.length > 0 && (
            <div className="day-section">
              <div className="label">Effective volume</div>
              {dayVolume.map(([m, v]) => (
                <div key={m} className="vol-row"><span>{m}</span><span>{v.toFixed(1)} sets</span></div>
              ))}
            </div>
          )}

          {/* Cardio */}
          <div className="card" style={{marginTop: 12}}>
            <div className="label">Cardio / Cycling</div>
            <div className="cat-filters" style={{marginTop: 6, marginBottom: 10}}>
              <button className={cardioMode === "steady" ? "btn-sm green" : "btn-sm"} onClick={() => setCardioMode("steady")}>Steady</button>
              <button className={cardioMode === "hiit" ? "btn-sm green" : "btn-sm"} onClick={() => setCardioMode("hiit")}>HIIT</button>
            </div>

            {cardioMode === "steady" && (
              <div className="set-grid">
                <div className="set-grid-row">
                  <span className="set-label">HR</span>
                  <input type="number" value={cAvgHr} onChange={e => setCAvgHr(+e.target.value || 0)} className="num-input" />
                  <span className="unit">bpm avg</span>
                </div>
                <div className="set-grid-row">
                  <span className="set-label">Dur</span>
                  <input type="number" value={cDur} onChange={e => setCDur(+e.target.value || 0)} className="num-input" />
                  <span className="unit">min</span>
                </div>
                <div style={{fontSize: 11, color: "#888", marginTop: 4}}>
                  Est: ~{steadyStateBurn(cAvgHr, cDur, userWeightLbs * 0.4536, userAge)} cal
                </div>
              </div>
            )}

            {cardioMode === "hiit" && (
              <div className="set-grid">
                <div className="set-grid-header"><span></span><span>HR</span><span>MIN</span></div>
                <div className="set-grid-row">
                  <span className="set-label">High</span>
                  <input type="number" value={cHighHr} onChange={e => setCHighHr(+e.target.value || 0)} className="num-input" />
                  <input type="number" value={cHighMin} onChange={e => setCHighMin(+e.target.value || 0)} className="num-input" />
                </div>
                <div className="set-grid-row">
                  <span className="set-label">Low</span>
                  <input type="number" value={cLowHr} onChange={e => setCLowHr(+e.target.value || 0)} className="num-input" />
                  <input type="number" value={cLowMin} onChange={e => setCLowMin(+e.target.value || 0)} className="num-input" />
                </div>
                <div className="set-grid-row">
                  <span className="set-label">Rnds</span>
                  <input type="number" value={cRounds} onChange={e => setCRounds(+e.target.value||"")} className="num-input" />
                  <span className="unit">rounds</span>
                </div>
                <div className="set-grid-row">
                  <span className="set-label">W/C</span>
                  <input type="number" value={cWarmup} onChange={e => setCWarmup(+e.target.value || 0)} className="num-input" placeholder="warm" />
                  <input type="number" value={cCooldown} onChange={e => setCCooldown(+e.target.value || 0)} className="num-input" placeholder="cool" />
                </div>
                <div style={{fontSize: 11, color: "#888", marginTop: 4}}>
                  Est: ~{hiitBurn([{hr:cHighHr,minutes:cHighMin},{hr:cLowHr,minutes:cLowMin}], cRounds, cWarmup, cCooldown, cLowHr, cLowHr, userWeightLbs*0.4536, userAge)} cal
                  / {hiitDuration([{hr:cHighHr,minutes:cHighMin},{hr:cLowHr,minutes:cLowMin}], cRounds, cWarmup, cCooldown)} min (+15% EPOC)
                </div>
              </div>
            )}

            <button className="btn full-w" style={{marginTop: 10}} onClick={addCardio}>Log Ride</button>
          </div>
        </div>
      )}

      {/* ═══ SETUP TAB ═══ */}
      {tab === "setup" && (
        <div className="section">
          <div className="setup-tdee">
            <div className="label">Base TDEE (sedentary)</div>
            <div className="tdee-row">
              <input type="number" value={tdee} onChange={e => setTdee(e.target.value)} onBlur={e => { const v = +e.target.value; if (v >= 0) sv("tdee", v, setTdee); }} className="num-input lg" />
              <span className="unit">cal/day (exercise adds on top)</span>
            </div>
          </div>
          <div className="setup-tdee">
            <div className="label">Body stats (for HR calorie formula)</div>
            <div className="tdee-row">
              <input type="number" value={userWeightLbs} onChange={e => setUserWeightLbs(e.target.value)} onBlur={e => { const v = +e.target.value; if (v > 0) sv("user_wt", v, setUserWeightLbs); }} className="num-input lg" />
              <span className="unit">lbs</span>
              <input type="number" value={userAge} onChange={e => setUserAge(e.target.value)} onBlur={e => { const v = +e.target.value; if (v > 0) sv("user_age", v, setUserAge); }} className="num-input" />
              <span className="unit">age</span>
            </div>
          </div>

          {[
            ["targets", "Daily Macro Targets"],
            ["weight", "Weight Log"],
            ["custom", "Custom Foods"],
            ["blocked", "Blocked Exercises"],
            ["api", "API / Data"],
          ].map(([k, label]) => (
            <div key={k} className="setup-section">
              <button className="setup-toggle" onClick={() => setSetupPanel(setupPanel === k ? null : k)}>
                <span>{label}</span><span>{setupPanel === k ? "\u2212" : "+"}</span>
              </button>

              {setupPanel === k && k === "targets" && (
                <div className="setup-content">
                  {DAYS.map((day, i) => {
                    const t = targets[i] || DEFAULT_TARGETS[0];
                    return (
                      <div key={i} className="target-day">
                        <div className="target-day-header" onClick={() => setEditDay(editDay === i ? null : i)}>
                          <span className="fw600">{day}</span>
                          <span className="dim">{t.cal}cal P:{t.protein} C:{t.carbs} F:{t.fat}</span>
                        </div>
                        {editDay === i && (
                          <div className="target-edit">
                            {[["cal", "Cal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"]].map(([k2, l2]) => (
                              <div key={k2}>
                                <div className="tiny-label">{l2}</div>
                                <input type="number" value={t[k2]} className="num-input"
                                  onChange={e => sv("targets", { ...targets, [i]: { ...t, [k2]: +e.target.value||"" } }, setTargets)} />
                              </div>
                            ))}
                            <button className="btn-sm full-span" onClick={() => {
                              const up = {}; for (let d = 0; d < 7; d++) up[d] = { ...t };
                              sv("targets", up, setTargets);
                            }}>Copy to all</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="dim small mt8">Weekly avg: {Math.round(Object.values(targets).reduce((s, t) => s + (t?.cal || 0), 0) / 7)} cal/day</div>
                </div>
              )}

              {setupPanel === k && k === "weight" && (
                <div className="setup-content">
                  <div className="weight-entry">
                    <input type="number" placeholder="lbs" value={weightIn} onChange={e => setWeightIn(e.target.value)} step="0.1" className="num-input lg" />
                    <button className="btn" onClick={() => {
                      const w = parseFloat(weightIn); if (!w || w < 50 || w > 500) return;
                      sv("weight", { ...weightLog, [viewDate]: w }, setWeightLog); setWeightIn("");
                    }}>Log {viewDate === today() ? "today" : viewDate}</button>
                  </div>
                  {Object.entries(weightLog).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 20).map(([d, w]) => (
                    <div key={d} className="weight-row">
                      <span className="dim">{d} ({SHORT_DAYS[dayOfWeekFor(d)]})</span>
                      <span>{w} lbs</span>
                    </div>
                  ))}
                </div>
              )}

              {setupPanel === k && k === "custom" && (
                <div className="setup-content">
                  <div className="custom-form">
                    <input type="text" placeholder="Food name" value={customForm.name} onChange={e => setCustomForm({ ...customForm, name: e.target.value })} className="input" />
                    <div className="custom-macros">
                      {[["cal", "Cal"], ["protein", "P"], ["carbs", "C"], ["fat", "F"], ["fiber", "Fib"]].map(([k2, l2]) => (
                        <div key={k2}>
                          <div className="tiny-label">{l2}</div>
                          <input type="number" value={customForm[k2] || ""} onChange={e => setCustomForm({ ...customForm, [k2]: +e.target.value || 0 })} className="num-input" />
                        </div>
                      ))}
                    </div>
                    <button className="btn" onClick={() => {
                      if (!customForm.name) return;
                      sv("custom", [...customFoods, { ...customForm, customId: `c-${Date.now()}` }], setCustomFoods);
                      setCustomForm({ name: "", cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
                    }}>Add</button>
                  </div>
                  {customFoods.map((f, i) => (
                    <div key={f.customId || i} className="log-entry">
                      <span>{f.name} ({f.cal}cal)</span>
                      <button className="remove-btn" onClick={() => sv("custom", customFoods.filter((_, j) => j !== i), setCustomFoods)}>&times;</button>
                    </div>
                  ))}
                </div>
              )}

              {setupPanel === k && k === "blocked" && (
                <div className="setup-content">
                  <div className="dim small mb8">Blocked exercises are hidden from the list and suggestions.</div>
                  {EXERCISES.map(e => (
                    <div key={e.id} className="blocked-row">
                      <span className={blocked.includes(e.id) ? "blocked-name" : ""}>{e.name}</span>
                      <button className={blocked.includes(e.id) ? "btn-sm red" : "btn-sm green"}
                        onClick={() => sv("blocked", blocked.includes(e.id) ? blocked.filter(b => b !== e.id) : [...blocked, e.id], setBlocked)}>
                        {blocked.includes(e.id) ? "Blocked" : "Active"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {setupPanel === k && k === "api" && (
                <div className="setup-content">
                  <div className="dim small mb8">USDA API key (free at fdc.nal.usda.gov)</div>
                  <input type="text" value={apiKey} onChange={e => sv("apikey", e.target.value, setApiKey)} className="input mb12" />
                  <button className="btn mb8" onClick={() => {
                    const data = exportAll(ALL_KEYS);
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `cut-tracker-export-${today()}.json`; a.click();
                    URL.revokeObjectURL(url);
                  }}>Export JSON</button>
                  <button className="btn danger" onClick={() => {
                    if (!confirm("Delete ALL data?")) return;
                    clearAll(ALL_KEYS);
                    setTargets(DEFAULT_TARGETS); setTdee(2400); setFoodLogs({}); setWorkLogs({});
                    setFavorites([]); setCustomFoods([]); setWeightLog({}); setBlocked(BLOCKED_DEFAULT); setApiKey("DEMO_KEY");
                  }}>Reset All</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
