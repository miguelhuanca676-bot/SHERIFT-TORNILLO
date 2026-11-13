// =====================================================================
//  Sheriff Tornillo · utilidades compartidas por los dos juegos web
//  (modelo 3D, sonido sintetizado, texturas por código)
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from './lib/loaders/GLTFLoader.js';
import * as SkeletonUtils from './lib/utils/SkeletonUtils.js';

export { THREE, SkeletonUtils };

// ---------------------------------------------------------------- modelo
let gltfPromesa = null;
export function cargarRobot(url = '../modelos/sheriff_tornillo.glb', progreso) {
  if (!gltfPromesa) {
    gltfPromesa = new Promise((ok, mal) => new GLTFLoader().load(url, ok, progreso, mal));
  }
  return gltfPromesa;
}

/** Crea una copia animable del robot, de pie, mirando a +Z, con la altura pedida. */
export function instanciarRobot(gltf, altura = 1.45, colores = null) {
  const raiz = new THREE.Group();
  const modelo = SkeletonUtils.clone(gltf.scene);
  modelo.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      o.frustumCulled = false;
      const lista = Array.isArray(o.material) ? o.material : [o.material];
      const nuevos = lista.map(m => {
        const c = m.clone();
        if (colores && colores[m.name]) {
          const d = colores[m.name];
          c.color = new THREE.Color(d.color);
          if (d.metal !== undefined) c.metalness = d.metal;
          if (d.rugosidad !== undefined) c.roughness = d.rugosidad;
          if (d.emision) { c.emissive = new THREE.Color(d.emision); c.emissiveIntensity = d.intensidad ?? 2; }
        }
        c.envMapIntensity = 0.9;
        return c;
      });
      o.material = Array.isArray(o.material) ? nuevos : nuevos[0];
    }
  });
  const caja = new THREE.Box3().setFromObject(modelo);
  const alto = caja.max.y - caja.min.y || 1.95;
  const esc = altura / alto;
  modelo.scale.setScalar(esc);
  modelo.position.y = -caja.min.y * esc;
  raiz.add(modelo);

  const mezclador = new THREE.AnimationMixer(modelo);
  const acciones = {};
  for (const clip of gltf.animations) {
    const a = mezclador.clipAction(clip);
    if (['Morir', 'Saltar', 'Agacharse'].includes(clip.name)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
    acciones[clip.name] = a;
  }
  let actual = null;
  function reproducir(nombre, fundido = 0.15, velocidad = 1) {
    const a = acciones[nombre];
    if (!a) return;
    a.timeScale = velocidad;
    if (actual === a) return;
    a.reset().fadeIn(fundido).play();
    if (actual) actual.fadeOut(fundido);
    actual = a;
  }
  return { raiz, modelo, mezclador, acciones, reproducir, get estado() { return actual ? actual.getClip().name : ''; } };
}

