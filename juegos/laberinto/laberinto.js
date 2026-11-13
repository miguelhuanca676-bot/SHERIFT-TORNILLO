// =====================================================================
//  SHERIFF TORNILLO · EL LABERINTO DEL ORO  (versión web, Three.js)
//  Misma especificación que el proyecto de Unity (GED Unidad 3):
//   · laberinto 11 x 9, celdas de 2 x 2, entrada F9, salida F1, jugador en F8
//   · 36 puntos de 10 c/u · puerta cerrada hasta recogerlos todos
//   · 2 enemigos: ruta fija de 4 puntos (2,5 u/s), PATHFINDING por los pasillos,
//     RAYCASTING hacia el jugador (lo ve a 8 u o menos si nada se interpone),
//     PERSECUCIÓN a 3,5 u/s · al tocar al jugador la partida termina
//   · estados del personaje: Quieto, Correr, Morir · tecla R reinicia
// =====================================================================
import { THREE, cargarRobot, instanciarRobot, Sonido, texturas, textoSprite, textoPiso,
         crearCactus, crearBarril, crearRoca, coloresBandido, avisarPortal } from '../comun.js';
import { RoomEnvironment } from '../lib/environments/RoomEnvironment.js';

// ------------------------------------------------------------------ AJUSTES (mismos valores que en Unity)
const AJUSTES = {
  velocidadJugador: 3,
  velocidadPatrulla: 2.5,
  velocidadPersecucion: 3.5,
  distanciaVision: 8,
  puntosPorMoneda: 10,
  alturaOjos: 1.0,
  duracionIntro: 2,
  textoDerrota: 'Juego terminado',
  textoVictoria: 'Victoria',
};

const PLANO = [
  '#####S#####', // 1
  '#.........#', // 2
  '#.##.#.##.#', // 3
  '#....#....#', // 4
  '#.##...##.#', // 5
  '#....#....#', // 6
  '#.##.#.##.#', // 7
  '#.........#', // 8
  '#####E#####', // 9
];
const COLS = 11, FILAS = 9, CELDA = 2, ALTO_PARED = 1.6;
const ENEMIGOS = [
  { nombre: 'Bandido Rojo (E1)', inicio: 'E5', ruta: ['E6', 'B6', 'B2', 'E2'], acento: 0xe8332a, poncho: 0x5a1210, css: '#e8332a' },
  { nombre: 'Bandido Morado (E2)', inicio: 'G5', ruta: ['G6', 'J6', 'J2', 'G2'], acento: 0x9d5cff, poncho: 0x34175a, css: '#9d5cff' },
];
const CELDA_JUGADOR = 'F8', CELDA_SALIDA = 'F1';

// ------------------------------------------------------------------ utilidades de celdas
const tipo = (c, f) => (f < 0 || f >= FILAS || c < 0 || c >= COLS) ? '#' : PLANO[f][c];
const aMundo = (c, f) => new THREE.Vector3((c - (COLS - 1) / 2) * CELDA, 0, (f - (FILAS - 1) / 2) * CELDA);
const leer = n => [n.charCodeAt(0) - 65, parseInt(n.slice(1), 10) - 1];
const celdaMundo = n => { const [c, f] = leer(n); return aMundo(c, f); };
const aCelda = p => [Math.round(p.x / CELDA + (COLS - 1) / 2), Math.round(p.z / CELDA + (FILAS - 1) / 2)];
const nombre = (c, f) => String.fromCharCode(65 + c) + (f + 1);

// ------------------------------------------------------------------ DOM
const $ = id => document.getElementById(id);
const lienzo = $('lienzo');
const ui = {
  puntaje: $('puntaje'), restantes: $('restantes'), total: $('total'), barra: $('barra'), puerta: $('puerta'),
  intro: $('intro'), final: $('final'), finTitulo: $('finTitulo'), finPuntaje: $('finPuntaje'), finStats: $('finStats'),
  carga: $('carga'), cargaTxt: $('cargaTxt'), info: $('info'), vineta: $('vineta'), ayuda: $('ayuda'),
};

// ------------------------------------------------------------------ escena
const LENTO = new URLSearchParams(location.search).has('lento');   // ?lento = calidad baja para equipos sin tarjeta gráfica
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !LENTO, powerPreference: 'high-performance' });
renderer.setPixelRatio(LENTO ? 0.6 : Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = !LENTO;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();
escena.background = new THREE.Color(0xe9a36d);
escena.fog = new THREE.Fog(0xe9a36d, 40, 90);
const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.55;

const camara = new THREE.PerspectiveCamera(40, 1, 0.3, 300);
escena.add(new THREE.HemisphereLight(0xffd9b0, 0x6a3a26, 0.55));
const sol = new THREE.DirectionalLight(0xffc890, 2.2);
sol.position.set(-9, 18, 10);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 13, bottom: -13, near: 1, far: 50 });
sol.shadow.bias = -0.0005;
escena.add(sol);

