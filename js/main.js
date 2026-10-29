/* =========================================================
   SHERIFF TORNILLO · Portal oficial · main.js
   ========================================================= */

/* ⚙️ CONFIGURACIÓN DEL JUEGO */
const CONFIG = {
  // Enlace público del juego en Unity Play
  urlUnity: "https://play.unity.com/en/games/3797a0b4-e17b-46d5-ab0b-ebe0cbc3c7af/sheriff-tornillo",
  // Opcional: el "src" del código de inserción (Unity Play > Share > Embed).
  // Si lo dejas vacío, el botón abre el juego en una pestaña nueva.
  urlEmbed: ""
};

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

/* ---------- Precarga ---------- */
addEventListener("load", () => setTimeout(() => $("#precarga").classList.add("oculto"), 350));
setTimeout(() => $("#precarga").classList.add("oculto"), 3500); // por si alguna librería tarda

/* ---------- Librerías (si cargan) ---------- */
if (window.AOS) AOS.init({ duration: 800, once: true, offset: 60, disable: reducido });
if (window.bootstrap) {
  $$('[title]').forEach(el => new bootstrap.Tooltip(el));
}
if (window.VanillaTilt && !reducido && matchMedia("(pointer:fine)").matches) {
  VanillaTilt.init($$("[data-tilt]"));
}

/* ---------- Enlaces del juego ---------- */
(() => {
  const jugar = $("#btnJugar"), directo = $("#linkDirecto"), play = $("#btnPlay");
  jugar.href = directo.href = CONFIG.urlUnity;
  const cargar = (e) => {
    if (!CONFIG.urlEmbed) { if (e.currentTarget === play) window.open(CONFIG.urlUnity, "_blank", "noopener"); return; }
    e.preventDefault();
    const f = document.createElement("iframe");
    f.src = CONFIG.urlEmbed; f.title = "Sheriff Tornillo – juego";
    f.allow = "autoplay; fullscreen; gamepad"; f.allowFullscreen = true;
    $("#portada").replaceWith(f);
  };
  play.addEventListener("click", cargar);
  jugar.addEventListener("click", cargar);
})();

/* ---------- Scroll: navbar, barra de progreso, botón arriba, parallax ---------- */
(() => {
  const nav = $("#nav"), barra = $("#progreso"), arriba = $("#arriba"), sol = $("#sol");
  const alScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle("solida", y > 40);
    barra.style.width = (max > 0 ? y / max * 100 : 0) + "%";
    arriba.classList.toggle("ver", y > innerHeight * .8);
    if (sol && !reducido && y < innerHeight) sol.style.transform = `translateY(${y * .35}px)`;
  };
  addEventListener("scroll", alScroll, { passive: true }); alScroll();
})();

/* ---------- Menú: marcar la sección visible ---------- */
(() => {
  const enlaces = $$('.navbar .nav-link[href^="#"], .offcanvas .nav-link[href^="#"]');
  const obs = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    enlaces.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main > header[id], main > section[id]").forEach(s => obs.observe(s));
})();

/* ---------- Máquina de escribir ---------- */
(() => {
  const el = $("#maquina");
  if (!el || reducido) return;
  const frases = [
    "El oro no se recupera solo, compañero.",
    "Salta los cactus. Deslízate bajo los buitres.",
    "1000 puntos. 3 sombreros. Un solo sheriff.",
    "Corre hasta que el cielo se ponga rojo."
  ];
  let i = 0, j = frases[0].length, borrando = true;
  const paso = () => {
    const f = frases[i];
    if (borrando) { j--; if (j <= 0) { borrando = false; i = (i + 1) % frases.length; } }
    else { j++; if (j >= frases[i].length) { borrando = true; el.textContent = frases[i]; return setTimeout(paso, 2600); } }
    el.textContent = frases[i].slice(0, Math.max(0, j)) || " ";
    setTimeout(paso, borrando ? 28 : 55);
  };
  setTimeout(paso, 3200);
})();

