// VIP-SUMMARY §3o.13 bookends: the 7:00 Morning Pulse "with an optional 60-second spoken version". The Brain reads
// the same note aloud with the browser's own voice when the agent presses Listen. Nothing is recorded or sent.

/** About 150 words is 60 seconds at a normal speaking pace. */
export const SPOKEN_WORDS = 150;

/** The words Pulse says: a greeting, then the note, cut at a sentence end so it stays inside a minute. */
export function spokenMorning(greeting: string, firstName: string, note: string, max = SPOKEN_WORDS): string {
  const hello = `${greeting}${firstName ? `, ${firstName}` : ""}.`;
  const body = note.replace(/\s+/g, " ").trim();
  const words = (s: string) => (s ? s.split(" ").length : 0);
  let out = hello;
  for (const sentence of body.match(/[^.!?]+[.!?]*/g) ?? []) {
    const s = sentence.trim();
    if (!s) continue;
    if (words(out) + words(s) > max) break;
    out += ` ${s}`;
  }
  return out;
}

// ---- said as people say it (Parry, 16 Oct, after the Film A tour) -----------------------------------------------
// Listen read "VIP-50" as "VIP minus fifty", ran sentences together and read addresses, times and money digit by
// digit. speakable() turns the text into the words a person would say; say() (components/brain/useVoice.ts) runs every
// spoken line through it: the Morning Pulse's Listen and Tell Pulse. Pure: nothing is sent.

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0 to 999,999,999,999 in words: "two hundred forty thousand", "forty-two". */
export function numberWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ""}`;
  for (const [size, word] of [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]] as const) {
    if (n >= size) return `${numberWords(Math.floor(n / size))} ${word}${n % size ? ` ${numberWords(n % size)}` : ""}`;
  }
  return String(n);
}

/** A house or grid number as people say it: 450 "four fifty", 1482 "fourteen eighty-two", 309 "three oh nine",
 * 100 "one hundred", 1300 "thirteen hundred", 2000 "two thousand". */
export function houseWords(n: number): string {
  if (n < 100 || n >= 10000) return numberWords(n);
  if (n % 1000 === 0) return numberWords(n);
  const hi = Math.floor(n / 100), lo = n % 100;
  if (lo === 0) return `${numberWords(hi)} hundred`;
  return `${numberWords(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : numberWords(lo)}`;
}

/** Dollars as people say them: $1,500 "fifteen hundred dollars", $240,000 "two hundred forty thousand dollars". */
export function dollarWords(amount: number): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const w = whole >= 1100 && whole < 10000 && whole % 100 === 0 && whole % 1000 !== 0 ? `${numberWords(whole / 100)} hundred` : numberWords(whole);
  const d = `${w} ${whole === 1 ? "dollar" : "dollars"}`;
  return cents ? `${d} and ${numberWords(cents)} ${cents === 1 ? "cent" : "cents"}` : d;
}

/** "9:30am" "nine thirty a.m.", "12:05 PM" "twelve oh five p.m.", "9am" "nine a.m.". */
function timeWords(h: number, m: number, ap: string | undefined): string {
  const mins = m === 0 ? (ap ? "" : " o'clock") : ` ${m < 10 ? `oh ${ONES[m]}` : numberWords(m)}`;
  return `${numberWords(h)}${mins}${ap ? ` ${ap.toLowerCase() === "a" ? "a.m." : "p.m."}` : ""}`;
}

const DIR: Record<string, string> = { N: "North", S: "South", E: "East", W: "West" };
const SUFFIX: Record<string, string> = { St: "Street", Dr: "Drive", Ave: "Avenue", Ln: "Lane", Rd: "Road", Blvd: "Boulevard", Ct: "Court", Cir: "Circle", Pl: "Place", Pkwy: "Parkway", Hwy: "Highway" };
const SUFFIXES = Object.keys(SUFFIX).join("|");
const STREET_WORD = `(?:${SUFFIXES}|Street|Drive|Avenue|Lane|Road|Boulevard|Court|Circle|Place|Way|Parkway|Highway)`;

/** The text Pulse speaks, as a person would say it: pauses kept at commas and full stops, VIP-50 and VIP-100 by name,
 * street addresses, times and dollar amounts in words. */
export function speakable(text: string): string {
  // a line break is the end of a sentence
  let s = ` ${text.replace(/([^.!?\s])\s*\n+\s*/g, "$1. ").replace(/\s*\n+\s*/g, " ")} `;
  // the program names
  s = s.replace(/\bVIP-?100\b/g, "VIP one hundred").replace(/\bVIP-?50\b/g, "VIP fifty");
  // times, before any other number
  s = s.replace(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s?m\b\.?/gi, (_, h, m, ap) => timeWords(Number(h), Number(m ?? 0), ap));
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => timeWords(Number(h), Number(m), undefined));
  // dollars
  s = s.replace(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?:\s?(k|K|M)\b)?/g, (_, n, c, unit) => {
    let v = Number(String(n).replace(/,/g, "")) + (c ? Number(c.padEnd(2, "0")) / 100 : 0);
    if (unit) v *= unit === "M" ? 1e6 : 1e3;
    return dollarWords(v);
  });
  // Utah grid addresses: "450 E 100 S" -> "four fifty East one hundred South"
  s = s.replace(/\b(\d{1,5})\s+([NSEW])\.?\s+(\d{1,5})\s+([NSEW])\b\.?/g, (_, a, d1, b, d2) => `${houseWords(Number(a))} ${DIR[d1]} ${houseWords(Number(b))} ${DIR[d2]}`);
  // "1482 Maple Ridge Dr", "77 Juniper Ct": the house number as people say it, the street word in full
  s = s.replace(new RegExp(`\\b(\\d{1,5})(\\s+(?:[NSEW]\\.?\\s+)?(?:[A-Z][a-z]+\\s+){1,3}${STREET_WORD})\\b`, "g"), (_, n, rest) => `${houseWords(Number(n))}${rest}`);
  s = s.replace(new RegExp(`(?<=\\b[A-Z][a-z]+\\s)(${SUFFIXES})\\b\\.?(?!\\s+[A-Z][a-z])`, "g"), (m, w) => `${SUFFIX[w]}${m.endsWith(".") ? "." : ""}`);
  // a direction letter next to a street number
  s = s.replace(/\b(\d{1,5}|[a-z]+)\s+([NSEW])\b\.?(?=\s+[A-Z0-9])/g, (_, a, d) => `${a} ${DIR[d]}`);
  // unit numbers: "#20" -> ", number twenty"
  s = s.replace(/\s*#\s?(\d{1,5})\b/g, (_, n) => `, number ${numberWords(Number(n))}`);
  // pauses: a dot, dash or line break between parts is a comma or a full stop, never a run-on
  s = s
    .replace(/\s*[·•|]\s*/g, ", ")
    .replace(/\s+[—–-]\s+|\s*[—–]\s*/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=\S)/g, "$1 ")
    .replace(/([.!?])(?=[A-Z])/g, "$1 ")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s+,/g, ".")
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (s && !/[.!?]$/.test(s)) s += ".";
  return s;
}
