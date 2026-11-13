// =====================================================================
//  SHERIFF TORNILLO · CARRERA EN EL DESIERTO  (versión web, Three.js)
//  Endless runner como el de Unity (GED Unidad 2):
//   · +10 puntos por segundo, monedas +50, meta 1000 puntos
//   · obstáculos bajos (cactus, TNT) -> saltar · altos (cartel SE BUSCA, buitre) -> deslizarse
//   · 3 vidas (sombreros), 1,5 s de invencibilidad tras un choque
//   · la velocidad sube de 10 a 24 m/s y el cielo pasa de la tarde al atardecer
// =====================================================================
import { THREE, cargarRobot, instanciarRobot, Sonido, texturas, crearCactus, crearBarril, crearRoca, avisarPortal } from '../comun.js';
import { RoomEnvironment } from '../lib/environments/RoomEnvironment.js';

const A = {
  velInicial: 10, aceleracion: 0.22, velMax: 24, puntosPorSegundo: 10, puntosMoneda: 50, meta: 1000,
  vidas: 3, invencible: 1.5, alturaSalto: 2.0, gravedad: 32, duracionAgachado: 0.75,
  textoDerrota: 'Juego terminado', textoVictoria: '¡Recuperaste el oro!',
};
const LENTO = new URLSearchParams(location.search).has('lento');
const $ = id => document.getElementById(id);
const lienzo = $('lienzo');

// ------------------------------------------------------------------ escena
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !LENTO });
renderer.setPixelRatio(LENTO ? 0.6 : Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = !LENTO; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const escena = new THREE.Scene();
const cieloTarde = new THREE.Color(0x8fc6e8), cieloAtardecer = new THREE.Color(0xf08a5d);
escena.background = cieloTarde.clone();
escena.fog = new THREE.Fog(0xf2c79a, 30, 120);
escena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.55;
const camara = new THREE.PerspectiveCamera(50, 1, 0.3, 400);
const hemi = new THREE.HemisphereLight(0xfff0d8, 0x7a4a30, 0.6); escena.add(hemi);
const sol = new THREE.DirectionalLight(0xffd2a0, 2.3); sol.position.set(8, 14, 6); sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, far: 60 });
escena.add(sol, sol.target);
const disco = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }));
disco.position.set(-30, 26, -170); escena.add(disco);

// suelo que se desplaza
const texSuelo = texturas.arena(1); texSuelo.repeat.set(8, 60);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(60, 400), new THREE.MeshStandardMaterial({ map: texSuelo, color: 0xd9a877, roughness: 1 }));
suelo.rotation.x = -Math.PI / 2; suelo.position.z = -150; suelo.receiveShadow = true; escena.add(suelo);
const texCamino = texturas.arena(1); texCamino.repeat.set(1, 80);
const camino = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 400), new THREE.MeshStandardMaterial({ map: texCamino, color: 0xb98a5e, roughness: 1 }));
camino.rotation.x = -Math.PI / 2; camino.position.set(0, 0.01, -150); camino.receiveShadow = true; escena.add(camino);

// mesetas lejanas
for (let i = 0; i < 10; i++) {
  const r = 8 + (i * 37 % 9), h = 8 + (i * 53 % 10);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 7), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xa0523d : 0x8a3f33, roughness: 1, flatShading: true }));
  m.position.set((i % 2 ? 1 : -1) * (40 + (i * 29 % 30)), h / 2, -90 - i * 28); escena.add(m);
}

// decoración a los lados (se recicla)
const deco = [];
let semilla = 5; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 26; i++) {
  const r = rnd(); const o = r < 0.5 ? crearCactus(0.9 + rnd() * 0.7) : r < 0.8 ? crearRoca(1 + rnd() * 1.5, rnd) : crearBarril(false, 1);
  const lado = rnd() < 0.5 ? -1 : 1; o.position.set(lado < 0 ? -(3.5 + rnd() * 14) : 9 + rnd() * 12, o.position.y, -i * 7 - rnd() * 4); escena.add(o); deco.push(o);
}

