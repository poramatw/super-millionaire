import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_URLS = {
  tokens: [
    '/models/cube-pets/animal-cat.glb', // 0: เหมียวนำโชค
    '/models/cube-pets/animal-dog.glb', // 1: ชิบะจอมลุย
    '/models/cube-pets/animal-panda.glb', // 2: แพนด้าเจ้าสัว
    '/models/cube-pets/animal-bunny.glb', // 3: ต่ายน้อยร้อยล้าน
    '/models/mini-characters/character-male-a.glb', // 4: หนุ่มน้อยนักลงทุน
    '/models/mini-characters/character-female-a.glb', // 5: สาวน้อยไฮโซ
    '/models/cube-pets/animal-penguin.glb', // 6: เพนกวินทักซิโด้
    '/models/cube-pets/animal-fox.glb', // 7: จิ้งจอกจอมดีล
    '/models/cube-pets/animal-chick.glb', // 8: ลูกเจี๊ยบเศรษฐี
    '/models/cube-pets/animal-elephant.glb', // 9: ช้างน้อยคู่บารมี
    '/models/mini-characters/character-male-b.glb', // 10: บาริสต้าหนุ่มชิค
    '/models/mini-characters/character-female-b.glb', // 11: คุณหนูนักช้อป
  ],
  house: '/models/city-suburban/building-type-d.glb',
  houseAlt: '/models/city-suburban/building-type-f.glb',
  hotel: '/models/city-commercial/building-skyscraper-b.glb',
  hotelAlt: '/models/city-commercial/building-skyscraper-c.glb',
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

function vinylMat(
  color: string,
  opts?: {
    roughness?: number;
    metalness?: number;
    clearcoat?: number;
    emissive?: string;
    emissiveIntensity?: number;
  },
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: opts?.roughness ?? 0.26,
    metalness: opts?.metalness ?? 0.04,
    clearcoat: opts?.clearcoat ?? 0.58,
    clearcoatRoughness: 0.18,
    emissive: opts?.emissive ?? '#000000',
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
  });
}

function goldMat(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: '#F6C844',
    roughness: 0.2,
    metalness: 0.82,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    emissive: '#B45309',
    emissiveIntensity: 0.1,
  });
}

function addCuteEyesAndBlush(
  headGroup: THREE.Group,
  eyeY = 0.02,
  eyeZ = 0.245,
  eyeSpread = 0.105,
  blushColor = '#F472B6',
): void {
  const darkEyeMat = vinylMat('#181311', { roughness: 0.08, clearcoat: 0.95 });
  const highlightMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const blushMat = vinylMat(blushColor, { roughness: 0.4, clearcoat: 0.2 });

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 16), darkEyeMat);
    eye.position.set(side * eyeSpread, eyeY, eyeZ);
    eye.scale.set(0.95, 1.12, 0.75);
    headGroup.add(eye);

    const specBig = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), highlightMat);
    specBig.position.set(side * eyeSpread + 0.011, eyeY + 0.013, eyeZ + 0.024);
    headGroup.add(specBig);

    const specSmall = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 8), highlightMat);
    specSmall.position.set(side * eyeSpread - 0.009, eyeY - 0.011, eyeZ + 0.023);
    headGroup.add(specSmall);

    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 12), blushMat);
    blush.position.set(side * (eyeSpread + 0.055), eyeY - 0.042, eyeZ - 0.02);
    blush.scale.set(1.25, 0.65, 0.5);
    headGroup.add(blush);
  }
}

function addMiniCrown(parent: THREE.Group, yPos: number, scale = 1): void {
  const crown = new THREE.Group();
  crown.position.y = yPos;
  const gMat = goldMat();
  const rubyMat = vinylMat('#E11D48', { roughness: 0.12, clearcoat: 0.9 });

  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.082, 0.048, 18), gMat);
  crown.add(baseRing);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.065, 10), gMat);
    spike.position.set(Math.cos(a) * 0.078, 0.045, Math.sin(a) * 0.078);
    crown.add(spike);

    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), i % 2 === 0 ? rubyMat : gMat);
    pearl.position.set(Math.cos(a) * 0.078, 0.08, Math.sin(a) * 0.078);
    crown.add(pearl);
  }

  crown.scale.setScalar(scale);
  parent.add(crown);
}

/**
 * Builds a high-craft, smooth-sculpted 3D Designer Vinyl Figurine for each of the 12 characters.
 * Uses glossy clearcoat materials, rounded anatomy, specular 3D eyes, and signature 3D accessories.
 */
