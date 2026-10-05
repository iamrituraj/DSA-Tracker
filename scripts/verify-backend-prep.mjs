// Headless verification for the Backend Prep page — no browser involved.
//
// Renders the dataset through the real React renderer (Vite SSR module loader +
// react-dom/server) and asserts that the content survived the trip: every text
// run in public/data/backend-prep.json must appear in the produced HTML, and the
// structural counts (code blocks, tables, list items) must match block for block.
// Nested sub-pages render collapsed behind a toggle, so each `page` node is also
// rendered as its own unit — that way content at any depth is covered.
//
//   node scripts/verify-backend-prep.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "public", "data", "backend-prep.json");

const normalize = (s) => String(s)
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#39;|&#x27;/g, "'").replace(/&quot;|&#34;/g, '"').replace(/&nbsp;/g, " ")
  .replace(/[\s\u00a0]+/g, " ")
  .trim();

// Marks the renderer converts away, plus the protocol we trim from bare links.
const plain = (s) => normalize(s).replace(/\*\*/g, "").replace(/`/g, "").replace(/^https?:\/\//, "").trim();

// Comparison projections. The haystack needs real markup removed, but the needle
// must never be tag-stripped — a Java/C# snippet legitimately contains `<K, V>`.
// Both end as a lowercase letters-and-digits string so escaping, quoting and
// whitespace differences cannot fake a mismatch.
const alnum = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const projHtml = (h) => alnum(String(h)
  .replace(/<[^>]*>/g, " ")
  .replace(/&lt;|&gt;|&amp;|&#39;|&#x27;|&quot;|&#34;|&nbsp;/g, " "));
const projText = (t) => alnum(String(t));
const needleOf = (s) => (s.length > 40 ? s.slice(0, 40) : s);

// The base64 blobs pasted into a few notes live in `text`; they are rendered as an
// <img> source, never as copy, so they are excluded from coverage.
const isInlineImage = (s) => /^data:image/.test(s);

// Walk a unit's node list without crossing into a nested sub-page's children.
function collectUnit(nodes, acc) {
  for (const node of nodes || []) {
    if (!node) continue;
    const text = String(node.text || "");
    if (text && !isInlineImage(text)) {
      const p = plain(text);
      if (p) acc.texts.push(p);
    }
    if (node.type === "code" && text) acc.code++;
    if (node.type === "table") {
      acc.tables++;
      for (const cell of [...(node.header || []), ...(node.rows || []).flat()]) {
        const p = plain(cell);
        if (p) acc.texts.push(p);
      }
    }
    if (node.type === "bulleted_list" || node.type === "numbered_list") acc.lists++;
    if (node.type === "page") {
      acc.subPages++;
      continue; // its body is verified as its own unit
    }
    collectUnit(node.children, acc);
  }
  return acc;
}

// Every `page` node in the topic tree becomes a render unit.
function collectUnits(node, units) {
  if (!node || node.type !== "page") return units;
  units.push(node);
  (node.children || []).forEach(c => collectUnits(c, units));
  return units;
}

const empty = () => ({ texts: [], code: 0, tables: 0, lists: 0, subPages: 0 });

async function main() {
  const dataset = JSON.parse(await readFile(DATA, "utf8"));
  const server = await createServer({ root: ROOT, logLevel: "error", server: { middlewareMode: true } });
  let mod;
  try {
    mod = await server.ssrLoadModule("/src/backend-prep.jsx");
  } catch (err) {
    await server.close();
    console.error("Failed to load src/backend-prep.jsx:", err.message);
    process.exit(1);
  }

  const problems = [];
  const totals = { texts: 0, code: 0, tables: 0, lists: 0, units: 0 };

  for (const topic of dataset.topics) {
    const units = collectUnits(topic.tree, []);
    // A `page` node renders collapsed, so each unit contributes its children; the
    // unit titles themselves come through the parent's sub-page header.
    let flat = "";
    const rendered = { code: 0, tables: 0, lists: 0 };
    for (const unit of units) {
      let unitHtml = "";
      try {
        unitHtml = renderToStaticMarkup(React.createElement(mod.Blocks, { nodes: unit.children || [] }));
      } catch (err) {
        problems.push(`${topic.title}: render crashed in “${plain(unit.text) || "page"}” — ${err.message}`);
        continue;
      }
      flat += " " + unitHtml;
      const want = collectUnit(unit.children, empty());
      const got = {
        code: (unitHtml.match(/<pre /g) || []).length,
        tables: (unitHtml.match(/<table /g) || []).length,
        lists: (unitHtml.match(/<li /g) || []).length,
      };
      for (const key of ["code", "tables", "lists"]) {
        if (got[key] !== want[key]) {
          problems.push(`${topic.title} › ${plain(unit.text) || "page"}: rendered ${got[key]} ${key}, dataset has ${want[key]}`);
        }
        rendered[key] += got[key];
      }
    }
    totals.units += units.length;
    const hay = projHtml(flat);

    // Coverage: every text run anywhere in the topic must be present somewhere in
    // the combined render. The topic's own title is rendered by the reader header,
    // not by the block renderer, so it is skipped here.
    const queue = [topic.tree];
    while (queue.length) {
      const node = queue.shift();
      if (!node) continue;
      const text = String(node.text || "");
      if (text && !isInlineImage(text) && node !== topic.tree) {
        const want = needleOf(projText(text));
        if (want && !hay.includes(want)) problems.push(`${topic.title}: text missing from render — “${plain(text).slice(0, 60)}”`);
        if (want) totals.texts++;
      }
      if (node.type === "table") {
        for (const cell of [...(node.header || []), ...(node.rows || []).flat()]) {
          const want = needleOf(projText(cell));
          if (want && !hay.includes(want)) problems.push(`${topic.title}: table cell missing — “${plain(cell).slice(0, 60)}”`);
        }
      }
      (node.children || []).forEach(c => queue.push(c));
    }

    // Structure counts were collected with the per-unit render above.
    totals.code += rendered.code;
    totals.tables += rendered.tables;
    totals.lists += rendered.lists;

    if (/undefined|\[object Object\]|NaN/.test(normalize(flat))) problems.push(`${topic.title}: render leaks undefined/NaN/[object]`);
  }

  await server.close();

  const nodes = dataset.topics.reduce((n, t) => n + t.nodes, 0);
  console.log(`Verified ${dataset.topics.length} topics · ${totals.units} page units · ${nodes} nodes`);
  console.log(`Coverage: ${totals.texts} text runs · ${totals.code} code blocks · ${totals.tables} tables · ${totals.lists} list items`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    [...new Set(problems)].slice(0, 25).forEach(p => console.error("  -", p));
    process.exit(1);
  }
  console.log("OK — every dataset block reached the rendered HTML.");
}

main().catch(err => { console.error(err); process.exit(1); });
