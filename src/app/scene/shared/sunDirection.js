import * as THREE from "three";

class SunDirection {
  constructor() {
    this._azimuthDeg = 55;
    this._elevationDeg = 45;
    this.direction = new THREE.Vector3();
    this._recompute();
  }

  set(azimuthDeg, elevationDeg) {
    this._azimuthDeg = azimuthDeg;
    this._elevationDeg = elevationDeg;
    this._recompute();
  }

  setElevation(elevationDeg) {
    this._elevationDeg = elevationDeg;
    this._recompute();
  }

  setAzimuth(azimuthDeg) {
    this._azimuthDeg = azimuthDeg;
    this._recompute();
  }

  _recompute() {
    const az = THREE.MathUtils.degToRad(this._azimuthDeg);
    const el = THREE.MathUtils.degToRad(this._elevationDeg);
    const cosEl = Math.cos(el);

    this.direction
      .set(cosEl * Math.sin(az), Math.sin(el), cosEl * Math.cos(az))
      .normalize();
  }
}

export const sunDirection = new SunDirection();
