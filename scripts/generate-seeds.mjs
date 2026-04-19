#!/usr/bin/env node
// Merges .tmp-batch-{1..6}.json body-text files + hardcoded metadata for the
// original 5 docs into seeds/nmsu-content.json and a regenerated
// seeds/nmsu-docs.ts. Run from the rosa/ project root.

import fs from "node:fs";
import path from "node:path";

const SEEDS_DIR = path.resolve("seeds");
const TMP_FILES = [1, 2, 3, 4, 5, 6].map((n) => `.tmp-batch-${n}.json`);

const url = (series, num) => {
  const s = series.toLowerCase();
  if (s === "cr") return `https://pubs.nmsu.edu/_circulars/CR${num}/`;
  return `https://pubs.nmsu.edu/_${s}/${series.toUpperCase()}${num}/`;
};
const pub = (series, num) =>
  series.toLowerCase() === "cr" ? `Circular ${num}` : `Guide ${series.toUpperCase()}-${num}`;
const id_ = (series, num) => `nmsu-${series.toLowerCase()}-${num}`;

// Metadata for all 62 docs. Each entry: [series, num, title_en, topic_tags[]]
const META_RAW = [
  // Originals (5) — placeholder content kept, will be replaced when real bodies are pasted.
  ["h", "230", "Chile Production in New Mexico", ["production", "general", "planting", "cultivars", "harvest", "spacing"]],
  ["h", "219", "Curly Top Virus in Chile", ["disease", "virus", "curly-top", "wilt", "yellowing", "stunting"]],
  ["h", "240", "Phytophthora Root Rot of Chile", ["disease", "fungus", "phytophthora", "wilt", "root-rot"]],
  ["a", "128", "Fertilizing Chile", ["nutrition", "fertilizer", "nitrogen", "iron", "deficiency"]],
  ["h", "232", "Chile Irrigation", ["irrigation", "water", "scheduling", "drip", "surface"]],
  // Batch 1 — chile-specific (12)
  ["h", "243", "Economic Insects of Chile", ["chile", "insect", "pest", "thrips", "weevil"]],
  ["h", "248", "Powdery Mildew on Chile Peppers", ["chile", "disease", "fungus", "powdery-mildew"]],
  ["h", "249", "Chile Pepper Disorders Caused by Environmental Stress", ["chile", "disorder", "heat-stress", "wind", "salinity", "sunscald"]],
  ["h", "250", "Verticillium Wilt of Chile Peppers", ["chile", "disease", "verticillium", "wilt", "soilborne"]],
  ["h", "235", "Postharvest Handling of Fresh Chiles", ["chile", "postharvest", "storage", "cooling"]],
  ["h", "236", "Postharvest Handling of Dehydrated Chiles", ["chile", "postharvest", "drying", "paprika"]],
  ["h", "237", "Measuring Chile Pepper Heat", ["chile", "pungency", "scoville", "capsaicin"]],
  ["h", "257", "Red Chile and Paprika Production in New Mexico", ["chile", "production", "red-chile", "paprika"]],
  ["h", "258", "Field Production of Organic Chile", ["chile", "organic", "production"]],
  ["h", "242", "Tomato Spotted Wilt Virus", ["virus", "thrips", "disease", "tomato", "pepper"]],
  ["h", "106", "Curly Top Virus", ["virus", "curly-top", "leafhopper", "tomato", "pepper"]],
  ["a", "609", "Relay Intercropping Brassicas into Chile and Sweet Corn", ["intercropping", "brassicas", "forage", "chile"]],
  // Batch 2 — vegetable/garden (15)
  ["h", "216", "When to Harvest Vegetables", ["harvest", "vegetables", "timing"]],
  ["h", "220", "Starting Plants Early Outdoors", ["season-extension", "cold-frame", "transplant"]],
  ["h", "246", "Starting a Community Vegetable Garden", ["community-garden", "smallholder", "planning"]],
  ["h", "251", "Row Cover Vegetable Production Techniques", ["row-cover", "season-extension", "frost", "pest-exclusion"]],
  ["h", "252", "Hoop House Vegetable Production", ["hoop-house", "high-tunnel", "season-extension"]],
  ["h", "261", "Mulches for Vegetable Production in New Mexico", ["mulch", "weed-control", "water-conservation"]],
  ["h", "262", "Vegetable Seed Saving for Home Gardeners and Small-scale Farmers", ["seed-saving", "pollination", "genetics"]],
  ["h", "180", "Hydroponics: Water-saving Farming for New Mexico's Arid Environment", ["hydroponics", "water-saving", "greenhouse"]],
  ["h", "176", "IPM Strategies for Common Garden Insect Pests of New Mexico", ["ipm", "pest", "vegetable"]],
  ["h", "181", "IPM for Pollinator Conservation in Home Gardens and Small Farms", ["ipm", "pollinator", "bee"]],
  ["h", "183", "IPM for Squash Bug for Home Gardens and Small-scale Growers", ["ipm", "squash-bug", "cucurbit"]],
  ["h", "168", "Selection and Use of Insecticides for Organic Production", ["organic", "insecticide", "pest"]],
  ["h", "169", "Using Insectary Plants to Attract and Sustain Beneficial Insects", ["insectary", "beneficial-insect", "biological-control"]],
  ["h", "172", "Backyard Beneficial Insects of New Mexico", ["beneficial-insect", "identification"]],
  ["h", "120", "Home and Market Garden Fertilization", ["fertilizer", "nutrient", "garden", "vegetables"]],
  // Batch 3 — agronomy/soil (7)
  ["a", "114", "Test Your Garden Soil", ["soil-test", "sampling", "nutrient"]],
  ["a", "147", "Agronomic Principles to Help with Farming During Drought Periods", ["drought", "water-conservation", "variety-selection"]],
  ["a", "148", "Understanding Soil Health for Production Agriculture in New Mexico", ["soil-health", "organic-matter", "biology"]],
  ["a", "150", "Principles of Cover Cropping for Arid and Semi-arid Farming Systems", ["cover-crop", "erosion", "soil-health"]],
  ["a", "151", "Growing Plants in Caliche Soils", ["caliche", "soil", "alkaline", "chlorosis"]],
  ["a", "152", "Reducing Tillage in Arid and Semi-arid Cropping Systems", ["tillage", "conservation", "erosion"]],
  ["a", "617", "Palmer Amaranth Biology and Management", ["weed", "palmer-amaranth", "herbicide"]],
  // Batch 4 — vegetables + pests (7)
  ["h", "223", "Home and Market Garden Sweet Corn Production", ["sweet-corn", "vegetable", "garden"]],
  ["h", "234", "Garlic Production in New Mexico", ["garlic", "vegetable", "production"]],
  ["h", "256", "NuMex Sweet Onions", ["onion", "vegetable", "variety"]],
  ["h", "221", "Spices and Herbs for the Home Garden", ["herb", "spice", "garden"]],
  ["h", "247", "Anthracnose of Cucurbits", ["cucurbit", "disease", "fungal"]],
  ["a", "231", "Blossom-End Rot", ["tomato", "pepper", "disorder", "calcium"]],
  ["h", "259", "Harlequin Bug", ["pest", "harlequin-bug", "brassica"]],
  // Batch 5 — fruit + pecan (8)
  ["h", "308", "Why Fruit Trees Fail to Bear", ["fruit-tree", "pollination", "troubleshooting"]],
  ["h", "310", "Fruits and Nuts for New Mexico Orchards", ["fruit", "nut", "orchard", "variety"]],
  ["h", "317", "Apple Disease Control", ["apple", "disease", "orchard"]],
  ["h", "327", "Pruning the Home Orchard", ["pruning", "orchard", "fruit"]],
  ["h", "324", "Home Garden Strawberry Production in New Mexico", ["strawberry", "small-fruit"]],
  ["h", "602", "Pecan Orchard Fertilization", ["pecan", "fertilization", "orchard"]],
  ["h", "636", "Estimating Water Needs for Pecan Trees", ["pecan", "irrigation", "water"]],
  ["h", "657", "Diseases and Other Disorders of Pecan in New Mexico", ["pecan", "disease", "disorder"]],
  // Batch 6 — soil/water/business (8)
  ["h", "110", "Backyard Composting", ["compost", "soil", "organic-matter"]],
  ["h", "171", "Iron Chlorosis", ["iron", "chlorosis", "deficiency", "alkaline-soil"]],
  ["a", "122", "Soil Test Interpretations", ["soil-test", "interpretation", "recommendations"]],
  ["cr", "573", "Drip Irrigation for Row Crops", ["irrigation", "drip", "row-crop"]],
  ["w", "102", "Irrigation Water Analysis and Interpretation", ["water-quality", "salinity", "irrigation"]],
  ["cr", "477", "Small Poultry Flock Management", ["poultry", "livestock", "smallholder"]],
  ["h", "149", "Marketing Alternatives for Small- to Medium-sized Family Farms and Ranches", ["marketing", "farm-business", "direct-sale"]],
  ["cr", "701", "Fruit Tree Freeze and Frost Damage and Its Management", ["frost", "freeze", "fruit-tree"]],
];