// ------------------------------------------------------------------ laberinto
const muros = []; // objetos que bloquean el rayo
function construirLaberinto() {
  const ancho = COLS * CELDA, largo = FILAS * CELDA;
  // desierto y piso
  const desierto = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: texturas.arena(60), roughness: 1, color: 0xc99a6a }));
  desierto.rotation.x = -Math.PI / 2; desierto.position.y = -0.02; desierto.receiveShadow = true; escena.add(desierto);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo), new THREE.MeshStandardMaterial({ map: texturas.arena(5), roughness: 0.95, color: 0xe0b98a }));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; escena.add(piso);

  // paredes (instanciadas)
  const celdasPared = [];
  for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) if (tipo(c, f) === '#') celdasPared.push([c, f]);
  const matAdobe = new THREE.MeshStandardMaterial({ map: texturas.adobe(), roughness: 0.9, color: 0xd8b59a });
  const paredes = new THREE.InstancedMesh(new THREE.BoxGeometry(CELDA, ALTO_PARED, CELDA), matAdobe, celdasPared.length);
  const remates = new THREE.InstancedMesh(new THREE.BoxGeometry(CELDA * 1.04, 0.12, CELDA * 1.04), new THREE.MeshStandardMaterial({ color: 0x9c5a3c, roughness: 0.8 }), celdasPared.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  celdasPared.forEach(([c, f], i) => {
    const p = aMundo(c, f);
    m.makeTranslation(p.x, ALTO_PARED / 2, p.z); paredes.setMatrixAt(i, m);
    const k = 0.9 + ((c * 7 + f * 13) % 5) * 0.04; paredes.setColorAt(i, col.setRGB(k, k * 0.97, k * 0.95));
    m.makeTranslation(p.x, ALTO_PARED + 0.06, p.z); remates.setMatrixAt(i, m);
  });
  paredes.castShadow = paredes.receiveShadow = true; remates.castShadow = true;
  escena.add(paredes, remates);
  muros.push(paredes);

  // adornos sobre algunas paredes interiores
  let semilla = 11; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  celdasPared.forEach(([c, f]) => {
    const borde = c === 0 || f === 0 || c === COLS - 1 || f === FILAS - 1;
    const r = rnd(); if (r < (borde ? 0.82 : 0.5)) return;
    const p = aMundo(c, f); let o;
    if (r < 0.7) o = crearBarril(rnd() < 0.5, 0.55); else if (r < 0.85) o = crearCactus(0.4); else o = crearRoca(0.45, rnd);
    o.position.add(new THREE.Vector3(p.x + (rnd() - 0.5) * 0.8, ALTO_PARED + 0.12, p.z + (rnd() - 0.5) * 0.8));
    escena.add(o);
  });

  // decoración alrededor
  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 10; i++) {
      const z = -largo / 2 + 1 + i * (largo - 2) / 9 + (rnd() - 0.5);
      const x = lado * (ancho / 2 + 1.6 + rnd() * 6);
      const r = rnd(); let o;
      if (r < 0.4) o = crearCactus(0.9 + rnd() * 0.5); else if (r < 0.65) o = crearRoca(0.9 + rnd(), rnd); else o = crearBarril(rnd() < 0.5, 1);
      o.position.set(x, o.position.y, z); escena.add(o);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = -ancho / 2 - 3 + i * (ancho + 6) / 13; if (Math.abs(x) < 2.4) continue;
    const c1 = crearCactus(0.8 + rnd() * 0.5); c1.position.set(x, 0, -largo / 2 - 1.8 - rnd() * 2); escena.add(c1);
    const r1 = crearRoca(0.7 + rnd(), rnd); r1.position.set(x + 0.7, r1.position.y, largo / 2 + 1.5 + rnd() * 1.5); escena.add(r1);
  }
  // coordenadas A-K y 1-9
  for (let c = 0; c < COLS; c++) {
    if (c === 5) continue;
    const p = aMundo(c, 0); const t1 = textoPiso(String.fromCharCode(65 + c)); t1.position.set(p.x, 0.02, -largo / 2 - 0.55); escena.add(t1);
    const t2 = textoPiso(String.fromCharCode(65 + c)); t2.position.set(p.x, 0.02, largo / 2 + 0.55); escena.add(t2);
  }
  for (let f = 0; f < FILAS; f++) {
    const p = aMundo(0, f);
    const t1 = textoPiso(String(f + 1)); t1.position.set(-ancho / 2 - 0.55, 0.02, p.z); escena.add(t1);
    const t2 = textoPiso(String(f + 1)); t2.position.set(ancho / 2 + 0.55, 0.02, p.z); escena.add(t2);
  }
}