export function createDesignerToyToken(
  tokenId: number,
  playerColor = '#E11D48',
  targetSize = 0.68,
): THREE.Group {
  const idx = ((Math.trunc(tokenId) % 12) + 12) % 12;
  const root = new THREE.Group();

  const accentMat = vinylMat(playerColor, { roughness: 0.22, clearcoat: 0.72 });
  const darkMat = vinylMat('#1F1916', { roughness: 0.25 });
  const whiteMat = vinylMat('#FFFDF9', { roughness: 0.24 });
  const creamMat = vinylMat('#FFF4E0', { roughness: 0.26 });
  const skinMat = vinylMat('#FFE0C2', { roughness: 0.28, clearcoat: 0.35 });
  const pinkMat = vinylMat('#F48FB1', { roughness: 0.3 });
  const gMat = goldMat();

  // Sculpted luxury toy plinth pad under feet
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.045, 28), gMat);
  pad.position.y = 0.0225;
  const innerPad = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.052, 28), accentMat);
  innerPad.position.y = 0.026;
  root.add(pad, innerPad);

  const fig = new THREE.Group();
  fig.position.y = 0.048;
  root.add(fig);

  if (idx === 0) {
    // 0: เหมียวนำโชค (Glossy Maneki-Neko Lucky Cat with Waving Paw & Gold Koban Coin)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.21, 28, 24), creamMat);
    body.position.y = 0.21;
    body.scale.set(1.02, 1.08, 0.94);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 22, 18), whiteMat);
    belly.position.set(0, 0.2, 0.09);
    belly.scale.set(0.95, 1.02, 0.6);
    fig.add(body, belly);

    // Collar & golden bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.024, 14, 28), accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.35;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), gMat);
    bell.position.set(0, 0.335, 0.175);
    fig.add(collar, bell);

    // Feet & waving paw + Koban coin
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), creamMat);
      foot.position.set(side * 0.11, 0.05, 0.07);
      foot.scale.set(1, 0.65, 1.3);
      fig.add(foot);
    }
    const leftWaveArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.11, 12, 16), creamMat);
    leftWaveArm.position.set(-0.2, 0.36, 0.08);
    leftWaveArm.rotation.z = 0.35;
    leftWaveArm.rotation.x = -0.3;
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.09, 12, 16), creamMat);
    rightArm.position.set(0.18, 0.24, 0.11);
    rightArm.rotation.z = -0.45;
    const koban = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.022, 20), gMat);
    koban.rotation.x = Math.PI / 2;
    koban.scale.set(0.82, 1, 1.25);
    koban.position.set(0.16, 0.22, 0.19);
    fig.add(leftWaveArm, rightArm, koban);

    // Curled tail
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.16, 10, 14), accentMat);
    tail.position.set(0, 0.18, -0.2);
    tail.rotation.x = 0.55;
    fig.add(tail);

    // Head & sculpted cat ears
    const head = new THREE.Group();
    head.position.y = 0.56;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.255, 32, 26), creamMat);
    skull.scale.set(1.08, 0.96, 0.96);
    head.add(skull);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.19, 18), creamMat);
      ear.position.set(side * 0.165, 0.21, 0.01);
      ear.rotation.z = -side * 0.32;
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 14), pinkMat);
      innerEar.position.set(side * 0.162, 0.2, 0.042);
      innerEar.rotation.z = -side * 0.32;
      head.add(ear, innerEar);
    }

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), whiteMat);
    snout.position.set(0, -0.035, 0.225);
    snout.scale.set(1.35, 0.85, 0.7);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), pinkMat);
    nose.position.set(0, -0.015, 0.268);
    head.add(snout, nose);
    addCuteEyesAndBlush(head, 0.02, 0.232, 0.105);
    fig.add(head);
  } else if (idx === 1) {
    // 1: ชิบะจอมลุย (Plump Shiba Inu with Bandana Scarf & Curled Tail)
    const shibaMat = vinylMat('#E68A32', { roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.215, 28, 24), shibaMat);
    body.position.y = 0.21;
    body.scale.set(1.0, 1.06, 0.95);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.155, 22, 18), creamMat);
    chest.position.set(0, 0.21, 0.09);
    chest.scale.set(0.92, 1.0, 0.62);
    fig.add(body, chest);

    // Bandana scarf in player color
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 14, 28), accentMat);
    scarfRing.rotation.x = Math.PI / 2;
    scarfRing.position.y = 0.35;
    const bandanaBib = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.13, 4), accentMat);
    bandanaBib.position.set(0, 0.29, 0.175);
    bandanaBib.rotation.x = Math.PI;
    bandanaBib.rotation.y = Math.PI / 4;
    fig.add(scarfRing, bandanaBib);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.066, 16, 14), creamMat);
      foot.position.set(side * 0.11, 0.05, 0.07);
      foot.scale.set(1, 0.68, 1.28);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.095, 12, 16), shibaMat);
      arm.position.set(side * 0.185, 0.23, 0.06);
      arm.rotation.z = -side * 0.38;
      fig.add(foot, arm);
    }

    // Donut curled Shiba tail
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.032, 12, 20, Math.PI * 1.45), shibaMat);
    tail.position.set(0, 0.25, -0.2);
    tail.rotation.y = Math.PI / 2;
    fig.add(tail);

    const head = new THREE.Group();
    head.position.y = 0.56;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.255, 32, 26), shibaMat);
    skull.scale.set(1.1, 0.96, 0.96);
    const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 20), creamMat);
    faceMask.position.set(0, -0.045, 0.09);
    faceMask.scale.set(1.08, 0.78, 0.82);
    head.add(skull, faceMask);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.18, 18), shibaMat);
      ear.position.set(side * 0.165, 0.21, 0.0);
      ear.rotation.z = -side * 0.28;
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), creamMat);
      brow.position.set(side * 0.085, 0.09, 0.23);
       brow.scale.set(1.2, 0.8, 0.6);
      head.add(ear, brow);
    }

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 16), creamMat);
    snout.position.set(0, -0.03, 0.235);
    snout.scale.set(1.2, 0.85, 0.85);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 14), darkMat);
    nose.position.set(0, -0.01, 0.285);
    head.add(snout, nose);
    addCuteEyesAndBlush(head, 0.025, 0.232, 0.105);
    fig.add(head);
  } else if (idx === 2) {
    // 2: แพนด้าเจ้าสัว (Tycoon Panda with Golden Top Hat, Silk Bow Tie & Gold Bullion)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.225, 28, 24), darkMat);
    body.position.y = 0.215;
    body.scale.set(1.06, 1.05, 0.96);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.175, 24, 20), whiteMat);
    belly.position.set(0, 0.195, 0.085);
    belly.scale.set(0.96, 0.94, 0.68);
    fig.add(body, belly);

    // Bow tie in player color
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.075, 12), accentMat);
      wing.position.set(side * 0.038, 0.355, 0.185);
      wing.rotation.z = side * (Math.PI / 2);
      fig.add(wing);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), gMat);
    knot.position.set(0, 0.355, 0.195);
    fig.add(knot);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 14), darkMat);
      foot.position.set(side * 0.115, 0.055, 0.07);
      foot.scale.set(1, 0.7, 1.25);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.095, 12, 16), darkMat);
      arm.position.set(side * 0.195, 0.24, 0.07);
      arm.rotation.z = -side * 0.4;
      fig.add(foot, arm);
    }

    const head = new THREE.Group();
    head.position.y = 0.565;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 26), whiteMat);
    skull.scale.set(1.1, 0.96, 0.98);
    head.add(skull);

    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 16), darkMat);
      ear.position.set(side * 0.205, 0.195, -0.01);
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), darkMat);
      patch.position.set(side * 0.105, 0.025, 0.205);
      patch.scale.set(1.05, 1.22, 0.5);
      patch.rotation.z = side * 0.22;
      head.add(ear, patch);
    }

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), whiteMat);
    snout.position.set(0, -0.035, 0.238);
    snout.scale.set(1.25, 0.85, 0.75);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 14), darkMat);
    nose.position.set(0, -0.015, 0.285);
    head.add(snout, nose);
    addCuteEyesAndBlush(head, 0.025, 0.242, 0.105);

    // Tycoon Top Hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.024, 24), darkMat);
    brim.position.y = 0.245;
    const crownHat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.092, 0.14, 24), darkMat);
    crownHat.position.y = 0.32;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.094, 0.032, 24), gMat);
    ribbon.position.y = 0.275;
    head.add(brim, crownHat, ribbon);
    fig.add(head);
  } else if (idx === 3) {
    // 3: ต่ายน้อยร้อยล้าน (Millionaire Plush Bunny with Long Sculpted Ears & Golden Carrot)
    const bunnyWhite = vinylMat('#FFF9FB', { roughness: 0.24 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 24), accentMat);
    body.position.y = 0.21;
    body.scale.set(0.98, 1.08, 0.92);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 14, 28), bunnyWhite);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.35;
    fig.add(body, collar);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), bunnyWhite);
      foot.position.set(side * 0.105, 0.05, 0.075);
      foot.scale.set(0.95, 0.65, 1.35);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.09, 12, 16), bunnyWhite);
      arm.position.set(side * 0.175, 0.23, 0.07);
      arm.rotation.z = -side * 0.35;
      fig.add(foot, arm);
    }

    const puffTail = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 16), bunnyWhite);
    puffTail.position.set(0, 0.14, -0.19);
    fig.add(puffTail);

    const head = new THREE.Group();
    head.position.y = 0.55;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 26), bunnyWhite);
    skull.scale.set(1.06, 0.96, 0.96);
    head.add(skull);

    // Long sculpted bunny ears (right ear playfully tilted)
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.105, 0.21, 0);
      earGroup.rotation.z = side === 1 ? -0.26 : 0.08;
      const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.22, 14, 20), bunnyWhite);
      outer.position.y = 0.12;
      outer.scale.set(1, 1, 0.58);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.17, 12, 16), pinkMat);
      inner.position.set(0, 0.12, 0.022);
      inner.scale.set(1, 1, 0.45);
      earGroup.add(outer, inner);
      head.add(earGroup);
    }

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), pinkMat);
    nose.position.set(0, -0.015, 0.248);
    head.add(nose);
    addCuteEyesAndBlush(head, 0.02, 0.228, 0.1);
    addMiniCrown(head, 0.235, 0.88);
    fig.add(head);
  } else if (idx === 4) {
    // 4: หนุ่มน้อยนักลงทุน (Chibi Young Investor in Tailored Suit & Golden Briefcase)
    const hairMat = vinylMat('#3B2314', { roughness: 0.32 });
    const pantsMat = vinylMat('#1E293B', { roughness: 0.35 });
    const tieMat = vinylMat('#E11D48', { roughness: 0.25 });

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.09, 12, 16), pantsMat);
      leg.position.set(side * 0.085, 0.095, 0);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), darkMat);
      shoe.position.set(side * 0.085, 0.038, 0.035);
      shoe.scale.set(0.95, 0.65, 1.35);
      fig.add(leg, shoe);
    }

    // Suit torso + white shirt + tie
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.17, 0.24, 24), accentMat);
    torso.position.y = 0.255;
    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 4), whiteMat);
    shirt.position.set(0, 0.29, 0.115);
    shirt.rotation.x = Math.PI;
    shirt.rotation.y = Math.PI / 4;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.13, 0.02), tieMat);
    tie.position.set(0, 0.275, 0.16);
    fig.add(torso, shirt, tie);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.11, 12, 16), accentMat);
      arm.position.set(side * 0.18, 0.255, 0.03);
      arm.rotation.z = -side * 0.28;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), skinMat);
      hand.position.set(side * 0.205, 0.175, 0.04);
      fig.add(arm, hand);
    }

    // Golden briefcase in right hand
    const briefcase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.105, 0.045), gMat);
    briefcase.position.set(0.235, 0.13, 0.05);
    fig.add(briefcase);

    // Chibi Head & Sculpted Layered Hair
    const head = new THREE.Group();
    head.position.y = 0.57;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.245, 32, 26), skinMat);
    skull.scale.set(1.05, 0.98, 0.96);
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.258, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    );
    hairCap.position.set(0, 0.02, -0.01);
    hairCap.rotation.x = -0.18;
    const bangs1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.14, 12, 16), hairMat);
    bangs1.position.set(-0.06, 0.14, 0.195);
    bangs1.rotation.z = 0.85;
    const bangs2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.12, 12, 16), hairMat);
    bangs2.position.set(0.08, 0.15, 0.19);
    bangs2.rotation.z = -0.75;
    head.add(skull, hairCap, bangs1, bangs2);
    addCuteEyesAndBlush(head, 0.0, 0.222, 0.098);
    fig.add(head);
  } else if (idx === 5) {
    // 5: สาวน้อยไฮโซ (Chibi Socialite Girl with Flared Dress, Golden Tiara & Handbag)
    const hairMat = vinylMat('#5C3317', { roughness: 0.3 });

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.09, 12, 16), skinMat);
      leg.position.set(side * 0.075, 0.09, 0);
      const boot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), whiteMat);
      boot.position.set(side * 0.075, 0.038, 0.03);
      boot.scale.set(0.95, 0.7, 1.3);
      fig.add(leg, boot);
    }

    // Flared A-line couture dress + pearl collar
    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.28, 28), accentMat);
    dress.position.y = 0.24;
    const pearls = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 12, 24), whiteMat);
    pearls.rotation.x = Math.PI / 2;
    pearls.position.y = 0.36;
    fig.add(dress, pearls);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.11, 12, 16), skinMat);
      arm.position.set(side * 0.165, 0.26, 0.03);
      arm.rotation.z = -side * 0.32;
      fig.add(arm);
    }

    // Luxury golden handbag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.095, 0.048), gMat);
    bag.position.set(0.21, 0.16, 0.06);
    fig.add(bag);

    const head = new THREE.Group();
    head.position.y = 0.57;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.245, 32, 26), skinMat);
    skull.scale.set(1.05, 0.98, 0.96);
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.265, 28, 24), hairMat);
    hairBack.position.set(0, -0.02, -0.045);
    hairBack.scale.set(1.08, 1.05, 0.95);
    const bangs = new THREE.Mesh(
      new THREE.SphereGeometry(0.252, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.44),
      hairMat,
    );
    bangs.position.y = 0.03;
    bangs.rotation.x = 0.22;
    head.add(skull, hairBack, bangs);
    addCuteEyesAndBlush(head, -0.005, 0.222, 0.098);
    addMiniCrown(head, 0.255, 0.92);
    fig.add(head);
  } else if (idx === 6) {
    // 6: เพนกวินทักซิโด้ (Royal Tuxedo Penguin with Crown & Bow Tie)
    const navyMat = vinylMat('#1E2638', { roughness: 0.22, clearcoat: 0.75 });
    const beakMat = vinylMat('#FFA000', { roughness: 0.25 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 26), navyMat);
    body.position.y = 0.31;
    body.scale.set(1.0, 1.24, 0.92);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.195, 26, 22), whiteMat);
    belly.position.set(0, 0.29, 0.085);
    belly.scale.set(0.92, 1.18, 0.65);
    fig.add(body, belly);

    for (const side of [-1, 1]) {
      const flipper = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.16, 12, 16), navyMat);
      flipper.position.set(side * 0.235, 0.3, 0.02);
      flipper.rotation.z = -side * 0.28;
      flipper.scale.set(0.65, 1, 1.2);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 12), beakMat);
      foot.position.set(side * 0.105, 0.04, 0.09);
      foot.scale.set(1.05, 0.5, 1.35);
      const wingTie = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.08, 12), accentMat);
      wingTie.position.set(side * 0.04, 0.41, 0.205);
      wingTie.rotation.z = side * (Math.PI / 2);
      fig.add(flipper, foot, wingTie);
    }

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.095, 16), beakMat);
    beak.position.set(0, 0.47, 0.245);
    beak.rotation.x = Math.PI / 2;
    fig.add(beak);

    const headProxy = new THREE.Group();
    headProxy.position.y = 0.51;
    addCuteEyesAndBlush(headProxy, 0.0, 0.195, 0.095);
    addMiniCrown(headProxy, 0.185, 0.95);
    fig.add(headProxy);
  } else if (idx === 7) {
    // 7: จิ้งจอกจอมดีล (Clever Fox in Waistcoat, Fluffy White-Tipped Tail & Gold Glasses)
    const foxMat = vinylMat('#E85D24', { roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 24), accentMat);
    body.position.y = 0.21;
    body.scale.set(1.0, 1.08, 0.92);
    const shirtFront = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 16), creamMat);
    shirtFront.position.set(0, 0.22, 0.095);
    shirtFront.scale.set(0.85, 1.0, 0.55);
    fig.add(body, shirtFront);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.064, 14, 12), darkMat);
      foot.position.set(side * 0.105, 0.05, 0.07);
      foot.scale.set(1, 0.68, 1.3);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.095, 12, 16), foxMat);
      arm.position.set(side * 0.18, 0.23, 0.06);
      arm.rotation.z = -side * 0.36;
      fig.add(foot, arm);
    }

    // Big fluffy fox tail with white tip
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0.06, 0.18, -0.2);
    tailGroup.rotation.x = 0.5;
    tailGroup.rotation.z = -0.35;
    const tailBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.14, 12, 16), foxMat);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.12, 16), creamMat);
    tailTip.position.y = 0.12;
    tailGroup.add(tailBase, tailTip);
    fig.add(tailGroup);

    const head = new THREE.Group();
    head.position.y = 0.555;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 26), foxMat);
    skull.scale.set(1.12, 0.94, 0.96);
    head.add(skull);

    for (const side of [-1, 1]) {
      const cheekTuft = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.14, 14), creamMat);
      cheekTuft.position.set(side * 0.22, -0.05, 0.06);
      cheekTuft.rotation.z = -side * 1.15;
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.21, 18), foxMat);
      ear.position.set(side * 0.175, 0.22, 0);
      ear.rotation.z = -side * 0.3;
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.14, 14), creamMat);
      innerEar.position.set(side * 0.172, 0.21, 0.042);
      innerEar.rotation.z = -side * 0.3;
      // Gold spectacles
      const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.0085, 10, 24), gMat);
      lensRing.position.set(side * 0.105, 0.02, 0.242);
      head.add(cheekTuft, ear, innerEar, lensRing);
    }

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.14, 18), creamMat);
    snout.position.set(0, -0.035, 0.255);
    snout.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 12), darkMat);
    nose.position.set(0, -0.035, 0.325);
    head.add(snout, nose);
    addCuteEyesAndBlush(head, 0.02, 0.228, 0.105);
    fig.add(head);
  } else if (idx === 8) {
    // 8: ลูกเจี๊ยบเศรษฐี (Plump Golden Millionaire Chick with Royal Crown & Scarf)
    const chickMat = vinylMat('#FFD54F', { roughness: 0.22, clearcoat: 0.68 });
    const beakMat = vinylMat('#FF7043', { roughness: 0.25 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.255, 32, 26), chickMat);
    body.position.y = 0.29;
    body.scale.set(1.06, 1.12, 1.0);
    fig.add(body);

    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.032, 14, 28), accentMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.18;
    fig.add(scarf);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 14), chickMat);
      wing.position.set(side * 0.255, 0.29, 0.02);
      wing.scale.set(0.48, 1.1, 0.85);
      wing.rotation.z = -side * 0.35;
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), beakMat);
      foot.position.set(side * 0.1, 0.038, 0.08);
      foot.scale.set(1.0, 0.5, 1.3);
      fig.add(wing, foot);
    }

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.08, 16), beakMat);
    beak.position.set(0, 0.33, 0.265);
    beak.rotation.x = Math.PI / 2;
    fig.add(beak);

    const headProxy = new THREE.Group();
    headProxy.position.y = 0.37;
    addCuteEyesAndBlush(headProxy, 0.0, 0.23, 0.105, '#FF8A65');
    addMiniCrown(headProxy, 0.22, 0.95);
    fig.add(headProxy);
  } else if (idx === 9) {
    // 9: ช้างน้อยคู่บารมี (Royal Baby Elephant with Raised Trunk, Tusks & Thai Gold Crown)
    const eleMat = vinylMat('#B8C7D4', { roughness: 0.25, clearcoat: 0.6 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 24), eleMat);
    body.position.y = 0.215;
    body.scale.set(1.06, 1.05, 0.96);

    const royalGarment = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.215, 0.16, 24), accentMat);
    royalGarment.position.y = 0.21;
    const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.024, 14, 28), gMat);
    goldTrim.rotation.x = Math.PI / 2;
    goldTrim.position.y = 0.35;
    fig.add(body, royalGarment, goldTrim);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.09, 16), eleMat);
      foot.position.set(side * 0.11, 0.045, 0.055);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 12, 16), eleMat);
      arm.position.set(side * 0.195, 0.23, 0.05);
      arm.rotation.z = -side * 0.35;
      fig.add(foot, arm);
    }

    const head = new THREE.Group();
    head.position.y = 0.555;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 26), eleMat);
    skull.scale.set(1.06, 0.96, 0.96);
    head.add(skull);

    // Big sculpted elephant ears with pink inner cushions
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 18), eleMat);
      ear.position.set(side * 0.255, 0.01, -0.02);
      ear.scale.set(0.38, 1.15, 0.92);
      ear.rotation.y = -side * 0.25;
      const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), pinkMat);
      innerEar.position.set(side * 0.25, 0.0, 0.015);
      innerEar.scale.set(0.32, 0.95, 0.78);
      innerEar.rotation.y = -side * 0.25;
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.085, 12), whiteMat);
      tusk.position.set(side * 0.072, -0.06, 0.245);
      tusk.rotation.x = Math.PI * 0.38;
      head.add(ear, innerEar, tusk);
    }

    // Playfully raised curved trunk
    const trunkBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.11, 12, 16), eleMat);
    trunkBase.position.set(0, -0.03, 0.245);
    trunkBase.rotation.x = 0.65;
    const trunkTip = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), eleMat);
    trunkTip.position.set(0, 0.025, 0.315);
    head.add(trunkBase, trunkTip);

    addCuteEyesAndBlush(head, 0.03, 0.222, 0.115);
    addMiniCrown(head, 0.24, 1.02);
    fig.add(head);
  } else if (idx === 10) {
    // 10: บาริสต้าหนุ่มชิค (Hipster Boy with Ribbed Beanie, Round Glasses & Iced Coffee)
    const hairMat = vinylMat('#2D1E17', { roughness: 0.32 });
    const denimMat = vinylMat('#334155', { roughness: 0.38 });

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.09, 12, 16), denimMat);
      leg.position.set(side * 0.085, 0.095, 0);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), whiteMat);
      shoe.position.set(side * 0.085, 0.038, 0.035);
      shoe.scale.set(0.95, 0.65, 1.35);
      fig.add(leg, shoe);
    }

    const hoodie = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.175, 0.24, 24), accentMat);
    hoodie.position.y = 0.255;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.19, 0.04), darkMat);
    apron.position.set(0, 0.23, 0.145);
    fig.add(hoodie, apron);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.11, 12, 16), accentMat);
      arm.position.set(side * 0.18, 0.255, 0.04);
      arm.rotation.z = -side * 0.3;
      fig.add(arm);
    }

    // Takeaway coffee cup in left hand
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.095, 16), whiteMat);
    cup.position.set(-0.21, 0.21, 0.09);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.042, 16), gMat);
    sleeve.position.set(-0.21, 0.21, 0.09);
    fig.add(cup, sleeve);

    const head = new THREE.Group();
    head.position.y = 0.565;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.245, 32, 26), skinMat);
    skull.scale.set(1.05, 0.98, 0.96);
    head.add(skull);

    // Beanie cap with rolled cuff
    const beanieDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.255, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.54),
      accentMat,
    );
    beanieDome.position.y = 0.04;
    const beanieCuff = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.042, 14, 32), hairMat);
    beanieCuff.rotation.x = Math.PI / 2 - 0.12;
    beanieCuff.position.y = 0.11;
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 14), gMat);
    pom.position.y = 0.3;
    head.add(beanieDome, beanieCuff, pom);

    for (const side of [-1, 1]) {
      const glass = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 10, 24), gMat);
      glass.position.set(side * 0.1, 0.0, 0.238);
      head.add(glass);
    }
    addCuteEyesAndBlush(head, 0.0, 0.222, 0.1);
    fig.add(head);
  } else {
    // 11: คุณหนูนักช้อป (Shopper Girl with Bouncy Twin-Tails, Beret Hat & Shopping Bag)
    const hairMat = vinylMat('#D97724', { roughness: 0.28 });

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.09, 12, 16), skinMat);
      leg.position.set(side * 0.075, 0.09, 0);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), accentMat);
      shoe.position.set(side * 0.075, 0.038, 0.03);
      shoe.scale.set(0.95, 0.7, 1.3);
      fig.add(leg, shoe);
    }

    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.225, 0.27, 28), accentMat);
    dress.position.y = 0.24;
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 12, 24), gMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.25;
    fig.add(dress, belt);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.11, 12, 16), skinMat);
      arm.position.set(side * 0.165, 0.255, 0.03);
      arm.rotation.z = -side * 0.32;
      fig.add(arm);
    }

    const shopBag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.05), pinkMat);
    shopBag.position.set(-0.21, 0.16, 0.05);
    fig.add(shopBag);

    const head = new THREE.Group();
    head.position.y = 0.565;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.245, 32, 26), skinMat);
    skull.scale.set(1.05, 0.98, 0.96);
    const bangs = new THREE.Mesh(
      new THREE.SphereGeometry(0.255, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.48),
      hairMat,
    );
    bangs.position.y = 0.025;
    head.add(skull, bangs);

    // Bouncy sculpted twin-tails
    for (const side of [-1, 1]) {
      const tieBall = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), gMat);
      tieBall.position.set(side * 0.245, 0.08, -0.02);
      const tailPuff = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.13, 12, 16), hairMat);
      tailPuff.position.set(side * 0.295, -0.01, -0.03);
      tailPuff.rotation.z = side * 0.38;
      head.add(tieBall, tailPuff);
    }

    // Cute French Beret Hat
    const beret = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), accentMat);
    beret.position.set(0.03, 0.22, -0.01);
    beret.scale.set(1.18, 0.45, 1.15);
    beret.rotation.z = -0.16;
    head.add(beret);

    addCuteEyesAndBlush(head, -0.005, 0.222, 0.098);
    fig.add(head);
  }

  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // Normalize height to targetSize
  root.scale.setScalar(targetSize / 0.92);
  return root;
}

