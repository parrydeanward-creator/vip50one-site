"use client";

import { STORY_LABEL, filterStory, productsIn, storyProduct, type StoryProduct } from "@/lib/lifeStory.ts";
import AskGroupSection from "./AskGroupSection.tsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dialable, mailable, touchUrl } from "@/lib/contact.ts";
import { BIZ_PARENT, byName, editText, editValue, isBizSub, listUrl, peopleUrl, personTag, personUrl, readGroups, readPage, readPerson, readTimeline, LEFT_EARLY_LINE, sectionColor, showValue, gapsIn, timelineUrl, type Field, type Groups, type Person, type PersonItem, type Section, type Timeline } from "@/lib/people.ts";
import { initialsOf, vipTierUrl } from "@/lib/vips.ts";
import {
  BDAY_FALLBACK, BDAY_GROUP, LEAD_CHIPS, NEED, RING_BOX, applyDone, isSoiSource, sourceColor, sourceLabel, tilesOf, boardColor, boardOf, circleOf, filterQuery, filterTitle, keysOf, lastTouchWords, narrow, ringRadius, sameFilter, seatFaces, todayYmd, toggleFilter,
  RING_KEYS, type Chip, type Done, type Filter,
} from "@/lib/contactsBoard.ts";
import PermissionsSection from "./PermissionsSection.tsx";
import HomeReportSection from "./HomeReportSection.tsx";
import CmaSection from "./CmaSection.tsx";
import ShareLinkSection, { MyHomeLine } from "./SiteFeedsSection.tsx";
import CallPrepCard from "./CallPrepCard.tsx";
import PersonMenu from "./PersonMenu.tsx";
import { useHeldDelete } from "./useHeldDelete.tsx";
import { firstOf } from "@/lib/deleteContact.ts";
import "@/app/contacts-board.css";

// VIP-SUMMARY §3k, My Contacts in ONE Brain, option C (Parry, 22 Oct: "yes on C"; research/mockups/contacts/
// contacts-c.png). Four clean-up buttons on top. Left: the agent's circles as rings round YOU (VIP-50 inside, Other
// outside), the people who need them drawn on their ring, a key of every group, and where people came from. Middle: the
// list, starting on who needs the agent today. Right: the person picked, ready to act (a bottom sheet on a phone).
// Every number opens its people and a done touch updates every count at once (PROTOCOL rule 12). ONE MOVE keeps the
// contacts, the groups, Pulse's lines and the field catalogue; the Brain draws what it is sent and asks.

const GOLD = "#f5c542";
const RED = "#ff5a5f";
const GREEN = "#2fbf71";
const TEAL = "#2fb7a3";
const PAGE = 40;

const TOUCH_KINDS: [string, string][] = [
  ["call", "Call"],
  ["text", "Text"],
  ["email", "Email"],
  ["video_text", "Video text"],
  ["face_to_face", "Face-to-face"],
  ["handwritten_note", "Note"],
];