// ---------------------------------------------------------------- sonido
export class Sonido {
  constructor() { this.ctx = null; this.musica = null; this.volMusica = 0.22; this.volFx = 0.5; this.silencio = false; this.tono = 1; }
  activar() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.maestro = this.ctx.createGain(); this.maestro.gain.value = 1; this.maestro.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  nota(f, t0, dur, tipo = 'square', vol = 0.2, destino = null, deslizar = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t0);
    if (deslizar) o.frequency.linearRampToValueAtTime(f + deslizar, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(destino || this.maestro);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  ruido(t0, dur, vol = 0.2, destino = null, filtro = 2000) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = filtro;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(destino || this.maestro); s.start(t0);
  }
  fx(nombre, extra = 0) {
    if (!this.ctx || this.silencio) return;
    const t = this.ctx.currentTime, v = this.volFx;
    switch (nombre) {
      case 'moneda': { const k = Math.pow(2, Math.min(extra, 8) / 24); this.nota(988 * k, t, 0.07, 'square', 0.16 * v); this.nota(1319 * k, t + 0.06, 0.22, 'square', 0.16 * v); break; }
      case 'alerta': this.nota(700, t, 0.25, 'sine', 0.3 * v, null, 900); break;
      case 'puerta': [523, 659, 784, 1047].forEach((f, i) => this.nota(f, t + 0.3 + i * 0.03, 1.2, 'triangle', 0.12 * v)); this.ruido(t, 0.4, 0.12 * v, null, 800); break;
      case 'derrota': [392, 370, 349, 330].forEach((f, i) => this.nota(f, t + i * 0.4, i === 3 ? 1 : 0.38, 'sawtooth', 0.12 * v)); break;
      case 'victoria': [[523, 0, .12], [523, .12, .12], [523, .24, .12], [659, .36, .36], [784, .72, .24], [659, .96, .12], [784, 1.08, .24], [1047, 1.32, 1]].forEach(([f, d, l]) => this.nota(f, t + d, l, 'square', 0.12 * v)); break;
      case 'golpe': this.ruido(t, 0.3, 0.4 * v, null, 200); this.nota(110, t, 0.35, 'sine', 0.4 * v, null, -60); break;
      case 'salto': this.nota(330, t, 0.18, 'square', 0.1 * v, null, 400); break;
      case 'desliza': this.ruido(t, 0.25, 0.12 * v, null, 1200); break;
      case 'inicio': this.nota(880, t, 0.9, 'sine', 0.2 * v); this.nota(1320, t, 0.7, 'sine', 0.1 * v); break;
    }
  }
  // Música western sencilla en bucle (melodía original + bajo "bum-chic" + cascos)
  iniciarMusica(tempo = 126) {
    if (!this.ctx || this.musica) return;
    const ctx = this.ctx, bus = ctx.createGain(); bus.gain.value = this.silencio ? 0 : this.volMusica; bus.connect(this.maestro);
    const mel = [69, -1, 72, 74, 76, -1, 76, 74, 72, 74, 76, 79, 76, -1, -1, -1, 74, -1, 72, 71, 69, -1, 71, 72, 74, 72, 71, 67, 69, -1, -1, -1,
                 69, -1, 72, 74, 76, -1, 79, 81, 79, 76, 74, 76, 72, -1, 74, -1, 76, 74, 72, 71, 72, 71, 67, 71, 69, -1, 64, -1, 69, -1, -1, -1];
    const bajo = [45, 45, 48, 45, 50, 45, 43, 45, 45, 48, 43, 48, 50, 43, 45, 45];
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    let paso = 0, siguiente = ctx.currentTime + 0.1;
    const programar = () => {
      const corchea = 60 / (tempo * this.tono) / 2;
      while (siguiente < ctx.currentTime + 0.3) {
        const p = paso % mel.length, n = mel[p];
        if (n >= 0) { let l = 1; while (l < 4 && mel[(p + l) % mel.length] < 0) l++; this.nota(hz(n), siguiente, corchea * l * 0.9, 'square', 0.07, bus); this.nota(hz(n) * 2, siguiente, corchea * l * 0.6, 'sine', 0.03, bus); }
        const b = bajo[Math.floor(p / 4) % bajo.length];
        if (p % 4 === 0) this.nota(hz(b), siguiente, corchea * 1.5, 'triangle', 0.22, bus);
        if (p % 4 === 2) this.nota(hz(b + 7), siguiente, corchea * 1.1, 'triangle', 0.16, bus);
        if (p % 2 === 1) this.ruido(siguiente, 0.05, 0.05, bus, 5000);
        if (p % 4 === 0 || p % 4 === 3) this.nota(400, siguiente, 0.05, 'sine', 0.12, bus, -250);
        siguiente += corchea; paso++;
      }
    };
    this.musica = { bus, id: setInterval(programar, 60) };
    programar();
  }
  detenerMusica() { if (this.musica) { clearInterval(this.musica.id); this.musica.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); this.musica = null; } }
  alternarSilencio() { this.silencio = !this.silencio; if (this.musica) this.musica.bus.gain.value = this.silencio ? 0 : this.volMusica; }
}

// ---------------------------------------------------------------- texturas por código
function ruidoValor(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export function texturaCanvas(tam, dibujar, repetir = 1) {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const g = c.getContext('2d'); dibujar(g, tam, ruidoValor(7));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir, repetir);
  t.anisotropy = 4;
  return t;
}
export const texturas = {
  arena: (rep = 4) => texturaCanvas(256, (g, n, r) => {
    g.fillStyle = '#e8c48e'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = r(); g.fillStyle = v > 0.5 ? 'rgba(255,240,210,.18)' : 'rgba(150,100,50,.14)'; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(170,120,60,.12)'; g.lineWidth = 2;
    for (let y = 8; y < n; y += 22) { g.beginPath(); for (let x = 0; x <= n; x += 8) g.lineTo(x, y + Math.sin(x / 18 + y) * 3); g.stroke(); }
  }, rep),
  adobe: () => texturaCanvas(256, (g, n, r) => {
    g.fillStyle = '#b88a62'; g.fillRect(0, 0, n, n);
    const filas = 4, alto = n / filas;
    for (let f = 0; f < filas; f++) for (let c = -1; c < 3; c++) {
      const x = c * n / 2 + (f % 2) * n / 4, y = f * alto, k = 0.9 + r() * 0.18;
      g.fillStyle = `rgb(${220 * k | 0},${150 * k | 0},${104 * k | 0})`;
      g.fillRect(x + 4, y + 4, n / 2 - 8, alto - 8);
      for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(90,50,25,.12)'; g.fillRect(x + 4 + r() * (n / 2 - 8), y + 4 + r() * (alto - 8), 2, 2); }
    }
  }),
  madera: () => texturaCanvas(128, (g, n, r) => {
    for (let i = 0; i < 4; i++) { const k = 0.85 + r() * 0.2; g.fillStyle = `rgb(${140 * k | 0},${92 * k | 0},${56 * k | 0})`; g.fillRect(i * n / 4, 0, n / 4, n); g.fillStyle = 'rgba(40,20,10,.5)'; g.fillRect(i * n / 4, 0, 2, n); }
    g.strokeStyle = 'rgba(60,30,15,.25)'; for (let y = 0; y < n; y += 7) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(n / 3, y + 3, n / 2, y - 3, n, y + 1); g.stroke(); }
  }),
};

