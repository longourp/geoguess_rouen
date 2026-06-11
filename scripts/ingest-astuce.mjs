#!/usr/bin/env node
/**
 * GTFS → pack "astuce" : génère src/data/packs/astuce/entities.json à partir
 * des données ouvertes du réseau Astuce (Métropole Rouen Normandie, Licence
 * Ouverte 2.0).
 *
 * Usage :
 *   node scripts/ingest-astuce.mjs                # télécharge le GTFS officiel
 *   node scripts/ingest-astuce.mjs chemin.zip     # zip GTFS local
 *   node scripts/ingest-astuce.mjs dossier/       # GTFS déjà extrait
 *
 * Le script ne tourne JAMAIS au build ni au runtime : il régénère un JSON
 * versionné, que `npm run validate:data` continue de garder cohérent.
 * Les corrections humaines vivent dans scripts/astuce-overlay.json et
 * survivent aux ré-ingestions.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';

const GTFS_URL =
  'https://api.mrn.cityway.fr/dataflow/offre-tc/download?provider=ASTUCE&dataFormat=gtfs&dataProfil=ASTUCE';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'src/data/packs/astuce/entities.json');
const OVERLAY_PATH = join(ROOT, 'scripts/astuce-overlay.json');

/** Nombre maximum d'arrêts retenus comme réponses possibles. */
const MAX_ENTITIES = 160;
/** Nombre de lignes (hors scolaires) à partir duquel un arrêt est un pôle. */
const HUB_MIN_LINES = 3;
const HUB_BIG_MIN_LINES = 5;
/** Au-delà de cette distance de la Seine, on ne tague pas la rive. */
const MAX_RIVE_DISTANCE_M = 4000;
/** Deux arrêts homonymes plus éloignés que ceci déclenchent un avertissement. */
const HOMONYM_WARN_M = 800;

/**
 * Tracé approximatif de la Seine dans l'agglomération (ordre amont → aval,
 * [lat, lon]). Face à l'aval, la rive droite est au nord (centre de Rouen).
 * Les erreurs près des méandres se corrigent via l'overlay.
 */
const SEINE = [
  [49.33, 1.115],
  [49.355, 1.115],
  [49.385, 1.122],
  [49.408, 1.115],
  [49.422, 1.108],
  [49.43, 1.1],
  [49.4365, 1.095],
  [49.4382, 1.0898],
  [49.4395, 1.085],
  [49.4418, 1.078],
  [49.4448, 1.066],
  [49.443, 1.052],
  [49.436, 1.038],
  [49.423, 1.023],
  [49.406, 1.008],
  [49.387, 0.996],
  [49.365, 0.981],
];

// ---------------------------------------------------------------------------
// Lecture du GTFS

