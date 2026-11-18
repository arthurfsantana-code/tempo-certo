
(function () {
  "use strict";

  const { describe, compass, uvText, temp, wind, rain, pct, pressure, hhmm, pickHourly,
    weekdayLabel, dayMonth, weekRange, esc, sameplace, placeFromGeo, validPlace } = TC;

  const API = {
    geo: "https://geocoding-api.open-meteo.com/v1/search",
    forecast: "https://api.open-meteo.com/v1/forecast",
  };
  const STORE = { place: "tc:place", favs: "tc:favs", units: "tc:units", theme: "tc:theme" };
  const DEFAULT_PLACE = { name: "São Paulo", admin1: "São Paulo", country: "Brasil", lat: -23.5475, lon: -46.6361 };
  const MAX_FAVS = 12;
  const REFRESH_MS = 10 * 60 * 1000;

  const $ = (sel) => document.querySelector(sel);
  const state = { place: null, units: "metric", data: null, favs: [], updatedAt: null };

  
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {  }
  }

  
  const svg = (inner) =>
    '<svg class="wx" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  const CLOUD = '<path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 10.3 4 4 0 0 0 7 18z"/>';
  const CLOUD_HI = '<path d="M7 14h10a3.5 3.5 0 0 0 .5-6.96A5.5 5.5 0 0 0 6.6 7.3 3.6 3.6 0 0 0 7 14z"/>';
  const CLOUD_LO = '<path d="M9.5 20h7.5a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.2 13.4 3.3 3.3 0 0 0 9.5 20z"/>';
  const ICONS = {
    clearDay: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    clearNight: svg('<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>'),
    partlyDay: svg('<circle cx="8" cy="8" r="2.6"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/>' + CLOUD_LO),
    partlyNight: svg('<path d="M9.5 4.2a4.3 4.3 0 1 0 5 5.6 3.4 3.4 0 0 1-5-5.6z"/>' + CLOUD_LO),
    cloud: svg(CLOUD),
    fog: svg('<path d="M4 8h16M6 12h12M4 16h16M8 20h8"/>'),
    drizzle: svg(CLOUD_HI + '<path d="M9 17.5v1M13 17.5v1M17 17.5v1M11 20.5v1M15 20.5v1"/>'),
    rain: svg(CLOUD_HI + '<path d="M8.5 17l-1 3M12.5 17l-1 3M16.5 17l-1 3"/>'),
    snow: svg(CLOUD_HI + '<path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01" stroke-width="2.6"/>'),
    storm: svg(CLOUD_HI + '<path d="M12.5 14l-2.5 4h3.5l-2 4"/>'),
  };
  function icon(kind, isDay) {
    if (kind === "clear") return isDay ? ICONS.clearDay : ICONS.clearNight;
    if (kind === "partly") return isDay ? ICONS.partlyDay : ICONS.partlyNight;
    return ICONS[kind] || ICONS.cloud;
  }
  const STAR = (on) =>
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linejoin="round" fill="' + (on ? "currentColor" : "none") + '">' +
    '<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z"/></svg>';

  
  function setStatus(message, kind, withRetry) {
    const el = $("#status");
    if (!message) { el.hidden = true; el.textContent = ""; el.className = "status"; return; }
    el.hidden = false;
    el.className = "status " + (kind || "");
    el.innerHTML = "<span>" + esc(message) + "</span>" +
      (withRetry ? ' <button type="button" class="btn small" data-action="retry">Tentar novamente</button>' : "");
  }

  function errorMessage(err) {
    if (!navigator.onLine) return "Sem conexão com a internet. Verifique a rede e tente de novo.";
    if (/HTTP 429/.test(err.message)) return "Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente.";
    if (/HTTP 4\d\d/.test(err.message)) return "A API recusou a consulta. Tente outra cidade.";
    return "Não foi possível obter a previsão agora. Tente novamente em instantes.";
  }

  
  async function fetchWeather(place, signal) {
    const params = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lon,
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code," +
        "wind_speed_10m,wind_direction_10m,surface_pressure,is_day",
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum," +
        "precipitation_probability_max,sunrise,sunset,uv_index_max",
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
    });
    const res = await fetch(API.forecast + "?" + params.toString(), { signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json.current || !json.hourly || !json.daily) throw new Error("Resposta inesperada da API");
    return json;
  }

  async function searchCities(query, signal) {
    const params = new URLSearchParams({ name: query, count: "6", language: "pt", format: "json" });
    const res = await fetch(API.geo + "?" + params.toString(), { signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    return Array.isArray(json.results) ? json.results : [];
  }

  
  let weatherCtrl = null;
  async function loadPlace(place, opts) {
    const o = opts || {};
    state.place = place;
    if (o.persist !== false) save(STORE.place, place);
    if (weatherCtrl) weatherCtrl.abort();
    weatherCtrl = new AbortController();
    const myCtrl = weatherCtrl;
    if (!o.silent) setStatus("Carregando previsão…", "loading");
    try {
      const data = await fetchWeather(place, myCtrl.signal);
      state.data = data;
      state.updatedAt = new Date();
      setStatus("");
      render();
    } catch (err) {
      if (err.name === "AbortError") return;
      if (o.silent && state.data) return;
      setStatus(errorMessage(err), "error", true);
    }
  }

  
  const unitSymbol = () => (state.units === "metric" ? "°C" : "°F");

  function render() {
    if (!state.data) return;
    $("#app").hidden = false;
    renderCurrent();
    renderDetails();
    renderHourly();
    renderDaily();
    renderFavorites();
    $("#btnUnits").textContent = unitSymbol();
    document.title = state.place.name + " " + temp(state.data.current.temperature_2m, state.units) +
      unitSymbol() + " | Tempo Certo";
  }

  function placeSubtitle(p) {
    const s = [p.admin1, p.country].filter(Boolean).join(", ");
    return s || p.lat.toFixed(2) + ", " + p.lon.toFixed(2);
  }

  function renderCurrent() {
    const u = state.units;
    const c = state.data.current;
    const d = state.data.daily;
    const info = describe(c.weather_code);
    const isFav = state.favs.some((f) => sameplace(f, state.place));
    const stamp = state.updatedAt
      ? state.updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";
    $("#current").innerHTML =
      '<div class="cur-head">' +
        "<div>" +
          '<h2 class="place">' + esc(state.place.name) + "</h2>" +
          '<p class="sub">' + esc(placeSubtitle(state.place)) + "</p>" +
        "</div>" +
        '<button type="button" class="icon-btn" data-action="toggle-fav" aria-pressed="' + isFav + '" ' +
          'aria-label="' + (isFav ? "Remover dos favoritos" : "Salvar nos favoritos") + '" ' +
          'title="' + (isFav ? "Remover dos favoritos" : "Salvar nos favoritos") + '">' + STAR(isFav) + "</button>" +
      "</div>" +
      '<div class="cur-main">' +
        '<div class="cur-icon">' + icon(info[1], c.is_day) + "</div>" +
        "<div>" +
          '<p class="big">' + temp(c.temperature_2m, u) + "<span>" + unitSymbol() + "</span></p>" +
          '<p class="desc">' + esc(info[0]) + "</p>" +
        "</div>" +
      "</div>" +
      '<p class="hilo">Máx ' + temp(d.temperature_2m_max[0], u) + "° &nbsp;·&nbsp; Mín " +
        temp(d.temperature_2m_min[0], u) + "° &nbsp;·&nbsp; Sensação " + temp(c.apparent_temperature, u) + "°</p>" +
      '<p class="stamp">Atualizado às ' + esc(stamp) + " (horário local da cidade: " + esc(hhmm(c.time)) + ")</p>";
  }

  function renderDetails() {
    const u = state.units;
    const c = state.data.current;
    const d = state.data.daily;
    const items = [
      ["Umidade", pct(c.relative_humidity_2m)],
      ["Vento", wind(c.wind_speed_10m, u) + " " + compass(c.wind_direction_10m)],
      ["Chuva agora", rain(c.precipitation, u)],
      ["Pressão", pressure(c.surface_pressure)],
      ["Chuva hoje", rain(d.precipitation_sum[0], u) + " (" + pct(d.precipitation_probability_max[0]) + ")"],
      ["Índice UV hoje", uvText(d.uv_index_max[0])],
      ["Nascer do sol", hhmm(d.sunrise[0])],
      ["Pôr do sol", hhmm(d.sunset[0])],
    ];
    $("#details").innerHTML = items.map((it) =>
      '<div class="stat"><dt>' + esc(it[0]) + "</dt><dd>" + esc(it[1]) + "</dd></div>").join("");
  }

  function renderHourly() {
    const u = state.units;
    const hours = pickHourly(state.data.hourly, state.data.current.time, 24);
    const cells = hours.map((h, i) => {
      const info = describe(h.code);
      const showPop = typeof h.pop === "number" && h.pop >= 1;
      return '<li class="hour">' +
        '<span class="h-time">' + (i === 0 ? "Agora" : esc(h.time.slice(11, 13)) + "h") + "</span>" +
        '<span class="h-icon" title="' + esc(info[0]) + '">' + icon(info[1], h.isDay) + "</span>" +
        '<span class="h-temp">' + temp(h.temp, u) + "°</span>" +
        '<span class="h-pop' + (showPop ? "" : " off") + '">' + (showPop ? pct(h.pop) : "&nbsp;") + "</span>" +
      "</li>";
    }).join("");
    $("#hourly").innerHTML = '<h3 class="card-title">Próximas 24 horas</h3>' +
      '<div class="scroll" tabindex="0" role="region" aria-label="Previsão por hora, role para o lado">' +
      '<ol class="hours">' + cells + "</ol></div>";
  }

  function renderDaily() {
    const u = state.units;
    const d = state.data.daily;
    const r = weekRange(d);
    const span = Math.max(r.max - r.min, 1);
    const rows = d.time.map((t, i) => {
      const info = describe(d.weather_code[i]);
      const lo = d.temperature_2m_min[i];
      const hi = d.temperature_2m_max[i];
      const width = Math.max(((hi - lo) / span) * 100, 6);
      const left = Math.min(((lo - r.min) / span) * 100, 100 - width);
      return '<li class="day">' +
        '<span class="d-name">' + esc(weekdayLabel(t, i)) + "<small>" + esc(dayMonth(t)) + "</small></span>" +
        '<span class="d-icon" title="' + esc(info[0]) + '">' + icon(info[1], 1) + "</span>" +
        '<span class="d-pop">' + pct(d.precipitation_probability_max[i]) + "</span>" +
        '<span class="d-lo">' + temp(lo, u) + "°</span>" +
        '<span class="bar" aria-hidden="true"><i style="left:' + left.toFixed(1) + "%;width:" + width.toFixed(1) + '%"></i></span>' +
        '<span class="d-hi">' + temp(hi, u) + "°</span>" +
      "</li>";
    }).join("");
    $("#daily").innerHTML = '<h3 class="card-title">Próximos 7 dias</h3><ul class="days">' + rows + "</ul>" +
      '<p class="legend">Percentual à direita do ícone: chance de chuva no dia.</p>';
  }

  function renderFavorites() {
    let body;
    if (!state.favs.length) {
      body = '<p class="empty">Nenhuma cidade salva ainda. Use a estrela no cartão principal para guardar uma cidade aqui.</p>';
    } else {
      body = '<ul class="favs">' + state.favs.map((f, i) =>
        "<li>" +
          '<button type="button" class="fav-open" data-action="open-fav" data-i="' + i + '">' +
            "<strong>" + esc(f.name) + "</strong><small>" + esc(placeSubtitle(f)) + "</small></button>" +
          '<button type="button" class="icon-btn small" data-action="remove-fav" data-i="' + i + '" ' +
            'aria-label="Remover ' + esc(f.name) + ' dos favoritos" title="Remover">&times;</button>' +
        "</li>").join("") + "</ul>";
    }
    $("#favorites").innerHTML = '<h3 class="card-title">Favoritas</h3>' + body;
  }

  
  function toggleFav() {
    const idx = state.favs.findIndex((f) => sameplace(f, state.place));
    if (idx >= 0) {
      state.favs.splice(idx, 1);
    } else {
      if (state.favs.length >= MAX_FAVS) state.favs.pop();
      state.favs.unshift(state.place);
    }
    save(STORE.favs, state.favs);
    renderCurrent();
    renderFavorites();
  }

  
  const input = $("#q");
  const list = $("#suggestions");
  let results = [];
  let activeIdx = -1;
  let searchTimer = null;
  let searchCtrl = null;

  function closeSuggestions() {
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeIdx = -1;
  }

  function highlight(i) {
    const opts = list.querySelectorAll("[role=option]");
    opts.forEach((el, k) => el.setAttribute("aria-selected", String(k === i)));
    activeIdx = i;
    if (i >= 0 && opts[i]) {
      input.setAttribute("aria-activedescendant", opts[i].id);
      opts[i].scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function renderSuggestions() {
    if (!results.length) {
      list.innerHTML = '<li class="none" role="presentation">Nenhuma cidade encontrada.</li>';
    } else {
      list.innerHTML = results.map((r, i) =>
        '<li role="option" id="opt-' + i + '" data-i="' + i + '" aria-selected="false">' +
          "<strong>" + esc(r.name) + "</strong>" +
          "<small>" + esc([r.admin1, r.country].filter(Boolean).join(", ")) + "</small></li>").join("");
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activeIdx = -1;
  }

  async function runSearch(query) {
    if (searchCtrl) searchCtrl.abort();
    searchCtrl = new AbortController();
    try {
      results = await searchCities(query, searchCtrl.signal);
      renderSuggestions();
    } catch (err) {
      if (err.name === "AbortError") return;
      results = [];
      list.innerHTML = '<li class="none" role="presentation">Não foi possível buscar agora. Tente de novo.</li>';
      list.hidden = false;
    }
  }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    closeSuggestions();
    input.value = "";
    input.blur();
    loadPlace(placeFromGeo(r));
  }

  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length < 2) { if (searchCtrl) searchCtrl.abort(); closeSuggestions(); return; }
    searchTimer = setTimeout(() => runSearch(q), 300);
  });

  input.addEventListener("keydown", (e) => {
    const n = results.length;
    if (list.hidden || !n) { if (e.key === "Escape") closeSuggestions(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); highlight((activeIdx + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight((activeIdx - 1 + n) % n); }
    else if (e.key === "Escape") { closeSuggestions(); }
  });

  $("#searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) return;
    clearTimeout(searchTimer);
    if (!results.length || list.hidden) await runSearch(q);
    if (results.length) choose(activeIdx >= 0 ? activeIdx : 0);
  });

  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("[data-i]");
    if (li) { e.preventDefault(); choose(Number(li.dataset.i)); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) closeSuggestions(); });

  
  $("#btnLocate").addEventListener("click", () => {
    if (!navigator.geolocation) { setStatus("Este navegador não oferece geolocalização.", "error"); return; }
    setStatus("Obtendo sua localização…", "loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadPlace({
        name: "Minha localização", admin1: "", country: "",
        lat: Number(pos.coords.latitude.toFixed(4)), lon: Number(pos.coords.longitude.toFixed(4)),
      }),
      (err) => {
        const msg = err.code === 1
          ? "Permissão de localização negada. Busque pelo nome da cidade."
          : "Não foi possível obter a localização. Busque pelo nome da cidade.";
        setStatus(msg, "error");
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });

  $("#btnUnits").addEventListener("click", () => {
    state.units = state.units === "metric" ? "imperial" : "metric";
    save(STORE.units, state.units);
    $("#btnUnits").textContent = unitSymbol();
    render();
  });

  $("#btnTheme").addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    save(STORE.theme, next);
  });

  
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "toggle-fav") toggleFav();
    else if (action === "retry") loadPlace(state.place);
    else if (action === "open-fav") { const f = state.favs[Number(el.dataset.i)]; if (f) loadPlace(f); }
    else if (action === "remove-fav") {
      state.favs.splice(Number(el.dataset.i), 1);
      save(STORE.favs, state.favs);
      renderFavorites();
      renderCurrent();
    }
  });

  
  function init() {
    const units = load(STORE.units, "metric");
    state.units = units === "imperial" ? "imperial" : "metric";
    const favs = load(STORE.favs, []);
    state.favs = Array.isArray(favs) ? favs.filter(validPlace) : [];
    $("#btnUnits").textContent = unitSymbol();

    const saved = load(STORE.place, null);
    loadPlace(validPlace(saved) ? saved : DEFAULT_PLACE, { persist: false });

    setInterval(() => {
      if (!document.hidden && state.place) loadPlace(state.place, { persist: false, silent: true });
    }, REFRESH_MS);
    window.addEventListener("online", () => {
      if (state.place) loadPlace(state.place, { persist: false, silent: true });
    });
  }

  init();
})();
