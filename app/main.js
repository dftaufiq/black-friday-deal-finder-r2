// DealScope app: hash routing (#/ home, #/deal/<id> detail), live search and
// filters (category, store, minimum discount) and sorting. All state lives
// in the URL hash so a filtered view can be linked and reloaded.

import { deals } from "./data.js";
import { renderHome, renderDetail } from "./views.js";

const app = document.getElementById("app");

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query || "");
  return { path, params };
}

function stateFromParams(params) {
  return {
    q: params.get("q") || "",
    cat: params.get("cat") || "",
    store: params.get("store") || "",
    min: Number(params.get("min") || 0),
    sort: params.get("sort") || "discount",
  };
}

function stateToQuery(state) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.cat) p.set("cat", state.cat);
  if (state.store) p.set("store", state.store);
  if (state.min) p.set("min", String(state.min));
  if (state.sort && state.sort !== "discount") p.set("sort", state.sort);
  const s = p.toString();
  return s ? "?" + s : "";
}

function render() {
  const { path, params } = parseHash();
  const dealMatch = path.match(/^deal\/(.+)$/);
  if (dealMatch) {
    const d = deals.find((x) => x.id === decodeURIComponent(dealMatch[1]));
    document.body.classList.add("detail-view");
    app.innerHTML = d ? renderDetail(d) : `<p class="empty">That deal is not on the board. <a href="#/">Back to all deals</a>.</p>`;
    window.scrollTo(0, 0);
    return;
  }
  document.body.classList.remove("detail-view");
  app.innerHTML = renderHome(stateFromParams(params));
  wireFilters(stateFromParams(params));
}

function wireFilters(state) {
  const q = document.getElementById("f-q");
  const cat = document.getElementById("f-cat");
  const store = document.getElementById("f-store");
  const min = document.getElementById("f-min");
  const sort = document.getElementById("f-sort");
  if (!q) return;
  let timer = 0;
  q.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      state.q = q.value;
      history.replaceState(null, "", "#/" + stateToQuery(state));
      render();
      const again = document.getElementById("f-q");
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    }, 180);
  });
  const onChange = (key, el) => el.addEventListener("change", () => {
    state[key] = key === "min" ? Number(el.value) : el.value;
    history.replaceState(null, "", "#/" + stateToQuery(state));
    render();
  });
  onChange("cat", cat);
  onChange("store", store);
  onChange("min", min);
  onChange("sort", sort);
}

window.addEventListener("hashchange", render);
render();