/* ---------- Polvo del desierto (hero) ---------- */
(() => {
  const cv = $("#polvo"); if (!cv || reducido) return;
  const ctx = cv.getContext("2d");
  let W, H, motas = [], activo = true;
  const ajustar = () => {
    const d = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    motas = Array.from({ length: Math.round(W / 22) }, () => ({ x: Math.random() * W, y: H * .45 + Math.random() * H * .55, r: Math.random() * 2.2 + .5, v: Math.random() * 40 + 20, o: Math.random() * 6, a: Math.random() * .5 + .2 }));
  };
  addEventListener("resize", ajustar); ajustar();
  new IntersectionObserver(e => activo = e[0].isIntersecting).observe(cv);
  let prev = performance.now();
  const bucle = (t) => {
    const dt = Math.min(.05, (t - prev) / 1000); prev = t;
    if (activo) {
      ctx.clearRect(0, 0, W, H);
      motas.forEach(m => {
        m.x -= m.v * dt; m.y += Math.sin(t / 900 + m.o) * 8 * dt;
        if (m.x < -5) { m.x = W + 5; m.y = H * .45 + Math.random() * H * .55; }
        ctx.globalAlpha = m.a; ctx.fillStyle = "#ffe2b0";
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
})();

/* ---------- Contadores ---------- */
const contar = (el) => {
  if (el.dataset.hecho) return; el.dataset.hecho = 1;
  const fin = +el.dataset.cuenta;
  if (reducido) { el.textContent = fin; return; }
  const t0 = performance.now();
  const paso = (t) => { const p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(fin * e); if (p < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
};
const obsContar = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { contar(en.target); obsContar.unobserve(en.target); } }), { threshold: .5 });
$$(".kpi [data-cuenta]").forEach(el => obsContar.observe(el));

/* ---------- Barras de habilidad ---------- */
const llenarBarras = (c = document) => $$(".progress-bar[data-valor]", c).forEach(b => { if (b.offsetParent) b.style.width = b.dataset.valor + "%"; });
const obsBarras = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { llenarBarras(); obsBarras.disconnect(); } }), { threshold: .3 });
obsBarras.observe($("#tabHab"));
$$('[data-bs-toggle="pill"]').forEach(b => b.addEventListener("shown.bs.tab", () => llenarBarras()));

/* ---------- Carteles: voltear con toque ---------- */
$$(".cartel").forEach(c => {
  c.addEventListener("click", () => c.classList.toggle("volteado"));
  c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.classList.toggle("volteado"); } });
});

/* ---------- Teclado que se ilumina ---------- */
(() => {
  const teclas = $$("#teclado .tecla[data-k]");
  const marcar = (key, on) => teclas.forEach(t => { if (t.dataset.k.toLowerCase() === key.toLowerCase()) t.classList.toggle("pulsada", on); });
  addEventListener("keydown", e => marcar(e.key, true));
  addEventListener("keyup", e => marcar(e.key, false));
  addEventListener("blur", () => teclas.forEach(t => t.classList.remove("pulsada")));
})();

/* ---------- Gráficas (Chart.js) ---------- */
(() => {
  if (!window.Chart) return;
  Chart.defaults.font.family = "Sniglet, system-ui, sans-serif";
  Chart.defaults.color = "#cdb6a4";

  // Puntos por estrella
  const cvE = $("#grafEstrellas");
  let grafE;
  const crearE = () => {
    grafE = new Chart(cvE, {
      type: "bar",
      data: {
        labels: ["★ 1 estrella", "★★ 2 estrellas", "★★★ 3 estrellas · META"],
        datasets: [{
          label: "Puntos necesarios",
          data: [300, 600, 1000],
          backgroundColor: ["#f6b26b", "#e0457b", "#f9c33b"],
          borderColor: "#1b0e1c", borderWidth: 2, borderRadius: 10, maxBarThickness: 90
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: reducido ? 0 : 1400, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#8e1a4a", titleColor: "#ffe08a", padding: 12, cornerRadius: 10,
            callbacks: { afterLabel: (c) => `≈ ${Math.round(c.raw / 10)} s solo corriendo · o ${c.raw / 50} monedas` }
          }
        },
        scales: {
          y: { beginAtZero: true, max: 1100, grid: { color: "rgba(251,238,221,.07)" }, ticks: { stepSize: 250 } },
          x: { grid: { display: false } }
        }
      }
    });
  };
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { crearE(); o.disconnect(); } }, { threshold: .3 }).observe(cvE);

  // Velocímetro
  const cvV = $("#grafVelocidad"), slider = $("#sliderVel"), lec = $("#lecturaVel"), kmh = $("#lecturaKmh");
  const MAX = 24;
  const graf = new Chart(cvV, {
    type: "doughnut",
    data: { datasets: [{ data: [10, MAX - 10], backgroundColor: ["#f9c33b", "rgba(251,238,221,.08)"], borderWidth: 0, borderRadius: 8 }] },
    options: { rotation: -90, circumference: 180, cutout: "78%", responsive: true, maintainAspectRatio: true, aspectRatio: 1.6, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 500 } }
  });
  const pintar = (v) => {
    graf.data.datasets[0].data = [v, MAX - v];
    graf.data.datasets[0].backgroundColor[0] = v < 15 ? "#f6b26b" : v < 20 ? "#f08a5d" : "#e0457b";
    graf.update();
    lec.textContent = v; kmh.textContent = Math.round(v * 3.6);
  };
  slider.addEventListener("input", () => pintar(+slider.value));
  // Animación automática al aparecer
  new IntersectionObserver((e, o) => {
    if (!e[0].isIntersecting) return; o.disconnect();
    if (reducido) { slider.value = 24; return pintar(24); }
    let v = 10; const id = setInterval(() => { v++; slider.value = v; pintar(v); if (v >= MAX) clearInterval(id); }, 110);
  }, { threshold: .5 }).observe(cvV);
})();

