// Cielo y ciclo de día y noche: cúpula con degradado, sol y luna en pixel
// art, estrellas y nubes de bloques que avanzan con el viento.
//
// La hora es un número de 0 a 1: 0 = amanecer, 0,25 = mediodía,
// 0,5 = atardecer y 0,75 = medianoche.

import * as THREE from 'three';

// Colores del cielo [arriba, horizonte] en tres momentos.
const DAY = [0x4fa8f0, 0xa8dcff];
const SUNSET = [0x6c7cd0, 0xffb27a];
const NIGHT = [0x0b1030, 0x1d2858];
const UNDERWATER = 0x1d4f9a;

const SKY_DISTANCE = 150; // radio de la cúpula (dentro del plano lejano de la cámara)
const CLOUD_HEIGHT = 108;
const CLOUD_CELL = 8; // bloques por celda de nube
const CLOUD_GRID = 64; // celdas por lado de la "baldosa" de nubes (se repite)
const CLOUD_TILE = CLOUD_CELL * CLOUD_GRID;
const WIND_SPEED = 1.2; // bloques por segundo

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Los shaders del cielo, las nubes y los bloques escriben el color tal cual,
// así que los colores se guardan sin convertir a espacio lineal.
const displayColor = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

function mixColor(a, b, t) {
  return displayColor(a).lerp(displayColor(b), t);
}

// Dibuja una textura pequeña en pixel art con una función (x, y) → color o null.
function pixelTexture(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = paint(x, y);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const sunTexture = () =>
  pixelTexture(16, (x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d < 3) return '#fffbe0';
    if (d < 5) return '#ffe680';
    if (d < 6) return '#ffc94a';
    // Rayos en las diagonales y los ejes.
    if (d < 8 && (x === 7 || x === 8 || y === 7 || y === 8 || x === y || x === 15 - y)) return '#ffd560';
    return null;
  });

const moonTexture = () =>
  pixelTexture(16, (x, y) => {
    if (Math.hypot(x - 7.5, y - 7.5) > 6.2) return null; // luna redonda
    const craters = [[6, 5, 1.6], [10, 9, 1.2], [5, 10, 1]];
    if (craters.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r)) return '#b9bfd8';
    return x + y < 11 ? '#ffffff' : '#e4e8fa'; // un poco de volumen
  });

// Malla de nubes: celdas llenas según un ruido que se repite cada CLOUD_GRID celdas.
function buildCloudGeometry() {
  const hash = (x, y) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // Ruido de valor suavizado y periódico, dos octavas.
  const value = (x, y, period) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const at = (i, j) => hash(((i % period) + period) % period, ((j % period) + period) % period);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
    const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  };
  const filled = (i, j) => {
    i = ((i % CLOUD_GRID) + CLOUD_GRID) % CLOUD_GRID;
    j = ((j % CLOUD_GRID) + CLOUD_GRID) % CLOUD_GRID;
    return value(i / 8, j / 8, 8) * 0.7 + value(i / 2, j / 2, 32) * 0.3 > 0.58;
  };

  const positions = [];
  const shades = [];
  const C = CLOUD_CELL, H = 4;
  const quad = (points, shade) => {
    const [a, b, c, d] = points;
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let k = 0; k < 6; k++) shades.push(shade);
  };
  for (let j = 0; j < CLOUD_GRID; j++) {
    for (let i = 0; i < CLOUD_GRID; i++) {
      if (!filled(i, j)) continue;
      const x0 = i * C, x1 = x0 + C, z0 = j * C, z1 = z0 + C;
      quad([[x0, H, z0], [x0, H, z1], [x1, H, z1], [x1, H, z0]], 1); // arriba
      quad([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]], 0.75); // abajo
      if (!filled(i + 1, j)) quad([[x1, 0, z0], [x1, H, z0], [x1, H, z1], [x1, 0, z1]], 0.9);
      if (!filled(i - 1, j)) quad([[x0, 0, z1], [x0, H, z1], [x0, H, z0], [x0, 0, z0]], 0.9);
      if (!filled(i, j + 1)) quad([[x1, 0, z1], [x1, H, z1], [x0, H, z1], [x0, 0, z1]], 0.85);
      if (!filled(i, j - 1)) quad([[x0, 0, z0], [x0, H, z0], [x1, H, z0], [x1, 0, z0]], 0.85);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aShade', new THREE.Float32BufferAttribute(shades, 1));
  return geometry;
}

