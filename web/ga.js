/* Núcleo del algoritmo genético (puerto fiel de ga.py).
 * Individuo: 10 pesos en bloques de 5 % que suman 100 %.
 * Fitness: rendimiento / riesgo.
 */
(function (global) {
  "use strict";

  const BLOQUE = 0.05;
  const N_BLOQUES = 20;

  const DATOS = [
    [64.59, 26.26, 101.18, 244.22, 6.5, 69.27, 67.51, 68.9, 281.82, 27.89],
    [69.73, 22.09, 103.06, 219.59, 6.66, 67.06, 69.41, 66.32, 243.55, 28.79],
    [77.37, 20.89, 96.98, 229.0, 6.66, 70.19, 67.83, 68.99, 213.53, 27.52],
    [74.69, 16.21, 97.98, 234.11, 7.03, 68.76, 74.56, 67.89, 192.86, 24.32],
    [71.04, 15.16, 97.78, 219.39, 7.2, 74.32, 70.42, 70.75, 177.39, 26.03],
    [60.59, 15.25, 98.72, 205.01, 7.2, 70.28, 71.36, 72.1, 172.85, 26.38],
    [56.4, 18.89, 97.25, 184.42, 7.5, 65.84, 71.25, 72.55, 160.89, 26.0],
    [63.48, 26.12, 87.79, 190.26, 7.5, 65.25, 71.16, 71.62, 156.23, 25.39],
    [79.43, 26.51, 98.61, 212.28, 7.26, 71.05, 67.91, 71.21, 172.22, 25.04],
    [76.9, 31.59, 98.16, 237.68, 7.26, 88.58, 69.23, 63.48, 205.6, 22.01],
    [75.67, 32.02, 90.35, 219.39, 6.98, 85.35, 69.14, 62.26, 190.44, 21.16],
  ];
  const N = DATOS[0].length;

  const MU = Array.from({ length: N }, (_, j) => DATOS.reduce((s, f) => s + f[j], 0) / DATOS.length);

  // Covarianza muestral (n - 1), igual que np.cov(rowvar=False)
  const SIGMA = Array.from({ length: N }, (_, a) =>
    Array.from({ length: N }, (_, b) => {
      let s = 0;
      for (const fila of DATOS) s += (fila[a] - MU[a]) * (fila[b] - MU[b]);
      return s / (DATOS.length - 1);
    })
  );

  /** Generador pseudoaleatorio con semilla (mulberry32). */
  function crearRng(semilla) {
    let a = (semilla >>> 0) || (Math.random() * 2 ** 32) >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const entero = (rng, max) => Math.floor(rng() * max);

  // Un individuo es un arreglo de enteros (bloques) que suma N_BLOQUES.
  function generarIndividuo(rng) {
    const b = new Array(N).fill(0);
    for (let i = 0; i < N_BLOQUES; i++) b[entero(rng, N)]++;
    return b;
  }

  /** Reparte los bloques sobrantes por mayor resto: siempre suma exactamente 20. */
  function reparar(pesos) {
    const total = pesos.reduce((s, x) => s + x, 0);
    const escala = pesos.map((x) => (x / total) * N_BLOQUES);
    const bloques = escala.map(Math.floor);
    let faltan = N_BLOQUES - bloques.reduce((s, x) => s + x, 0);
    const orden = escala.map((x, i) => [x - bloques[i], i]).sort((p, q) => q[0] - p[0]);
    for (let k = 0; faltan > 0; k++, faltan--) bloques[orden[k][1]]++;
    return bloques;
  }

  const pesos = (ind) => ind.map((b) => b * BLOQUE);

  function rendimiento(ind) {
    const w = pesos(ind);
    return w.reduce((s, x, i) => s + x * MU[i], 0);
  }

  function riesgo(ind) {
    const w = pesos(ind);
    let v = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) v += w[i] * SIGMA[i][j] * w[j];
    return Math.sqrt(v);
  }

  function fitness(ind) {
    const r = riesgo(ind);
    return r === 0 ? 0 : rendimiento(ind) / r;
  }

  function ruleta(rng, poblacion, fit) {
    const total = fit.reduce((s, x) => s + x, 0);
    let meta = rng() * total;
    for (let i = 0; i < poblacion.length; i++) {
      meta -= fit[i];
      if (meta <= 0) return poblacion[i];
    }
    return poblacion[poblacion.length - 1];
  }

  function cruza(rng, p1, p2) {
    const punto = 1 + entero(rng, N - 1);
    return reparar(p1.slice(0, punto).concat(p2.slice(punto)));
  }

  function mutacion(rng, ind, prob) {
    const hijo = ind.slice();
    if (rng() < prob) {
      const con = hijo.map((b, i) => (b > 0 ? i : -1)).filter((i) => i >= 0);
      hijo[con[entero(rng, con.length)]]--;
      hijo[entero(rng, N)]++;
    }
    return hijo;
  }

  function validar(p) {
    if (!(p.poblacion >= 2)) throw new Error("La población debe tener al menos 2 individuos.");
    if (!(p.generaciones >= 1)) throw new Error("Debe haber al menos 1 generación.");
    if (!(p.mutacion >= 0 && p.mutacion <= 1)) throw new Error("La mutación debe estar entre 0 y 1.");
    if (!(p.elitismo >= 0 && p.elitismo < p.poblacion)) throw new Error("El elitismo debe ser menor que la población.");
  }

  /**
   * Ejecuta el algoritmo y guarda cada generación para poder reproducirla.
   * @returns {{historial: Array, mejor: number[], fitness: number, rendimiento: number, riesgo: number}}
   */
  function ejecutar(params) {
    validar(params);
    const rng = crearRng(params.semilla);
    let poblacion = Array.from({ length: params.poblacion }, () => generarIndividuo(rng));
    const historial = [];

    const instantanea = (pob) => {
      const fit = pob.map(fitness);
      const iMejor = fit.indexOf(Math.max(...fit));
      return {
        mejor: fit[iMejor],
        promedio: fit.reduce((s, x) => s + x, 0) / fit.length,
        mejorInd: pob[iMejor].slice(),
        puntos: pob.map((ind) => ({ r: rendimiento(ind), s: riesgo(ind) })),
      };
    };

    historial.push(instantanea(poblacion)); // generación 0 = población inicial
    for (let g = 0; g < params.generaciones; g++) {
      const fit = poblacion.map(fitness);
      const orden = fit.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]);
      const nueva = orden.slice(0, params.elitismo).map(([, i]) => poblacion[i]);
      while (nueva.length < poblacion.length) {
        const h = cruza(rng, ruleta(rng, poblacion, fit), ruleta(rng, poblacion, fit));
        nueva.push(mutacion(rng, h, params.mutacion));
      }
      poblacion = nueva;
      historial.push(instantanea(poblacion));
    }
    const ultima = historial[historial.length - 1];
    return {
      historial,
      mejor: ultima.mejorInd,
      fitness: ultima.mejor,
      rendimiento: rendimiento(ultima.mejorInd),
      riesgo: riesgo(ultima.mejorInd),
    };
  }

  global.GA = { DATOS, MU, SIGMA, N, BLOQUE, N_BLOQUES, ejecutar, reparar, fitness, rendimiento, riesgo, crearRng, generarIndividuo, cruza, mutacion };
})(typeof window !== "undefined" ? window : globalThis);