/* ---------- Calculadora del sheriff ---------- */
(() => {
  const sM = $("#sliderMonedas"), sT = $("#sliderTiempo");
  const fmt = (s) => { s = Math.ceil(s); const m = Math.floor(s / 60), r = s % 60; return m ? `${m} min${r ? " " + r + " s" : ""}` : `${r} s`; };
  const calcular = () => {
    const monedas = +sM.value, t = +sT.value;
    const porSeg = 10 + 50 * monedas / 60;                // 10 pts/s + 50 por moneda
    const pts = Math.round(porSeg * t);
    $("#valMonedas").textContent = monedas;
    $("#valTiempo").textContent = t;
    $("#resMeta").textContent = fmt(1000 / porSeg);
    $("#resPuntos").textContent = pts.toLocaleString("es") + " pts";
    const est = pts >= 1000 ? 3 : pts >= 600 ? 2 : pts >= 300 ? 1 : 0;
    $$("#resEstrellas i").forEach((i, k) => i.classList.toggle("on", k < est));
  };
  sM.addEventListener("input", calcular); sT.addEventListener("input", calcular); calcular();
})();

/* ---------- Revisión del navegador ---------- */
(() => {
  const cont = $("#checks"); if (!cont) return;
  const items = [];
  let webgl2 = false;
  try { webgl2 = !!document.createElement("canvas").getContext("webgl2"); } catch (e) {}
  items.push(webgl2 ? ["ok", "WebGL 2.0 compatible", "Tu navegador puede ejecutar el juego."] : ["mal", "WebGL 2.0 no disponible", "Actualiza el navegador o activa la aceleración por hardware."]);

  const ua = navigator.userAgent;
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Otro";
  items.push(["Chrome Edge Firefox Opera".includes(nav) ? "ok" : "aviso", `Navegador: ${nav}`, nav === "Safari" ? "Funciona, pero Chrome o Edge van mejor." : "Navegador recomendado."]);

  const pc = matchMedia("(pointer:fine)").matches && innerWidth >= 900;
  items.push(pc ? ["ok", "Computadora con teclado", "Listo para los controles del juego."] : ["aviso", "Pantalla táctil detectada", "El juego necesita teclado: ábrelo en una computadora."]);

  const mem = navigator.deviceMemory;
  if (mem) items.push(mem >= 4 ? ["ok", `Memoria: ${mem} GB o más`, "Suficiente para WebGL."] : ["aviso", `Memoria: ${mem} GB`, "Cierra otras pestañas antes de jugar."]);

  cont.innerHTML = items.map(([e, t, d]) => `<div class="check"><span class="estado ${e}"><i class="bi ${e === "ok" ? "bi-check-lg" : e === "mal" ? "bi-x-lg" : "bi-exclamation-lg"}"></i></span><div><b>${t}</b><small>${d}</small></div></div>`).join("");
})();

/* =========================================================
   🎮 Mini demo "Calienta motores"
   ========================================================= */
