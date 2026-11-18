/* Testes das funções puras. Execute com: node test.js */
const assert = require("assert");
const TC = require("./lib.js");

// Descrições e ícones
assert.deepStrictEqual(TC.describe(0), ["Céu limpo", "clear"]);
assert.strictEqual(TC.describe(95)[1], "storm");
assert.strictEqual(TC.describe(12345)[0], "Condição desconhecida");

// Conversões
assert.strictEqual(TC.temp(0, "metric"), "0");
assert.strictEqual(TC.temp(0, "imperial"), "32");
assert.strictEqual(TC.temp(21.6, "metric"), "22");
assert.strictEqual(TC.temp(null, "metric"), "—");
assert.strictEqual(TC.wind(100, "metric"), "100 km/h");
assert.strictEqual(TC.wind(100, "imperial"), "62 mph");
assert.strictEqual(TC.rain(25.4, "metric"), "25.4 mm");
assert.strictEqual(TC.rain(25.4, "imperial"), "1.00 in");
assert.strictEqual(TC.pct(55.4), "55%");
assert.strictEqual(TC.pct(undefined), "—");

// Direção do vento e UV
assert.strictEqual(TC.compass(0), "N");
assert.strictEqual(TC.compass(90), "L");
assert.strictEqual(TC.compass(359), "N");
assert.strictEqual(TC.uvLabel(2), "Baixo");
assert.strictEqual(TC.uvLabel(9), "Muito alto");
assert.strictEqual(TC.uvText(7.4), "7 (Alto)");

// Horário e dias
assert.strictEqual(TC.hhmm("2026-11-18T05:41"), "05:41");
assert.strictEqual(TC.weekdayLabel("2026-11-18", 0), "Hoje");
assert.strictEqual(TC.weekdayLabel("2026-11-19", 1), "Amanhã");
assert.strictEqual(TC.weekdayLabel("2026-11-20", 2), "sex");

// Seleção das próximas 24 horas com dados simulados
const time = [];
for (let d = 18; d <= 19; d++) {
  for (let h = 0; h < 24; h++) time.push(`2026-11-${d}T${String(h).padStart(2, "0")}:00`);
}
const mk = (fn) => time.map((_, i) => fn(i));
const hourly = {
  time,
  temperature_2m: mk((i) => 15 + (i % 24) / 2),
  precipitation_probability: mk(() => 10),
  weather_code: mk(() => 1),
  is_day: mk((i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
};
const picked = TC.pickHourly(hourly, "2026-11-18T08:15", 24);
assert.strictEqual(picked.length, 24);
assert.strictEqual(picked[0].time, "2026-11-18T08:00");
assert.strictEqual(picked[23].time, "2026-11-19T07:00");
// perto do fim da série devolve só o que existe
assert.strictEqual(TC.pickHourly(hourly, "2026-11-19T22:30", 24).length, 2);

// Faixa semanal
assert.deepStrictEqual(
  TC.weekRange({ temperature_2m_min: [12, 9, 14], temperature_2m_max: [24, 27, 22] }),
  { min: 9, max: 27 }
);

// Segurança e locais
assert.strictEqual(TC.esc('<img src=x onerror="a()">'), "&lt;img src=x onerror=&quot;a()&quot;&gt;");
assert.ok(TC.sameplace({ lat: -23.55, lon: -46.63 }, { lat: -23.5501, lon: -46.6301 }));
assert.ok(!TC.sameplace({ lat: -23.55, lon: -46.63 }, { lat: -22.9, lon: -43.2 }));
assert.deepStrictEqual(
  TC.placeFromGeo({ name: "Curitiba", admin1: "Paraná", country: "Brasil", latitude: -25.43, longitude: -49.27 }),
  { name: "Curitiba", admin1: "Paraná", country: "Brasil", lat: -25.43, lon: -49.27 }
);
assert.ok(TC.validPlace({ name: "X", lat: 10, lon: 20 }));
assert.ok(!TC.validPlace({ name: "X", lat: 999, lon: 20 }));
assert.ok(!TC.validPlace(null));

console.log("Todos os testes passaram.");
