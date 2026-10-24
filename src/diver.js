/**
 * Low-poly scuba diver that still reads from the front: mask with two lenses,
 * harness, tank valve over the shoulder, and wide fins. Local height is exactly
 * DIVER_HEIGHT_M (1.75 m, fins included). The caller scales the group by
 * world-units-per-metre so the figure matches the species.
 */
import * as THREE from 'three';
import { DIVER_HEIGHT_M } from './sizes.js';

export { DIVER_HEIGHT_M };

export function createDiver() {
  const g = new THREE.Group();
  g.name = 'scuba-diver';

  const suit = new THREE.MeshStandardMaterial({ color: 0x1a4f86, roughness: 0.55, metalness: 0.04 });
  const suitDark = new THREE.MeshStandardMaterial({ color: 0x12365c, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe6b896, roughness: 0.7 });
  const tankMetal = new THREE.MeshStandardMaterial({ color: 0xd5dbe3, roughness: 0.28, metalness: 0.72 });
  const tankBand = new THREE.MeshStandardMaterial({ color: 0xf2c143, roughness: 0.4, metalness: 0.2 });
  const maskFrame = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.35, metalness: 0.4 });
  const lens = new THREE.MeshStandardMaterial({
    color: 0x8fd4ea, emissive: 0x3aa0c4, emissiveIntensity: 0.55,
    roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.92,
  });
  const finM = new THREE.MeshStandardMaterial({ color: 0x19a39a, roughness: 0.45 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.55 });
  const hose = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.4 });

  const add = (mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = false;
    g.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, rx, ry, rz) =>
    add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, rx, ry, rz);
  const cap = (r, len, mat, x, y, z, rx, ry, rz) =>
    add(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 6), mat), x, y, z, rx, ry, rz);

  // Torso and hips — slight forward swim lean is applied on the whole group later.
  box(0.34, 0.42, 0.2, suit, 0, 1.12, 0.02);
  box(0.3, 0.16, 0.18, suitDark, 0, 0.84, 0.01);
  // Shoulder harness, visible from the front so the figure reads as scuba without the tank.
  box(0.06, 0.34, 0.08, strap, -0.1, 1.18, 0.1, 0.15, 0, 0.35);
  box(0.06, 0.34, 0.08, strap, 0.1, 1.18, 0.1, 0.15, 0, -0.35);
  box(0.22, 0.05, 0.08, strap, 0, 1.02, 0.12);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), tankBand), 0, 1.02, 0.15);

  // Head, hood, and a two-lens mask (not a single black bar).
  add(new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), skin), 0, 1.5, 0.03);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), suit), 0, 1.53, -0.01);
  box(0.16, 0.055, 0.03, maskFrame, 0, 1.52, 0.125);
  box(0.045, 0.04, 0.02, lens, -0.038, 1.525, 0.145);
  box(0.045, 0.04, 0.02, lens, 0.038, 1.525, 0.145);
  box(0.018, 0.03, 0.02, maskFrame, 0, 1.51, 0.14);
  // Second stage in the mouth, hose toward the tank.
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.05, 6), hose), 0, 1.45, 0.14, Math.PI / 2, 0, 0);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 5, 10, Math.PI), hose), 0.08, 1.38, 0.02, 0, 0.4, -0.6);

  // Tank on the back, valve and a yellow band peeking over the shoulder.
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.46, 8), tankMetal), 0.02, 1.12, -0.16);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.06, 8), tankBand), 0.02, 1.28, -0.16);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), tankMetal), 0.02, 1.4, -0.14);
  box(0.05, 0.08, 0.06, strap, 0, 1.22, -0.08);

  // Arms forward in a swim pose, short gloves so they are not bare tubes.
  cap(0.045, 0.28, suit, 0.24, 1.16, 0.1, 0.7, 0, -0.55);
  cap(0.045, 0.28, suit, -0.24, 1.16, 0.1, 0.7, 0, 0.55);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), suitDark), 0.36, 1.02, 0.22);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), suitDark), -0.36, 1.02, 0.22);

  // Legs and long fins.
  cap(0.055, 0.36, suit, 0.09, 0.52, 0.02, 0.12, 0, 0.04);
  cap(0.055, 0.36, suit, -0.09, 0.52, 0.02, 0.12, 0, -0.04);
  box(0.12, 0.02, 0.34, finM, 0.1, 0.18, 0.16, -0.35, 0.08, 0);
  box(0.12, 0.02, 0.34, finM, -0.1, 0.18, 0.16, -0.35, -0.08, 0);
  box(0.1, 0.025, 0.08, suitDark, 0.1, 0.22, 0.02);
  box(0.1, 0.025, 0.08, suitDark, -0.1, 0.22, 0.02);

  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g);
  const h = bounds.getSize(new THREE.Vector3()).y || 1;
  const k = DIVER_HEIGHT_M / h;
  const center = bounds.getCenter(new THREE.Vector3());
  g.scale.setScalar(k);
  g.position.copy(center).multiplyScalar(-k);

  const wrap = new THREE.Group();
  wrap.name = 'scuba-diver';
  wrap.add(g);
  wrap.userData.heightM = DIVER_HEIGHT_M;
  wrap.frustumCulled = false;
  wrap.traverse(o => { o.frustumCulled = false; });
  return wrap;
}