// ------------------------------------------------------------------ puerta de salida (F1)
const puerta = { abierta: false, t: 0, hojaI: null, hojaD: null, bloqueo: null, luces: [], luz: null };
function construirPuerta() {
  const p = celdaMundo(CELDA_SALIDA), zb = p.z + CELDA / 2; // borde entre F2 y F1
  const g = new THREE.Group(); g.position.set(p.x, 0, zb); escena.add(g);
  const madera = new THREE.MeshStandardMaterial({ map: texturas.madera(), roughness: 0.8 });
  const oscura = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });
  const caja = (w, h, d, mat, x, y, z, padre = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); b.castShadow = true; padre.add(b); return b; };
  caja(0.18, 2.5, 0.24, oscura, -0.92, 1.25, 0); caja(0.18, 2.5, 0.24, oscura, 0.92, 1.25, 0);
  caja(2.3, 0.2, 0.3, oscura, 0, 2.5, 0);
  caja(1.9, 0.6, 0.08, madera, 0, 2.95, 0);
  const letrero = textoSprite('SALIDA', { color: '#ffe08a', tam: 64, escala: 0.55 }); letrero.position.set(0, 3.0, 0.1); g.add(letrero);
  const hoja = lado => {
    const piv = new THREE.Group(); piv.position.set(lado * -0.83, 0, 0); g.add(piv);
    for (let i = 0; i < 4; i++) caja(0.15, 1.2 - Math.abs(i - 1.5) * 0.08, 0.06, madera, lado * (0.12 + i * 0.2), 1.0, 0, piv);
    caja(0.75, 0.1, 0.05, oscura, lado * 0.42, 1.3, 0.04, piv); caja(0.75, 0.1, 0.05, oscura, lado * 0.42, 0.65, 0.04, piv);
    return piv;
  };
  puerta.hojaI = hoja(1); puerta.hojaD = hoja(-1);
  // bloqueo invisible que también detiene el rayo
  puerta.bloqueo = new THREE.Mesh(new THREE.BoxGeometry(CELDA, 2, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  puerta.bloqueo.position.y = 1; g.add(puerta.bloqueo); muros.push(puerta.bloqueo);
  const matLuz = new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff3020, emissiveIntensity: 3 });
  for (const x of [-0.92, 0.92]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), matLuz); s.position.set(x, 2.62, 0.15); g.add(s); }
  puerta.matLuz = matLuz;
  puerta.luz = new THREE.PointLight(0xff3020, 6, 6, 2); puerta.luz.position.set(0, 2.2, 0.9); g.add(puerta.luz);
  // entrada F9
  const e = celdaMundo('F9'), ze = e.z + CELDA / 2, ge = new THREE.Group(); ge.position.set(e.x, 0, ze); escena.add(ge);
  caja(0.16, 2.2, 0.16, oscura, -0.92, 1.1, 0, ge); caja(0.16, 2.2, 0.16, oscura, 0.92, 1.1, 0, ge); caja(2.2, 0.16, 0.2, oscura, 0, 2.2, 0, ge);
  const ent = textoSprite('ENTRADA', { color: '#cfe8ff', tam: 64, escala: 0.45 }); ent.position.set(0, 2.55, 0); ge.add(ent);
}
function abrirPuerta() {
  if (puerta.abierta) return;
  puerta.abierta = true; puerta.t = 0;
  const i = muros.indexOf(puerta.bloqueo); if (i >= 0) muros.splice(i, 1);
  puerta.matLuz.color.set(0x40ff60); puerta.matLuz.emissive.set(0x40ff60); puerta.luz.color.set(0x40ff60);
  sonido.fx('puerta');
  destello(celdaMundo(CELDA_SALIDA).add(new THREE.Vector3(0, 1.2, 1)), 40);
}

// ------------------------------------------------------------------ monedas (36)
const monedas = [];
function construirMonedas() {
  const excluidas = new Set([CELDA_JUGADOR, ...ENEMIGOS.flatMap(e => [e.inicio, ...e.ruta])]);
  const geo = new THREE.CylinderGeometry(0.34, 0.34, 0.07, 28);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.85, roughness: 0.3, emissive: 0xa05a00, emissiveIntensity: 0.45 });
  const geoU = new THREE.TorusGeometry(0.13, 0.035, 8, 20, Math.PI);
  const matU = new THREE.MeshStandardMaterial({ color: 0x9a6008, metalness: 0.8, roughness: 0.35 });
  for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
    if (tipo(c, f) !== '.' || excluidas.has(nombre(c, f))) continue;
    const g = new THREE.Group(), p = aMundo(c, f);
    g.position.set(p.x, 0.75, p.z);
    const disco = new THREE.Mesh(geo, mat); disco.castShadow = true; g.add(disco);
    const u = new THREE.Mesh(geoU, matU); u.rotation.set(-Math.PI / 2, 0, Math.PI); u.position.set(0, 0.035, 0.03); g.add(u);
    g.rotation.x = 0.35;
    escena.add(g);
    monedas.push({ g, celda: nombre(c, f), fase: c * 0.7 + f * 1.3, viva: true });
  }
}

