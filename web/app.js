/* Interfaz: formulario, reproductor de generaciones y gráficos en canvas. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const form = $("form");
  const campos = ["poblacion", "generaciones", "mutacion", "elitismo"];
  const out = { poblacion: $("o-poblacion"), generaciones: $("o-generaciones"), mutacion: $("o-mutacion"), elitismo: $("o-elitismo") };
  const elError = $("error");
  const slider = $("gen");
  const btnPlay = $("play");

  let resultado = null;
  let gen = 0;
  let timer = null;
  let rango = null;

  // ---------- Datos de entrada ----------
  (function pintarTabla() {
    const t = $("datos");
    const cab = "<tr><th>#</th>" + GA.DATOS[0].map((_, i) => `<th>A${i + 1}</th>`).join("") + "</tr>";
    const filas = GA.DATOS.map((f, i) => `<tr><td>${i + 1}</td>${f.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
    t.innerHTML = cab + filas;
  })();

  // ---------- Pesos ----------
  const lista = $("pesos");
  lista.innerHTML = GA.DATOS[0].map((_, i) =>
    `<li><span>Activo ${i + 1}</span><div class="track"><div class="fill"></div></div><span class="pct">0 %</span></li>`).join("");
  const fills = [...lista.querySelectorAll(".fill")];
  const pcts = [...lista.querySelectorAll(".pct")];

  function pintarPesos(ind) {
    ind.forEach((b, i) => {
      const p = b * GA.BLOQUE * 100;
      fills[i].style.width = p + "%";
      pcts[i].textContent = Math.round(p) + " %";
    });
  }

  // ---------- Gráficos ----------
  function preparar(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, w: width, h: height };
  }

  function ejes(ctx, w, h, m, xs, ys, xTit, yTit) {
    ctx.strokeStyle = css("--line");
    ctx.fillStyle = css("--muted");
    ctx.font = "12px 'Trebuchet MS', sans-serif";
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = ys.min + ((ys.max - ys.min) * i) / 4;
      const y = h - m.b - ((h - m.t - m.b) * i) / 4;
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(w - m.r, y); ctx.stroke();
      ctx.fillText(v.toFixed(ys.dec), m.l - 6, y + 4);
    }
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const v = xs.min + ((xs.max - xs.min) * i) / 4;
      ctx.fillText(v.toFixed(xs.dec), m.l + ((w - m.l - m.r) * i) / 4, h - m.b + 16);
    }
    ctx.fillText(xTit, m.l + (w - m.l - m.r) / 2, h - 4);
    ctx.save(); ctx.translate(12, m.t + (h - m.t - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yTit, 0, 0); ctx.restore();
  }

  function dibujarFitness() {
    const { ctx, w, h } = preparar($("c-fit"));
    if (!resultado) return;
    const m = { l: 56, r: 12, t: 10, b: 32 };
    const H = resultado.historial;
    const xs = { min: 0, max: H.length - 1, dec: 0 };
    const ys = { min: rango.fMin, max: rango.fMax, dec: 1 };
    ejes(ctx, w, h, m, xs, ys, "Generación", "Fitness");
    const X = (i) => m.l + ((w - m.l - m.r) * i) / Math.max(1, H.length - 1);
    const Y = (v) => h - m.b - ((h - m.t - m.b) * (v - ys.min)) / (ys.max - ys.min || 1);
    const serie = (clave, color, grosor, dash) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.setLineDash(dash || []);
      for (let i = 0; i <= gen; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(i), Y(H[i][clave]));
      ctx.stroke(); ctx.setLineDash([]);
    };
    serie("promedio", css("--muted"), 1.5, [5, 4]);
    serie("mejor", css("--red-l"), 2.5);
    ctx.fillStyle = css("--text");
    ctx.beginPath(); ctx.arc(X(gen), Y(H[gen].mejor), 4.5, 0, Math.PI * 2); ctx.fill();
  }

  function dibujarPoblacion() {
    const { ctx, w, h } = preparar($("c-pop"));
    if (!resultado) return;
    const m = { l: 48, r: 12, t: 10, b: 32 };
    const xs = { min: rango.sMin, max: rango.sMax, dec: 1 };
    const ys = { min: rango.rMin, max: rango.rMax, dec: 1 };
    ejes(ctx, w, h, m, xs, ys, "Riesgo", "Rendimiento");
    const X = (s) => m.l + ((w - m.l - m.r) * (s - xs.min)) / (xs.max - xs.min || 1);
    const Y = (r) => h - m.b - ((h - m.t - m.b) * (r - ys.min)) / (ys.max - ys.min || 1);
    const puntos = (lista, color, radio) => {
      ctx.fillStyle = color;
      for (const p of lista) { ctx.beginPath(); ctx.arc(X(p.s), Y(p.r), radio, 0, Math.PI * 2); ctx.fill(); }
    };
    if (gen > 0) puntos(resultado.historial[0].puntos, "rgba(120,160,160,.35)", 3);
    puntos(resultado.historial[gen].puntos, css("--red-l"), 4);
  }

  // ---------- Estado de la reproducción ----------
  function calcularRango(H) {
    const todos = H.flatMap((g) => g.puntos);
    const pad = (a, b) => (b - a) * 0.06 || 1;
    const f = H.flatMap((g) => [g.mejor, g.promedio]);
    const r = todos.map((p) => p.r), s = todos.map((p) => p.s);
    const [fMin, fMax] = [Math.min(...f), Math.max(...f)];
    const [rMin, rMax] = [Math.min(...r), Math.max(...r)];
    const [sMin, sMax] = [Math.max(0, Math.min(...s)), Math.max(...s)];
    return { fMin: fMin - pad(fMin, fMax), fMax: fMax + pad(fMin, fMax), rMin: rMin - pad(rMin, rMax), rMax: rMax + pad(rMin, rMax), sMin: Math.max(0, sMin - pad(sMin, sMax)), sMax: sMax + pad(sMin, sMax) };
  }

  function render() {
    if (!resultado) return;
    const g = resultado.historial[gen];
    const ind = g.mejorInd;
    $("k-fitness").textContent = g.mejor.toFixed(4);
    $("k-rend").textContent = GA.rendimiento(ind).toFixed(2);
    $("k-riesgo").textContent = GA.riesgo(ind).toFixed(2);
    $("k-gen").textContent = `${gen} / ${resultado.historial.length - 1}`;
    slider.value = gen;
    pintarPesos(ind);
    dibujarFitness();
    dibujarPoblacion();
  }

  function pausar() {
    clearInterval(timer); timer = null;
    btnPlay.textContent = "▶"; btnPlay.setAttribute("aria-label", "Reproducir");
  }

  function reproducir() {
    if (!resultado) return;
    if (gen >= resultado.historial.length - 1) gen = 0;
    btnPlay.textContent = "⏸"; btnPlay.setAttribute("aria-label", "Pausar");
    timer = setInterval(() => {
      if (gen >= resultado.historial.length - 1) return pausar();
      gen++; render();
    }, Number($("vel").value));
  }

  // ---------- Eventos ----------
  campos.forEach((id) => {
    $(id).addEventListener("input", () => {
      const v = Number($(id).value);
      out[id].textContent = id === "mutacion" ? v.toFixed(2) : v;
      if (id === "poblacion") $("elitismo").max = Math.min(20, v - 1);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    elError.hidden = true;
    pausar();
    const semilla = $("semilla").value.trim();
    try {
      resultado = GA.ejecutar({
        poblacion: Number($("poblacion").value),
        generaciones: Number($("generaciones").value),
        mutacion: Number($("mutacion").value),
        elitismo: Number($("elitismo").value),
        semilla: semilla === "" ? undefined : Number(semilla),
      });
    } catch (err) {
      elError.textContent = err.message; elError.hidden = false; return;
    }
    rango = calcularRango(resultado.historial);
    slider.max = resultado.historial.length - 1;
    slider.disabled = false; btnPlay.disabled = false;
    gen = reducir ? resultado.historial.length - 1 : 0;
    render();
    if (!reducir) reproducir();
  });

  btnPlay.addEventListener("click", () => (timer ? pausar() : reproducir()));
  slider.addEventListener("input", () => { pausar(); gen = Number(slider.value); render(); });
  $("vel").addEventListener("change", () => { if (timer) { pausar(); reproducir(); } });

  let pendiente = null;
  new ResizeObserver(() => {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => { dibujarFitness(); dibujarPoblacion(); });
  }).observe(document.querySelector("main"));

  // Primera corrida automática para que la página nunca se vea vacía
  form.requestSubmit();
})();