// ------------------------------------------------------------------ obstáculos y monedas
const matMadera = new THREE.MeshStandardMaterial({ map: texturas.madera(), roughness: 0.8 });
const matPapel = new THREE.MeshStandardMaterial({ color: 0xf3e1bd, roughness: 0.9 });
function cartelSeBusca() {
  const g = new THREE.Group();
  for (const x of [-1.25, 1.25]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), matMadera); p.position.set(x, 1.3, 0); p.castShadow = true; g.add(p); }
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.95, 0.12), matMadera); tabla.position.y = 1.95; tabla.castShadow = true; g.add(tabla);
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#f3e1bd'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#8e1a4a'; x.font = '44px Rye, serif'; x.textAlign = 'center'; x.fillText('SE BUSCA', 128, 62);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.78), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); hoja.position.set(0, 1.95, 0.07); g.add(hoja);
  return { g, alto: true, y0: 1.45, y1: 2.45, ancho: 0.4 };
}
function buitre() {
  const g = new THREE.Group(), negro = new THREE.MeshStandardMaterial({ color: 0x2a2026, roughness: 0.8 });
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), negro); cuerpo.rotation.x = Math.PI / 2; g.add(cuerpo);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd98a8a })); cab.position.set(0, 0.1, 0.5); g.add(cab);
  const ala = lado => { const piv = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.5), negro); a.position.x = lado * 0.7; piv.add(a); g.add(piv); return piv; };
  g.userData.alas = [ala(-1), ala(1)];
  g.position.y = 1.85; g.rotation.y = 0;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, alto: true, y0: 1.45, y1: 2.3, ancho: 0.6, vuela: true };
}
function bajo(tipo) {
  const g = tipo === 'tnt' ? crearBarril(true, 1.15) : crearCactus(0.62);
  return { g, alto: false, y0: 0, y1: tipo === 'tnt' ? 1.1 : 1.25, ancho: 0.45 };
}
const geoMoneda = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 24);
const matMoneda = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.85, roughness: 0.3, emissive: 0xa05a00, emissiveIntensity: 0.5 });
const obstaculos = [], monedas = [];
let distanciaProx = 30;

function generar() {
  const z = -95;
  const tiempo = juego.tiempo;
  const pAlto = tiempo > 4 ? 0.42 : 0;
  const esAlto = Math.random() < pAlto;
  let o;
  if (esAlto) o = Math.random() < 0.55 ? cartelSeBusca() : buitre(); else o = bajo(Math.random() < 0.5 ? 'tnt' : 'cactus');
  o.g.position.z = z; o.z = z; escena.add(o.g); obstaculos.push(o);
  // monedas: en arco sobre los bajos, al ras del suelo bajo los altos
  if (Math.random() < 0.75) {
    for (let i = -2; i <= 2; i++) {
      const y = esAlto ? 0.55 : 1.0 + (2.2 - Math.abs(i) * 0.45);
      crearMoneda(z + i * 1.4, y);
    }
  }
  // a veces un obstáculo doble
  if (tiempo > 15 && Math.random() < 0.25) {
    const o2 = bajo('cactus'); o2.g.position.z = z - 3.2; o2.z = z - 3.2; escena.add(o2.g); obstaculos.push(o2);
  }
}
function crearMoneda(z, y) {
  const m = new THREE.Mesh(geoMoneda, matMoneda); m.rotation.x = Math.PI / 2; m.position.set(0, y, z); m.castShadow = true;
  escena.add(m); monedas.push({ m, z });
}

// ------------------------------------------------------------------ jugador
const sonido = new Sonido();
let robot = null;
const J = { y: 0, vy: 0, agachado: 0, enSuelo: true, invencible: 0, vidas: A.vidas };
function saltar() {
  if (juego.estado !== 'jugando' || !J.enSuelo) return;
  J.vy = Math.sqrt(2 * A.gravedad * A.alturaSalto); J.enSuelo = false; J.agachado = 0;
  robot.reproducir('Saltar', 0.08); sonido.fx('salto');
}
function agacharse() {
  if (juego.estado !== 'jugando') return;
  if (!J.enSuelo) { J.vy = Math.min(J.vy, -18); return; } // en el aire: cae rápido
  if (J.agachado <= 0) { robot.reproducir('Agacharse', 0.06, 1.4); sonido.fx('desliza'); }
  J.agachado = A.duracionAgachado;
}