// ------------------------------------------------------------------ partículas (destellos, polvo, confeti)
const particulas = [];
const geoPart = new THREE.PlaneGeometry(1, 1);
function emitir(pos, n, colorFn, vel, vida, tam, gravedad) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geoPart, new THREE.MeshBasicMaterial({ color: colorFn(i), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(pos); m.scale.setScalar(tam * (0.6 + Math.random() * 0.4));
    const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(vel * (0.4 + Math.random() * 0.6));
    escena.add(m); particulas.push({ m, d, vida, t: 0, gravedad, giro: Math.random() * 6 });
  }
}
const destello = (p, n = 16) => emitir(p, n, () => (Math.random() < 0.5 ? 0xffe07a : 0xffb020), 4, 0.6, 0.14, -2);
const polvo = p => emitir(p.clone().setY(0.1), 2, () => 0xdcb27f, 0.8, 0.6, 0.25, 0.3);
const confeti = p => emitir(p, 200, () => [0x8e1a4a, 0xf9c33b, 0xffffff, 0x4fb3ff][Math.floor(Math.random() * 4)], 9, 3, 0.16, -6);
function actualizarParticulas(dt) {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i]; p.t += dt;
    p.d.y += p.gravedad * dt; p.m.position.addScaledVector(p.d, dt);
    p.m.rotation.set(p.t * p.giro, p.t * p.giro * 0.7, 0);
    p.m.material.opacity = 1 - p.t / p.vida;
    if (p.t >= p.vida) { escena.remove(p.m); p.m.material.dispose(); particulas.splice(i, 1); }
  }
}

// ------------------------------------------------------------------ jugador
const sonido = new Sonido();
let jugador = null;
const teclas = new Set(); let teclaActiva = null;
const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const RADIO = 0.42;

function libre(x, z) {
  // ¿el círculo del jugador cabe aquí sin tocar una pared (o la puerta cerrada)?
  const [c0, f0] = aCelda(new THREE.Vector3(x, 0, z));
  for (let f = f0 - 1; f <= f0 + 1; f++) for (let c = c0 - 1; c <= c0 + 1; c++) {
    let bloquea = tipo(c, f) === '#';
    if (!bloquea && !puerta.abierta && nombre(c, f) === CELDA_SALIDA) bloquea = true;
    if (!bloquea) continue;
    const p = aMundo(c, f), h = CELDA / 2;
    const dx = Math.max(Math.abs(x - p.x) - h, 0), dz = Math.max(Math.abs(z - p.z) - h, 0);
    if (dx * dx + dz * dz < RADIO * RADIO - 1e-6) return false;
  }
  return true;
}

function moverJugador(dt) {
  const j = jugador;
  let dir = null;
  if (juego.estado === 'jugando') {
    if (teclaActiva && !teclas.has(teclaActiva)) teclaActiva = null;
    if (!teclaActiva) for (const k of Object.keys(DIRS)) if (teclas.has(k)) { teclaActiva = k; break; }
    dir = teclaActiva ? DIRS[teclaActiva] : null;
  }
  const antes = j.raiz.position.clone();
  if (dir) {
    const v = AJUSTES.velocidadJugador * dt;
    let nx = j.raiz.position.x + dir[0] * v, nz = j.raiz.position.z + dir[1] * v;
    // asistencia de pasillo (centra en el carril, estilo Pac-Man)
    if (dir[0] !== 0) { const cz = Math.round(j.raiz.position.z / CELDA) * CELDA; nz = j.raiz.position.z + THREE.MathUtils.clamp(cz - j.raiz.position.z, -v, v); }
    else { const cx = Math.round(j.raiz.position.x / CELDA) * CELDA; nx = j.raiz.position.x + THREE.MathUtils.clamp(cx - j.raiz.position.x, -v, v); }
    if (libre(nx, j.raiz.position.z)) j.raiz.position.x = nx;
    if (libre(j.raiz.position.x, nz)) j.raiz.position.z = nz;
    const ang = Math.atan2(dir[0], dir[1]);
    let d = ang - j.raiz.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    j.raiz.rotation.y += THREE.MathUtils.clamp(d, -15 * dt, 15 * dt);
  }
  const vel = antes.distanceTo(j.raiz.position) / Math.max(dt, 1e-4);
  j.velSuave = THREE.MathUtils.lerp(j.velSuave || 0, vel, 1 - Math.exp(-20 * dt));
  if (juego.estado === 'jugando') {
    const corre = dir && j.velSuave > 0.4;       // contra la pared no avanza -> Quieto
    j.reproducir(corre ? 'Correr' : 'Quieto', 0.12);
    j.estadoNombre = corre ? 'Correr' : 'Quieto';
    if (corre && (j.tPolvo = (j.tPolvo || 0) - dt) <= 0) { j.tPolvo = 0.18; polvo(j.raiz.position); }
  }
  j.golpe.position.copy(j.raiz.position);
}

