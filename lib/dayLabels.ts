// Day Clock labels (Parry, 20 Oct: "how can we have better lableing on the clock calendar? the user has no idea what
// each item is"). A block knows only the ids of the work in it; this turns them into who it is for, grouped by touch:
// "Call John, Brent · Video text Lycia, Jessica · Social Steve · Note Sarah". Pure, tested in tests/dayLabels.test.ts.

const KINDS: { word: string; re: RegExp }[] = [
  { word: "Call", re: /^\s*call\s+/i },
  { word: "Video text", re: /^\s*video text\s+/i },
  { word: "Text", re: /^\s*text\s+/i },
  { word: "Social", re: /^\s*social(?: media)? (?:touch|interaction)(?: with)?\s*[—–:-]?\s*/i },
  { word: "Note", re: /^\s*(?:handwritten note|write a handwritten note|note)(?: to)?\s+/i },
  { word: "Drop by", re: /^\s*drop[- ]?by\s+/i },
  { word: "Face-to-face", re: /^\s*face[- ]to[- ]face(?: with)?\s+/i },
];
const MAX_NAMES = 8;

/** Who a block is for, from its refs and the day's titles; "" when none are known. */
export function whoLine(refs: readonly string[], titles: ReadonlyMap<string, string>): string {
  const groups = new Map<string, string[]>();
  let shown = 0, more = 0;
  for (const ref of refs) {
    const t = titles.get(ref) ?? titles.get(ref.replace(/^day:/, ""));
    if (!t) continue;
    // "Write Dave Kim a handwritten note." reads as a note to Dave Kim
    const w = t.match(/^\s*write\s+(.+?)\s+a\s+(?:handwritten\s+)?(?:note|card)\b/i);
    if (w) {
      if (shown >= MAX_NAMES) { more++; continue; }
      shown++;
      groups.set("Note", [...(groups.get("Note") ?? []), w[1]]);
      continue;
    }
    const k = KINDS.find((x) => x.re.test(t));
    const word = k ? k.word : "";
    const name = (k ? t.replace(k.re, "") : t).split(/\.\s|,\s|\s+[—–-]\s+|\s*\(/)[0].replace(/[.]+$/, "").trim();
    if (!name) continue;
    if (shown >= MAX_NAMES) { more++; continue; }
    shown++;
    const list = groups.get(word) ?? [];
    list.push(name);
    groups.set(word, list);
  }
  const parts = [...groups].map(([w, names]) => (w ? `${w} ${names.join(", ")}` : names.join(", ")));
  return parts.join(" · ") + (more ? ` · +${more} more` : "");
}

/** Each block's number in time order (1, 2, 3 ...), so a block too short for a name on the clock matches its row. */
export function blockNumbers(blocks: readonly { id: string; start: string }[]): Map<string, number> {
  const order = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return new Map(order.map((b, i) => [b.id, i + 1]));
}