export class Sky {
  constructor(scene, camera, blockUniforms, settings, viewDistance) {
    this.camera = camera;
    this.blockUniforms = blockUniforms;
    this.settings = settings;
    this.viewDistance = viewDistance;
    this.time = settings.startTime;
    this.elapsed = 0; // segundos de juego (para el viento y el agua)
    this.horizon = new THREE.Color();
    this.group = new THREE.Group();
    scene.add(this.group);

    // Cúpula con degradado.
    this.domeUniforms = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(SKY_DISTANCE, 24, 12),
      new THREE.ShaderMaterial({
        uniforms: this.domeUniforms,
        vertexShader: /* glsl */ `
          varying float vHeight;
          void main() {
            vHeight = normalize(position).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          varying float vHeight;
          void main() {
            gl_FragColor = vec4(mix(uHorizon, uTop, smoothstep(0.0, 0.6, vHeight)), 1.0);
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    dome.renderOrder = -4;
    this.group.add(dome);

    // Estrellas: puntos fijos en la esfera que giran con la noche.
    const starPositions = [];
    for (let i = 0; i < 700; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue;
      starPositions.push(...v.normalize().multiplyScalar(SKY_DISTANCE * 0.95).toArray());
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    // El cielo se dibuja antes que el terreno y sin profundidad, para que el
    // terreno lo tape siempre. Por eso nada del cielo es "transparent" (Three.js
    // dibuja lo transparente al final): las estrellas se suman al color del
    // cielo y se apagan bajando su color a negro.
    this.starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.stars = new THREE.Points(starGeometry, this.starMaterial);
    this.stars.renderOrder = -3;
    this.group.add(this.stars);

    // Sol y luna.
    const disc = (texture, size) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, depthWrite: false, depthTest: false, fog: false }),
      );
      mesh.renderOrder = -2;
      this.group.add(mesh);
      return mesh;
    };
    this.sun = disc(sunTexture(), 28);
    this.moon = disc(moonTexture(), 18);

    // Nubes: la misma malla repetida 3×3 alrededor de la cámara.
    this.cloudUniforms = {
      uColor: { value: new THREE.Color() },
      uFadeNear: { value: viewDistance * 0.45 },
      uFadeFar: { value: viewDistance * 0.95 },
    };
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: this.cloudUniforms,
      vertexShader: /* glsl */ `
        attribute float aShade;
        varying float vShade;
        varying float vDistance;
        void main() {
          vShade = aShade;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDistance = length(mv.xz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uFadeNear;
        uniform float uFadeFar;
        varying float vShade;
        varying float vDistance;
        void main() {
          float alpha = 0.85 * (1.0 - smoothstep(uFadeNear, uFadeFar, vDistance));
          if (alpha <= 0.01) discard;
          gl_FragColor = vec4(uColor * vShade, alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cloudGeometry = buildCloudGeometry();
    this.clouds = [];
    for (let k = 0; k < 9; k++) {
      const mesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
      mesh.frustumCulled = false;
      mesh.renderOrder = 1; // después del terreno
      scene.add(mesh);
      this.clouds.push(mesh);
    }
  }

  // Distancia de visión en bloques (niebla y nubes se ajustan a ella).
  setViewDistance(viewDistance) {
    this.viewDistance = viewDistance;
    this.cloudUniforms.uFadeNear.value = viewDistance * 0.45;
    this.cloudUniforms.uFadeFar.value = viewDistance * 0.95;
  }

  // Elevación del sol: 1 a mediodía, 0 en el horizonte, -1 a medianoche.
  get sunElevation() {
    return Math.sin(this.time * Math.PI * 2);
  }

  // Avanza el reloj (solo mientras se juega).
  advance(dt) {
    this.elapsed += dt;
    this.time = (this.time + dt / this.settings.dayLengthSeconds) % 1;
  }

  // Coloca el cielo alrededor de la cámara y actualiza colores y luz.
  update(underwater) {
    const cam = this.camera.position;
    const e = this.sunElevation;
    this.group.position.copy(cam);

    // Colores del cielo según la altura del sol.
    let top, horizon;
    if (e >= 0.25) [top, horizon] = DAY.map(displayColor);
    else if (e >= 0) {
      const t = e / 0.25;
      top = mixColor(SUNSET[0], DAY[0], t);
      horizon = mixColor(SUNSET[1], DAY[1], t);
    } else {
      const t = Math.min(1, -e / 0.2);
      top = mixColor(SUNSET[0], NIGHT[0], t);
      horizon = mixColor(SUNSET[1], NIGHT[1], t);
    }
    // Estrellas: aparecen al anochecer y giran despacio.
    const angle = this.time * Math.PI * 2;
    const night = smoothstep(0.05, -0.25, e);
    this.starMaterial.color.setScalar(night);
    this.stars.visible = night > 0.01 && !underwater;
    this.stars.rotation.z = angle;

    // Luz del cielo para los bloques: nunca negra del todo, algo azulada de noche.
    const N = this.settings.nightDaylight;
    const daylight = N + (1 - N) * smoothstep(-0.18, 0.15, e);
    const u = this.blockUniforms;
    u.uDaylight.value = daylight;
    u.uSkyLightColor.value.set(1 - 0.25 * night, 1 - 0.15 * night, 1);
    u.uTime.value = this.elapsed;

    // Bajo el agua todo se vuelve azul: cielo y niebla, que además se acerca.
    if (underwater) top = horizon = displayColor(UNDERWATER).multiplyScalar(Math.max(0.35, daylight));
    this.horizon.copy(horizon);
    this.domeUniforms.uTop.value.copy(top);
    this.domeUniforms.uHorizon.value.copy(horizon);
    u.uFogColor.value.set(horizon.r, horizon.g, horizon.b);
    u.uFogNear.value = underwater ? 1 : this.viewDistance * 0.6;
    u.uFogFar.value = underwater ? 22 : this.viewDistance;

    // Sol y luna, opuestos, recorriendo el cielo de este a oeste.
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.25).normalize();
    this.sun.position.copy(dir).multiplyScalar(SKY_DISTANCE * 0.9);
    this.moon.position.copy(dir).multiplyScalar(-SKY_DISTANCE * 0.9);
    this.sun.lookAt(cam);
    this.moon.lookAt(cam);

    // Nubes: se mueven con el viento y se tiñen con la luz del día.
    this.cloudUniforms.uColor.value.setRGB(daylight, daylight, Math.min(1, daylight * 1.08));
    const offset = (this.elapsed * WIND_SPEED) % CLOUD_TILE;
    const baseX = Math.floor((cam.x - offset) / CLOUD_TILE) * CLOUD_TILE + offset;
    const baseZ = Math.floor(cam.z / CLOUD_TILE) * CLOUD_TILE;
    this.clouds.forEach((mesh, k) => {
      mesh.position.set(baseX + ((k % 3) - 1) * CLOUD_TILE, CLOUD_HEIGHT, baseZ + (Math.floor(k / 3) - 1) * CLOUD_TILE);
    });
  }
}