// ------------------------------------------------------------------ enemigos: pathfinding + raycasting
const rayo = new THREE.Raycaster();
function caminoBFS(desde, hasta) {
  // Búsqueda en anchura por las celdas caminables (los pasillos); F1 solo si la puerta está abierta
  const clave = (c, f) => f * COLS + c, previo = new Map();
  const ok = (c, f) => tipo(c, f) !== '#' && (puerta.abierta || nombre(c, f) !== CELDA_SALIDA);
  const cola = [desde]; previo.set(clave(...desde), null);
  while (cola.length) {
    const [c, f] = cola.shift();
    if (c === hasta[0] && f === hasta[1]) break;
    for (const [dc, df] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [c + dc, f + df], k = clave(...n);
      if (!previo.has(k) && ok(...n)) { previo.set(k, [c, f]); cola.push(n); }
    }
  }
  if (!previo.has(clave(...hasta))) return [];
  const camino = []; let p = hasta;
  while (p) { camino.unshift(p); p = previo.get(clave(...p)); }
  return camino.map(([c, f]) => aMundo(c, f));
}

const enemigos = [];
function crearEnemigo(gltf, def) {
  const r = instanciarRobot(gltf, 1.7, coloresBandido(def.acento, def.poncho));
  r.raiz.position.copy(celdaMundo(def.inicio));
  r.raiz.rotation.y = 0;
  escena.add(r.raiz);
  const luz = new THREE.PointLight(def.acento, 3, 3, 2); luz.position.set(0, 1.25, 0.5); r.raiz.add(luz);
  // rayo visible (cilindro fino) y radio de visión
  const rayoVis = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
  escena.add(rayoVis);
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: def.acento, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  anillo.rotation.x = -Math.PI / 2; escena.add(anillo);
  // ruta numerada
  const ruta = new THREE.Group(); escena.add(ruta);
  const pts = def.ruta.map(celdaMundo);
  const linea = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.clone().setY(0.05))), new THREE.LineBasicMaterial({ color: def.acento, transparent: true, opacity: 0.6 }));
  ruta.add(linea);
  pts.forEach((p, i) => {
    const disco = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 32), new THREE.MeshBasicMaterial({ color: def.acento, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    disco.rotation.x = -Math.PI / 2; disco.position.set(p.x, 0.04, p.z); ruta.add(disco);
    const num = textoPiso(String(i + 1), { color: def.css, alto: 0.5 }); num.position.set(p.x, 0.05, p.z); ruta.add(num);
  });
  const alerta = textoSprite('!', { color: '#fff', fondo: def.css, tam: 72, escala: 0.6 }); alerta.visible = false; escena.add(alerta);
  const e = { ...def, r, pts, indice: 0, estado: 'Patrulla', camino: [], tCamino: 0, rayoVis, anillo, rutaVis: ruta, alerta, ultimoRayo: 'FueraDeRango', tAlerta: 0 };
  e.camino = caminoBFS(aCelda(r.raiz.position), aCelda(pts[0]));
  enemigos.push(e);
}

function lanzarRayo(e) {
  // RAYCASTING: desde los ojos del enemigo hacia el jugador; lo primero que toca decide si lo ve
  const ojo = e.r.raiz.position.clone().setY(AJUSTES.alturaOjos);
  const obj = jugador.raiz.position.clone().setY(AJUSTES.alturaOjos);
  const dir = obj.clone().sub(ojo); const dist = dir.length(); dir.normalize();
  rayo.set(ojo, dir); rayo.far = AJUSTES.distanciaVision;
  const golpes = rayo.intersectObjects([...muros, jugador.golpe], false);
  let fin, resultado;
  if (golpes.length) {
    fin = golpes[0].point;
    resultado = golpes[0].object === jugador.golpe ? 'VeAlJugador' : 'Bloqueado';
  } else { fin = ojo.clone().addScaledVector(dir, AJUSTES.distanciaVision); resultado = 'FueraDeRango'; }
  e.ultimoRayo = resultado; e.distJugador = dist;
  // dibujo del rayo
  const largo = ojo.distanceTo(fin);
  const v = e.rayoVis; v.visible = ayudas;
  v.position.copy(ojo).lerp(fin, 0.5);
  v.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const grosor = resultado === 'VeAlJugador' ? 0.06 : 0.035;
  v.scale.set(grosor, largo, grosor);
  v.material.color.set(resultado === 'VeAlJugador' ? 0xff2a1a : resultado === 'Bloqueado' ? 0xffd21a : 0xffffff);
  v.material.opacity = resultado === 'FueraDeRango' ? 0.35 : 0.95;
  return resultado === 'VeAlJugador';
}

function seguirCamino(e, dt, vel, destinoFinal) {
  const p = e.r.raiz.position;
  let paso = vel * dt;
  while (paso > 0) {
    const objetivo = e.camino.length ? e.camino[0] : destinoFinal;
    if (!objetivo) break;
    const d = objetivo.clone().sub(p); d.y = 0; const l = d.length();
    if (l < 1e-4) { if (e.camino.length) { e.camino.shift(); continue; } break; }
    if (l <= paso) { p.x = objetivo.x; p.z = objetivo.z; paso -= l; if (e.camino.length) e.camino.shift(); else break; }
    else { p.addScaledVector(d, paso / l); paso = 0; }
    const ang = Math.atan2(d.x, d.z); let da = ang - e.r.raiz.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    e.r.raiz.rotation.y += THREE.MathUtils.clamp(da, -14 * dt, 14 * dt);
  }
}

