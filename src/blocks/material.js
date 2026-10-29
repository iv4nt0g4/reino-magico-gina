// Material compartido por todos los chunks: las texturas de bloques van en
// un DataArrayTexture (una capa por textura), de modo que un quad fusionado
// por el greedy meshing puede repetir su textura sin salirse de ella.

import * as THREE from 'three';
import { TEXTURE_NAMES } from './registry.js';
import { TEXTURE_SIZE, generateTexturePixels } from './textures.js';

const vertexShader = /* glsl */ `
  in vec2 aInfo; // x: capa de textura, y: luz

  out vec2 vUv;
  flat out float vLayer;
  out float vLight;
  out float vFogDepth;

  void main() {
    vUv = uv;
    vLayer = aInfo.x;
    vLight = aInfo.y;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = length(mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp sampler2DArray;

  uniform sampler2DArray uTextures;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  in vec2 vUv;
  flat in float vLayer;
  in float vLight;
  in float vFogDepth;

  out vec4 fragColor;

  void main() {
    vec4 color = texture(uTextures, vec3(vUv, vLayer));
    if (color.a < 0.5) discard; // huecos de las hojas
    vec3 rgb = color.rgb * vLight;
    float fog = smoothstep(uFogNear, uFogFar, vFogDepth);
    fragColor = vec4(mix(rgb, uFogColor, fog), 1.0);
  }
`;

export function createBlockMaterial() {
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

  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTextures: { value: texture },
      uFogColor: { value: new THREE.Vector3() },
      uFogNear: { value: 0 },
      uFogFar: { value: 1 },
    },
  });
}

// La niebla se calcula en el shader con colores tal cual (espacio sRGB),
// igual que las texturas, para que el horizonte se funda con el cielo.
export function setFog(material, hexColor, near, far) {
  const u = material.uniforms;
  u.uFogColor.value.set(((hexColor >> 16) & 255) / 255, ((hexColor >> 8) & 255) / 255, (hexColor & 255) / 255);
  u.uFogNear.value = near;
  u.uFogFar.value = far;
}
