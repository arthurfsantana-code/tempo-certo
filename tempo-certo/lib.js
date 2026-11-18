/* Funções puras do Tempo Certo: sem DOM, testáveis no Node. */
(function (root) {
  "use strict";

  // Códigos WMO usados pelo Open-Meteo -> [descrição, tipo de ícone]
  const WMO = {
    0: ["Céu limpo", "clear"],
    1: ["Predominantemente limpo", "clear"],
    2: ["Parcialmente nublado", "partly"],
    3: ["Nublado", "cloud"],
    45: ["Neblina", "fog"],
    48: ["Neblina com geada", "fog"],
    51: ["Garoa fraca", "drizzle"],
    53: ["Garoa moderada", "drizzle"],
    55: ["Garoa intensa", "drizzle"],
    56: ["Garoa congelante", "drizzle"],
    57: ["Garoa congelante forte", "drizzle"],
    61: ["Chuva fraca", "rain"],
    63: ["Chuva moderada", "rain"],
    65: ["Chuva forte", "rain"],
    66: ["Chuva congelante", "rain"],
    67: ["Chuva congelante forte", "rain"],
    71: ["Neve fraca", "snow"],
    73: ["Neve moderada", "snow"],
    75: ["Neve forte", "snow"],
    77: ["Grãos de neve", "snow"],
    80: ["Pancadas de chuva fracas", "rain"],
    81: ["Pancadas de chuva", "rain"],
    82: ["Pancadas de chuva fortes", "rain"],
    85: ["Pancadas de neve fracas", "snow"],
    86: ["Pancadas de neve fortes", "snow"],
    95: ["Trovoadas", "storm"],
    96: ["Trovoadas com granizo", "storm"],
    99: ["Trovoadas com granizo forte", "storm"],
  };

  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  function describe(code) {
    return WMO[code] || ["Condição desconhecida", "cloud"];
  }

  function compass(deg) {
    if (!isNum(deg)) return "";
    return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8];
  }

  function uvLabel(uv) {
    if (!isNum(uv)) return "—";
    if (uv < 3) return "Baixo";
    if (uv < 6) return "Moderado";
    if (uv < 8) return "Alto";
    if (uv < 11) return "Muito alto";
    return "Extremo";
  }

  function uvText(uv) {
    return isNum(uv) ? `${Math.round(uv)} (${uvLabel(uv)})` : "—";
  }

  // A API devolve °C, km/h e mm; a conversão para imperial é feita aqui.
  function temp(c, units) {
    if (!isNum(c)) return "—";
    return String(Math.round(units === "imperial" ? (c * 9) / 5 + 32 : c));
  }

  function wind(kmh, units) {
    if (!isNum(kmh)) return "—";
    return units === "imperial" ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`;
  }

  function rain(mm, units) {
    if (!isNum(mm)) return "—";
    return units === "imperial" ? `${(mm / 25.4).toFixed(2)} in` : `${mm.toFixed(1)} mm`;
  }

  function pct(v) {
    return isNum(v) ? `${Math.round(v)}%` : "—";
  }

  function pressure(hpa) {
    return isNum(hpa) ? `${Math.round(hpa)} hPa` : "—";
  }

  // Horário local ISO "2026-11-18T08:15" -> "08:15"
  function hhmm(iso) {
    return typeof iso === "string" && iso.length >= 16 ? iso.slice(11, 16) : "—";
  }

  // Próximas `count` horas a partir da hora cheia atual (horários já no fuso do local).
  function pickHourly(h, nowIso, count) {
    const n = count || 24;
    const start = nowIso.slice(0, 13) + ":00";
    let i = h.time.findIndex((t) => t >= start);
    if (i < 0) i = 0;
    const out = [];
    for (let k = i; k < Math.min(i + n, h.time.length); k++) {
      out.push({
        time: h.time[k],
        temp: h.temperature_2m[k],
        pop: h.precipitation_probability ? h.precipitation_probability[k] : null,
        code: h.weather_code[k],
        isDay: h.is_day ? h.is_day[k] : 1,
      });
    }
    return out;
  }

  function weekdayLabel(dateStr, index) {
    if (index === 0) return "Hoje";
    if (index === 1) return "Amanhã";
    const d = new Date(dateStr + "T12:00:00Z");
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" })
      .format(d)
      .replace(".", "");
  }

  function dayMonth(dateStr) {
    const d = new Date(dateStr + "T12:00:00Z");
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })
      .format(d)
      .replace(".", "");
  }

  function weekRange(daily) {
    return {
      min: Math.min.apply(null, daily.temperature_2m_min),
      max: Math.max.apply(null, daily.temperature_2m_max),
    };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[ch]);
  }

  function sameplace(a, b) {
    return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
  }

  function placeFromGeo(r) {
    return {
      name: r.name,
      admin1: r.admin1 || "",
      country: r.country || "",
      lat: r.latitude,
      lon: r.longitude,
    };
  }

  function validPlace(p) {
    return !!p && typeof p.name === "string" && isNum(p.lat) && isNum(p.lon) &&
      Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  }

  const api = {
    describe, compass, uvLabel, uvText, temp, wind, rain, pct, pressure, hhmm,
    pickHourly, weekdayLabel, dayMonth, weekRange, esc, sameplace, placeFromGeo, validPlace,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TC = api;
})(typeof window !== "undefined" ? window : globalThis);
