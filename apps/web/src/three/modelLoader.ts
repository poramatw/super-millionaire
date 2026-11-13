import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_URLS = {
  tokens: [
    '/models/car/sedan-sports.glb', // 0: รถคลาสสิก
    '/models/watercraft/boat-sail-a.glb', // 1: เรือสำเภา
    '/models/cube-pets/animal-elephant.glb', // 2: ช้างศึก
    '/models/car/taxi.glb', // 3: ตุ๊กตุ๊ก/แท็กซี่
    '/models/mini-characters/character-male-a.glb', // 4: นักธุรกิจ/หมวกเศรษฐี
    '/models/pirate/chest.glb', // 5: หีบสมบัติ/ถุงทอง
  ],
  house: '/models/city-suburban/building-type-b.glb',
  hotel: '/models/city-commercial/building-skyscraper-a.glb',
  coin: '/models/toy-car/item-coin-gold.glb',
} as const;

export type FallbackModelKind = 'token' | 'house' | 'hotel' | 'coin';

const sharedLoader = new GLTFLoader();
const templateCache = new Map<string, Promise<THREE.Group>>();

function normalizeTemplate(rawScene: THREE.Group): THREE.Group {
  const wrapper = new THREE.Group();
  rawScene.updateMatrixWorld(true);

  rawScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(rawScene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const scale = 1 / maxDim;

  rawScene.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  rawScene.scale.setScalar(scale);
  wrapper.add(rawScene);
  wrapper.updateMatrixWorld(true);

  return wrapper;
}

export function loadNormalizedGLB(url: string, targetSize: number): Promise<THREE.Group> {
  let pending = templateCache.get(url);
  if (!pending) {
    pending = new Promise<THREE.Group>((resolve, reject) => {
      sharedLoader.load(
        url,
        (gltf) => {
          resolve(normalizeTemplate(gltf.scene));
        },
        undefined,
        (err) => {
          templateCache.delete(url);
          reject(err);
        },
      );
    });
    templateCache.set(url, pending);
  }

  return pending.then((template) => {
    const clone = template.clone(true);
    clone.scale.setScalar(targetSize);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  });
}

export function createFallbackModel(
  kind: FallbackModelKind,
  targetSize: number,
  color = '#E3BE3B',
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'house') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#EF5DA8', roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#C42B73', roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.52, 0.7), bodyMat);
    body.position.y = 0.26;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.42, 4), roofMat);
    roof.position.y = 0.73;
    roof.rotation.y = Math.PI / 4;
    body.castShadow = true;
    roof.castShadow = true;
    group.add(body, roof);
  } else if (kind === 'hotel') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#FF6B1A', roughness: 0.35 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#C94100', roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.0, 0.65), bodyMat);
    body.position.y = 0.5;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.45), roofMat);
    crown.position.y = 1.08;
    body.castShadow = true;
    crown.castShadow = true;
    group.add(body, crown);
  } else if (kind === 'coin') {
    const coinMat = new THREE.MeshStandardMaterial({
      color: '#F5C43D',
      metalness: 0.72,
      roughness: 0.25,
    });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.position.y = 0.42;
    coin.castShadow = true;
    group.add(coin);
  } else {
    const pawnMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.55, 18), pawnMat);
    base.position.y = 0.275;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), pawnMat);
    head.position.y = 0.68;
    base.castShadow = true;
    head.castShadow = true;
    group.add(base, head);
  }

  group.scale.setScalar(targetSize);
  return group;
}
