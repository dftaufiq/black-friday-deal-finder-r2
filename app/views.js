// DealScope views: turns the deal data into HTML for the home grid, the
// ranked top-5 strip, and the per-deal detail page. No network calls here;
// every link is a plain <a href> to the store's own search page.

import { deals, storeUrl, compareAcrossStores, topFive, signalCounts, CHECKED_WINDOW } from "./data.js";

export function money(n) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return "$" + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function pct(d) {
  return Math.round((1 - d.price / d.was) * 100);
}

export function saved(d) {
  return d.was - d.price;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function signalBadge(d) {
  const cls = d.sig === "NEW LOW" ? "sig-new" : d.sig === "STRONG" ? "sig-strong" : "sig-routine";
  return `<span class="sig ${cls}">${d.sig}</span>`;
}

function checkedLine(d) {
  const t = d.checked.slice(0, 16).replace("T", " ");
  return `Checked ${t} UTC \u00b7 ${esc(d.src)}`;
}

export function dealCard(d) {
  const others = compareAcrossStores(d);
  const best = others[0];
  const bestNote = others.length > 1 && d.id !== best.id
    ? `<span class="best-note">Best price: ${esc(best.store)} ${money(best.price)}</span>`
    : others.length > 1
      ? `<span class="best-note best-here">\u2605 Best price here</span>`
      : "";
  return `<article class="card">
    <div class="card-top"><span class="store">${esc(d.store.toUpperCase())}</span><span class="cat">${esc(d.cat)}</span>${bestNote}</div>
    <h3 class="card-title"><a href="#/deal/${d.id}">${esc(d.title)}</a></h3>
    <div class="price-row"><span class="price">${money(d.price)}</span><span class="was">${money(d.was)}</span><span class="off">\u2212${pct(d)}%</span></div>
    <div class="sig-row">${signalBadge(d)}<span class="ev">${esc(d.ev)}</span></div>
    <p class="checked">${checkedLine(d)}</p>
    <div class="card-actions"><a class="btn" href="${storeUrl(d.store, d.q)}" target="_blank" rel="noopener">View at ${esc(d.store)} \u2197</a><a class="details" href="#/deal/${d.id}">Details \u2192</a></div>
  </article>`;
}

function topFiveStrip() {
  const five = topFive();
  const cards = five.map((d, i) => `<a class="top-card" href="#/deal/${d.id}">
    <span class="top-line"><span class="top-rank">#${i + 1}</span><span class="top-title">${esc(d.title)}</span></span>
    <span class="top-meta">${esc(d.store)} \u00b7 ${esc(d.cat)}</span>
    <span class="top-price"><b>${money(d.price)}</b> <s>${money(d.was)}</s> <em>\u2212${pct(d)}%</em></span>
  </a>`).join("");
  return `<section class="top5" aria-label="Top 5 deals right now">
    <h2>TOP 5 RIGHT NOW <span>biggest discounts, one per category</span></h2>
    <div class="top-list">${cards}</div>
  </section>`;
}

function filterBar(state, cats, stores) {
  const opt = (v, label, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${label}</option>`;
  return `<section class="filters" aria-label="Search and filters">
    <label class="f-search"><span>SEARCH</span><input id="f-q" type="search" placeholder="AirPods, LEGO, TV\u2026" value="${esc(state.q)}"></label>
    <label><span>CATEGORY</span><select id="f-cat">${opt("", "All", state.cat)}${cats.map((c) => opt(c, c, state.cat)).join("")}</select></label>
    <label><span>STORE</span><select id="f-store">${opt("", "All", state.store)}${stores.map((s) => opt(s, s, state.store)).join("")}</select></label>
    <label><span>MIN. DISCOUNT</span><select id="f-min">${opt(0, "Any", state.min)}${opt(30, "30%+", state.min)}${opt(50, "50%+", state.min)}${opt(60, "60%+", state.min)}</select></label>
    <label><span>SORT</span><select id="f-sort">${opt("discount", "Biggest discount", state.sort)}${opt("saved", "Biggest $ saved", state.sort)}${opt("price", "Lowest price", state.sort)}${opt("newlow", "New lows first", state.sort)}</select></label>
  </section>`;
}

export function applyFilters(state) {
  const q = state.q.trim().toLowerCase();
  let list = deals.filter((d) => {
    if (q && !(d.title + " " + d.store + " " + d.cat).toLowerCase().includes(q)) return false;
    if (state.cat && d.cat !== state.cat) return false;
    if (state.store && d.store !== state.store) return false;
    if (state.min && pct(d) < state.min) return false;
    return true;
  });
  const by = {
    discount: (a, b) => pct(b) - pct(a) || saved(b) - saved(a),
    saved: (a, b) => saved(b) - saved(a),
    price: (a, b) => a.price - b.price,
    newlow: (a, b) => (a.sig === "NEW LOW" ? 0 : 1) - (b.sig === "NEW LOW" ? 0 : 1) || pct(b) - pct(a),
  };
  return list.sort(by[state.sort] || by.discount);
}

export function renderHome(state) {
  const cats = [...new Set(deals.map((d) => d.cat))].sort();
  const stores = [...new Set(deals.map((d) => d.store))].sort();
  const list = applyFilters(state);
  const counts = signalCounts();
  const filtered = state.q || state.cat || state.store || state.min;
  const shown = filtered ? `${list.length} of ${deals.length} deals` : `${deals.length} deals`;
  const hero = `<p class="count" id="count">${shown} \u00b7 ${counts["NEW LOW"]} new lows \u00b7 ${stores.length} stores \u00b7 checked ${CHECKED_WINDOW}</p>`;
  const grid = list.length
    ? `<div class="grid">${list.map(dealCard).join("")}</div>`
    : `<p class="empty">No deals match those filters. Clear the search or lower the minimum discount.</p>`;
  return `${hero}${topFiveStrip()}${filterBar(state, cats, stores)}
    <p class="result-count">${list.length} deal${list.length === 1 ? "" : "s"} shown \u2014 sorted by ${state.sort === "discount" ? "biggest discount" : state.sort === "saved" ? "biggest $ saved" : state.sort === "price" ? "lowest price" : "new lows first"}</p>
    ${grid}`;
}

export function renderDetail(d) {
  const others = compareAcrossStores(d);
  const rows = others.map((o) => {
    const isThis = o.id === d.id;
    const isBest = o.id === others[0].id;
    return `<tr class="${isThis ? "this-row" : ""}${isBest ? " best-row" : ""}">
      <td>${esc(o.store)}${isBest ? " \u2605" : ""}</td>
      <td><b>${money(o.price)}</b></td>
      <td><s>${money(o.was)}</s></td>
      <td>\u2212${pct(o)}%</td>
      <td>${isThis ? "This listing" : money(o.price - others[0].price) === "$0" ? "Same as best" : money(o.price - others[0].price) + " more"}</td>
      <td><a href="${storeUrl(o.store, o.q)}" target="_blank" rel="noopener">View \u2197</a></td>
    </tr>`;
  }).join("");
  const t = d.checked.slice(0, 16).replace("T", " ");
  return `<p class="back"><a href="#/">&larr; All deals</a></p>
  <div class="detail">
    <div class="detail-head">
      <div class="card-top"><span class="store">${esc(d.store.toUpperCase())}</span><span class="cat">${esc(d.cat)}</span>${others[0].id === d.id && others.length > 1 ? `<span class="best-note best-here">\u2605 BEST PRICE</span>` : ""}</div>
      <h2 class="detail-title">${esc(d.title)}</h2>
      <div class="price-row big"><span class="price">${money(d.price)}</span><span class="was">${money(d.was)}</span><span class="off">\u2212${pct(d)}%</span><span class="save">You save ${money(saved(d))}</span></div>
      <div class="sig-row big">${signalBadge(d)}<span class="ev">${esc(d.ev)}</span></div>
      <div class="card-actions"><a class="btn" href="${storeUrl(d.store, d.q)}" target="_blank" rel="noopener">View at ${esc(d.store)} \u2197</a></div>
    </div>
    <div class="detail-cols">
      <section class="panel">
        <h3>Same product, other stores</h3>
        <table class="compare">
          <thead><tr><th>Store</th><th>Price</th><th>Usual</th><th>Off</th><th>Note</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="panel-note">${others.length > 1 ? `Compared across ${others.length} stores \u2014 the cheapest is ${esc(others[0].store)} at ${money(others[0].price)}.` : "Only one store lists this product in our board \u2014 no cross-store comparison exists for it."}</p>
      </section>
      <section class="panel">
        <h3>How this price was checked</h3>
        <dl class="facts">
          <dt>Store</dt><dd>${esc(d.store)}</dd>
          <dt>Category</dt><dd>${esc(d.cat)}</dd>
          <dt>Sale price</dt><dd>${money(d.price)}</dd>
          <dt>Usual price</dt><dd>${money(d.was)} (${pct(d)}% off, save ${money(saved(d))})</dd>
          <dt>Checked</dt><dd>${t} UTC \u2014 27 Nov 2026</dd>
          <dt>Read in</dt><dd>${esc(d.src)}</dd>
          <dt>Signal</dt><dd>${d.sig} \u2014 ${esc(d.ev)}</dd>
        </dl>
      </section>
    </div>
  </div>`;
}
