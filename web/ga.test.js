// Pruebas del núcleo en JavaScript. Ejecutar: node --test web/
const test = require("node:test");
const assert = require("node:assert/strict");
require("./ga.js");
const GA = globalThis.GA;

const suma = (ind) => ind.reduce((s, x) => s + x, 0);

test("reparar siempre devuelve exactamente 20 bloques", () => {
  const rng = GA.crearRng(1);
  for (let i = 0; i < 300; i++) {
    const crudo = Array.from({ length: GA.N }, () => rng() + 0.01);
    assert.equal(suma(GA.reparar(crudo)), GA.N_BLOQUES);
  }
});

test("cruza y mutación conservan la validez del individuo", () => {
  const rng = GA.crearRng(2);
  const a = GA.generarIndividuo(rng), b = GA.generarIndividuo(rng);
  for (let i = 0; i < 300; i++) {
    const h = GA.mutacion(rng, GA.cruza(rng, a, b), 1);
    assert.equal(suma(h), GA.N_BLOQUES);
    assert.ok(h.every((x) => Number.isInteger(x) && x >= 0));
  }
});

test("el elitismo evita que el mejor fitness empeore", () => {
  const r = GA.ejecutar({ poblacion: 30, generaciones: 40, mutacion: 0.2, elitismo: 2, semilla: 7 });
  const mejores = r.historial.map((g) => g.mejor);
  for (let i = 1; i < mejores.length; i++) assert.ok(mejores[i] >= mejores[i - 1] - 1e-12);
});

test("resultado reproducible con semilla", () => {
  const p = { poblacion: 40, generaciones: 30, mutacion: 0.1, elitismo: 2, semilla: 11 };
  assert.deepEqual(GA.ejecutar(p).mejor, GA.ejecutar(p).mejor);
});

test("parámetros inválidos lanzan error", () => {
  assert.throws(() => GA.ejecutar({ poblacion: 1, generaciones: 10, mutacion: 0.1, elitismo: 0 }));
  assert.throws(() => GA.ejecutar({ poblacion: 10, generaciones: 10, mutacion: 2, elitismo: 0 }));
  assert.throws(() => GA.ejecutar({ poblacion: 10, generaciones: 10, mutacion: 0.1, elitismo: 10 }));
});
