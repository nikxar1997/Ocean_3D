import * as THREE from "three";
import { sunDirection } from "../shared/sunDirection";

export class OceanGraphics {
  constructor() {
    this.mesh = null;
    this.material = null;
    this.geometry = null;

    this._dragMult = 0.38;
    this._waterDepth = 0.9;
    this._waveFreqMult = 1.18;
    this._waveTimeMult = 2.0;
    this._waveTimeGrowth = 1.02;
    this._waveWeightDecay = 0.22;
    this._scatterColor = new THREE.Color(0.0293, 0.0898, 0.2717);
  }

  setDragMult(v) {
    this._dragMult = v;
    if (this.material) this.material.uniforms.uDragMult.value = v;
  }
  setWaterDepth(v) {
    this._waterDepth = v;
    if (this.material) this.material.uniforms.uWaterDepth.value = v;
  }
  setWaveFreqMult(v) {
    this._waveFreqMult = v;
    if (this.material) this.material.uniforms.uWaveFreqMult.value = v;
  }
  setWaveSpeed(v) {
    this._waveTimeMult = v;
    if (this.material) this.material.uniforms.uWaveTimeMult.value = v;
  }
  setWaveTimeGrowth(v) {
    this._waveTimeGrowth = v;
    if (this.material) this.material.uniforms.uWaveTimeGrowth.value = v;
  }
  setWaveWeightDecay(v) {
    this._waveWeightDecay = v;
    if (this.material) this.material.uniforms.uWaveWeightDecay.value = v;
  }

  setScatterColor(color) {
    this._scatterColor.set(color);
    if (this.material) this.material.uniforms.uScatterColor.value.set(color);
  }

  init(scene) {
    if (this.mesh) return;

    this.geometry = new THREE.PlaneGeometry(2, 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        cameraPos: { value: new THREE.Vector3() },
        cameraMatrixWorld: { value: new THREE.Matrix4() },
        cameraProjectionMatrixInverse: { value: new THREE.Matrix4() },
        uSunDir: { value: sunDirection.direction },
        uDragMult: { value: this._dragMult },
        uWaterDepth: { value: this._waterDepth },
        uWaveFreqMult: { value: this._waveFreqMult },
        uWaveTimeMult: { value: this._waveTimeMult },
        uWaveTimeGrowth: { value: this._waveTimeGrowth },
        uWaveWeightDecay: { value: this._waveWeightDecay },
        uScatterColor: { value: this._scatterColor.clone() },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 0;
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
    this.material.uniforms.cameraPos.value.copy(camera.position);
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

uniform float iTime;
uniform vec3  iResolution;
uniform vec3  cameraPos;
uniform mat4  cameraMatrixWorld;
uniform mat4  cameraProjectionMatrixInverse;

uniform vec3  uSunDir;

uniform float uDragMult;
uniform float uWaterDepth;
uniform float uWaveFreqMult;
uniform float uWaveTimeMult;
uniform float uWaveTimeGrowth;
uniform float uWaveWeightDecay;
uniform vec3  uScatterColor;

#define ITERATIONS_RAYMARCH 12
#define ITERATIONS_NORMAL   36

vec2 wavedx(vec2 position, vec2 direction, float frequency, float timeshift) {
  float x    = dot(direction, position) * frequency + timeshift;
  float wave = exp(sin(x) - 1.0);
  return vec2(wave, -wave * cos(x));
}

float getwaves(vec2 position, int iterations) {
  float wavePhaseShift = length(position) * 0.1;
  float iter = 0.0, frequency = 1.0;
  float timeMultiplier = uWaveTimeMult;
  float weight = 1.0, sumOfValues = 0.0, sumOfWeights = 0.0;
  for (int i = 0; i < ITERATIONS_NORMAL; i++) {
    if (i >= iterations) break;
    vec2 p   = vec2(sin(iter), cos(iter));
    vec2 res = wavedx(position, p, frequency, iTime * timeMultiplier + wavePhaseShift);
    position     += p * res.y * weight * uDragMult;
    sumOfValues  += res.x * weight;
    sumOfWeights += weight;
    weight        = mix(weight, 0.0, uWaveWeightDecay);
    frequency    *= uWaveFreqMult;
    timeMultiplier *= uWaveTimeGrowth;
    iter += 1232.399963;
  }
  return sumOfValues / sumOfWeights;
}

float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth) {
  vec3 pos = start;
  vec3 dir = normalize(end - start);
  for (int i = 0; i < 64; i++) {
    float height = getwaves(pos.xz, ITERATIONS_RAYMARCH) * depth - depth;
    if (height + 0.01 > pos.y) return distance(pos, camera);
    pos += dir * (pos.y - height);
  }
  return distance(start, camera);
}

vec3 normal(vec2 pos, float e, float depth) {
  vec2 ex = vec2(e, 0.0);
  float H = getwaves(pos.xy, ITERATIONS_NORMAL) * depth;
  vec3 a  = vec3(pos.x, H, pos.y);
  return normalize(cross(
    a - vec3(pos.x - e, getwaves(pos.xy - ex.xy, ITERATIONS_NORMAL) * depth, pos.y),
    a - vec3(pos.x,     getwaves(pos.xy + ex.yx, ITERATIONS_NORMAL) * depth, pos.y + e)
  ));
}

float intersectPlane(vec3 origin, vec3 dir, vec3 point, vec3 n) {
  return clamp(dot(point - origin, n) / dot(dir, n), -1.0, 9991999.0);
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

float getSun(vec3 dir) {
  return pow(max(0.0, dot(dir, uSunDir)), 720.0) * 210.0;
}

vec3 aces_tonemap(vec3 color) {
  mat3 m1 = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
  mat3 m2 = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
  vec3 v = m1 * color;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));
}

vec3 getRay(vec2 fc) {
  vec2 ndc  = (fc / iResolution.xy) * 2.0 - 1.0;
  vec4 clip = vec4(ndc, -1.0, 1.0);
  vec4 view = cameraProjectionMatrixInverse * clip;
  view = vec4(view.xy, -1.0, 0.0);
  return normalize((cameraMatrixWorld * view).xyz);
}

void main() {
  vec3 ray = getRay(gl_FragCoord.xy);

  if (ray.y >= 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 origin       = cameraPos;
  float highHit     = intersectPlane(origin, ray, vec3(0.0),              vec3(0,1,0));
  float lowHit      = intersectPlane(origin, ray, vec3(0,-uWaterDepth,0), vec3(0,1,0));
  float dist        = raymarchwater(origin, origin + ray * highHit, origin + ray * lowHit, uWaterDepth);
  vec3  waterHitPos = origin + ray * dist;

  vec3 N = normal(waterHitPos.xz, 0.01, uWaterDepth);
  N = mix(N, vec3(0,1,0), 0.8 * min(1.0, sqrt(dist * 0.01) * 1.1));

  float fresnel = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-N, ray)), 5.0);

  vec3 R = normalize(reflect(ray, N));
  R.y = abs(R.y);

  vec3 reflection = getAtmosphere(R) + getSun(R);
  vec3 scattering = uScatterColor * 0.1
                  * (0.2 + (waterHitPos.y + uWaterDepth) / uWaterDepth);

  gl_FragColor = vec4(aces_tonemap((fresnel * reflection + scattering) * 2.0), 1.0);
}
`;