async function getJson(url: string): Promise<{ status: number; body: unknown } | null> {
  try {
    const r = await fetch(url, { credentials: "include", cache: "no-store" });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch {
    return null;
  }
}

function Face({ p, size, ring, glow }: { p: { name: string; photo: string | null }; size: number; ring: string; glow?: boolean }) {
  return (
    <span className={`ct-av${glow ? " ct-glow" : ""}`} style={{ width: size, height: size, borderColor: ring, fontSize: Math.round(size * 0.34) }} aria-hidden="true">
      {p.photo ? <img src={p.photo} alt="" /> : initialsOf(p.name)}
    </span>
  );
}

export default function Contacts({
  onUnavailable,
  onChanged,
  onBack,
  onClassic,
  onPowerHour,
  onOpenPage,
  celebrate = [],
  openId = null,
  startGroup = null,
}: {
  startGroup?: string | null; // open this group's list on arrival; mayors_circle and rising_vip land inside Biz VIP
  openId?: { id: string; k: number } | null; // pick this person on arrival ("Go to" elsewhere in the Brain)
  onUnavailable: () => void;
  onChanged: () => void;
  onBack: () => void;
  onClassic: () => void;
  /** Start Power Hour: the Brain's own Power Hour. */
  onPowerHour?: () => void;
  /** A ONE MOVE page inside the Brain (Possible duplicates opens Clean Up Contacts). */
  onOpenPage?: (path: string) => void;
  celebrate?: string[];
}) {
  const glowing = useMemo(() => new Set(celebrate), [celebrate]);
  const [server, setServer] = useState<Groups | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(NEED);
  const [srcAll, setSrcAll] = useState(false);
  const [list, setList] = useState<PersonItem[]>([]);
  const [listNote, setListNote] = useState<string | null>(null);
  const [listBusy, setListBusy] = useState(false);
  const [more, setMore] = useState<{ total: number; next: string | null }>({ total: 0, next: null });
  const [due, setDue] = useState<PersonItem[] | null>(null);
  const [ringOf, setRingOf] = useState<Map<string, string[]>>(new Map());
  const [family, setFamily] = useState<Record<string, PersonItem[]>>({});
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PersonItem[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [sheet, setSheet] = useState(false); // the person card as a bottom sheet on a phone
  const [full, setFull] = useState(false); // the full contact (every section, history, delete)
  const [pick, setPick] = useState<"touch" | "vip" | null>(null);
  const [done, setDone] = useState<Done[]>([]);
  const [prepFor, setPrepFor] = useState<string | null>(null);
  const [openSec, setOpenSec] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ key: string; text: string } | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [storyOnly, setStoryOnly] = useState<StoryProduct | null>(null);
  const [adding, setAdding] = useState<{ first_name: string; last_name: string; phone: string; email: string; tier: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const held = useHeldDelete({ demo: false });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const midRef = useRef<HTMLElement | null>(null);
  const today = todayYmd();

  // ---- loading -----------------------------------------------------------------------------
  const loadGroups = useCallback(async () => {
    const r = await getJson(`${peopleUrl}/groups`);
    if (!r || r.status === 404 || r.status === 405) return onUnavailable();
    if (r.status !== 200) return setErr(r.status === 401 ? "Sign in again to see your contacts." : "ONE couldn't load your contacts just now.");
    const g = readGroups(r.body);
    if (!g) return onUnavailable();
    setServer(g);
    setErr(null);
  }, [onUnavailable]);

  // Pulse's list: everyone who needs the agent, shown A-Z (Parry, 12 Oct); the red and yellow marks show who is first.
  const loadDue = useCallback(async () => {
    const r = await getJson(listUrl({ sort: "pulse", limit: 100 }));
    const p = r?.status === 200 ? readPage(r.body) : null;
    setDue(p ? byName(p.items.filter((i) => i.pulse)) : []);
  }, []);

  // Which ring each person who needs the agent sits on: each ring's list in Pulse's order (those flagged come first).
  const loadRings = useCallback(async (g: Groups) => {
    const want = RING_KEYS.filter((k) => (g.groups.find((x) => x.key === k)?.needsYou ?? 0) > 0);
    const rs = await Promise.all(want.map((k) => getJson(listUrl({ group: k, sort: "pulse", limit: 100 })).then((r) => [k, r?.status === 200 ? readPage(r.body)?.items ?? [] : []] as const)));
    const m = new Map<string, string[]>();
    for (const [k, items] of rs) for (const p of items) if (p.pulse) m.set(p.id, [...(m.get(p.id) ?? []), k]);
    setRingOf(m);
  }, []);

  useEffect(() => {
    loadGroups();
    loadDue();
  }, [loadGroups, loadDue]);
  useEffect(() => {
    if (server) loadRings(server);
  }, [server, loadRings]);

  // Biz VIP's three lists, so a person in two of them counts once in its key line (lib/people.ts nestBizVip).
  const inBiz = filter.kind === "group" && (filter.key === BIZ_PARENT || isBizSub(filter.key));
  useEffect(() => {
    if (!inBiz || !server) return;
    let on = true;
    const keys = [BIZ_PARENT, ...server.groups.filter((g) => isBizSub(g.key)).map((g) => g.key)];
    Promise.all(keys.map((k) => getJson(listUrl({ group: k, sort: "name", limit: 100 })).then((r) => [k, r?.status === 200 ? readPage(r.body)?.items ?? null : null] as const))).then((rs) => {
      if (on) setFamily(Object.fromEntries(rs.filter((x): x is readonly [string, PersonItem[]] => !!x[1])));
    });
    return () => {
      on = false;
    };
  }, [inBiz, server]);

  // The list behind the filter. Who needs you is Pulse's list; Ask a group and Possible duplicates have no list here.
  const loadList = useCallback(async (f: Filter, cursor: string | null = null) => {
    const fq = filterQuery(f);
    if (!fq || f.kind === "need") return;
    setListBusy(true);
    setListNote(null);
    const page = async (group: string | null) => {
      const r = await getJson(listUrl({ group, source: fq.source, sort: fq.sort, cursor, limit: PAGE }));
      return { status: r?.status ?? 0, page: r?.status === 200 ? readPage(r.body) : null };
    };
    const got = await page(fq.group);
    // VIPs with no birthday: ONE MOVE counts them but does not list them as a group yet; until it does, the VIP-50 and
    // VIP-100 show here, A-Z, and the agent adds each birthday on the card (never a made-up list).
    if (f.kind === "chip" && f.key === "bday" && fq.group === BDAY_GROUP && (!got.page || (!got.page.total && !cursor))) {
      const both = await Promise.all(BDAY_FALLBACK.map((k) => getJson(listUrl({ group: k, sort: "name", limit: 100 }))));
      const items = byName(both.flatMap((r) => (r?.status === 200 ? readPage(r.body)?.items ?? [] : [])));
      setListBusy(false);
      setList(items);
      setMore({ total: items.length, next: null });
      setListNote("Your VIPs, A-Z. Open each one with no birthday and add it on their card.");
      return;
    }
    setListBusy(false);
    if (!got.page) {
      setList([]);
      setMore({ total: 0, next: null });
      return setListNote("ONE couldn't load that list just now.");
    }
    const p = got.page;
    setList((was) => (cursor ? [...was, ...p.items.filter((i) => !was.some((w) => w.id === i.id))] : p.items));
    setMore({ total: p.total, next: p.next });
    // A lead source: until ONE MOVE filters by source, it answers with every lead; say so rather than mislabel them.
    if (f.kind === "lsrc" && p.total > f.n) setListNote(`ONE MOVE is switching on the ${sourceLabel(f.key)} filter. Until then this shows all your leads, A-Z.`);
  }, []);

  const choose = useCallback(
    (next: Filter) => {
      const f = toggleFilter(filter, next);
      setFilter(f);
      setList([]);
      setMore({ total: 0, next: null });
      setListNote(null);
      setFull(false);
      setAdding(null);
      if (f.kind !== "need") loadList(f);
      // on a phone the list is under the rings: bring it up so the tap shows its people
      if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 760px)").matches) setTimeout(() => midRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    },
    [filter, loadList],
  );

  // Search as the agent types: the list narrows at once; from two letters ONE MOVE searches everyone (name, phone, email,
  // address, notes).
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) return setFound(null);
    const t = setTimeout(async () => {
      const r = await getJson(listUrl({ q: needle, sort: "name", limit: 50 }));
      const p = r?.status === 200 ? readPage(r.body) : null;
      setFound(p ? p.items : []);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const loadPerson = useCallback(async (id: string) => {
    const r = await getJson(personUrl(id));
    const p = r?.status === 200 ? readPerson(r.body) : null;
    if (!p) {
      setNote(r?.status === 404 ? "That contact isn't there any more." : "ONE couldn't open that contact just now.");
      return null;
    }
    setPerson((was) => (was && was.id !== id ? was : p));
    return p;
  }, []);

  const select = useCallback(
    (id: string, open = true) => {
      setSel(id);
      setPick(null);
      setAdding(null);
      setEdit(null);
      setTimeline(null);
      setStoryOnly(null);
      setPerson((was) => (was?.id === id ? was : null));
      if (open) setSheet(true);
      loadPerson(id).then((p) => {
        if (p) setOpenSec(p.sections[0]?.key ?? null);
      });
    },
    [loadPerson],
  );

  // On arrival: a person asked for ("Go to"), or a group, else the first person who needs the agent.
  useEffect(() => {
    if (openId) select(openId.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!server || !startGroup || startedRef.current) return;
    startedRef.current = true;
    if (server.groups.some((g) => g.key === startGroup)) choose({ kind: "group", key: startGroup });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, startGroup]);
  useEffect(() => {
    if (!sel && !openId && due && due.length) select(due[0].id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due]);

  // ---- the numbers, with today's done touches off at once (rule 12) --------------------------------------------------
  const flagged = useMemo(() => new Set((due ?? []).map((p) => p.id)), [due]);
  const groups = useMemo(() => (server ? applyDone(server, done, flagged) : null), [server, done, flagged]);
  const board = useMemo(() => (groups ? boardOf(groups, family) : null), [groups, family]);
  const doneIds = useMemo(() => new Set(done.map((d) => d.id)), [done]);
  const needLeft = groups?.needsYou ?? 0;
  const waiting = useMemo(() => (due ?? []).filter((p) => !doneIds.has(p.id)), [due, doneIds]);
  const faces = useMemo(() => seatFaces(waiting, ringOf), [waiting, ringOf]);
  const byId = useMemo(() => {
    const m = new Map<string, PersonItem>();
    for (const p of [...(due ?? []), ...list, ...(found ?? [])]) if (!m.has(p.id)) m.set(p.id, p);
    return m;
  }, [due, list, found]);

  // ---- writing -----------------------------------------------------------------------------
  const post = async (url: string, body: unknown): Promise<{ ok: boolean; body: unknown; status: number }> => {
    try {
      const r = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  };
  const errorOf = (b: unknown, fallback: string) => (b && typeof b === "object" && typeof (b as { error?: unknown }).error === "string" ? (b as { error: string }).error : fallback);
  const okOf = (r: { ok: boolean; body: unknown }) => r.ok && !(r.body && typeof r.body === "object" && (r.body as { ok?: unknown }).ok === false);

  const reloadAll = () => {
    loadGroups();
    loadDue();
    if (filter.kind !== "need") loadList(filter);
  };

  // Mark touched today: ONE MOVE logs it everywhere (task, month box, trackers, timeline; /api/brain/touch, the same route
  // as the contact card and Power Hour). The counts drop at once; ONE MOVE's next answer then stands.
  const logTouch = async (kind: string, label: string) => {
    if (!sel || busy) return;
    const id = sel;
    const it = byId.get(id) ?? (person && person.id === id ? { id, tier: person.tier, cls: (person.cls as PersonItem["cls"]) ?? null } : null);
    setBusy(true);
    const r = await post(touchUrl, { contact_id: id, kind, detail: `${label} logged from My Contacts in ONE Brain` });
    setBusy(false);
    if (!okOf(r)) return setNote(errorOf(r.body, "ONE MOVE didn't take that. Nothing was changed."));
    setPick(null);
    if (it) setDone((d) => (d.some((x) => x.id === id) ? d : [...d, { id, keys: keysOf(it, ringOf, filter) }]));
    const name = person?.id === id ? person.firstName ?? person.name : it && "name" in it ? (it as PersonItem).name : "They";
    setNote(`${name} marked touched today. ${Math.max(0, needLeft - (flagged.has(id) && !doneIds.has(id) ? 1 : 0))} left today. Boxes and Pulse update.`);
    reloadAll();
    loadPerson(id);
    onChanged();
  };

  // Make VIP: ONE MOVE's VIP route (the same as VIP Management's rings).
  const makeVip = async (tier: "vip50" | "vip100") => {
    if (!person || busy) return;
    setBusy(true);
    const r = await post(vipTierUrl, { contact_id: person.id, tier });
    setBusy(false);
    if (!okOf(r)) return setNote(errorOf(r.body, "That didn't go through. Nothing was changed."));
    setPick(null);
    setNote(`Done. ${person.name} is in your ${tier === "vip50" ? "VIP-50" : "VIP-100"}.`);
    loadPerson(person.id);
    reloadAll();
    onChanged();
  };

  const saveField = async (f: Field) => {
    if (!person || !edit || busy) return;
    const v = editValue(f, edit.text);
    if ("error" in v) return setNote(v.error);
    setBusy(true);
    const r = await post(personUrl(person.id), { fields: { [f.key]: v.value } });
    setBusy(false);
    const next = r.ok ? readPerson(r.body) : null;
    if (!r.ok) return setNote(errorOf(r.body, "That didn't save. Nothing was changed."));
    setEdit(null);
    if (next) setPerson(next);
    else loadPerson(person.id);
    setNote(`${f.label} saved.`);
    loadGroups();
    onChanged();
  };

  // The month's touches tick with one tap (Parry, 20 Oct): ONE MOVE logs the touch everywhere when one turns on.
  const quickSave = async (f: Field, value: string | null) => {
    if (!person || busy) return;
    setBusy(true);
    const r = await post(personUrl(person.id), { fields: { [f.key]: value } });
    setBusy(false);
    const next = r.ok ? readPerson(r.body) : null;
    if (!r.ok) return setNote(errorOf(r.body, "That didn't save. Nothing was changed."));
    setEdit(null);
    if (next) setPerson(next);
    else loadPerson(person.id);
    setNote(value ? `${f.label} ticked. It counts everywhere.` : `${f.label} cleared.`);
    reloadAll();
    onChanged();
  };

  const addPerson = async () => {
    if (!adding || busy) return;
    if (!adding.first_name.trim()) return setNote("The first name is required.");
    setBusy(true);
    const body: Record<string, string> = { first_name: adding.first_name.trim(), tier: adding.tier };
    for (const k of ["last_name", "phone", "email"] as const) if (adding[k].trim()) body[k] = adding[k].trim();
    const r = await post(peopleUrl, body);
    setBusy(false);
    const id = r.ok && r.body && typeof (r.body as { id?: unknown }).id === "string" ? (r.body as { id: string }).id : null;
    if (!id) return setNote(errorOf(r.body, "That person wasn't added. Nothing was changed."));
    setAdding(null);
    setNote(`${body.first_name} is in your contacts.`);
    reloadAll();
    onChanged();
    select(id);
  };

  // Delete (walker 2026-10-17-0042): off the screen at once, held 6 seconds with Undo, then ONE MOVE's route; if it
  // does not take it, the lists reload from ONE MOVE (where the person still is) and the toast says so.
  const deletePerson = () => {
    if (!person) return;
    const id = person.id;
    const first = firstOf(person.firstName ?? person.name);
    const gone = (l: PersonItem[]) => l.filter((p) => p.id !== id);
    setList(gone);
    setDue((d) => (d ? gone(d) : d));
    setFound((f) => (f ? gone(f) : f));
    setMore((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
    setServer((g) => (g ? { ...g, total: Math.max(0, g.total - 1) } : g));
    setPerson(null);
    setSel(null);
    setFull(false);
    setSheet(false);
    setEdit(null);
    setTimeline(null);
    const reload = () => reloadAll();
    held.start({ ids: [id], first, restore: reload, onDone: () => (reload(), onChanged()) });
  };

  const loadTimeline = async (cursor: string | null = null) => {
    if (!person) return;
    const r = await getJson(timelineUrl(person.id, cursor));
    const t = r?.status === 200 ? readTimeline(r.body) : null;
    if (!t) return setNote("ONE couldn't load the history just now.");
    setTimeline((was) => (cursor && was ? { events: [...was.events, ...t.events], next: t.next } : t));
  };

  // A row's Text: their number from ONE MOVE, then the agent's own messages app. No number: their full contact, to add one.
  const textFrom = async (id: string) => {
    const p = person?.id === id ? person : await loadPerson(id);
    const tel = p ? dialable(p.phone) : null;
    if (tel) window.location.href = `sms:${tel}`;
    else if (p) {
      select(id);
      setFull(true);
      setNote(`No mobile number for ${p.firstName ?? p.name} yet. Add one under How to reach.`);
    }
  };
  const openFull = () => {
    setFull(true);
    setSheet(false);
    rootRef.current?.scrollTo({ top: 0 });
  };

  const back = () => {
    if (prepFor) return setPrepFor(null);
    if (edit) return setEdit(null);
    if (pick) return setPick(null);
    if (adding) return setAdding(null);
    if (full) return setFull(false);
    if (sheet) return setSheet(false);
    if (q) return setQ("");
    if (!sameFilter(filter, NEED)) return choose(filter);
    onBack();
  };
  // a note says what happened, then steps aside
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 6000);
    return () => clearTimeout(t);
  }, [note]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (sheet || full || pick || adding)) back();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (err) {
    return (
      <div className="vr-msg" role="alert">
        <p>{err}</p>
        <button className="vr-btn" onClick={onClassic}>Open the Classic page</button>
      </div>
    );
  }
  if (!groups || !board) {
    return (
      <div className="page-panel-veil" role="status">
        <span className="page-panel-spin" aria-hidden="true" />
        Opening your contacts…
      </div>
    );
  }

  // ---- what the middle shows ---------------------------------------------------------------------------------------
  const searching = q.trim().length > 0;
  const base = filter.kind === "need" ? due ?? [] : list;
  const rows = searching ? (found && q.trim().length >= 2 ? found : narrow(base, q)) : base;
  const title = searching && found && q.trim().length >= 2 ? `FOUND · ${found.length}${found.length === 50 ? "+" : ""}` : filterTitle(filter, board, groups.gaps, needLeft);
  const sel0 = sel ? byId.get(sel) ?? null : null;
  const selNeeds = !!sel && !doneIds.has(sel) && (flagged.has(sel) || !!(person?.id === sel && person.pulse));
  const tel = person ? dialable(person.phone) : null;
  const mail = person ? mailable(person.email) : null;
  const ringPick = (k: string) => choose({ kind: "group", key: k });
  const isOn = (f: Filter) => sameFilter(filter, f);
  const chips: { k: Chip; n: string; label: string; act: string }[] = [
    { k: "bday", n: groups.gaps.vipNoBirthday.toLocaleString("en-US"), label: "VIPs with no birthday", act: "Add" },
    { k: "dup", n: groups.gaps.possibleDuplicates.toLocaleString("en-US"), label: "Possible duplicates", act: "Review" },
    { k: "sort", n: groups.gaps.toSort.toLocaleString("en-US"), label: "New to sort", act: "Sort" },
    { k: "perm", n: "✓", label: "Ask a group for permission", act: "Choose" },
  ];
  const chipGo = (k: Chip) => {
    // Possible duplicates are reviewed in ONE MOVE's Clean Up Contacts (merge, not a duplicate, later), inside the Brain.
    if (k === "dup") return onOpenPage ? onOpenPage("/contacts/cleanup") : onClassic();
    choose({ kind: "chip", key: k });
  };
  const srcTotal = board.sources.reduce((a, s) => a + s.count, 0);
  const cx = RING_BOX / 2;

  const circle = (p: PersonItem) => circleOf(p, ringOf, p.id);

  const personCard = person && sel === person.id ? person : null;
  const cardName = personCard?.name ?? sel0?.name ?? "";
  const cardWhy = sel && doneIds.has(sel) ? "Done today" : personCard?.pulse ? personCard.pulse.line : sel0?.pulse ?? null;
  const cardCircle = sel0 ? circle(sel0) : personCard ? circleOf({ tier: personCard.tier, cls: (personCard.cls as PersonItem["cls"]) ?? null, source: personCard.source }, ringOf, personCard.id) : null;

  return (
    <div ref={rootRef} className="ct" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      {held.toast}
      {prepFor && <CallPrepCard contactId={prepFor} phone={person?.id === prepFor ? person.phone : null} onClose={() => setPrepFor(null)} onDial={() => setPrepFor(null)} />}

      <header className="ct-head">
        <div>
          {/* a back button on every page (Parry, 23 Oct: "I need back buttons on every page") */}
          <button type="button" className="page-back" data-act="page-back" onClick={onBack} aria-label="Back">← Back</button>
          <span className="ct-tag">ONE MOVE · CONTACTS</span>
          <h1 className="ct-h1">MY CONTACTS</h1>
          <p className="ct-sub">
            <button className="ct-num" onClick={() => choose({ kind: "all" })} aria-label={`Show all ${board.total} people`}>{`${board.total.toLocaleString("en-US")} people`}</button>
            {". "}
            <button className="ct-num" onClick={() => (isOn(NEED) ? undefined : choose(NEED))} aria-label={`Show the ${needLeft} who need you today`}>{`${needLeft.toLocaleString("en-US")} need you today`}</button>
            {"."}
          </p>
        </div>
        <div className="ct-tools">
          <input className="ct-search" type="search" placeholder="Search name, phone, email, address, notes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your contacts" />
          {/* Import lives on My Contacts (Parry, 23 Oct: "couldnt import contacts move to contacts page") */}
          <button className="ct-btn" data-act="contacts-import" onClick={() => (onOpenPage ? onOpenPage("/contacts/import") : onClassic())}>Import</button>
          <button className="ct-btn solid" onClick={() => { setAdding({ first_name: "", last_name: "", phone: "", email: "", tier: "contact" }); setFull(false); setSheet(true); }}>+ Add a person</button>
        </div>
      </header>

      <div className="ct-chips" role="group" aria-label="Clean up your contacts">
        {chips.map((c) => (
          <button key={c.k} className={`ct-chip${isOn({ kind: "chip", key: c.k }) ? " on" : ""}`} aria-pressed={isOn({ kind: "chip", key: c.k })} onClick={() => chipGo(c.k)}>
            <span><b>{c.n}</b>{c.label}</span>
            <span className="ct-chip-go">{c.act} →</span>
          </button>
        ))}
      </div>

      {full && personCard ? (
        fullContact()
      ) : (
        <div className="ct-grid">
          {/* left: the rings, the key, where they came from */}
          <section className="ct-card ct-left" aria-label="Your circles">
            <svg className="ct-rings" viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} role="group" aria-label="Your circles, closest inside">
              {[...board.rings].reverse().map((r) => {
                const on = isOn({ kind: "group", key: r.key });
                return (
                  <circle
                    key={r.key}
                    className="ct-ring"
                    data-ring={r.key}
                    cx={cx}
                    cy={cx}
                    r={ringRadius(r.key)}
                    fill={r.color}
                    fillOpacity={on ? 0.16 : 0.04}
                    stroke={r.color}
                    strokeOpacity={on ? 1 : r.count ? 0.5 : 0.22}
                    strokeWidth={on ? 5 : 2}
                    role="button"
                    tabIndex={0}
                    aria-pressed={on}
                    aria-label={`${r.label}: ${r.count} ${r.count === 1 ? "person" : "people"}${r.needsYou ? `, ${r.needsYou} need you` : ""}`}
                    onClick={() => ringPick(r.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        ringPick(r.key);
                      }
                    }}
                  >
                    <title>{`${r.label}: ${r.count.toLocaleString("en-US")}`}</title>
                  </circle>
                );
              })}
              {faces.seats.map((s) => {
                const p = byId.get(s.id);
                if (!p) return null;
                return (
                  <g key={s.id} className="ct-seat" role="button" tabIndex={0} aria-label={`${p.name}: ${p.pulse ?? "needs you"}`} onClick={() => select(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p.id); } }}>
                    <title>{`${p.name} · ${p.pulse ?? ""}`}</title>
                    <circle cx={s.x} cy={s.y} r={14} fill="#1b2750" stroke={p.urgency === "now" ? RED : GOLD} strokeWidth={sel === p.id ? 4 : 2.5} />
                    <text x={s.x} y={s.y + 3.5} textAnchor="middle" className="ct-seat-t">{initialsOf(p.name)}</text>
                  </g>
                );
              })}
              {faces.more > 0 && (
                <g className="ct-seat" role="button" tabIndex={0} aria-label={`${faces.more} more need you: show them`} onClick={() => choose(NEED)} onKeyDown={(e) => { if (e.key === "Enter") choose(NEED); }}>
                  <circle cx={cx + ringRadius("other") * Math.cos(-1.25)} cy={cx + ringRadius("other") * Math.sin(-1.25)} r={15} fill="#1b2750" stroke={RED} strokeWidth={2.5} />
                  <text x={cx + ringRadius("other") * Math.cos(-1.25)} y={cx + ringRadius("other") * Math.sin(-1.25) + 3.5} textAnchor="middle" className="ct-seat-t">{`+${faces.more}`}</text>
                </g>
              )}
              <g className="ct-seat" role="button" tabIndex={0} aria-label={`You: ${needLeft} need you today. Show them`} onClick={() => !isOn(NEED) && choose(NEED)} onKeyDown={(e) => { if (e.key === "Enter" && !isOn(NEED)) choose(NEED); }}>
                <circle cx={cx} cy={cx} r={30} fill="#0a1230" stroke={GOLD} strokeWidth={2.5} />
                <text x={cx} y={cx + 3} textAnchor="middle" className="ct-you">YOU</text>
                <text x={cx} y={cx + 16} textAnchor="middle" className="ct-you-n">{`${needLeft} NEED YOU`}</text>
              </g>
            </svg>

            {/* The key as tiles (Parry, 23 Oct: "yes on B"): big numbers, Leads wide with its sources, every one opens its people */}
            <div className="ct-key">
              {(() => {
                const t = tilesOf(board.key);
                const tile = (k: (typeof board.key)[number], empty = false, wide = false) => {
                  const on = isOn({ kind: "group", key: k.key }) || (k.key === BIZ_PARENT && filter.kind === "group" && isBizSub(filter.key));
                  return (
                    <button key={k.key} className={`ct-k${on ? " on" : ""}${empty ? " empty" : ""}${wide ? " ct-k-span" : ""}`} data-key={k.key} style={{ color: k.color }} aria-pressed={on} onClick={() => ringPick(k.key)} aria-label={`${k.label}: ${k.count}${k.needsYou ? `, ${k.needsYou} need you` : ""}`}>
                      <span className="ct-k-n">{k.label.toUpperCase()}</span>
                      <span className="ct-k-c">{k.count.toLocaleString("en-US")}</span>
                      {!empty && <em className="ct-k-need">{k.needsYou ? `${k.needsYou.toLocaleString("en-US")} need you` : "\u00a0"}</em>}
                    </button>
                  );
                };
                const L = t.leads;
                const srcTot = board.leadsSources.reduce((a, s) => a + s.count, 0) || 1;
                const shown = srcAll ? board.leadsSources : board.leadsSources.slice(0, LEAD_CHIPS);
                const rest = board.leadsSources.slice(LEAD_CHIPS);
                const restN = rest.reduce((a, s) => a + s.count, 0);
                const pickSrc = (s: { source: string; count: number }) => choose({ kind: "lsrc", key: s.source, n: s.count });
                return (
                  <>
                    {t.before.map((k) => tile(k))}
                    {L ? (
                      <div className={`ct-k ct-k-wide${isOn({ kind: "group", key: "leads" }) ? " on" : ""}`} style={{ color: L.color }}>
                        <button className="ct-k-main" data-key="leads" aria-pressed={isOn({ kind: "group", key: "leads" })} onClick={() => ringPick("leads")} aria-label={`Leads: ${L.count}${L.needsYou ? `, ${L.needsYou} need you` : ""}`}>
                          <span className="ct-k-n">LEADS</span>
                          <span className="ct-k-c">{L.count.toLocaleString("en-US")}</span>
                          <em className="ct-k-need">{L.needsYou ? `${L.needsYou.toLocaleString("en-US")} need you` : "\u00a0"}</em>
                        </button>
                        {board.leadsSources.length ? (
                          <>
                            <div className="ct-lbar" role="group" aria-label="Leads by source">
                              {board.leadsSources.slice(0, LEAD_CHIPS).map((s, i) => (
                                <button key={s.source} title={`${sourceLabel(s.source)}: ${s.count.toLocaleString("en-US")}`} aria-label={`${sourceLabel(s.source)} leads: ${s.count}`} style={{ width: `${(s.count / srcTot) * 100}%`, background: sourceColor(s.source, i) }} onClick={() => pickSrc(s)} />
                              ))}
                              {restN ? <button title={`${rest.length} smaller sources: ${restN}`} aria-label={`${rest.length} smaller sources: ${restN}`} style={{ width: `${(restN / srcTot) * 100}%`, background: "#5a6488" }} onClick={() => setSrcAll(true)} /> : null}
                            </div>
                            <div className="ct-lchips">
                              {shown.map((s, i) => (
                                <button key={s.source} className={`ct-lchip${isOn({ kind: "lsrc", key: s.source, n: s.count }) ? " on" : ""}${isSoiSource(s.source) ? " soi" : ""}`} aria-pressed={isOn({ kind: "lsrc", key: s.source, n: s.count })} onClick={() => pickSrc(s)} title={isSoiSource(s.source) ? "SOI moving back to Sphere" : undefined}>
                                  <i style={{ background: sourceColor(s.source, i) }} />
                                  {sourceLabel(s.source)} <b>{s.count.toLocaleString("en-US")}</b>
                                </button>
                              ))}
                              {rest.length ? (
                                <button className="ct-lchip more" onClick={() => setSrcAll(!srcAll)}>{srcAll ? "Fewer" : <>{`+${rest.length} more · `}<b>{restN.toLocaleString("en-US")}</b></>}</button>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {/* an odd tile out spans the row rather than sit alone */}
                    {t.after.map((k, i) => tile(k, false, t.after.length % 2 === 1 && i === t.after.length - 1))}
                    {t.empty.map((k) => tile(k, true))}
                  </>
                );
              })()}
            </div>

            <div className="ct-from">
              <div className="ct-sec">CAME FROM</div>
              {board.sources.length ? (
                <div className="ct-srcbar">
                  {board.sources.map((s) => (
                    <button
                      key={s.key}
                      title={`${s.label}: ${s.count.toLocaleString("en-US")}`}
                      aria-label={`Came from ${s.label}: ${s.count}`}
                      style={{ width: `${Math.max((s.count / Math.max(1, srcTotal)) * 100, 1.5)}%`, background: s.color, opacity: filter.kind === "source" && filter.key !== s.key ? 0.35 : 1 }}
                      onClick={() => choose({ kind: "source", key: s.key })}
                    />
                  ))}
                </div>
              ) : null}
              <div className="ct-srcl">
                {board.sources.map((s) => (
                  <button key={s.key} className={isOn({ kind: "source", key: s.key }) ? "on" : undefined} aria-pressed={isOn({ kind: "source", key: s.key })} onClick={() => choose({ kind: "source", key: s.key })}>
                    <i style={{ background: s.color }} />
                    {s.label} <b>{s.count.toLocaleString("en-US")}</b>
                  </button>
                ))}
              </div>
              {board.emptySources.length ? <p className="ct-zero">{board.emptySources.map((l) => `${l} 0`).join(" · ")}</p> : null}
              {/* Lead Sources lives here now (Parry, 23 Oct: "yes fold them in"); the menu entry stays so nothing breaks */}
              <button className="ct-more" data-act="contacts-sources" onClick={() => (onOpenPage ? onOpenPage("/contacts/sources") : onClassic())}>Lead sources: name and manage where people come from</button>
            </div>
          </section>

          {/* middle: the list */}
          <section ref={midRef} className="ct-card ct-mid" aria-label="People">
            <div className="ct-lhead">
              <div className="ct-ltitle" style={{ color: filter.kind === "need" && !searching ? RED : GOLD }}>
                {title}
                <small>{filter.kind === "need" && !searching ? "Tap a ring to show its people here" : listBusy ? "Loading…" : ""}</small>
              </div>
              <div className="ct-lbtns">
                {!sameFilter(filter, NEED) || searching ? (
                  <button className="ct-btn" onClick={() => { setQ(""); if (!sameFilter(filter, NEED)) choose(filter); }}>Back to need you today</button>
                ) : null}
                <button className="ct-btn solid" onClick={() => (onPowerHour ? onPowerHour() : onClassic())}>Start Power Hour</button>
              </div>
            </div>
            {inBiz && board.bizSubs.length ? (
              <div className="ct-subs">
                {[{ key: BIZ_PARENT, label: "All Biz VIP" }, ...board.bizSubs].map((g) => (
                  <button key={g.key} className={`ct-btn${filter.kind === "group" && filter.key === g.key ? " solid" : ""}`} onClick={() => (filter.kind === "group" && filter.key === g.key ? undefined : choose({ kind: "group", key: g.key }))}>
                    {"count" in g ? `${g.label} · ${g.count}` : g.label}
                  </button>
                ))}
              </div>
            ) : null}
            {listNote ? <p className="ct-lnote">{listNote}</p> : null}
            {filter.kind === "chip" && filter.key === "perm" && !searching ? (
              <div className="ct-perm">
                <AskGroupSection startOpen onClose={() => choose(NEED)} />
              </div>
            ) : (
              <>
                <div className="ct-tbl" role="table" aria-label={title}>
                  <div className="ct-tr ct-th" role="row">
                    <span role="columnheader" />
                    <span role="columnheader">NAME</span>
                    <span role="columnheader" className="ct-c3">CIRCLE</span>
                    <span role="columnheader" className="ct-c4">LAST TOUCH</span>
                    <span role="columnheader">WHY TODAY</span>
                    <span role="columnheader" />
                  </div>
                  {rows.map((p) => {
                    const c = circle(p);
                    const isDone = doneIds.has(p.id);
                    const needs = !!p.pulse && !isDone;
                    return (
                      <div
                        key={p.id}
                        role="row"
                        tabIndex={0}
                        className={`ct-tr ct-row${sel === p.id ? " sel" : ""}${isDone ? " done" : ""}`}
                        onClick={() => select(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.target === e.currentTarget) select(p.id);
                        }}
                        aria-label={`${p.name}, ${c.label}${p.pulse ? `, ${p.pulse}` : ""}`}
                      >
                        <span role="cell"><Face p={p} size={34} ring={needs ? (p.urgency === "now" ? RED : GOLD) : boardColor(c.key)} glow={glowing.has(p.id)} /></span>
                        <span role="cell" className="ct-name">{p.name}</span>
                        <span role="cell" className="ct-c3"><i className="ct-dot" style={{ background: boardColor(c.key) }} />{c.label}</span>
                        <span role="cell" className="ct-c4 ct-dim">{lastTouchWords(p.lastTouchOn, today)}</span>
                        <span role="cell" className="ct-why">{isDone ? "Done today" : p.pulse ?? (personTag(p) || "—")}</span>
                        <span role="cell" className="ct-qa">
                          <button aria-label={`Call ${p.name}`} title="Call" onClick={(e) => { e.stopPropagation(); setPrepFor(p.id); }}>☎</button>
                          <button aria-label={`Text ${p.name}`} title="Text" onClick={(e) => { e.stopPropagation(); void textFrom(p.id); }}>✉</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!rows.length && !listBusy ? (
                  <p className="ct-empty">
                    {searching
                      ? "No one matches. Clear the search to see everyone."
                      : filter.kind === "need"
                        ? due === null ? "Loading…" : "No one is waiting on you right now."
                        : filter.kind === "group" && filter.key === BIZ_PARENT
                          ? "No one in Biz VIP yet. Make someone a Biz VIP from their contact page."
                          : "No one in this list yet."}
                  </p>
                ) : null}
                {!searching && filter.kind !== "need" && more.next ? (
                  <button className="ct-more" onClick={() => loadList(filter, more.next)}>{`Show more (${(more.total - list.length).toLocaleString("en-US")} left)`}</button>
                ) : null}
              </>
            )}
            {/* Archived lives here now (Parry, 23 Oct: "yes fold them in") */}
            <button className="ct-more" data-act="contacts-archived" onClick={() => (onOpenPage ? onOpenPage("/contacts/archived") : onClassic())}>Archived contacts</button>
            <button className="ct-more" onClick={onClassic}>Open the Classic contacts page</button>
          </section>

          {/* right: the person picked (a bottom sheet on a phone) */}
          <section className={`ct-card ct-person${sheet ? " open" : ""}`} aria-label={adding ? "Add a person" : cardName || "The person you pick"}>
            {adding ? (
              <form
                className="rx-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addPerson();
                }}
              >
                <div className="ct-ph">
                  <h2 className="ct-pname">ADD A PERSON</h2>
                  <button type="button" className="ct-x" onClick={() => { setAdding(null); setSheet(false); }} aria-label="Close">×</button>
                </div>
                {(
                  [
                    ["first_name", "First name", "text"],
                    ["last_name", "Last name", "text"],
                    ["phone", "Phone", "tel"],
                    ["email", "Email", "email"],
                  ] as const
                ).map(([k, label, type]) => (
                  <label key={k} className="pf-field">
                    <span>{label}</span>
                    <input type={type} value={adding[k]} maxLength={k === "email" ? 200 : 80} autoFocus={k === "first_name"} onChange={(e) => setAdding({ ...adding, [k]: e.target.value })} />
                  </label>
                ))}
                <label className="pf-field">
                  <span>List</span>
                  <select value={adding.tier} onChange={(e) => setAdding({ ...adding, tier: e.target.value })}>
                    <option value="contact">Contacts (not a VIP)</option>
                    <option value="vip100">VIP-100</option>
                    <option value="vip50">VIP-50</option>
                  </select>
                </label>
                <p className="d-sum rx-small">Everything else (birthday, family, home) you fill in on their card once they're added.</p>
                <div className="pf-actions">
                  <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
                  <button type="button" className="chip-btn" onClick={() => { setAdding(null); setSheet(false); }}>Cancel</button>
                </div>
              </form>
            ) : sel ? (
              <>
                <div className="ct-ph">
                  <div className="ct-pwho">
                    <Face p={{ name: cardName || "?", photo: personCard?.photo ?? sel0?.photo ?? null }} size={54} ring={selNeeds ? RED : cardCircle ? boardColor(cardCircle.key) : TEAL} glow={glowing.has(sel)} />
                    <div>
                      <h2 className="ct-pname">{cardName.toUpperCase()}</h2>
                      {cardWhy ? (
                        <span className="ct-pill" style={{ color: selNeeds ? RED : GREEN, background: selNeeds ? "rgba(255,90,95,.15)" : "rgba(47,191,113,.15)" }}>{cardWhy}</span>
                      ) : null}
                    </div>
                  </div>
                  <button className="ct-x" onClick={() => setSheet(false)} aria-label="Close">×</button>
                </div>
                {personCard ? (
                  <>
                    <p className="ct-facts">
                      {personCard.source ? <>Came in from {personCard.source}<br /></> : null}
                      {personCard.stage ? <>{personCard.stage}<br /></> : null}
                      {cardCircle ? (
                        <span style={{ color: boardColor(cardCircle.key) }}>● {personTag(personCard) || cardCircle.label}</span>
                      ) : null}
                      {personCard.leftEarly ? <><br />{LEFT_EARLY_LINE}</> : null}
                    </p>
                    <div className="ct-pacts">
                      {tel ? (
                        <button className={`ct-btn${personCard.pulse?.nextStep !== "text" ? " solid" : ""}`} onClick={() => setPrepFor(personCard.id)}>Call</button>
                      ) : (
                        <button className="ct-btn" onClick={openFull} title="No phone yet: add one on the full contact">Call</button>
                      )}
                      {tel ? (
                        <a className={`ct-btn${personCard.pulse?.nextStep === "text" ? " solid" : ""}`} href={`sms:${tel}`}>Text</a>
                      ) : (
                        <button className="ct-btn" onClick={openFull} title="No phone yet: add one on the full contact">Text</button>
                      )}
                      {mail ? <a className="ct-btn" href={`mailto:${mail}`}>Email</a> : <button className="ct-btn" onClick={openFull} title="No email yet: add one on the full contact">Email</button>}
                      {personCard.tier === "vip50" ? (
                        <button className="ct-btn" disabled>In VIP-50</button>
                      ) : (
                        <button className="ct-btn" aria-expanded={pick === "vip"} onClick={() => setPick(pick === "vip" ? null : "vip")}>{personCard.tier === "vip100" ? "Move to VIP-50" : "Make VIP"}</button>
                      )}
                    </div>
                    {pick === "vip" ? (
                      <div className="ct-pick" role="group" aria-label="Which list">
                        <span>Which list?</span>
                        <button className="ct-btn solid" disabled={busy} onClick={() => makeVip("vip50")}>VIP-50</button>
                        {personCard.tier !== "vip100" ? <button className="ct-btn" disabled={busy} onClick={() => makeVip("vip100")}>VIP-100</button> : null}
                      </div>
                    ) : null}
                    {selNeeds ? (
                      <button className="ct-btn ct-touched" aria-expanded={pick === "touch"} onClick={() => setPick(pick === "touch" ? null : "touch")}>Mark touched today</button>
                    ) : null}
                    {pick === "touch" ? (
                      <div className="ct-pick" role="group" aria-label="How you touched them">
                        <span>How?</span>
                        {TOUCH_KINDS.map(([k, l]) => (
                          <button key={k} className="ct-btn" disabled={busy} onClick={() => logTouch(k, l)}>{l}</button>
                        ))}
                      </div>
                    ) : null}
                    {personCard.pulse ? (
                      <>
                        <div className="ct-sec ct-sec-gap">PULSE SUGGESTS</div>
                        <p className="ct-pulse">{personCard.pulse.line}</p>
                      </>
                    ) : null}
                    <button className="ct-btn ct-open" onClick={openFull}>Open full contact →</button>
                  </>
                ) : (
                  <p className="ct-facts">Opening…</p>
                )}
              </>
            ) : (
              <p className="ct-facts">Pick someone in the list or on a ring to see them here, ready to call or text.</p>
            )}
          </section>
          {sheet ? <button className="ct-scrim" aria-label="Close" onClick={() => setSheet(false)} /> : null}
        </div>
      )}

      {note && (
        <div className="ct-toast pop" role="status">
          <span>{note}</span>
          <button className="chip-btn" onClick={() => setNote(null)}>OK</button>
        </div>
      )}
    </div>
  );

  // The full contact: every section ONE MOVE sends (each field edits in place), the home report, CMAs, the share link,
  // the life story and delete, as the old drawer had them.
  function fullContact() {
    const p = personCard!;
    return (
      <section className="ct-full" aria-label={p.name}>
        <div className="ct-fullbar">
          <button className="ct-btn" onClick={() => setFull(false)}>← Back to my contacts</button>
        </div>
        <div className="ct-card ct-fullcard">
          <div className="d-head">
            {personTag(p) && <span className="chip" style={{ color: TEAL, borderColor: TEAL }}>{personTag(p)}</span>}
            {p.stage && <span className="chip">{p.stage}</span>}
          </div>
          <div className="pmenu-row">
            <h1 className="d-title">{p.name}</h1>
            {p.leftEarly ? <p className="d-sub" role="note">{LEFT_EARLY_LINE}</p> : null}
            <PersonMenu first={firstOf(p.firstName ?? p.name)} onDelete={deletePerson} />
          </div>
          {p.pulse && (
            <p className="pc-pulse-line">
              <b>Pulse</b> {p.pulse.line}
            </p>
          )}
          <MyHomeLine myHome={p.myHome} />
          <div className="ta-log">
            {tel && <button type="button" className={`chip-btn${p.pulse?.nextStep === "call" ? " primary" : ""}`} onClick={() => setPrepFor(p.id)}>Call</button>}
            {tel && <a className={`chip-btn${p.pulse?.nextStep === "text" ? " primary" : ""}`} href={`sms:${tel}`}>Text</a>}
            {mail && <a className="chip-btn" href={`mailto:${mail}`}>Email</a>}
          </div>
          <div className="ct-fullsecs">
            {p.sections.map((s) =>
              s.key === "permissions" ? (
                <section key={s.key} className="pc-card">
                  <PermissionsSection contactId={p.id} onChanged={() => void loadPerson(p.id)} />
                </section>
              ) : (
                <SectionCard
                  key={s.key}
                  s={s}
                  open={openSec === s.key}
                  onToggle={() => {
                    setOpenSec(openSec !== s.key ? s.key : null);
                    setEdit(null);
                  }}
                  edit={edit}
                  setEdit={setEdit}
                  busy={busy}
                  onSave={saveField}
                  onQuick={quickSave}
                />
              ),
            )}
            {/* HOME-REPORT §4.1 (16 Oct): the monthly report on this person's home, on the card in both Classic and the Brain */}
            <section className="pc-card">
              <HomeReportSection contactId={p.id} first={p.firstName || p.name.split(" ")[0] || ""} />
            </section>
            {/* LEADS §1.7c (18 Oct): the contact's CMAs and "Build a CMA", as Classic's card (vip50-web-crm#310) */}
            <section className="pc-card">
              <CmaSection contactId={p.id} first={p.firstName || p.name.split(" ")[0] || ""} />
            </section>
            {/* SITE-FEEDS K17 (18 Oct): a VIP's own referral link on the agent's site, as Classic's card (vip50-web-crm#312) */}
            {p.canShareLink ? (
              <section className="pc-card">
                <ShareLinkSection key={p.id} contactId={p.id} first={p.firstName || p.name.split(" ")[0] || ""} />
              </section>
            ) : null}
            <section className="pc-card">
              <button className="pc-card-h" aria-expanded={!!timeline} onClick={() => (timeline ? setTimeline(null) : loadTimeline())}>
                <span style={{ color: "#c8d0e6" }}>Life story</span>
                <small>{p.timelineCount ? `${p.timelineCount} things` : "nothing yet"}</small>
              </button>
              {timeline && productsIn(timeline.events).length > 1 && (
                <div className="pc-story-filter" role="group" aria-label="Show the story from">
                  <button className={`chip-btn${storyOnly ? "" : " primary"}`} aria-pressed={!storyOnly} onClick={() => setStoryOnly(null)}>All</button>
                  {productsIn(timeline.events).map(({ product, count }) => (
                    <button key={product} className={`chip-btn${storyOnly === product ? " primary" : ""}`} aria-pressed={storyOnly === product} onClick={() => setStoryOnly(storyOnly === product ? null : product)}>
                      {STORY_LABEL[product]} · {count}
                    </button>
                  ))}
                </div>
              )}
              {timeline && (
                <ul className="pc-time">
                  {filterStory(timeline.events, storyOnly).map((e, i) => (
                    <li key={`${e.at}-${i}`}>
                      <time>{e.at.slice(0, 10)}</time>
                      <span>{e.title}</span>
                      <small className={`pc-story-p p-${storyProduct(e)}`}>{STORY_LABEL[storyProduct(e)]}{e.detail ? ` · ${e.detail}` : ""}</small>
                    </li>
                  ))}
                  {timeline.events.length === 0 && <li><span>Nothing recorded yet.</span></li>}
                  {timeline.next && <li><button className="vr-classic" onClick={() => loadTimeline(timeline.next)}>Older</button></li>}
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    );
  }
}

function SectionCard({
  s,
  open,
  onToggle,
  edit,
  setEdit,
  busy,
  onSave,
  onQuick,
}: {
  s: Section;
  open: boolean;
  onToggle: () => void;
  edit: { key: string; text: string } | null;
  setEdit: (e: { key: string; text: string } | null) => void;
  busy: boolean;
  onSave: (f: Field) => void;
  onQuick: (f: Field, value: string | null) => void;
}) {
  const col = sectionColor(s.key);
  const gaps = gapsIn(s);
  return (
    <section className="pc-card" id={`pc-sec-${s.key}`}>
      <button className="pc-card-h" aria-expanded={open} onClick={onToggle}>
        <span style={{ color: col }}>{s.label}</span>
        <small>{[s.summary, gaps ? `${gaps} to fill in` : null].filter(Boolean).join(" · ")}</small>
      </button>
      {open && (
        <dl className="pc-fields">
          {s.fields.map((f) => {
            const shown = showValue(f);
            const editing = edit?.key === f.key;
            return (
              <div key={f.key} id={`pc-f-${f.key}`} className={`pc-field${shown == null ? " gap" : ""}`}>
                <dt>{f.label}</dt>
                <dd>
                  {editing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        onSave(f);
                      }}
                    >
                      {f.type === "choice" ? (
                        <select autoFocus value={edit.text} onChange={(e) => setEdit({ key: f.key, text: e.target.value })}>
                          <option value="">—</option>
                          {(f.choices ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : f.type === "list" || (f.type === "text" && (shown?.length ?? 0) > 60) ? (
                        <textarea autoFocus rows={3} value={edit.text} onChange={(e) => setEdit({ key: f.key, text: e.target.value })} />
                      ) : (
                        <input
                          autoFocus
                          value={edit.text}
                          type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"}
                          inputMode={f.type === "number" || f.type === "money" ? "decimal" : f.type === "date" ? "numeric" : undefined}
                          placeholder={f.type === "date" ? "MM-DD-YYYY or MM-DD" : undefined}
                          onChange={(e) => setEdit({ key: f.key, text: e.target.value })}
                        />
                      )}
                      <span className="pf-actions">
                        <button type="submit" className="chip-btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                        <button type="button" className="chip-btn" onClick={() => setEdit(null)}>Cancel</button>
                      </span>
                    </form>
                  ) : s.key === "touches" && f.editable && (f.type === "choice" || f.type === "date") ? (
                    <TouchTick f={f} shown={shown} busy={busy} onQuick={onQuick} onEdit={() => setEdit({ key: f.key, text: editText(f) })} />
                  ) : f.editable ? (
                    <button className="pc-value" onClick={() => setEdit({ key: f.key, text: editText(f) })} aria-label={`${f.label}: ${shown ?? "empty"}. Edit`}>
                      {shown ?? <em>Add</em>}
                    </button>
                  ) : (
                    <span className="pc-value ro">{shown ?? <em>—</em>}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}

/** One of the month's touches: a tap ticks it (or clears it). A quarterly touch shows its date and ticks for today;
 *  its date can still be changed. */
function TouchTick({ f, shown, busy, onQuick, onEdit }: {
  f: Field; shown: string | null; busy: boolean; onQuick: (f: Field, value: string | null) => void; onEdit: () => void;
}) {
  const on = f.type === "choice" ? f.value === "Yes" : !!f.value;
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    <span className="pc-tick-row">
      <button
        type="button"
        className={`pc-tick${on ? " on" : ""}`}
        disabled={busy}
        aria-pressed={on}
        aria-label={on ? `${f.label}: done. Tap to clear` : `${f.label}: not done. Tap to tick`}
        onClick={() => onQuick(f, on ? (f.type === "choice" ? "No" : null) : (f.type === "choice" ? "Yes" : ymd))}
      >
        {on ? "✓ Done" : "Tick"}
      </button>
      {f.type === "date" && on && shown ? (
        <button type="button" className="pc-value" onClick={onEdit} aria-label={`${f.label} date: ${shown}. Change`}>{shown}</button>
      ) : null}
    </span>
  );
}