/**
 * Creates a sculpted 3D House or Grand Hotel colored with the owner's character color
 * so players can immediately recognize whose buildings stand on each tile.
 */
export function createOwnerBuildingMesh(
  kind: 'house' | 'hotel',
  ownerColor = '#E3BE3B',
  targetSize = 0.4,
): THREE.Group {
  const group = new THREE.Group();
  const roofMat = vinylMat(ownerColor, {
    roughness: 0.24,
    clearcoat: 0.65,
    emissive: ownerColor,
    emissiveIntensity: 0.14,
  });
  const wallMat = vinylMat('#FFFDF7', { roughness: 0.36, clearcoat: 0.25 });
  const trimMat = vinylMat(ownerColor, { roughness: 0.3, clearcoat: 0.5 });
  const winMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  const gMat = goldMat();

  if (kind === 'house') {
    // Boutique Villa with owner-colored pitched roof, awning, chimney & glowing windows
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.72), trimMat);
    baseTrim.position.y = 0.04;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.48, 0.62), wallMat);
    walls.position.y = 0.32;

    // Pitched hip roof in owner's signature color
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.44, 4), roofMat);
    roof.position.y = 0.76;
    roof.rotation.y = Math.PI / 4;

    // Gold finial on roof peak
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), gMat);
    finial.position.y = 0.99;

    // Chimney in owner color
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), trimMat);
    chimney.position.set(0.18, 0.82, -0.14);

    // Front door & owner-colored awning
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.04), trimMat);
    door.position.set(0, 0.2, 0.31);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.12), roofMat);
    awning.position.set(0, 0.34, 0.34);

    // Side windows
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.03), winMat);
      win.position.set(side * 0.2, 0.36, 0.31);
      group.add(win);
    }

    group.add(baseTrim, walls, roof, finial, chimney, door, awning);
  } else {
    // Luxury Grand Hotel Tower in owner's color with golden crown spire
    const podium = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.76), trimMat);
    podium.position.y = 0.11;

    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.62), wallMat);
    tower.position.y = 0.61;

    // Vertical owner-colored corner pilasters
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), roofMat);
        pilaster.position.set(sx * 0.32, 0.61, sz * 0.29);
        group.add(pilaster);
      }
    }

    // Illuminated window bands
    for (let floor = 0; floor < 3; floor++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.64), winMat);
      band.position.y = 0.38 + floor * 0.22;
      group.add(band);
    }

    // Owner-colored grand mansard roof + golden crown spire
    const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 0.7), gMat);
    roofDeck.position.y = 1.04;

    const mansard = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.28, 4), roofMat);
    mansard.position.y = 1.22;
    mansard.rotation.y = Math.PI / 4;

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), gMat);
    spire.position.y = 1.48;

    group.add(podium, tower, roofDeck, mansard, spire);
  }

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  group.scale.setScalar(targetSize);
  return group;
}