// ------------------------------------------------------------------ estado
const juego = { estado: 'carga', tiempo: 0, puntos: 0, monedas: 0, esquivados: 0, vel: A.velInicial, distancia: 0, metaAlcanzada: false, tEstado: 0, camLateral: true };
const pantallaVidas = $('vidas');
function dibujarVidas() {
  pantallaVidas.innerHTML = '';
  for (let i = 0; i < A.vidas; i++) pantallaVidas.insertAdjacentHTML('beforeend',
    `<svg viewBox="0 0 40 28" class="${i < J.vidas ? '' : 'perdida'}"><path d="M4 20c6 4 26 4 32 0-3-1-5-2-6-5l-2-10c-1-3-4-4-6-2l-2 2-2-2c-2-2-5-1-6 2l-2 10c-1 3-3 4-6 5z" fill="#8e1a4a" stroke="#4a0d26" stroke-width="1.5"/><path d="M9 15c7 2 15 2 22 0" stroke="#a7b4c2" stroke-width="2.4" fill="none"/></svg>`);
}
function golpe() {
  if (J.invencible > 0) return;
  J.vidas--; dibujarVidas(); sonido.fx('golpe'); sacudir(0.45);
  document.body.animate([{ boxShadow: 'inset 0 0 0 100vmax rgba(255,0,0,.35)' }, { boxShadow: 'inset 0 0 0 100vmax rgba(255,0,0,0)' }], 400);
  if (J.vidas <= 0) { fin(false); return; }
  J.invencible = A.invencible;
}
function fin(gano) {
  juego.estado = gano ? 'meta' : 'derrota'; juego.tEstado = 0;
  robot.reproducir(gano ? 'Festejar' : 'Morir', 0.1);
  sonido.detenerMusica(); sonido.fx(gano ? 'victoria' : 'derrota');
  setTimeout(() => {
    $('final').hidden = false; $('final').classList.toggle('gano', gano);
    $('finTitulo').textContent = gano ? A.textoVictoria : A.textoDerrota;
    $('finPuntaje').textContent = Math.floor(juego.puntos);
    const p = juego.puntos, e = p >= 1000 ? 3 : p >= 600 ? 2 : p >= 300 ? 1 : 0;
    $('finEstrellas').textContent = '★'.repeat(e) + '☆'.repeat(3 - e);
    $('finEstrellas').style.color = '#f9c33b';
    $('finStats').textContent = `Monedas ${juego.monedas} · Esquivados ${juego.esquivados} · Distancia ${Math.floor(juego.distancia)} m · Tiempo ${Math.floor(juego.tiempo)} s`;
    $('btnSeguir').hidden = !gano;
  }, gano ? 600 : 1300);
  avisarPortal('fin', { victoria: gano, puntaje: Math.floor(juego.puntos) });
}
function seguir() {
  if (juego.estado !== 'meta') return;
  $('final').hidden = true; juego.estado = 'jugando'; juego.metaAlcanzada = true; robot.reproducir('Correr'); sonido.iniciarMusica(150);
}
const reiniciar = () => location.reload();
let sacudida = 0; const sacudir = f => { sacudida = f; };