// Minimal placeholder content for the original 5 (preserved from current seeds).
const ORIGINAL_PLACEHOLDERS = {
  "nmsu-h-230":
    "Comprehensive guide to growing chile in New Mexico: cultivar selection, planting dates, soil preparation, plant spacing, harvest timing, and common cultural practices. Default reference for general 'how do I grow chile here' questions. [PLACEHOLDER — full publication body to be pasted by user.]",
  "nmsu-h-219":
    "Identification and management of beet curly top virus in chile: vectored by the beet leafhopper. Key symptoms — stunted plants, upward curling and yellowing of young leaves, thickened leathery foliage, plants wilt and die in patches across a field. No cure once infected; management is preventive (vector control, row covers, planting dates). [PLACEHOLDER — full publication body to be pasted by user.]",
  "nmsu-h-240":
    "Phytophthora capsici causes root rot, crown rot, and foliar blight in chile. Symptoms — sudden wilting of healthy-looking plants, dark water-soaked lesions on stems near soil line, plants collapse after irrigation. Favored by warm, wet soil. Management — resistant cultivars, raised beds, careful irrigation, crop rotation, fungicides. [PLACEHOLDER — full publication body to be pasted by user.]",
  "nmsu-a-128":
    "Nutrient management for chile: nitrogen, phosphorus, potassium, and micronutrient (iron, zinc) recommendations. Diagnostic guidance for common deficiencies — overall yellowing of older leaves (nitrogen), interveinal chlorosis with green veins on young leaves (iron in alkaline soils), purpling of undersides (phosphorus). Soil tests, application rates, and timing. [PLACEHOLDER — full publication body to be pasted by user.]",
  "nmsu-h-232":
    "Irrigation scheduling for chile in arid New Mexico: estimating crop water use, frequency by growth stage (seedling, vegetative, flowering, fruit fill), surface vs drip systems, and avoiding over-irrigation that promotes Phytophthora. Hot dry weeks need more frequent shorter applications; cool wet weeks need restraint. [PLACEHOLDER — full publication body to be pasted by user.]",
};