/**
 * Creates a minimal-realistic 3D miniature landmark for a specific board tile.
 * Pops up on the inner edge of the tile when a player lands on it or owns it.
 */
export function createTileLandmarkModel(
  tileIndex: number,
  ownerColor: string | null = null,
  targetSize = 0.48,
): THREE.Group {
  const idx = ((tileIndex % 40) + 40) % 40;
  const group = new THREE.Group();

  const accentHex = ownerColor ?? '#E3BE3B';
  const accentMat = vinylMat(accentHex, {
    roughness: 0.26,
    clearcoat: 0.6,
    emissive: accentHex,
    emissiveIntensity: ownerColor ? 0.16 : 0.06,
  });
  const marbleMat = vinylMat('#FFFDF9', { roughness: 0.32, clearcoat: 0.35 });
  const terracottaMat = vinylMat('#C2593F', { roughness: 0.42, clearcoat: 0.25 });
  const gMat = goldMat();

  // Base pedestal disc with owner/theme ring
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 20), marbleMat);
  plinth.position.y = 0.03;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.028, 10, 24), accentMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(plinth, ring);

  // 5 Grand Hotels (#4, #5, #15, #25, #35)
  if (idx === 4 || idx === 5 || idx === 15 || idx === 25 || idx === 35) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.62, 16), marbleMat);
    tower.position.y = 0.37;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), accentMat);
    dome.position.y = 0.68;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10), gMat);
    crown.position.y = 0.88;
    group.add(tower, dome, crown);
  } else if (idx === 12 || idx === 28) {
    // Utilities: #12 การไฟฟ้า (Turbine Tower), #28 การประปา (Water Sphere Tower)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.62, 12), marbleMat);
    mast.position.y = 0.36;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      idx === 12 ? gMat : accentMat,
    );
    globe.position.y = 0.68;
    group.add(mast, globe);
  } else if (idx === 39) {
    // #39 เสาชิงช้า (Giant Red Swing)
    const redMat = vinylMat(ownerColor ?? '#DC2626', { roughness: 0.25, clearcoat: 0.65 });
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.78, 12), redMat);
      pillar.position.set(side * 0.16, 0.44, 0);
      pillar.rotation.z = -side * 0.04;
      group.add(pillar);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), redMat);
    crossbar.position.y = 0.82;
    const pediment = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 16, Math.PI), gMat);
    pediment.position.y = 0.84;
    group.add(crossbar, pediment);
  } else if (idx === 1 || idx === 2 || idx === 3 || idx === 23 || idx === 24 || idx === 26 || idx === 27) {
    // Golden Bell Chedi / Lanna Pagoda (กรุงเทพฯ, นครปฐม, นนทบุรี, เชียงใหม่, เชียงราย, แม่ฮ่องสอน, ลำปาง)
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), marbleMat);
    step1.position.y = 0.11;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), accentMat);
    step2.position.y = 0.21;
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 18), gMat);
    bell.position.y = 0.44;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 12), gMat);
    spire.position.y = 0.74;
    group.add(step1, step2, bell, spire);
  } else if (idx === 6 || idx === 8 || idx === 9 || idx === 29 || idx === 31 || idx === 32) {
    // Ancient Prang / Victory Monument (อยุธยา, ลพบุรี, สระบุรี, ขอนแก่น, อุดรธานี, นครราชสีมา)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), terracottaMat);
    base.position.y = 0.13;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, 0.46, 8), accentMat);
    body.position.y = 0.43;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), gMat);
    top.position.y = 0.68;
    top.scale.set(1, 1.5, 1);
    group.add(base, body, top);
  } else if (idx === 11 || idx === 13 || idx === 14) {
    // Bridge / Arch Pavilion (กาญจนบุรี, ราชบุรี, สุพรรณบุรี)
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 10, 20, Math.PI), accentMat);
    arch.position.y = 0.16;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.18), gMat);
    deck.position.y = 0.16;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.42, 10), terracottaMat);
    tower.position.set(0, 0.37, -0.05);
    group.add(arch, deck, tower);
  } else if (idx === 16 || idx === 18 || idx === 19 || idx === 21 || idx === 34) {
    // Coastal Resort / Palm & Lighthouse (ภูเก็ต, สุราษฎร์ธานี, สงขลา, เพชรบุรี, พัทยา)
    const villa = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.24), marbleMat);
    villa.position.set(-0.05, 0.23, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.2, 4), accentMat);
    roof.position.set(-0.05, 0.5, 0);
    roof.rotation.y = Math.PI / 4;
    const palmTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.04, 0.48, 8),
      terracottaMat,
    );
    palmTrunk.position.set(0.14, 0.28, 0.04);
    palmTrunk.rotation.z = -0.18;
    const palmCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      vinylMat('#10B981', { roughness: 0.35 }),
    );
    palmCrown.position.set(0.18, 0.52, 0.04);
    palmCrown.scale.set(1.3, 0.55, 1.3);
    group.add(villa, roof, palmTrunk, palmCrown);
  } else {
    // Modern Metropolis / Special Tile Monument (#37 ดอนเมือง, Start, etc.)
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.28), marbleMat);
    tower.position.y = 0.32;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), accentMat);
    cap.position.y = 0.61;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 12), gMat);
    spire.position.y = 0.77;
    group.add(tower, cap, spire);
  }

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  group.scale.setScalar(targetSize);
  return group;
}

export function createFallbackModel(
  kind: FallbackModelKind,
  targetSize: number,
  color = '#E3BE3B',
  tokenId = 0,
): THREE.Group {
  if (kind === 'token') {
    return createDesignerToyToken(tokenId, color, targetSize);
  }
  if (kind === 'house' || kind === 'hotel') {
    return createOwnerBuildingMesh(kind, color, targetSize);
  }

  const group = new THREE.Group();
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

  group.scale.setScalar(targetSize);
  return group;
}