// ------------------------------------------------------------------ teclado y táctil
addEventListener('keydown', ev => {
  sonido.activar();
  const k = ev.key.toLowerCase();
  if (['arrowup', 'arrowdown', ' '].includes(k)) ev.preventDefault();
  if (k === 'arrowup' || k === ' ' || k === 'w') saltar();
  if (k === 'arrowdown' || k === 's') agacharse();
  if (k === 'r') reiniciar();
  if (k === 'v') juego.camLateral = !juego.camLateral;
  if (k === 'm') sonido.alternarSilencio();
  if (k === 'enter') seguir();
  if ((k === 'p' || k === 'escape') && (juego.estado === 'jugando' || juego.estado === 'pausa')) {
    juego.estado = juego.estado === 'pausa' ? 'jugando' : 'pausa'; $('pausa').hidden = juego.estado !== 'pausa';
  }
});
$('tSalta').addEventListener('pointerdown', e => { e.preventDefault(); sonido.activar(); saltar(); });
$('tDesliza').addEventListener('pointerdown', e => { e.preventDefault(); sonido.activar(); agacharse(); });
$('btnOtra').addEventListener('click', reiniciar);
$('btnSeguir').addEventListener('click', seguir);
lienzo.addEventListener('pointerdown', () => { lienzo.focus(); sonido.activar(); });
addEventListener('message', ev => { if (ev.data && ev.data.comando === 'reiniciar') reiniciar(); });

function redimensionar() {
  renderer.setSize(innerWidth, innerHeight, false); lienzo.style.width = innerWidth + 'px'; lienzo.style.height = innerHeight + 'px';
  camara.aspect = innerWidth / innerHeight; camara.fov = camara.aspect < 1.2 ? 62 : 50; camara.updateProjectionMatrix();
}
addEventListener('resize', redimensionar);

