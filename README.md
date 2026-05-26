# Cut Tracker

Nutrition, workout, and deficit tracker. PWA for mobile.

## Features
- Food logging via USDA FoodData Central API (curated DB default, branded optional)
- Per-set weight/reps workout logging with exercise database
- Per-day-of-week calorie and macro targets
- Custom TDEE entry with exercise burn on top
- Daily and weekly deficit tracking
- Weekly MET-hours progress (target: 40 hrs/wk)
- Muscle volume tracking (effective sets per muscle group)
- Suggested full-body workouts from equipment-filtered exercise pool
- Custom foods, favorites, weight log
- JSON export/import
- All data in localStorage, works offline

## Stack
Vite + React, deployed to GitHub Pages via Actions.

## Dev
```
npm install
npm run dev
```

## USDA API
Uses DEMO_KEY by default (rate limited). Get free key: https://fdc.nal.usda.gov/api-key-signup.html