/** Texto como sprite (para números de ruta, coordenadas, carteles). */
export function textoSprite(texto, { color = '#fff', fondo = null, tam = 64, fuente = 'Rye, serif', escala = 1 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `${tam}px ${fuente}`;
  const w = Math.ceil(g.measureText(texto).width) + tam * 0.6, h = Math.ceil(tam * 1.4);
  c.width = w; c.height = h;
  const g2 = c.getContext('2d');
  if (fondo) { g2.fillStyle = fondo; g2.beginPath(); g2.roundRect(0, 0, w, h, h * 0.3); g2.fill(); }
  g2.font = `${tam}px ${fuente}`; g2.fillStyle = color; g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.fillText(texto, w / 2, h / 2 + tam * 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m); s.scale.set(w / h * escala, escala, 1);
  return s;
}

/** Texto plano acostado en el piso. */
export function textoPiso(texto, { color = 'rgba(80,40,20,.85)', tam = 96, fuente = 'Sniglet, sans-serif', alto = 0.6 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `800 ${tam}px ${fuente}`;
  const w = Math.ceil(g.measureText(texto).width) + 20, h = Math.ceil(tam * 1.3);
  c.width = w; c.height = h;
  const g2 = c.getContext('2d'); g2.font = `800 ${tam}px ${fuente}`; g2.fillStyle = color; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(texto, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * w / h, alto), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Decoración western hecha con primitivas. */
export function crearCactus(esc = 1, color = 0x4c8a52) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.6, 4, 10), mat); tronco.position.y = 1.0; g.add(tronco);
  const b1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 4, 8), mat); b1.position.set(0.42, 1.2, 0); g.add(b1);
  const b1h = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.3, 4, 8), mat); b1h.rotation.z = Math.PI / 2; b1h.position.set(0.25, 0.92, 0); g.add(b1h);
  const b2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), mat); b2.position.set(-0.38, 1.45, 0); g.add(b2);
  const b2h = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.26, 4, 8), mat); b2h.rotation.z = Math.PI / 2; b2h.position.set(-0.22, 1.2, 0); g.add(b2h);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.scale.setScalar(esc);
  return g;
}
export function crearBarril(tnt = false, esc = 1) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.95, 18), new THREE.MeshStandardMaterial({ color: tnt ? 0xb03a2e : 0x8b5a2b, roughness: 0.6 }));
  cuerpo.position.y = 0.475; g.add(cuerpo);
  const aro = new THREE.MeshStandardMaterial({ color: 0x2b2222, metalness: 0.6, roughness: 0.4 });
  for (const y of [0.2, 0.75]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.06, 18), aro); a.position.y = y; g.add(a); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(esc);
  return g;
}
export function crearRoca(esc = 1, r = Math.random) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshStandardMaterial({ color: 0xa8654a, roughness: 0.9, flatShading: true }));
  m.scale.set((1 + r() * 0.5) * esc, (0.55 + r() * 0.3) * esc, (0.9 + r() * 0.4) * esc);
  m.position.y = 0.2 * esc; m.rotation.y = r() * 6; m.castShadow = true;
  return m;
}

// Paleta de los Hermanos Óxido (mismo robot, oxidado)
export function coloresBandido(acento, poncho) {
  return {
    Metal_Claro: { color: 0xc77a45, metal: 0.55, rugosidad: 0.6 },
    Metal_Cuerpo: { color: 0x94502a, metal: 0.55, rugosidad: 0.65 },
    Metal_Extremidades: { color: 0x66381e, metal: 0.55, rugosidad: 0.65 },
    Poncho_Guindo: { color: poncho }, Poncho_Blanco: { color: acento }, Poncho_Plomo: { color: 0x1d1818 },
    Sombrero_Guindo: { color: 0x161414, rugosidad: 0.7 }, Sombrero_Cinta_Plomo: { color: acento },
    Visor: { color: 0x050506 }, Ojos: { color: acento, emision: acento, intensidad: 3 },
    Boca: { color: 0x2a2420 }, Insignia_Blanca: { color: 0x4a4038 },
  };
}

/** Avisa a la página del portal (si existe) de lo que pasa en el juego. */
export function avisarPortal(tipo, datos = {}) {
  try { if (window.parent && window.parent !== window) window.parent.postMessage({ origen: 'sheriff-juego', tipo, ...datos }, '*'); } catch (e) { /* sin portal */ }
}
