// Materiales de los chunks: las texturas de bloques van en un
// DataArrayTexture (una capa por textura), de modo que un quad fusionado por
// el greedy meshing puede repetir su textura sin salirse de ella.
//
// La luz llega por vértice (luz de cielo y luz de bloque, ya convertidas a
// brillo). La hora del día solo cambia un uniform: no hay que recalcular mallas.

import * as THREE from 'three';
import { TEXTURE_NAMES } from './registry.js';
import { TEXTURE_SIZE, generateTexturePixels } from './textures.js';

const vertexShader = /* glsl */ `
  in vec2 aInfo;  // x: capa de textura, y: sombreado de la cara × AO
  in vec2 aLight; // x: brillo de la luz de cielo, y: brillo de la luz de bloque

  uniform float uTime;

  out vec2 vUv;
  flat out float vLayer;
  out float vShade;
  out vec2 vLight;
  out float vFogDepth;

  void main() {
    vUv = uv;
  #ifdef WATER
    vUv += vec2(uTime * 0.04, uTime * 0.07); // el agua se mueve despacito
  #endif
    vLayer = aInfo.x;
    vShade = aInfo.y;
    vLight = aLight;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = length(mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp sampler2DArray;

  uniform sampler2DArray uTextures;
  uniform float uDaylight;    // 1 de día, menos de noche
  uniform vec3 uSkyLightColor; // tono de la luz del cielo (azulado de noche)
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  in vec2 vUv;
  flat in float vLayer;
  in float vShade;
  in vec2 vLight;
  in float vFogDepth;

  out vec4 fragColor;

  const vec3 BLOCK_LIGHT_COLOR = vec3(1.0, 0.86, 0.66); // luz cálida de antorchas

  void main() {
    vec4 color = texture(uTextures, vec3(vUv, vLayer));
  #ifndef WATER
    if (color.a < 0.5) discard; // huecos de hojas, cristal y plantas
  #endif
    vec3 skyLight = uSkyLightColor * vLight.x * uDaylight;
    vec3 blockLight = BLOCK_LIGHT_COLOR * vLight.y;
    vec3 light = max(max(skyLight, blockLight), vec3(0.03));
    vec3 rgb = color.rgb * vShade * light;
    float fog = smoothstep(uFogNear, uFogFar, vFogDepth);
  #ifdef WATER
    fragColor = vec4(mix(rgb, uFogColor, fog), color.a);
  #else
    fragColor = vec4(mix(rgb, uFogColor, fog), 1.0);
  #endif
  }
`;

export function createBlockMaterials() {
  const texture = new THREE.DataArrayTexture(
    generateTexturePixels(),
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    TEXTURE_NAMES.length,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  // Uniforms compartidos por los dos materiales (el cielo los actualiza).
  const uniforms = {
    uTextures: { value: texture },
    uTime: { value: 0 },
    uDaylight: { value: 1 },
    uSkyLightColor: { value: new THREE.Vector3(1, 1, 1) },
    uFogColor: { value: new THREE.Vector3() },
    uFogNear: { value: 0 },
    uFogFar: { value: 1 },
  };

  const solid = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms });
  const water = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    defines: { WATER: '' },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide, // la superficie también se ve desde dentro del agua
  });
  return { solid, water, uniforms };
}