// --- Build content map ---
const content = { ...ORIGINAL_PLACEHOLDERS };

for (const f of TMP_FILES) {
  const p = path.join(SEEDS_DIR, f);
  if (!fs.existsSync(p)) {
    console.warn(`[generate-seeds] missing ${f}, skipping`);
    continue;
  }
  const arr = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const entry of arr) {
    if (entry && typeof entry.id === "string" && typeof entry.content_en === "string") {
      content[entry.id] = entry.content_en;
    }
  }
}

// --- Build metadata array ---
const docs = META_RAW.map(([series, num, title_en, tags]) => ({
  id: id_(series, num),
  pub_number: pub(series, num),
  title_en,
  title_es: title_en,
  source_url: url(series, num),
  topic_tags: tags,
}));

// Sanity-check that every doc has content.
const missing = docs.filter((d) => !content[d.id]);
if (missing.length > 0) {
  console.warn(
    `[generate-seeds] ${missing.length} docs have no body content: ${missing.map((d) => d.id).join(", ")}`,
  );
}

// --- Write nmsu-content.json ---
fs.writeFileSync(
  path.join(SEEDS_DIR, "nmsu-content.json"),
  JSON.stringify(content, null, 2),
);

// --- Write nmsu-docs.ts ---
const tsBody = `// AUTO-GENERATED by scripts/generate-seeds.mjs. Edit seeds then re-run.
// NMSU Extension publications corpus — metadata + bodies pulled from
// nmsu-content.json at import time.

import content from "./nmsu-content.json";

export interface NmsuDoc {
  id: string;
  pub_number: string;
  title_en: string;
  title_es: string;
  source_url: string;
  content_en: string;
  content_es: string;
  topic_tags: string[];
}

const META = ${JSON.stringify(docs, null, 2)} as const;

const CONTENT = content as Record<string, string>;

export const NMSU_DOCS: NmsuDoc[] = META.map((m) => {
  const body = CONTENT[m.id] ?? "";
  return {
    id: m.id,
    pub_number: m.pub_number,
    title_en: m.title_en,
    title_es: m.title_es,
    source_url: m.source_url,
    content_en: body,
    content_es: body,
    topic_tags: [...m.topic_tags],
  };
});

export function findDoc(id: string): NmsuDoc | undefined {
  return NMSU_DOCS.find((d) => d.id === id);
}
`;

fs.writeFileSync(path.join(SEEDS_DIR, "nmsu-docs.ts"), tsBody);

console.log(
  `[generate-seeds] wrote ${docs.length} docs. Bodies: ${Object.keys(content).length}. Missing: ${missing.length}.`,
);