function actualizarEnemigo(e, dt) {
  e.anillo.position.set(e.r.raiz.position.x, 0.06, e.r.raiz.position.z);
  e.anillo.scale.setScalar(AJUSTES.distanciaVision);
  e.anillo.material.opacity = e.estado === 'Persecucion' ? 0.6 : 0.22;
  e.anillo.visible = ayudas && e.estado !== 'Detenido'; e.rutaVis.visible = ayudas;
  e.alerta.visible = e.estado === 'Persecucion';
  if (e.alerta.visible) { e.tAlerta += dt; e.alerta.position.copy(e.r.raiz.position).setY(2.35 + Math.abs(Math.sin(e.tAlerta * 9)) * 0.15 * Math.max(0, 1.5 - e.tAlerta)); }
  if (e.estado === 'Detenido') { e.rayoVis.visible = false; return; }
  if (juego.estado !== 'jugando') { e.rayoVis.visible = false; e.r.reproducir('Quieto'); return; }

  const ve = lanzarRayo(e);
  if (ve) {
    if (e.estado !== 'Persecucion') { e.estado = 'Persecucion'; e.tAlerta = 0; sonido.fx('alerta'); }
    e.tCamino -= dt;
    if (e.tCamino <= 0) { e.tCamino = 0.2; e.camino = caminoBFS(aCelda(e.r.raiz.position), aCelda(jugador.raiz.position)); if (e.camino.length) e.camino.shift(); }
    seguirCamino(e, dt, AJUSTES.velocidadPersecucion, jugador.raiz.position);
  } else {
    if (e.estado === 'Persecucion') {           // dejó de verlo: vuelve a su ruta
      e.estado = 'Patrulla';
      e.camino = caminoBFS(aCelda(e.r.raiz.position), aCelda(e.pts[e.indice]));
    }
    const objetivo = e.pts[e.indice];
    if (!e.camino.length && e.r.raiz.position.distanceTo(objetivo) < 0.05) {
      e.indice = (e.indice + 1) % e.pts.length;  // siguiente punto; después del último vuelve al primero
      e.camino = caminoBFS(aCelda(e.r.raiz.position), aCelda(e.pts[e.indice]));
    }
    seguirCamino(e, dt, AJUSTES.velocidadPatrulla, objetivo);
  }
  e.r.reproducir('Correr', 0.12, e.estado === 'Persecucion' ? 1.25 : 1);
  // TRIGGER: si toca al jugador, termina la partida
  const d = e.r.raiz.position.clone().sub(jugador.raiz.position); d.y = 0;
  if (d.length() < 0.75) derrota(e);
}

// ------------------------------------------------------------------ reglas de la partida
const juego = { estado: 'carga', puntaje: 0, recogidas: 0, tiempo: 0, tEstado: 0, racha: 0, ultimaMoneda: -9 };
let ayudas = true, vistaCenital = false, mostrarInfo = false;

function recoger(m) {
  m.viva = false; escena.remove(m.g);
  juego.recogidas++; juego.puntaje += AJUSTES.puntosPorMoneda;
  juego.racha = (juego.tiempo - juego.ultimaMoneda < 1.2) ? juego.racha + 1 : 0; juego.ultimaMoneda = juego.tiempo;
  sonido.fx('moneda', juego.racha);
  destello(m.g.position.clone());
  actualizarHUD(true);
  avisarPortal('puntaje', { puntaje: juego.puntaje, restantes: monedas.length - juego.recogidas });
  if (juego.recogidas >= monedas.length) abrirPuerta();
}

function derrota(e) {
  if (juego.estado !== 'jugando') return;
  juego.estado = 'derrota'; juego.tEstado = 0;
  jugador.reproducir('Morir', 0.08);
  const h = e.r.raiz.position.clone().sub(jugador.raiz.position); jugador.raiz.rotation.y = Math.atan2(h.x, h.z);
  enemigos.forEach(x => { x.estado = 'Detenido'; x.r.reproducir('Festejar', 0.2); });
  sonido.detenerMusica(); sonido.fx('golpe'); sonido.fx('derrota');
  emitir(jugador.raiz.position.clone().setY(0.9), 40, () => 0xff9a2a, 5, 0.7, 0.1, -4);
  sacudir(0.5);
  setTimeout(() => mostrarFinal(false), 1100);
  avisarPortal('fin', { victoria: false, puntaje: juego.puntaje });
}

function victoria() {
  if (juego.estado !== 'jugando') return;
  juego.estado = 'victoria'; juego.tEstado = 0;
  jugador.raiz.rotation.y = 0; jugador.reproducir('Festejar', 0.2);
  enemigos.forEach(x => { x.estado = 'Detenido'; x.r.reproducir('Quieto'); });
  sonido.detenerMusica(); sonido.fx('victoria');
  confeti(jugador.raiz.position.clone().setY(2.5));
  setTimeout(() => mostrarFinal(true), 700);
  avisarPortal('fin', { victoria: true, puntaje: juego.puntaje });
}