(() => {
  const cv = $("#mini"), ctx = cv.getContext("2d"), demo = $("#demo"), recEl = $("#record");
  let W = 0, H = 0;
  let record = +(leer("st_record") || 0); recEl.textContent = record;

  let estado = "inicio", visible = false, j, obs, mon, vel, puntos, vidas, tiempo, invencible, sigObs, part, celebrado;
  const reiniciar = () => {
    j = { x: 74, y: 0, vy: 0, desliza: 0 }; obs = []; mon = []; part = [];
    vel = 260; puntos = 0; vidas = 3; tiempo = 0; invencible = 0; sigObs = 1.2; celebrado = false;
  };
  const ajustar = () => {
    const d = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  reiniciar();
  addEventListener("resize", () => { ajustar(); dibujar(0); }); ajustar();
  const suelo = () => H - 38;
  const altoRobot = () => j.desliza > 0 ? 26 : 52;

  const empezar = () => { if (estado !== "jugando") { reiniciar(); estado = "jugando"; return true; } return false; };
  const saltar = () => { if (empezar()) return; if (j.y === 0) { j.vy = 620; j.desliza = 0; polvo(); } };
  const deslizar = () => { if (estado !== "jugando") return; if (j.y > 0) j.vy = -900; j.desliza = .6; };
  function polvo() { for (let i = 0; i < 6; i++) part.push({ x: j.x, y: suelo(), vx: -60 - Math.random() * 80, vy: 20 + Math.random() * 50, v: .5, c: "#f1cf9d" }); }
  function chispas(x, y, c, n = 12) { for (let i = 0; i < n; i++) part.push({ x, y, vx: (Math.random() - .5) * 300, vy: Math.random() * 260, v: .6, c }); }

  new IntersectionObserver(e => visible = e[0].isIntersecting, { threshold: .4 }).observe(demo);
  addEventListener("keydown", e => {
    if (!visible) return;
    if (["ArrowUp", " ", "w", "W"].includes(e.key)) { e.preventDefault(); if (!e.repeat) saltar(); }
    if (["ArrowDown", "s", "S"].includes(e.key)) { e.preventDefault(); deslizar(); }
  });
  cv.addEventListener("pointerdown", e => {
    const r = cv.getBoundingClientRect();
    (estado !== "jugando" || e.clientY - r.top < r.height / 2) ? saltar() : deslizar();
  });
  $("#bSalta").addEventListener("pointerdown", e => { e.preventDefault(); saltar(); });
  $("#bDesliza").addEventListener("pointerdown", e => { e.preventDefault(); deslizar(); });

  const choca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function finPartida(gano) {
    estado = gano ? "gana" : "fin";
    const p = Math.floor(puntos);
    if (p > record) { record = p; guardar("st_record", p); recEl.textContent = p; }
    if (gano && !celebrado) {
      celebrado = true;
      if (window.confetti && !reducido) {
        const r = cv.getBoundingClientRect();
        confetti({ particleCount: 140, spread: 80, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }, colors: ["#f9c33b", "#e0457b", "#8e1a4a", "#fff2d6"] });
      }
      if (window.bootstrap) { $("#avisoTexto").textContent = `Recuperaste el oro con ${p} puntos. ¡Ahora prueba el juego completo!`; bootstrap.Toast.getOrCreateInstance($("#aviso")).show(); }
    }
  }

  function actualizar(dt) {
    part.forEach(p => { p.x += p.vx * dt; p.y -= p.vy * dt; p.vy -= 500 * dt; p.v -= dt; }); part = part.filter(p => p.v > 0);
    if (estado !== "jugando") return;
    tiempo += dt; puntos += 10 * dt;
    vel = Math.min(560, 260 + tiempo * 9);
    j.vy -= 1800 * dt; j.y = Math.max(0, j.y + j.vy * dt); if (j.y === 0 && j.vy < 0) j.vy = 0;
    if (j.desliza > 0) j.desliza -= dt;
    if (invencible > 0) invencible -= dt;
    sigObs -= dt;
    if (sigObs <= 0) {
      const alto = Math.random() < .4 && tiempo > 3, x = W + 20;
      if (alto) { obs.push({ x, w: 34, h: 26, alto: true, tipo: Math.random() < .5 ? "buitre" : "cartel" }); for (let i = 0; i < 3; i++) mon.push({ x: x - 10 + i * 24, alt: 12 }); }
      else { obs.push({ x, w: 22, h: 36, alto: false, tipo: Math.random() < .6 ? "cactus" : "tnt" }); [[-30, 70], [11, 100], [52, 70]].forEach(([dx, a]) => mon.push({ x: x + dx, alt: a })); }
      sigObs = .9 + Math.random() * 1.1 - Math.min(.4, tiempo / 80);
    }
    const caja = { x: j.x - 12, y: suelo() - j.y - altoRobot(), w: 24, h: altoRobot() };
    obs.forEach(o => {
      o.x -= (vel + (o.tipo === "buitre" ? 60 : 0)) * dt;
      const oy = o.alto ? suelo() - 34 - o.h : suelo() - o.h;
      if (!o.golpe && invencible <= 0 && choca(caja, { x: o.x, y: oy, w: o.w, h: o.h })) {
        o.golpe = true; vidas--; invencible = 1.5; chispas(j.x, suelo() - j.y - 30, "#ffb347");
        if (vidas <= 0) finPartida(false);
      }
    });
    mon.forEach(m => {
      m.x -= vel * dt;
      if (!m.tomada && choca(caja, { x: m.x - 8, y: suelo() - m.alt - 8, w: 16, h: 16 })) { m.tomada = true; puntos += 50; chispas(m.x, suelo() - m.alt, "#f9c33b"); }
    });
    obs = obs.filter(o => o.x > -60); mon = mon.filter(m => m.x > -20 && !m.tomada);
    if (puntos >= 1000 && estado === "jugando") finPartida(true);
  }

  let fondoX = 0;
  function dibujar(dt) {
    const p = Math.min(1, puntos / 1000);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p < .5 ? "#4a2a4a" : "#2a0f2a"); g.addColorStop(.6, p < .5 ? "#e08a5d" : "#b8445a"); g.addColorStop(1, "#ffd9a0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,226,150,.85)"; ctx.beginPath(); ctx.arc(W * .78, suelo() - 40 + p * 50, 42, 0, 7); ctx.fill();
    if (estado === "jugando") fondoX = (fondoX + vel * .15 * dt) % 400;
    for (let k = -1; k < W / 400 + 2; k++) {
      const bx = k * 400 - fondoX;
      ctx.fillStyle = "#e39b62"; ctx.fillRect(bx + 40, suelo() - 70, 110, 70);
      ctx.fillStyle = "#c97a4a"; ctx.fillRect(bx + 40, suelo() - 52, 110, 14);
      ctx.fillStyle = "#d98c56"; ctx.fillRect(bx + 230, suelo() - 40, 80, 40);
    }
    ctx.fillStyle = "#f7e2a8"; ctx.fillRect(0, suelo(), W, H - suelo());
    ctx.fillStyle = "#e8a874"; ctx.fillRect(0, suelo() + 12, W, 8);
    const t = performance.now() / 1000;
    mon.forEach(m => {
      const sx = Math.abs(Math.cos(t * 5 + m.x * .05));
      ctx.fillStyle = "#f9c33b"; ctx.strokeStyle = "#a87a14"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(m.x, suelo() - m.alt, 8 * Math.max(.2, sx), 8, 0, 0, 7); ctx.fill(); ctx.stroke();
    });
    obs.forEach(o => {
      if (o.alto) {
        const y = suelo() - 34 - o.h;
        if (o.tipo === "cartel") {
          ctx.fillStyle = "#6b4226"; ctx.fillRect(o.x + 3, y - 4, 4, 70); ctx.fillRect(o.x + o.w - 7, y - 4, 4, 70);
          ctx.fillStyle = "#f7ead0"; ctx.fillRect(o.x - 4, y, o.w + 8, o.h);
          ctx.fillStyle = "#8e1a4a"; ctx.font = "9px Rye, serif"; ctx.textAlign = "center"; ctx.fillText("SE BUSCA", o.x + o.w / 2, y + 16);
        } else {
          const a = Math.sin(t * 14) * 8;
          ctx.strokeStyle = "#3a2a36"; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(o.x - 4, y + 10 - a); ctx.quadraticCurveTo(o.x + 8, y + 2, o.x + 17, y + 14); ctx.quadraticCurveTo(o.x + 26, y + 2, o.x + 38, y + 10 - a); ctx.stroke();
          ctx.fillStyle = "#3a2a36"; ctx.beginPath(); ctx.ellipse(o.x + 17, y + 16, 8, 6, 0, 0, 7); ctx.fill();
        }
      } else {
        const y = suelo() - o.h;
        if (o.tipo === "cactus") {
          ctx.fillStyle = "#4c8a52"; ctx.strokeStyle = "#244a29"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(o.x + 6, y, 10, o.h, 5); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.roundRect(o.x - 2, y + 10, 6, 14, 3); ctx.roundRect(o.x + 18, y + 6, 6, 14, 3); ctx.fill(); ctx.stroke();
        } else {
          ctx.fillStyle = "#b03a2e"; ctx.strokeStyle = "#4a1019"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(o.x - 2, y + 6, o.w + 4, o.h - 6, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#ffe08a"; ctx.font = "9px Rye, serif"; ctx.textAlign = "center"; ctx.fillText("TNT", o.x + o.w / 2, y + 26);
        }
      }
    });
    if (!(invencible > 0 && Math.floor(t * 14) % 2 === 0)) robot(j.x, suelo() - j.y, j.desliza > 0, t);
    part.forEach(q => { ctx.globalAlpha = Math.max(0, q.v * 1.6); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 4, 4); });
    ctx.globalAlpha = 1;
    // HUD
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "16px Rye, serif";
    ctx.fillText(Math.floor(puntos) + " / 1000", 14, 26);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(14, 34, 120, 6);
    ctx.fillStyle = "#f9c33b"; ctx.fillRect(14, 34, 120 * p, 6);
    ctx.textAlign = "right"; ctx.fillStyle = "#e0457b"; ctx.font = "18px sans-serif";
    ctx.fillText("♥".repeat(Math.max(0, vidas)), W - 14, 28);
    if (estado !== "jugando") {
      ctx.fillStyle = "rgba(27,14,28,.62)"; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center"; ctx.fillStyle = "#f9c33b"; ctx.font = (W < 500 ? 21 : 30) + "px Rye, serif";
      ctx.fillText(estado === "inicio" ? "¡Atrapa a los Hermanos Óxido!" : estado === "gana" ? "¡Recuperaste el oro! ★★★" : "Se te cayó el sombrero…", W / 2, H / 2 - 8);
      ctx.fillStyle = "#fbeedd"; ctx.font = "15px Sniglet, sans-serif";
      ctx.fillText(estado === "inicio" ? (W < 500 ? "Toca para empezar" : "Pulsa ↑ / Espacio o toca para empezar") : `Puntos: ${Math.floor(puntos)} · ${W < 500 ? "toca" : "pulsa ↑ o toca"} para reintentar`, W / 2, H / 2 + 22);
    }
  }

  // Robot como el del juego: cuerpo cilíndrico, sombrero y poncho guindo
  function robot(x, base, agachado, t) {
    ctx.save(); ctx.translate(x, base);
    const bob = j.y === 0 && estado === "jugando" ? Math.abs(Math.sin(t * 16)) * 3 : 0;
    ctx.translate(0, -bob);
    if (agachado) ctx.scale(1.2, .52);
    const pa = estado === "jugando" ? Math.sin(t * 16) * 6 : 0;
    ctx.strokeStyle = "#5d7e8c"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-3 + pa, -3); ctx.moveTo(3, -16); ctx.lineTo(3 - pa, -3); ctx.stroke();
    ctx.fillStyle = "#b9d3d8"; ctx.beginPath(); ctx.ellipse(-3 + pa, -2, 6, 2.5, 0, 0, 7); ctx.ellipse(3 - pa, -2, 6, 2.5, 0, 0, 7); ctx.fill();
    // cuerpo cilíndrico
    const gr = ctx.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, "#5f8592"); gr.addColorStop(.5, "#a9c6cf"); gr.addColorStop(1, "#4f707c");
    ctx.fillStyle = gr; ctx.strokeStyle = "#3e5a64"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-9, -54, 18, 40, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1b0e1c"; ctx.beginPath(); ctx.ellipse(6, -45, 3.5, 4.5, 0, 0, 7); ctx.fill();
    // poncho
    ctx.fillStyle = "#e0457b"; ctx.strokeStyle = "#8e1a4a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-11, -38); ctx.lineTo(11, -38); ctx.lineTo(15, -24); ctx.lineTo(-15, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-14, -27); ctx.lineTo(14, -27); ctx.stroke();
    // sombrero
    ctx.fillStyle = "#e0457b"; ctx.strokeStyle = "#8e1a4a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -55, 16, 3.5, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-8, -66, 16, 11, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillRect(-8, -58, 16, 2);
    ctx.restore();
  }

  let ultimo = performance.now();
  function bucle(ahora) {
    const dt = Math.min(.033, (ahora - ultimo) / 1000); ultimo = ahora;
    if (visible) { actualizar(dt); dibujar(dt); }
    requestAnimationFrame(bucle);
  }
  dibujar(0); requestAnimationFrame(bucle);
})();