// ------------------------------------------------------------------ bucle
const reloj = new THREE.Clock();
const DT_MAX = LENTO ? 0.1 : 0.05;
function bucle() {
  const dt = Math.min(reloj.getDelta(), DT_MAX);
  juego.tEstado += dt;
  if (juego.estado === 'cuenta') {
    const n = 3 - Math.floor(juego.tEstado / 0.7);
    $('cuentaTxt').textContent = n > 0 ? n : '¡YA!';
    if (juego.tEstado > 2.6) { $('cuenta').hidden = true; juego.estado = 'jugando'; robot.reproducir('Correr'); }
  }
  const corre = juego.estado === 'jugando';
  if (corre) {
    juego.tiempo += dt;
    juego.vel = Math.min(A.velMax, A.velInicial + A.aceleracion * juego.tiempo * (juego.metaAlcanzada ? 1.3 : 1));
    juego.puntos += A.puntosPorSegundo * dt;
    juego.distancia += juego.vel * dt;
    const avance = juego.vel * dt;
    texSuelo.offset.y += avance / 400 * 60; texCamino.offset.y += avance / 400 * 80;
    for (const o of deco) { o.position.z += avance; if (o.position.z > 12) o.position.z -= 182; }
    distanciaProx -= avance;
    if (distanciaProx <= 0) { generar(); distanciaProx = 15 + Math.random() * 14 + juego.vel * 0.4; }
    // física del salto
    if (!J.enSuelo) { J.vy -= A.gravedad * dt; J.y += J.vy * dt; if (J.y <= 0) { J.y = 0; J.vy = 0; J.enSuelo = true; robot.reproducir('Correr', 0.1); } }
    if (J.agachado > 0) { J.agachado -= dt; if (J.agachado <= 0 && J.enSuelo) robot.reproducir('Correr', 0.12); }
    if (J.invencible > 0) { J.invencible -= dt; robot.raiz.visible = Math.floor(J.invencible * 12) % 2 === 0 || J.invencible <= 0; }
    // obstáculos
    const altoJ = J.agachado > 0 ? 1.6 * 0.45 : 1.6;
    for (let i = obstaculos.length - 1; i >= 0; i--) {
      const o = obstaculos[i];
      o.z += avance * (o.vuela ? 1.25 : 1); o.g.position.z = o.z;
      if (o.vuela) { const t = performance.now() / 120; o.g.userData.alas[0].rotation.z = Math.sin(t) * 0.6; o.g.userData.alas[1].rotation.z = -Math.sin(t) * 0.6; }
      if (Math.abs(o.z) < o.ancho + 0.3 && !o.pasado) {
        const solapa = J.y < o.y1 && J.y + altoJ > o.y0;
        if (solapa) { golpe(); o.pasado = true; }
      }
      if (o.z > 0.9 && !o.pasado) { o.pasado = true; juego.esquivados++; }
      if (o.z > 14) { escena.remove(o.g); obstaculos.splice(i, 1); }
    }
    for (let i = monedas.length - 1; i >= 0; i--) {
      const m = monedas[i]; m.z += avance; m.m.position.z = m.z; m.m.rotation.z += dt * 4;
      if (Math.abs(m.z) < 0.6 && m.m.position.y > J.y - 0.2 && m.m.position.y < J.y + altoJ + 0.3) {
        juego.monedas++; juego.puntos += A.puntosMoneda; sonido.fx('moneda', juego.monedas % 6); escena.remove(m.m); monedas.splice(i, 1); continue;
      }
      if (m.z > 14) { escena.remove(m.m); monedas.splice(i, 1); }
    }
    if (!juego.metaAlcanzada && juego.puntos >= A.meta) fin(true);
    robot.mezclador.timeScale = 0.8 + (juego.vel - A.velInicial) / (A.velMax - A.velInicial) * 0.7;
  } else robot && (robot.mezclador.timeScale = 1);

  if (robot) {
    robot.raiz.position.y = J.y;
    robot.mezclador.update(dt);
    // cielo de la tarde al atardecer según el avance hacia la meta
    const k = Math.min(1, juego.puntos / A.meta);
    escena.background.copy(cieloTarde).lerp(cieloAtardecer, k);
    escena.fog.color.set(0xf2c79a).lerp(new THREE.Color(0xe07a55), k);
    disco.position.y = 26 - k * 20; sol.color.set(0xffe0b0).lerp(new THREE.Color(0xff9a60), k);
  }
  // HUD
  $('puntos').textContent = Math.floor(juego.puntos);
  $('barraVel').style.width = ((juego.vel - A.velInicial) / (A.velMax - A.velInicial) * 100) + '%';
  $('meta').textContent = juego.metaAlcanzada ? `¡META SUPERADA! · ${Math.round(juego.vel)} m/s` : `META: ${A.meta} PUNTOS · faltan ${Math.max(0, Math.ceil(A.meta - juego.puntos))}`;
  // cámara
  const objCam = juego.camLateral ? new THREE.Vector3(6.2, 2.7, 2.2) : new THREE.Vector3(0, 3.4, 7.5);
  camara.position.lerp(objCam, 1 - Math.exp(-4 * dt));
  if (sacudida > 0) { sacudida = Math.max(0, sacudida - dt); camara.position.x += (Math.random() - 0.5) * sacudida; camara.position.y += (Math.random() - 0.5) * sacudida; }
  camara.lookAt(0, 1.3, juego.camLateral ? -4 : -8);
  renderer.render(escena, camara);
  requestAnimationFrame(bucle);
}

async function iniciar() {
  redimensionar(); camara.position.set(6.2, 2.7, 2.2); dibujarVidas();
  requestAnimationFrame(bucle);
  try {
    const gltf = await cargarRobot('../modelos/sheriff_tornillo.glb', ev => { if (ev.total) $('cargaTxt').textContent = `Cargando al Sheriff… ${Math.round(ev.loaded / ev.total * 100)}%`; });
    robot = instanciarRobot(gltf, 1.6);
    robot.raiz.rotation.y = Math.PI; // corre hacia -Z
    escena.add(robot.raiz); robot.reproducir('Quieto', 0);
    $('carga').hidden = true; $('cuenta').hidden = false;
    juego.estado = 'cuenta'; juego.tEstado = 0;
    sonido.activar(); sonido.fx('inicio'); sonido.iniciarMusica(140);
    lienzo.focus(); focus();
    avisarPortal('listo', {});
  } catch (e) { console.error(e); $('cargaTxt').textContent = 'No se pudo cargar el modelo 3D. Abre el portal desde el servidor, no con doble clic.'; }
}
iniciar();
