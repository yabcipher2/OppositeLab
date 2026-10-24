export const INTEREST_CATALOG = [
  { id: "int-quant-finance", label: "Quantitative Finance", cluster: "Systems" },
  { id: "int-deep-ecology", label: "Deep Ecology", cluster: "Nature" },
  { id: "int-generative-art", label: "Generative Art", cluster: "Creative" },
  { id: "int-maritime-history", label: "Maritime History", cluster: "History" },
  { id: "int-retrocomputing", label: "Retrocomputing", cluster: "Tech" },
  { id: "int-fermentation", label: "Fermentation Science", cluster: "Nature" },
  { id: "int-urban-planning", label: "Urban Planning", cluster: "Systems" },
  { id: "int-mycology", label: "Mycology", cluster: "Nature" },
  { id: "int-algo-composition", label: "Algorithmic Composition", cluster: "Creative" },
  { id: "int-wilderness", label: "Wilderness Survival", cluster: "Nature" },
  { id: "int-philosophy-mind", label: "Philosophy of Mind", cluster: "Abstract" },
  { id: "int-mech-watches", label: "Mechanical Watches", cluster: "Tech" },
  { id: "int-game-theory", label: "Game Theory", cluster: "Systems" },
  { id: "int-sourdough", label: "Sourdough Craft", cluster: "Nature" },
  { id: "int-amateur-radio", label: "Amateur Radio", cluster: "Tech" },
  { id: "int-typeface", label: "Typeface Design", cluster: "Creative" },
  { id: "int-beekeeping", label: "Beekeeping", cluster: "Nature" },
  { id: "int-theoretical-physics", label: "Theoretical Physics", cluster: "Abstract" },
  { id: "int-cryptography", label: "Cryptography", cluster: "Systems" },
  { id: "int-ethnobotany", label: "Ethnobotany", cluster: "Nature" },
  { id: "int-glassblowing", label: "Glassblowing", cluster: "Creative" },
  { id: "int-cartography", label: "Historical Cartography", cluster: "History" },
  { id: "int-linguistics", label: "Computational Linguistics", cluster: "Abstract" },
  { id: "int-analog-synth", label: "Analog Synthesizers", cluster: "Creative" },
] as const;

const labelsById = new Map<string, string>(INTEREST_CATALOG.map(({ id, label }) => [id, label]));
const idsByLabel = new Map<string, string>(INTEREST_CATALOG.map(({ id, label }) => [label.toLowerCase(), id]));

export function interestLabel(value: string) {
  return labelsById.get(value) ?? value;
}

export function interestId(value: string) {
  return idsByLabel.get(value.toLowerCase()) ?? INTEREST_CATALOG.find(({ id }) => id === value)?.id ?? value;
}