async function loadGtfs(arg) {
  const wanted = ['routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt'];
  if (arg && existsSync(arg) && statSync(arg).isDirectory()) {
    return Object.fromEntries(wanted.map((f) => [f, readFileSync(join(arg, f), 'utf8')]));
  }
  let bytes;
  if (arg) {
    bytes = readFileSync(arg);
  } else {
    console.log(`Téléchargement du GTFS Astuce…`);
    const res = await fetch(GTFS_URL);
    if (!res.ok) throw new Error(`Téléchargement impossible : HTTP ${res.status}`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  const files = unzipSync(new Uint8Array(bytes));
  return Object.fromEntries(wanted.map((f) => [f, strFromU8(files[f])]));
}

/** Parse CSV (RFC 4180) en objets indexés par l'en-tête. Gère BOM et champs cités. */
function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = splitCsvLine(lines[i]);
    const row = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = cells[c] ?? '';
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  if (!line.includes('"')) return line.split(',');
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// ---------------------------------------------------------------------------
// Normalisation / géométrie

function normalize(input) {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(input) {
  return normalize(input).replace(/ /g, '-');
}

const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LON = 111_320 * Math.cos((49.43 * Math.PI) / 180);

/** Distance (m) et côté (signe du produit vectoriel) vis-à-vis de la Seine. */
function seineSide(lat, lon) {
  let best = { dist: Infinity, cross: 0 };
  for (let i = 0; i < SEINE.length - 1; i++) {
    const [ay, ax] = SEINE[i];
    const [by, bx] = SEINE[i + 1];
    // Coordonnées locales en mètres, origine au début du segment.
    const dx = (bx - ax) * M_PER_DEG_LON;
    const dy = (by - ay) * M_PER_DEG_LAT;
    const px = (lon - ax) * M_PER_DEG_LON;
    const py = (lat - ay) * M_PER_DEG_LAT;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
    const ddx = px - t * dx;
    const ddy = py - t * dy;
    const dist = Math.hypot(ddx, ddy);
    if (dist < best.dist) best = { dist, cross: dx * py - dy * px };
  }
  if (best.dist > MAX_RIVE_DISTANCE_M) return null;
  // Polyligne orientée vers l'aval : à gauche du courant = rive gauche.
  return best.cross > 0 ? 'rive-gauche' : 'rive-droite';
}

// ---------------------------------------------------------------------------
// Classification des lignes

function classifyRoute(route) {
  const short = route.route_short_name.trim();
  const type = route.route_type.trim();
  if (type === '1') return { kind: 'metro', tag: 'ligne-metro', label: 'Métro' };
  if (type === '4') return { kind: 'ferry', tag: 'ligne-calypso', label: 'Calypso' };
  if (/^T\d$/i.test(short))
    return { kind: 'teor', tag: `ligne-${short.toLowerCase()}`, label: short };
  if (/^F\d$/i.test(short))
    return { kind: 'fast', tag: `ligne-${short.toLowerCase()}`, label: short };
  if (/^[23]\d\d$/.test(short)) return { kind: 'scolaire', tag: null, label: short };
  return { kind: 'bus', tag: `ligne-${slugify(short)}`, label: short };
}

// ---------------------------------------------------------------------------

async function main() {
  const gtfs = await loadGtfs(process.argv[2]);

  const routes = new Map(); // route_id → { kind, tag, label }
  for (const r of parseCsv(gtfs['routes.txt'])) routes.set(r.route_id, classifyRoute(r));

  const trips = new Map(); // trip_id → route_id
  for (const t of parseCsv(gtfs['trips.txt'])) trips.set(t.trip_id, t.route_id);

  const stops = new Map(); // stop_id → { name, lat, lon }
  for (const s of parseCsv(gtfs['stops.txt'])) {
    stops.set(s.stop_id, {
      name: s.stop_name.trim(),
      lat: Number(s.stop_lat),
      lon: Number(s.stop_lon),
    });
  }

  // Passage sur stop_times : pour chaque trajet, arrêts desservis + extrémités.
  // groupes par nom normalisé : un "arrêt" du jeu = toutes ses voies/quais.
  const groups = new Map(); // clé normalisée → groupe
  const groupOf = (stopId) => {
    const stop = stops.get(stopId);
    if (!stop || !stop.name) return null;
    const key = normalize(stop.name);
    if (!key) return null;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: stop.name,
        stopIds: new Set(),
        lats: [],
        lons: [],
        routeIds: new Set(),
        trips: 0,
        terminusOf: new Set(),
      };
      groups.set(key, g);
    }
    if (!g.stopIds.has(stopId)) {
      g.stopIds.add(stopId);
      g.lats.push(stop.lat);
      g.lons.push(stop.lon);
    }
    return g;
  };

  // trip_id → { first: {seq, stopId}, last: {seq, stopId}, stopIds }
  const tripEnds = new Map();
  const stopTimes = parseCsv(gtfs['stop_times.txt']);
  for (const st of stopTimes) {
    const seq = Number(st.stop_sequence);
    let ends = tripEnds.get(st.trip_id);
    if (!ends) {
      ends = { first: null, last: null, stopIds: [] };
      tripEnds.set(st.trip_id, ends);
    }
    ends.stopIds.push(st.stop_id);
    if (!ends.first || seq < ends.first.seq) ends.first = { seq, stopId: st.stop_id };
    if (!ends.last || seq > ends.last.seq) ends.last = { seq, stopId: st.stop_id };
  }

  for (const [tripId, ends] of tripEnds) {
    const routeId = trips.get(tripId);
    const route = routes.get(routeId);
    if (!route || route.kind === 'scolaire') continue;
    for (const stopId of ends.stopIds) {
      const g = groupOf(stopId);
      if (!g) continue;
      g.routeIds.add(routeId);
      g.trips += 1;
    }
    for (const endStopId of [ends.first.stopId, ends.last.stopId]) {
      const g = groupOf(endStopId);
      if (g) g.terminusOf.add(routeId);
    }
  }

  // Sélection : métro/ferry/TEOR d'office, puis pôles et arrêts FAST par
  // fréquence de desserte, plafonné à MAX_ENTITIES.
  const all = [...groups.values()].filter((g) => g.routeIds.size > 0);
  for (const g of all) {
    g.lines = [...g.routeIds].map((id) => routes.get(id));
    g.kinds = new Set(g.lines.map((l) => l.kind));
    g.lineLabels = [...new Set(g.lines.map((l) => l.label))].sort();
    g.lat = g.lats.reduce((a, b) => a + b, 0) / g.lats.length;
    g.lon = g.lons.reduce((a, b) => a + b, 0) / g.lons.length;
    const spreadM = Math.hypot(
      (Math.max(...g.lats) - Math.min(...g.lats)) * M_PER_DEG_LAT,
      (Math.max(...g.lons) - Math.min(...g.lons)) * M_PER_DEG_LON,
    );
    if (spreadM > HOMONYM_WARN_M) {
      console.warn(
        `⚠ homonymes éloignés (${Math.round(spreadM)} m) regroupés sous « ${g.name} » — à vérifier dans l'overlay`,
      );
    }
  }

  const byPriority = (g) =>
    g.kinds.has('metro') || g.kinds.has('ferry')
      ? 0
      : g.kinds.has('teor')
        ? 1
        : g.lineLabels.length >= HUB_MIN_LINES
          ? 2
          : g.kinds.has('fast')
            ? 3
            : 4;
  const ranked = all
    .slice()
    .sort(
      (a, b) =>
        byPriority(a) - byPriority(b) ||
        b.lineLabels.length - a.lineLabels.length ||
        b.trips - a.trips ||
        a.key.localeCompare(b.key),
    );
  const kept = ranked.slice(0, MAX_ENTITIES).filter((g) => byPriority(g) < 4);
  const dropped = ranked.length - kept.length;

  // Notoriété : échelle log sur le nombre de passages (desserte ≈ célébrité).
  const maxTrips = Math.max(...kept.map((g) => g.trips));
  const notoriety = (g) =>
    Math.min(100, Math.max(1, Math.round((100 * Math.log(1 + g.trips)) / Math.log(1 + maxTrips))));

  const overlay = existsSync(OVERLAY_PATH) ? JSON.parse(readFileSync(OVERLAY_PATH, 'utf8')) : {};

  const usedIds = new Set();
  const entities = [];
  for (const g of kept) {
    let id = slugify(g.name);
    while (usedIds.has(id)) id = `${id}-2`;
    usedIds.add(id);

    const tags = new Set(['arret']);
    for (const kind of g.kinds) if (kind !== 'bus') tags.add(kind);
    for (const line of g.lines) if (line.tag) tags.add(line.tag);
    if (g.terminusOf.size > 0) tags.add('terminus');
    if (g.lineLabels.length >= HUB_MIN_LINES) tags.add('hub-3-lignes');
    if (g.lineLabels.length >= HUB_BIG_MIN_LINES) tags.add('hub-5-lignes');
    const rive = seineSide(g.lat, g.lon);
    if (rive) tags.add(rive);

    const aliases = new Set();
    if (/\bSaint-/i.test(g.name)) aliases.add(g.name.replace(/\bSaint-/gi, 'St '));
    if (/\bSainte-/i.test(g.name)) aliases.add(g.name.replace(/\bSainte-/gi, 'Ste '));
    if (/\bSt[- ]/i.test(g.name)) aliases.add(g.name.replace(/\bSt[- ]/gi, 'Saint-'));

    const shown = g.lineLabels.slice(0, 6).join(', ');
    const more = g.lineLabels.length > 6 ? '…' : '';

    const entity = {
      id,
      name: g.name,
      aliases: [...aliases],
      type: 'station',
      tags: [...tags].sort(),
      notoriety: notoriety(g),
      blurb: `Arrêt desservi par ${shown}${more}.`,
    };

    const patch = overlay[id];
    if (patch) {
      if (patch.exclude) continue;
      const tagSet = new Set(entity.tags);
      for (const t of patch.removeTags ?? []) tagSet.delete(t);
      for (const t of patch.addTags ?? []) tagSet.add(t);
      entity.tags = [...tagSet].sort();
      if (patch.notoriety) entity.notoriety = patch.notoriety;
      if (patch.aliases) entity.aliases = [...new Set([...entity.aliases, ...patch.aliases])];
      if (patch.blurb) entity.blurb = patch.blurb;
    }
    entities.push(entity);
  }
  entities.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(OUT_PATH, JSON.stringify(entities, null, 2) + '\n');

  // Rapport : densité de chaque tag (pour calibrer les catégories) + rives.
  const tagCounts = new Map();
  for (const e of entities) for (const t of e.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  console.log(`\n${entities.length} arrêts retenus (${dropped} groupes écartés) → ${OUT_PATH}\n`);
  console.log('Tags (nombre d’arrêts) :');
  for (const [tag, count] of [...tagCounts].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${tag}`);
  }
  const sansRive = entities.filter(
    (e) => !e.tags.includes('rive-gauche') && !e.tags.includes('rive-droite'),
  ).length;
  console.log(
    `\nRives : ${tagCounts.get('rive-gauche') ?? 0} gauche, ${
      tagCounts.get('rive-droite') ?? 0
    } droite, ${sansRive} non taggés (trop loin de la Seine).`,
  );
  console.log('Vérifiez les rives douteuses et corrigez via scripts/astuce-overlay.json.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
