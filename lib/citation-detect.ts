// Regex fallback: when the model doesn't call cite_nmsu_doc but says
// "Guide H-230" / "Guía H-230" / "según H-230" out loud, pick up the pub
// number from the transcript and push to the citation store. Dedupes via
// the store's built-in 30s window, so this is safe to call alongside the
// tool-call path — whichever fires first wins.

import { NMSU_DOCS } from "@/seeds/nmsu-docs";

const VALID_DOC_IDS = new Set(NMSU_DOCS.map((d) => d.id));

// Matches "H-230", "H 230", "H230", "A-128", etc. Word-boundaried.
const PUB_REGEX = /\b([HA])[\s-]?(\d{3})\b/g;

export function detectCitedDocIds(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(PUB_REGEX)) {
    const letter = match[1].toLowerCase();
    const num = match[2];
    const id = `nmsu-${letter}-${num}`;
    if (VALID_DOC_IDS.has(id)) found.add(id);
  }
  return [...found];
}
