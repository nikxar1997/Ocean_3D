import * as THREE from "three";
import { sunDirection } from "../shared/sunDirection";

export class SkyGraphics {
  constructor() {
    this.mesh = null;
    this.material = null;
    this.geometry = null;

    this._cloudScale = 0.0;
    this._cloudSpeed = 0.005;
    this._cloudDark = 0.5;
    this._cloudLight = 0.3;
    this._cloudCover = 0.2;
    this._cloudAlpha = 8.0;
    this._skyTint = 0.6;
    this._skyColour1 = new THREE.Color(0.03, 0.08, 0.18);
    this._skyColour2 = new THREE.Color(0.08, 0.15, 0.3);

    this._windDir = new THREE.Vector2(1.0, 0.3);
  }

  setCloudScale(v) {
    this._cloudScale = v;
    if (this.material) this.material.uniforms.uCloudScale.value = v;
  }
  setCloudSpeed(v) {
    this._cloudSpeed = v;
    if (this.material) this.material.uniforms.uCloudSpeed.value = v;
  }
  setCloudDark(v) {
    this._cloudDark = v;
    if (this.material) this.material.uniforms.uCloudDark.value = v;
  }
  setCloudLight(v) {
    this._cloudLight = v;
    if (this.material) this.material.uniforms.uCloudLight.value = v;
  }
  setCloudCover(v) {
    this._cloudCover = v;
    if (this.material) this.material.uniforms.uCloudCover.value = v;
  }
  setCloudAlpha(v) {
    this._cloudAlpha = v;
    if (this.material) this.material.uniforms.uCloudAlpha.value = v;
  }
  setSkyTint(v) {
    this._skyTint = v;
    if (this.material) this.material.uniforms.uSkyTint.value = v;
  }

  setSkyColour1(color) {
    this._skyColour1.set(color);
    if (this.material) this.material.uniforms.uSkyColour1.value.set(color);
  }
  setSkyColour2(color) {
    this._skyColour2.set(color);
    if (this.material) this.material.uniforms.uSkyColour2.value.set(color);
  }

  setWindDir(x, y) {
    this._windDir.set(x, y).normalize();
    if (this.material)
      this.material.uniforms.uWindDir.value.copy(this._windDir);
  }

