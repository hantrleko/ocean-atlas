/**
 * Low-poly stylized scuba diver. Local height is exactly DIVER_HEIGHT_M
 * (adult, fins included, 1.75 m — the 1.7–1.8 m band). The caller scales the
 * group by world-units-per-metre so the figure matches the species.
 */
import * as THREE from 'three';
import { DIVER_HEIGHT_M } from './sizes.js';

export { DIVER_HEIGHT_M };

export function createDiver() {
  const g = new THREE.Group();
  g.name = 'scuba-diver';
  const suit = new THREE.MeshStandardMaterial({
    color: 0x2f7de1, emissive: 0x1a5ec4, emissiveIntensity: 0.85, roughness: 0.45, metalness: 0.06,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe2b394, roughness: 0.72 });
  const tankM = new THREE.MeshStandardMaterial({
    color: 0xf0c84a, emissive: 0xffe14a, emissiveIntensity: 1.4, roughness: 0.35, metalness: 0.05, toneMapped: false,
  });
  const maskM = new THREE.MeshStandardMaterial({ color: 0x143044, roughness: 0.12, metalness: 0.35 });
  const finM = new THREE.MeshStandardMaterial({
    color: 0x1f8f8c, emissive: 0x1f8f8c, emissiveIntensity: 0.35, roughness: 0.48,
  });
  const strap = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.4, metalness: 0.2 });

  const add = (mesh, x, y, z, rx = 0, ry = 0, rz = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = false;
    g.add(mesh);
    return mesh;
  };

  // Roughly 1.75 m before the exact normalize below. Upright, slight swim lean.
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.46, 2, 6), suit), 0, 0.98, 0);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin), 0, 1.5, 0.02);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.05), maskM), 0, 1.5, 0.13);
  // Chest stripe faces the camera (+Z) so the figure still reads when the tank is behind the body.
  add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), tankM), 0, 1.08, 0.16);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.46, 7), tankM), 0, 1.05, -0.2);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), strap), 0, 1.22, -0.12);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.36, 2, 5), suit), 0.22, 1.08, 0.06, 0.45, 0, -0.4);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.36, 2, 5), suit), -0.22, 1.08, 0.06, 0.45, 0, 0.4);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 2, 5), suit), 0.09, 0.5, 0.02, 0.08, 0, 0);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 2, 5), suit), -0.09, 0.5, 0.02, 0.08, 0, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.28), finM), 0.09, 0.16, 0.1, -0.2, 0, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.28), finM), -0.09, 0.16, 0.1, -0.2, 0, 0);

  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const h = box.getSize(new THREE.Vector3()).y || 1;
  const k = DIVER_HEIGHT_M / h;
  const center = box.getCenter(new THREE.Vector3());
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