function mostrarFinal(gano) {
  ui.final.hidden = false;
  ui.final.classList.toggle('gano', gano);
  ui.finTitulo.textContent = gano ? AJUSTES.textoVictoria : AJUSTES.textoDerrota;
  ui.finPuntaje.textContent = juego.puntaje;
  const s = Math.floor(juego.tiempo);
  ui.finStats.textContent = `Monedas ${juego.recogidas}/${monedas.length} · Tiempo ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('btnOtra').textContent = gano ? 'JUGAR OTRA VEZ (R)' : 'REINTENTAR (R)';
}

function actualizarHUD(pulso = false) {
  ui.puntaje.textContent = String(juego.puntaje).padStart(4, '0');
  const rest = monedas.length - juego.recogidas;
  ui.restantes.textContent = rest; ui.total.textContent = monedas.length;
  ui.barra.style.width = (monedas.length ? juego.recogidas / monedas.length * 100 : 100) + '%';
  ui.puerta.textContent = puerta.abierta ? 'PUERTA ABIERTA · ¡CORRE A LA SALIDA!' : `PUERTA CERRADA · faltan ${rest} puntos`;
  ui.puerta.classList.toggle('abierta', puerta.abierta);
  if (pulso) { for (const el of [ui.puntaje, ui.restantes]) { el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); } }
}

function reiniciar() { location.reload(); }

// ------------------------------------------------------------------ cámara (todo el laberinto en pantalla)
let sacudida = 0;
const sacudir = f => { sacudida = f; };
function ajustarCamara(dt, inmediato = false) {
  const w = lienzo.clientWidth || 1, h = lienzo.clientHeight || 1;
  camara.aspect = w / h; camara.updateProjectionMatrix();
  const ang = THREE.MathUtils.degToRad(vistaCenital ? 89.9 : 66);
  const hx = COLS * CELDA / 2 + 1.2, hz = FILAS * CELDA / 2 + 1.2;
  const centro = new THREE.Vector3(0, 0, 0.6);
  const dirAtras = new THREE.Vector3(0, Math.sin(ang), Math.cos(ang));
  const esquinas = [];
  for (const y of [0, ALTO_PARED]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) esquinas.push(new THREE.Vector3(sx * hx, y, sz * hz));
  const prueba = camara.clone(); prueba.aspect = camara.aspect; prueba.updateProjectionMatrix();
  let lo = 4, hi = 200;
  for (let i = 0; i < 26; i++) {
    const d = (lo + hi) / 2;
    prueba.position.copy(centro).addScaledVector(dirAtras, d); prueba.lookAt(centro); prueba.updateMatrixWorld();
    const cabe = esquinas.every(e => { const p = e.clone().project(prueba); return Math.abs(p.x) <= 1 && p.y <= 0.78 && p.y >= -1; });
    if (cabe) hi = d; else lo = d;
  }
  const destino = centro.clone().addScaledVector(dirAtras, hi);
  if (inmediato) camara.position.copy(destino); else camara.position.lerp(destino, 1 - Math.exp(-5 * dt));
  camara.lookAt(centro);
  if (sacudida > 0) { sacudida = Math.max(0, sacudida - dt); camara.position.x += (Math.random() - 0.5) * sacudida; camara.position.z += (Math.random() - 0.5) * sacudida; }
}
function redimensionar() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); lienzo.style.width = w + 'px'; lienzo.style.height = h + 'px';
  ajustarCamara(0, true);
}
window.addEventListener('resize', redimensionar);

// ------------------------------------------------------------------ teclado
window.addEventListener('keydown', ev => {
  sonido.activar();
  if (juego.estado !== 'carga' && !sonido.musica && (juego.estado === 'jugando' || juego.estado === 'intro')) sonido.iniciarMusica();
  if (DIRS[ev.key]) { ev.preventDefault(); if (!teclas.has(ev.key)) teclaActiva = ev.key; teclas.add(ev.key); }
  const k = ev.key.toLowerCase();
  if (k === 'r') reiniciar();
  if (k === 'l') ayudas = !ayudas;
  if (k === 'v') vistaCenital = !vistaCenital;
  if (k === 'm') sonido.alternarSilencio();
  if (k === 'h') ui.ayuda.hidden = !ui.ayuda.hidden;
  if (ev.key === 'F1') { ev.preventDefault(); mostrarInfo = !mostrarInfo; ui.info.hidden = !mostrarInfo; }
  if (ev.key === ' ') ev.preventDefault();
});
window.addEventListener('keyup', ev => { teclas.delete(ev.key); });
window.addEventListener('blur', () => teclas.clear());
lienzo.addEventListener('pointerdown', () => { lienzo.focus(); sonido.activar(); });
$('btnOtra').addEventListener('click', reiniciar);
window.addEventListener('message', ev => { if (ev.data && ev.data.comando === 'reiniciar') reiniciar(); });

// ------------------------------------------------------------------ bucle principal
const reloj = new THREE.Clock();
const DT_MAX = LENTO ? 0.12 : 0.05;
function bucle() {
  const dt = Math.min(reloj.getDelta(), DT_MAX);
  juego.tEstado += dt;
  if (juego.estado === 'intro' && juego.tEstado >= AJUSTES.duracionIntro) { juego.estado = 'jugando'; juego.tEstado = 0; ui.intro.hidden = true; }
  if (juego.estado === 'jugando') juego.tiempo += dt;

  if (jugador) {
    moverJugador(dt);
    jugador.mezclador.update(dt);
    // TRIGGER de monedas
    if (juego.estado === 'jugando') for (const m of monedas) {
      if (!m.viva) continue;
      const dx = m.g.position.x - jugador.raiz.position.x, dz = m.g.position.z - jugador.raiz.position.z;
      if (dx * dx + dz * dz < 0.75 * 0.75) recoger(m);
    }
    // TRIGGER de salida
    if (juego.estado === 'jugando' && puerta.abierta) {
      const s = celdaMundo(CELDA_SALIDA);
      if (Math.abs(jugador.raiz.position.x - s.x) < 0.9 && jugador.raiz.position.z < s.z + 0.6) victoria();
    }
  }
  for (const e of enemigos) { actualizarEnemigo(e, dt); e.r.mezclador.update(dt); }
  const persigue = enemigos.some(e => e.estado === 'Persecucion') && juego.estado === 'jugando';
  ui.vineta.classList.toggle('activa', persigue);
  sonido.tono = persigue ? 1.08 : 1;

  for (const m of monedas) if (m.viva) { m.g.rotation.y += 1.6 * dt; m.g.position.y = 0.75 + Math.sin(performance.now() / 380 + m.fase) * 0.1; }
  if (puerta.abierta && puerta.t < 1) {
    puerta.t = Math.min(1, puerta.t + dt / 0.9);
    const k = 1 - Math.pow(1 - puerta.t, 3), reb = Math.sin(puerta.t * Math.PI * 3) * (1 - puerta.t) * 0.15, a = THREE.MathUtils.degToRad(105) * (k + reb);
    puerta.hojaI.rotation.y = a; puerta.hojaD.rotation.y = -a;
  }
  actualizarParticulas(dt);
  ajustarCamara(dt);
  if (mostrarInfo && jugador) {
    const [c, f] = aCelda(jugador.raiz.position);
    ui.info.textContent = [`Jugador: ${jugador.estadoNombre || 'Quieto'} · celda ${nombre(c, f)} · vel ${AJUSTES.velocidadJugador}`,
      ...enemigos.map(e => `${e.nombre}: ${e.estado} · rayo: ${e.ultimoRayo} · dist ${(e.distJugador || 0).toFixed(1)}/${AJUSTES.distanciaVision} · destino ${e.estado === 'Persecucion' ? 'JUGADOR' : e.ruta[e.indice]}`),
      `Puntos: ${juego.puntaje} (${AJUSTES.puntosPorMoneda} c/u) · restantes ${monedas.length - juego.recogidas} · puerta ${puerta.abierta ? 'abierta' : 'cerrada'}`].join('\n');
  }
  renderer.render(escena, camara);
  requestAnimationFrame(bucle);
}

// ------------------------------------------------------------------ inicio
async function iniciar() {
  redimensionar();
  construirLaberinto(); construirPuerta(); construirMonedas();
  ui.total.textContent = monedas.length; actualizarHUD();
  requestAnimationFrame(bucle);
  try {
    const gltf = await cargarRobot('../modelos/sheriff_tornillo.glb', ev => { if (ev.total) ui.cargaTxt.textContent = `Cargando al Sheriff… ${Math.round(ev.loaded / ev.total * 100)}%`; });
    jugador = instanciarRobot(gltf, 1.7);
    jugador.raiz.position.copy(celdaMundo(CELDA_JUGADOR));
    jugador.raiz.rotation.y = Math.PI; // mira hacia el laberinto (arriba)
    jugador.golpe = new THREE.Mesh(new THREE.CylinderGeometry(RADIO, RADIO, 1.5, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    jugador.golpe.geometry.translate(0, 0.75, 0);
    escena.add(jugador.raiz, jugador.golpe);
    jugador.reproducir('Quieto', 0);
    ENEMIGOS.forEach(d => crearEnemigo(gltf, d));
    ui.carga.hidden = true;
    juego.estado = AJUSTES.duracionIntro > 0 ? 'intro' : 'jugando'; juego.tEstado = 0;
    ui.intro.hidden = juego.estado !== 'intro';
    sonido.activar(); sonido.fx('inicio'); sonido.iniciarMusica();
    lienzo.focus(); window.focus();
    avisarPortal('listo', { total: monedas.length });
  } catch (err) {
    console.error(err);
    ui.cargaTxt.textContent = 'No se pudo cargar el modelo 3D. Abre el portal desde el servidor (GitHub Pages), no con doble clic.';
  }
}
iniciar();
