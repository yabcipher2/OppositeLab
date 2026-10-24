import { interestLabel } from "@/lib/interest-catalog";

export const WORLDVIEW_AXES = ["wv-order", "wv-local", "wv-empirical", "wv-individual"] as const;
const MICRO_HOBBY_LABELS: Record<string, string> = {
  "mh-kb-restore": "Restoring 1980s mechanical keyboards",
  "mh-tide-charts": "Collecting antique tide charts",
  "mh-moss-terr": "Moss terrarium cultivation",
  "mh-circuit-bend": "Circuit bending toy instruments",
  "mh-dead-lang": "Learning dead languages",
  "mh-star-maps": "Hand-drawing star maps",
  "mh-seed-saving": "Heirloom seed saving",
  "mh-shortwave": "Shortwave radio listening",
  "mh-lock-pick": "Competitive lockpicking",
  "mh-paper-marb": "Ebru paper marbling",
  "mh-neon-bend": "Neon tube bending",
  "mh-soil-micro": "Soil microbiome study",
  "mh-zine-make": "Zine making and distribution",
  "mh-astro-photo": "Deep-sky astrophotography",
  "mh-watch-serv": "Vintage watch servicing",
  "mh-tape-loop": "Magnetic tape loop art",
  "mh-urban-foraging": "Urban foraging and identification",
  "mh-font-hunt": "Typeface hunting in the wild",
};

export function normalizedWorldview(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const raw = value as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const axis of WORLDVIEW_AXES) {
    const valueForAxis = raw[axis];
    if (typeof valueForAxis === "number" && Number.isFinite(valueForAxis)) result[axis] = Math.max(0, Math.min(100, valueForAxis));
  }
  return result;
}

export function calculateDivergence(left: unknown, right: unknown) {
  const leftAxes = normalizedWorldview(left);
  const rightAxes = normalizedWorldview(right);
  const sharedAxes = Object.keys(leftAxes).filter((axis) => typeof rightAxes[axis] === "number");
  if (!sharedAxes.length) return { score: null, axes: [] as string[] };
  const score = Math.round(sharedAxes.reduce((sum, axis) => sum + Math.abs(leftAxes[axis] - rightAxes[axis]), 0) / sharedAxes.length);
  return { score, axes: sharedAxes };
}

export function findResonancePoint(left: unknown, right: unknown) {
  const leftHobbies = Array.isArray(left) ? left.filter((item): item is string => typeof item === "string") : [];
  const rightHobbies = new Set(Array.isArray(right) ? right.filter((item): item is string => typeof item === "string") : []);
  const hobby = leftHobbies.find((item) => rightHobbies.has(item));
  if (hobby) {
    if (hobby.startsWith("mh-custom:")) return hobby.slice("mh-custom:".length);
    return MICRO_HOBBY_LABELS[hobby] ?? hobby.replace(/^mh-/, "").replace(/-/g, " ");
  }
  return "";
}

export function sharedInterests(left: unknown, right: unknown) {
  const leftItems = Array.isArray(left) ? left.filter((item): item is string => typeof item === "string") : [];
  const rightItems = new Set(Array.isArray(right) ? right.filter((item): item is string => typeof item === "string").map((item) => interestLabel(item).toLowerCase()) : []);
  return leftItems.map(interestLabel).filter((item) => rightItems.has(item.toLowerCase()));
}