  init(scene) {
    if (this.mesh) return;

    this.geometry = new THREE.PlaneGeometry(2, 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        cameraMatrixWorld: { value: new THREE.Matrix4() },
        cameraProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uSunDir: { value: sunDirection.direction },
        uCloudScale: { value: this._cloudScale },
        uCloudSpeed: { value: this._cloudSpeed },
        uCloudDark: { value: this._cloudDark },
        uCloudLight: { value: this._cloudLight },
        uCloudCover: { value: this._cloudCover },
        uCloudAlpha: { value: this._cloudAlpha },
        uSkyTint: { value: this._skyTint },
        uSkyColour1: { value: this._skyColour1.clone() },
        uSkyColour2: { value: this._skyColour2.clone() },
        uWindDir: { value: this._windDir.clone() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);

    this.onResize();
    window.addEventListener("resize", this.onResize);
  }

  onResize = () => {
    if (!this.material) return;
    this.material.uniforms.iResolution.value.set(
      window.innerWidth,
      window.innerHeight,
      1,
    );
  };

  update(time, camera) {
    if (!this.material) return;
    this.material.uniforms.iTime.value = time;
    this.material.uniforms.uSunDir.value.copy(sunDirection.direction);
    this.material.uniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
    this.material.uniforms.cameraProjectionMatrixInverse.value.copy(
      camera.projectionMatrixInverse,
    );
  }

  dispose(scene) {
    if (!this.mesh) return;
    window.removeEventListener("resize", this.onResize);
    scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.mesh = null;
    this.material = null;
    this.geometry = null;
  }
}

const VERT = /* glsl */ `
  void main() { gl_Position = vec4(position, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;

uniform float  iTime;
uniform vec3   iResolution;
uniform mat4   cameraMatrixWorld;
uniform mat4   cameraProjectionMatrixInverse;

uniform vec3   uSunDir;

uniform float  uCloudScale;
uniform float  uCloudSpeed;
uniform float  uCloudDark;
uniform float  uCloudLight;
uniform float  uCloudCover;
uniform float  uCloudAlpha;
uniform float  uSkyTint;
uniform vec3   uSkyColour1;
uniform vec3   uSkyColour2;
uniform vec2   uWindDir;



vec3 getRay(vec2 fc) {
  vec2 ndc  = (fc / iResolution.xy) * 2.0 - 1.0;
  vec4 clip = vec4(ndc, -1.0, 1.0);
  vec4 view = cameraProjectionMatrixInverse * clip;
  view = vec4(view.xy, -1.0, 0.0);
  return normalize((cameraMatrixWorld * view).xyz);
}



vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir) {
  float st   = 1.0 / (raydir.y * 1.0 + 0.1);
  float st2  = 1.0 / (sundir.y  * 11.0 + 1.0);
  float rsdt = pow(abs(dot(sundir, raydir)), 2.0);
  vec3  sunc = mix(vec3(1.0),
    max(vec3(0.0), vec3(1.0) - vec3(5.5,13.0,22.4) / 22.4), st2);
  vec3 bs  = vec3(5.5,13.0,22.4) / 22.4 * sunc;
  vec3 bs2 = max(vec3(0.0),
    bs - vec3(5.5,13.0,22.4) * 0.002 * (st - 6.0 * sundir.y * sundir.y));
  bs2 *= st * (0.24 + rsdt * 0.24);
  return bs2 * (1.0 + pow(1.0 - raydir.y, 3.0));
}

vec3 getAtmosphere(vec3 dir) {
  return extra_cheap_atmosphere(dir, uSunDir) * 0.5;
}


vec3 getSunContrib(vec3 dir) {
  float cosA  = dot(dir, uSunDir);
  float disc  = pow(max(0.0, cosA), 720.0) * 210.0;
  float corona = pow(max(0.0, cosA), 12.0) * 0.4;
  vec3 sunColor = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 1.0, 0.95), clamp(disc, 0.0, 1.0));
  return sunColor * (disc + corona);
}

vec3 aces_tonemap(vec3 color) {
  mat3 m1 = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
  mat3 m2 = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
  vec3 v = m1 * color;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
}

const mat2 cm = mat2(1.6, 1.2, -1.2, 1.6);

vec2 chash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float cnoise(in vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h * vec3(dot(a, chash(i)), dot(b, chash(i+o)), dot(c, chash(i+1.0)));
  return dot(n, vec3(70.0));
}

float fbm(vec2 n) {
  float total = 0.0, amp = 0.1;
  for (int i = 0; i < 7; i++) {
    total += cnoise(n) * amp;
    n = cm * n;
    amp *= 0.4;
  }
  return total;
}

vec3 cloudLayer(vec3 skyBase, vec2 p, vec3 ray) {
  vec2 uv = p * vec2(iResolution.x / iResolution.y, 1.0);


  vec2 windOffset = uWindDir * iTime * uCloudSpeed;

  float q = fbm((uv * uCloudScale * 0.5) + windOffset * 0.5);

  float r = 0.0;
  vec2 uv2 = uv * uCloudScale + windOffset - q;
  float weight = 0.8;
  for (int i = 0; i < 8; i++) {
    r += abs(weight * cnoise(uv2));
    uv2 = cm * uv2 + windOffset * 0.1;  
    weight *= 0.7;
  }

  float f = 0.0;
  uv2 = uv * uCloudScale + windOffset - q;
  weight = 0.7;
  for (int i = 0; i < 8; i++) {
    f += weight * cnoise(uv2);
    uv2 = cm * uv2 + windOffset * 0.1;
    weight *= 0.6;
  }
  f *= r + f;

  float c = 0.0;
  uv2 = uv * uCloudScale * 2.0 + windOffset * 1.3 - q;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c += weight * cnoise(uv2);
    uv2 = cm * uv2 + windOffset * 0.1;
    weight *= 0.6;
  }

  float c1 = 0.0;
  uv2 = uv * uCloudScale * 3.0 + windOffset * 1.7 - q;
  weight = 0.4;
  for (int i = 0; i < 7; i++) {
    c1 += abs(weight * cnoise(uv2));
    uv2 = cm * uv2 + windOffset * 0.1;
    weight *= 0.6;
  }
  c += c1;

  float sunFacing = max(0.0, dot(ray, uSunDir)); 
  vec3 cloudColour = vec3(1.1, 1.1, 0.9) * clamp(uCloudDark + uCloudLight * c, 0.0, 1.0);
  cloudColour = mix(cloudColour, cloudColour * vec3(1.05, 1.02, 0.95), sunFacing * 0.5);

  float coverage = uCloudCover + uCloudAlpha * f * r;

  vec3 skyGrad  = mix(uSkyColour2, uSkyColour1, p.y);
  vec3 skyFinal = mix(skyBase, skyGrad, uSkyTint);

  float horizonFade = smoothstep(0.0, 0.12, ray.y);

  return mix(skyFinal,
             clamp(uSkyTint * skyFinal + cloudColour, 0.0, 1.0),
             clamp(coverage + c, 0.0, 1.0) * horizonFade);
}

void main() {
  vec3 ray = getRay(gl_FragCoord.xy);

  if (ray.y < 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 atmo    = getAtmosphere(ray) + getSunContrib(ray);
  vec3 skyBase = aces_tonemap(atmo * 2.0);
  vec2 p       = gl_FragCoord.xy / iResolution.xy;

  vec3 finalColor = cloudLayer(skyBase, p, ray);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;
