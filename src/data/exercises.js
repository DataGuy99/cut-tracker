// cps = estimated cal/set, met = MET value, mpm = MET-minutes per set (met * avg set duration incl rest)
export const EXERCISES = [
  // QUAD-DOMINANT
  { id:"belt-squat", name:"Belt Squat", cat:"Legs", type:"compound", equip:"Belt+Rack", muscles:{Quads:.60,Glutes:.25,Hamstrings:.10,Core:.05}, cps:7, met:6.0, mpm:15 },
  { id:"landmine-squat", name:"Landmine Squat", cat:"Legs", type:"compound", equip:"Barbell", muscles:{Quads:.50,Glutes:.25,Core:.15,Shoulders:.10}, cps:6, met:5.5, mpm:14 },
  { id:"bulgarian-split", name:"Bulgarian Split Squat", cat:"Legs", type:"compound", equip:"Dumbbells", muscles:{Quads:.55,Glutes:.30,Hamstrings:.15}, cps:6, met:5.5, mpm:14 },
  { id:"goblet-squat", name:"Goblet Squat", cat:"Legs", type:"compound", equip:"Dumbbell", muscles:{Quads:.55,Glutes:.25,Core:.15,Hamstrings:.05}, cps:6, met:5.0, mpm:12.5 },
  // HINGE
  { id:"rdl", name:"Romanian Deadlift", cat:"Legs", type:"compound", equip:"Barbell", muscles:{Hamstrings:.50,Glutes:.30,Back:.15,Core:.05}, cps:8, met:6.0, mpm:15 },
  { id:"sumo-dl", name:"Sumo Deadlift", cat:"Legs", type:"compound", equip:"Barbell", muscles:{Glutes:.30,Quads:.30,Hamstrings:.20,Back:.15,Core:.05}, cps:9, met:6.0, mpm:15 },
  { id:"stiff-leg-dl", name:"Stiff-Leg Deadlift", cat:"Legs", type:"compound", equip:"Barbell", muscles:{Hamstrings:.55,Glutes:.25,Back:.15,Core:.05}, cps:8, met:6.0, mpm:15 },
  { id:"hip-thrust", name:"Barbell Hip Thrust", cat:"Legs", type:"compound", equip:"Barbell+Bench", muscles:{Glutes:.65,Hamstrings:.25,Core:.10}, cps:7, met:5.5, mpm:14 },
  { id:"nordic-curl", name:"Nordic Curl", cat:"Legs", type:"isolation", equip:"Nordic Att.", muscles:{Hamstrings:.85,Glutes:.15}, cps:5, met:4.0, mpm:8 },
  // PUSH
  { id:"bench", name:"Bench Press", cat:"Push", type:"compound", equip:"Barbell+Bench", muscles:{Chest:.60,Triceps:.25,Shoulders:.15}, cps:7, met:5.0, mpm:12.5 },
  { id:"incline-db", name:"Incline DB Press", cat:"Push", type:"compound", equip:"DB+Bench", muscles:{Chest:.50,Shoulders:.30,Triceps:.20}, cps:6, met:5.0, mpm:12.5 },
  { id:"db-bench", name:"DB Bench Press", cat:"Push", type:"compound", equip:"DB+Bench", muscles:{Chest:.55,Triceps:.25,Shoulders:.20}, cps:6, met:5.0, mpm:12.5 },
  { id:"ohp", name:"Overhead Press", cat:"Push", type:"compound", equip:"Barbell", muscles:{Shoulders:.55,Triceps:.30,Core:.15}, cps:7, met:5.0, mpm:12.5 },
  { id:"landmine-press", name:"Landmine Press", cat:"Push", type:"compound", equip:"Barbell", muscles:{Shoulders:.45,Chest:.30,Triceps:.15,Core:.10}, cps:6, met:5.0, mpm:12.5 },
  { id:"dips", name:"Dips", cat:"Push", type:"compound", equip:"Dip Bar", muscles:{Chest:.40,Triceps:.40,Shoulders:.20}, cps:6, met:5.0, mpm:12.5 },
  { id:"lateral-raise", name:"Lateral Raise", cat:"Push", type:"isolation", equip:"Dumbbells", muscles:{Shoulders:1.0}, cps:3, met:3.5, mpm:7 },
  // PULL
  { id:"bb-row", name:"Barbell Row", cat:"Pull", type:"compound", equip:"Barbell", muscles:{Back:.55,Biceps:.25,Rear_Delts:.15,Core:.05}, cps:7, met:5.0, mpm:12.5 },
  { id:"db-row", name:"DB Row", cat:"Pull", type:"compound", equip:"Dumbbell+Bench", muscles:{Back:.55,Biceps:.30,Rear_Delts:.15}, cps:6, met:5.0, mpm:12.5 },
  { id:"pullups", name:"Pull-ups", cat:"Pull", type:"compound", equip:"Pull-up Bar", muscles:{Back:.55,Biceps:.30,Core:.15}, cps:6, met:5.0, mpm:12.5 },
  { id:"chinups", name:"Chin-ups", cat:"Pull", type:"compound", equip:"Pull-up Bar", muscles:{Back:.45,Biceps:.40,Core:.15}, cps:6, met:5.0, mpm:12.5 },
  { id:"face-pull", name:"Face Pull (Band)", cat:"Pull", type:"isolation", equip:"Band", muscles:{Rear_Delts:.50,Back:.30,Biceps:.20}, cps:3, met:3.5, mpm:7 },
  // ARMS
  { id:"ez-curl", name:"EZ Bar Curl", cat:"Arms", type:"isolation", equip:"EZ Curl Bar", muscles:{Biceps:.85,Forearms:.15}, cps:4, met:3.5, mpm:7 },
  { id:"hammer-curl", name:"Hammer Curl", cat:"Arms", type:"isolation", equip:"Dumbbells", muscles:{Biceps:.60,Forearms:.40}, cps:4, met:3.5, mpm:7 },
  { id:"skull-crusher", name:"Skull Crushers", cat:"Arms", type:"isolation", equip:"EZ Curl Bar+Bench", muscles:{Triceps:.90,Shoulders:.10}, cps:4, met:3.5, mpm:7 },
  { id:"oh-tri-ext", name:"OH Tricep Extension", cat:"Arms", type:"isolation", equip:"Dumbbell", muscles:{Triceps:.90,Shoulders:.10}, cps:3, met:3.5, mpm:7 },
];

export const BLOCKED_DEFAULT = ["back-squat","front-squat"];
export const CATEGORIES = ["Legs","Push","Pull","Arms"];
