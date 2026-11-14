import * as THREE from 'three';
import type { BoardMapTheme } from '@super-millionaire/shared';
import { loadNormalizedGLB } from './modelLoader';

export interface EnvironmentPalette {
  backgroundHex: string;
  fogHex: string;
  tableClothHex: string;
  tableRoughness: number;
  rimHex: string;
  ambientIntensity: number;
}

export interface BoardEnvironmentController {
  group: THREE.Group;
  palette: EnvironmentPalette;
  update: (elapsedSec: number) => void;
  dispose: () => void;
}

const PALETTES: Record<BoardMapTheme, EnvironmentPalette> = {
  siam_park: {
    backgroundHex: '#0d261f',
    fogHex: '#0d261f',
    tableClothHex: '#0b4f5c',
    tableRoughness: 0.25,
    rimHex: '#4a2c16',
    ambientIntensity: 1.05,
  },
  bangkok_metro: {
    backgroundHex: '#091022',
    fogHex: '#091022',
    tableClothHex: '#0a1c36',
    tableRoughness: 0.28,
    rimHex: '#25314d',
    ambientIntensity: 0.98,
  },
  tropical_island: {
    backgroundHex: '#082c3f',
    fogHex: '#082c3f',
    tableClothHex: '#096986',
    tableRoughness: 0.2,
    rimHex: '#8c6239',
    ambientIntensity: 1.1,
  },
  royal_palace: {
    backgroundHex: '#1c0d16',
    fogHex: '#1c0d16',
    tableClothHex: '#1b1128',
    tableRoughness: 0.26,
    rimHex: '#785015',
    ambientIntensity: 1.04,
  },
};

function makeRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  const rad = Math.min(r, hw * 0.48, hd * 0.48);
  s.moveTo(-hw + rad, -hd);
  s.lineTo(hw - rad, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + rad);
  s.lineTo(hw, hd - rad);
  s.quadraticCurveTo(hw, hd, hw - rad, hd);
  s.lineTo(-hw + rad, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - rad);
  s.lineTo(-hw, -hd + rad);
  s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd);
  return s;
}

function makeOrganicBlobShape(radiusX: number, radiusZ: number, seed = 1): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wave =
      1 +
      Math.sin(a * 3 + seed * 1.7) * 0.12 +
      Math.cos(a * 2 - seed * 2.3) * 0.09 +
      Math.sin(a * 5 + seed) * 0.04;
    pts.push(new THREE.Vector2(Math.cos(a) * radiusX * wave, Math.sin(a) * radiusZ * wave));
  }
  const shape = new THREE.Shape();
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  shape.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i]!;
    const next = pts[(i + 1) % pts.length]!;
    shape.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  return shape;
}

/**
 * Multi-layered contoured terrain island with beveled cliff strata and lush top cap
 * inspired by stylized 3D diorama game scenes.
 */
function createSteppedTerrainMassif(opts: {
  x: number;
  z: number;
  baseY?: number;
  rotY?: number;
  seed?: number;
  tiers: Array<{
    rx: number;
    rz: number;
    height: number;
    cliffHex: string;
    topHex: string;
    offsetX?: number;
    offsetZ?: number;
  }>;
}): THREE.Group {
  const group = new THREE.Group();
  group.position.set(opts.x, opts.baseY ?? -0.45, opts.z);
  if (opts.rotY) group.rotation.y = opts.rotY;

  let currentY = 0;
  opts.tiers.forEach((tier, i) => {
    const shape = makeOrganicBlobShape(tier.rx, tier.rz, (opts.seed ?? 1) + i * 3.1);
    const cliffGeo = new THREE.ExtrudeGeometry(shape, {
      depth: tier.height,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 3,
      curveSegments: 18,
    });
    cliffGeo.rotateX(-Math.PI / 2);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: tier.cliffHex,
      roughness: 0.82,
      metalness: 0.04,
    });
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.set(tier.offsetX ?? 0, currentY, tier.offsetZ ?? 0);
    cliffMesh.castShadow = true;
    cliffMesh.receiveShadow = true;
    group.add(cliffMesh);

    const capShape = makeOrganicBlobShape(
      tier.rx * 0.98,
      tier.rz * 0.98,
      (opts.seed ?? 1) + i * 3.1,
    );
    const capGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
      curveSegments: 18,
    });
    capGeo.rotateX(-Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({
      color: tier.topHex,
      roughness: 0.58,
      metalness: 0.04,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.position.set(tier.offsetX ?? 0, currentY + tier.height + 0.02, tier.offsetZ ?? 0);
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;
    group.add(capMesh);

    currentY += tier.height + 0.05;
  });

  return group;
}

/**
 * Stylized hexagonal/polygonal cliff rock columns & coastal boulders.
 */
function createCliffColumnCluster(
  x: number,
  z: number,
  rockHex: string,
  capHex: string,
  count = 6,
  scale = 1,
): THREE.Group {
  const cluster = new THREE.Group();
  cluster.position.set(x, -0.45, z);
  const rockMat = new THREE.MeshStandardMaterial({ color: rockHex, roughness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: capHex, roughness: 0.55 });

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i * 0.3;
    const dist = i === 0 ? 0 : 0.36 + (i % 2) * 0.22;
    const h = (0.45 + ((i * 37) % 10) * 0.09) * scale;
    const r = (0.24 + ((i * 19) % 5) * 0.04) * scale;

    const col = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 1.08, h, 7), rockMat);
    col.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
    col.rotation.y = i * 0.7;
    col.castShadow = true;
    col.receiveShadow = true;

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.94, 0.07 * scale, 7), capMat);
    cap.position.set(Math.cos(angle) * dist, h + 0.03 * scale, Math.sin(angle) * dist);
    cap.rotation.y = i * 0.7;
    cap.castShadow = true;
    cluster.add(col, cap);
  }
  return cluster;
}

/**
 * Dramatic Corner Mountain Cliff with an Animated Cascading Waterfall & Plunge Pool Foam.
 */
function createWaterfallMountain(
  x: number,
  z: number,
  rotY: number,
  cliffHex: string,
  topHex: string,
  waterHex: string,
  updaters: Array<(t: number) => void>,
): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = rotY;

  const massif = createSteppedTerrainMassif({
    x: 0,
    z: 0,
    baseY: -0.45,
    seed: 12,
    tiers: [
      { rx: 2.35, rz: 2.15, height: 0.55, cliffHex, topHex },
      { rx: 1.85, rz: 1.65, height: 0.65, cliffHex, topHex, offsetZ: -0.18 },
      { rx: 1.32, rz: 1.2, height: 0.68, cliffHex, topHex, offsetZ: -0.32 },
      { rx: 0.82, rz: 0.75, height: 0.58, cliffHex, topHex, offsetZ: -0.42 },
    ],
  });
  root.add(massif);

  // Upper spring pool + cascading water streams down the front (+Z) face
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: waterHex,
    emissive: waterHex,
    emissiveIntensity: 0.22,
    roughness: 0.14,
    metalness: 0.08,
    clearcoat: 0.9,
    transparent: true,
    opacity: 0.88,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: '#E0F7FA',
    emissive: '#B2EBF2',
    emissiveIntensity: 0.35,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
  });

  const cascade = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.05, 0.24), waterMat);
  cascade.position.set(0, 0.68, 0.82);
  cascade.rotation.x = -0.36;
  root.add(cascade);

  // Animated falling water droplets / mist bubbles at the base of the waterfall
  const foamBalls: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.11 + (i % 3) * 0.035, 12, 10),
      foamMat,
    );
    ball.position.set((i - 3.5) * 0.11, -0.25, 1.32 + (i % 2) * 0.12);
    root.add(ball);
    foamBalls.push(ball);
  }

  const rippleRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.72, 28), foamMat);
  rippleRing.rotation.x = -Math.PI / 2;
  rippleRing.position.set(0, -0.34, 1.42);
  root.add(rippleRing);

  updaters.push((t) => {
    foamBalls.forEach((b, idx) => {
      const pulse = 0.82 + Math.sin(t * 5.2 + idx * 1.1) * 0.28;
      b.scale.setScalar(pulse);
      b.position.y = -0.26 + Math.abs(Math.sin(t * 4.0 + idx)) * 0.14;
    });
    const rScale = 1 + Math.sin(t * 3.2) * 0.14;
    rippleRing.scale.set(rScale, rScale, 1);
  });

  return root;
}

/**
 * Sculpted 3D Arched Bridge connecting the Central Board Citadel across the water moat.
 */
function createArchedBridge(opts: {
  x: number;
  z: number;
  rotY: number;
  deckHex: string;
  railHex: string;
  trimHex?: string;
}): THREE.Group {
  const bridge = new THREE.Group();
  bridge.position.set(opts.x, -0.36, opts.z);
  bridge.rotation.y = opts.rotY;

  const deckMat = new THREE.MeshStandardMaterial({ color: opts.deckHex, roughness: 0.6 });
  const railMat = new THREE.MeshStandardMaterial({ color: opts.railHex, roughness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: opts.trimHex ?? '#F6C844',
    metalness: 0.68,
    roughness: 0.25,
  });

  const segments = 9;
  const span = 2.05;
  const width = 1.05;
  for (let i = 0; i < segments; i++) {
    const u = i / (segments - 1) - 0.5;
    const archY = Math.cos(u * Math.PI) * 0.26;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, span / segments + 0.03), deckMat);
    plank.position.set(0, archY, u * span);
    plank.rotation.x = Math.sin(u * Math.PI) * 0.24;
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);

    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 8), railMat);
        post.position.set(side * (width * 0.45), archY + 0.14, u * span);
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), goldMat);
        finial.position.set(side * (width * 0.45), archY + 0.29, u * span);
        bridge.add(post, finial);
      }
    }
  }

  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, span * 0.96), railMat);
    beam.position.set(side * (width * 0.45), 0.28, 0);
    bridge.add(beam);
  }

  return bridge;
}

/**
 * Multi-clustered Stylized Foliage Tree (7 organic canopy clusters + branching trunk).
 */
function createLushClusterTree(
  trunkColor = '#5D4037',
  canopyPalette: [string, string, string] = ['#2E7D32', '#43A047', '#66BB6A'],
  scale = 1,
): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.82 });
  const c0 = new THREE.MeshStandardMaterial({ color: canopyPalette[0], roughness: 0.55 });
  const c1 = new THREE.MeshStandardMaterial({ color: canopyPalette[1], roughness: 0.5 });
  const c2 = new THREE.MeshStandardMaterial({ color: canopyPalette[2], roughness: 0.46 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.72, 10), trunkMat);
  trunk.position.y = 0.36;
  trunk.castShadow = true;
  tree.add(trunk);

  const boughL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.36, 8), trunkMat);
  boughL.position.set(-0.12, 0.62, 0.04);
  boughL.rotation.z = 0.55;
  const boughR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.34, 8), trunkMat);
  boughR.position.set(0.13, 0.64, -0.04);
  boughR.rotation.z = -0.52;
  tree.add(boughL, boughR);

  const puffs: Array<[number, number, number, number, THREE.Material]> = [
    [0, 0.88, 0, 0.4, c0],
    [-0.24, 0.82, 0.14, 0.31, c0],
    [0.25, 0.84, -0.1, 0.32, c1],
    [-0.14, 1.06, -0.14, 0.32, c1],
    [0.16, 1.08, 0.14, 0.3, c1],
    [0, 1.24, 0.02, 0.29, c2],
    [-0.08, 1.34, -0.02, 0.21, c2],
  ];

  for (const [px, py, pz, r, mat] of puffs) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat);
    puff.position.set(px, py, pz);
    puff.scale.set(1.08, 0.88, 1.05);
    puff.castShadow = true;
    puff.receiveShadow = true;
    tree.add(puff);
  }

  tree.scale.setScalar(scale);
  return tree;
}

/**
 * Gracefully curved Coconut Palm with segmented trunk & arched fronds.
 */
function createPalmTree(scale = 1): THREE.Group {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#8D5B36', roughness: 0.78 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#2EBD59',
    roughness: 0.46,
    side: THREE.DoubleSide,
  });
  const coconutMat = new THREE.MeshStandardMaterial({ color: '#4E342E', roughness: 0.58 });

  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 - t * 0.045, 0.12 - t * 0.04, 0.28, 10),
      trunkMat,
    );
    seg.position.set(t * t * 0.28, 0.13 + i * 0.24, 0);
    seg.rotation.z = -t * 0.28;
    seg.castShadow = true;
    palm.add(seg);
  }

  const topPos = new THREE.Vector3(0.24, 1.54, 0);
  for (let f = 0; f < 7; f++) {
    const angle = (f / 7) * Math.PI * 2;
    const frondGroup = new THREE.Group();
    frondGroup.position.copy(topPos);
    frondGroup.rotation.y = angle;

    const innerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.18), leafMat);
    innerBlade.position.set(0.2, 0.02, 0);
    innerBlade.rotation.z = -0.15;
    const outerBlade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 5), leafMat);
    outerBlade.position.set(0.56, -0.12, 0);
    outerBlade.rotation.z = -Math.PI / 2 - 0.52;
    outerBlade.scale.set(0.35, 1, 1.5);
    innerBlade.castShadow = true;
    outerBlade.castShadow = true;
    frondGroup.add(innerBlade, outerBlade);
    palm.add(frondGroup);
  }

  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2;
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), coconutMat);
    coco.position.set(topPos.x + Math.cos(a) * 0.085, topPos.y - 0.07, topPos.z + Math.sin(a) * 0.085);
    palm.add(coco);
  }

  palm.scale.setScalar(scale);
  return palm;
}

/**
 * Multi-tiered Thai Royal Sala Pavilion with stepped terrace, columns & golden spire.
 */
function createThaiSalaPavilion(
  roofColor = '#C92A2A',
  goldColor = '#F5C43D',
  scale = 1,
): THREE.Group {
  const sala = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#F8F3E6', roughness: 0.42 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.36 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.38 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: goldColor,
    metalness: 0.72,
    roughness: 0.24,
  });

  const lowerPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 1.75), baseMat);
  lowerPlinth.position.y = 0.08;
  const upperPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 1.48), baseMat);
  upperPlinth.position.y = 0.22;
  const goldTrimBase = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.05, 1.54), goldMat);
  goldTrimBase.position.y = 0.3;
  lowerPlinth.castShadow = true;
  upperPlinth.castShadow = true;
  sala.add(lowerPlinth, upperPlinth, goldTrimBase);

  const offsets = [-0.54, 0.54];
  for (const ox of offsets) {
    for (const oz of offsets) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.96, 12), pillarMat);
      pillar.position.set(ox, 0.78, oz);
      pillar.castShadow = true;
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.07, 0.08, 12), goldMat);
      capital.position.set(ox, 1.24, oz);
      sala.add(pillar, capital);
    }
  }

  const eaveTrim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 1.72), goldMat);
  eaveTrim.position.y = 1.28;

  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(1.36, 0.52, 4), roofMat);
  roof1.position.y = 1.55;
  roof1.rotation.y = Math.PI / 4;
  roof1.castShadow = true;

  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(0.98, 0.46, 4), roofMat);
  roof2.position.y = 1.88;
  roof2.rotation.y = Math.PI / 4;
  roof2.castShadow = true;

  const roof3 = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.4, 4), roofMat);
  roof3.position.y = 2.18;
  roof3.rotation.y = Math.PI / 4;

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.65, 12), goldMat);
  spire.position.y = 2.62;
  spire.castShadow = true;

  sala.add(eaveTrim, roof1, roof2, roof3, spire);
  sala.scale.setScalar(scale);
  return sala;
}

/**
 * Lathe-sculpted Thai Golden Bell Chedi (พระเจดีย์ทองคำทรงระฆัง)
 */
function createGoldenBellChedi(scale = 1): THREE.Group {
  const chedi = new THREE.Group();
  const marbleMat = new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.35 });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: '#F5C43D',
    metalness: 0.82,
    roughness: 0.18,
    clearcoat: 0.65,
    emissive: '#B45309',
    emissiveIntensity: 0.12,
  });

  const base1 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 1.45), marbleMat);
  base1.position.y = 0.09;
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.18, 1.16), goldMat);
  base2.position.y = 0.25;
  chedi.add(base1, base2);

  const profile = [
    new THREE.Vector2(0.0, 0.32),
    new THREE.Vector2(0.52, 0.32),
    new THREE.Vector2(0.46, 0.46),
    new THREE.Vector2(0.38, 0.56),
    new THREE.Vector2(0.42, 0.72),
    new THREE.Vector2(0.36, 0.98),
    new THREE.Vector2(0.22, 1.22),
    new THREE.Vector2(0.16, 1.38),
    new THREE.Vector2(0.11, 1.65),
    new THREE.Vector2(0.06, 1.98),
    new THREE.Vector2(0.015, 2.38),
    new THREE.Vector2(0.0, 2.48),
  ];
  const bellGeo = new THREE.LatheGeometry(profile, 28);
  const bellMesh = new THREE.Mesh(bellGeo, goldMat);
  bellMesh.castShadow = true;
  bellMesh.receiveShadow = true;
  chedi.add(bellMesh);

  chedi.scale.setScalar(scale);
  return chedi;
}

/**
 * Illuminated Riverfront Ferris Wheel for Bangkok Metro.
 */
function createFerrisWheel(scale = 1, updaters: Array<(t: number) => void>): THREE.Group {
  const root = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    metalness: 0.65,
    roughness: 0.28,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const goldNeonMat = new THREE.MeshStandardMaterial({
    color: '#FACC15',
    emissive: '#EAB308',
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  // Base platform & A-frame legs
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 1.1), frameMat);
  platform.position.y = 0.09;
  root.add(platform);

  const hubY = 1.65;
  for (const sideZ of [-0.32, 0.32]) {
    for (const sideX of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.75, 10), frameMat);
      leg.position.set(sideX * 0.46, 0.88, sideZ);
      leg.rotation.z = sideX * 0.26;
      root.add(leg);
    }
  }

  const wheel = new THREE.Group();
  wheel.position.y = hubY;
  root.add(wheel);

  const radius = 1.22;
  for (const sideZ of [-0.18, 0.18]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.032, 12, 36), neonMat);
    rim.position.z = sideZ;
    wheel.add(rim);
  }
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.65, 0.02, 10, 32), goldNeonMat);
  wheel.add(innerRim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.46, 16), goldNeonMat);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  const cabins: THREE.Group[] = [];
  const cabinCount = 10;
  for (let i = 0; i < cabinCount; i++) {
    const a = (i / cabinCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, radius * 2, 8), frameMat);
    spoke.rotation.z = a;
    wheel.add(spoke);

    const cabinPivot = new THREE.Group();
    cabinPivot.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    const gondola = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      i % 2 === 0 ? goldNeonMat : neonMat,
    );
    gondola.position.y = -0.08;
    cabinPivot.add(gondola);
    wheel.add(cabinPivot);
    cabins.push(cabinPivot);
  }

  updaters.push((t) => {
    const rot = t * 0.28;
    wheel.rotation.z = rot;
    for (const c of cabins) {
      c.rotation.z = -rot;
    }
  });

  root.scale.setScalar(scale);
  return root;
}

/**
 * Coastal Lighthouse with Rotating Light Beam for Tropical Island.
 */
function createLighthouse(scale = 1, updaters: Array<(t: number) => void>): THREE.Group {
  const root = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#FFFDF9', roughness: 0.35 });
  const redMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.38 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.4 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#FACC15',
    emissiveIntensity: 0.95,
    roughness: 0.15,
  });

  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const rBot = 0.42 - i * 0.042;
    const rTop = 0.42 - (i + 1) * 0.042;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, 0.36, 20),
      i % 2 === 0 ? whiteMat : redMat,
    );
    seg.position.y = 0.18 + i * 0.36;
    seg.castShadow = true;
    root.add(seg);
  }

  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.08, 20), darkMat);
  gallery.position.y = 1.84;
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.28, 16), lanternMat);
  lampRoom.position.y = 2.02;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.28, 20), redMat);
  roof.position.y = 2.3;
  root.add(gallery, lampRoom, roof);

  const beamPivot = new THREE.Group();
  beamPivot.position.y = 2.02;
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#FEF08A',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const beamCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 16, 1, true), beamMat);
  beamCone.rotation.z = Math.PI / 2;
  beamCone.position.x = 1.35;
  beamPivot.add(beamCone);
  root.add(beamPivot);

  updaters.push((t) => {
    beamPivot.rotation.y = t * 0.85;
  });

  root.scale.setScalar(scale);
  return root;
}

function createCuteCloud(scale = 1): THREE.Group {
  const cloud = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.55,
    metalness: 0.02,
  });
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 0.46],
    [0.38, -0.05, 0.06, 0.36],
    [-0.38, -0.07, -0.04, 0.34],
    [0.16, 0.16, -0.06, 0.3],
    [-0.18, 0.12, 0.08, 0.28],
  ];
  for (const [x, y, z, r] of puffs) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), mat);
    p.position.set(x, y, z);
    cloud.add(p);
  }
  cloud.scale.setScalar(scale);
  return cloud;
}

function createStreetLamp(glowColor = '#FFE082'): THREE.Group {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: '#2C3545',
    metalness: 0.65,
    roughness: 0.32,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: glowColor,
    emissive: glowColor,
    emissiveIntensity: 0.9,
    roughness: 0.18,
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.15, 10), poleMat);
  pole.position.y = 0.575;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), bulbMat);
  globe.position.y = 1.2;
  lamp.add(pole, globe);
  return lamp;
}

export function createBoardEnvironment(theme: BoardMapTheme): BoardEnvironmentController {
  const group = new THREE.Group();
  group.name = `board-env-${theme}`;
  const palette = PALETTES[theme] ?? PALETTES.siam_park;

  let disposed = false;
  const updaters: Array<(elapsedSec: number) => void> = [];

  // 0. Central Board Citadel Stepped Cliff Base (gives the board itself real 3D island depth!)
  const citadelShape = makeRoundedRectShape(11.95, 11.95, 0.65);
  const citadelGeo = new THREE.ExtrudeGeometry(citadelShape, {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 3,
  });
  citadelGeo.rotateX(-Math.PI / 2);
  const citadelCliffColor =
    theme === 'royal_palace'
      ? '#EDE3CF'
      : theme === 'bangkok_metro'
        ? '#334155'
        : theme === 'tropical_island'
          ? '#E6C280'
          : '#8D6E63';
  const citadelMat = new THREE.MeshStandardMaterial({
    color: citadelCliffColor,
    roughness: 0.72,
  });
  const citadelMesh = new THREE.Mesh(citadelGeo, citadelMat);
  citadelMesh.position.y = -0.86;
  citadelMesh.receiveShadow = true;
  group.add(citadelMesh);

  // Shared floating clouds framing the sky
  const cloudPositions: Array<[number, number, number, number]> = [
    [-8.8, 3.3, -7.8, 1.0],
    [8.8, 3.5, -7.5, 1.1],
    [-9.2, 3.1, 6.8, 0.95],
    [9.0, 3.4, 7.0, 1.05],
    [0.0, 3.9, -10.5, 1.15],
  ];
  cloudPositions.forEach(([cx, cy, cz, sc], idx) => {
    const cloud = createCuteCloud(sc);
    cloud.position.set(cx, cy, cz);
    cloud.rotation.y = idx * 0.9;
    group.add(cloud);
    updaters.push((t) => {
      cloud.position.y = cy + Math.sin(t * 0.7 + idx * 1.4) * 0.14;
      cloud.position.x = cx + Math.cos(t * 0.25 + idx) * 0.35;
    });
  });

  if (theme === 'siam_park') {
    // =========================================================================
    // THEME 1: ตลาดน้ำ & อุทยานสยาม (Multi-Tiered Emerald Hills, Waterfall & Canal)
    // =========================================================================
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: '#14889E',
      roughness: 0.16,
      metalness: 0.1,
      clearcoat: 0.85,
      transparent: true,
      opacity: 0.9,
    });
    const waterSurface = new THREE.Mesh(new THREE.RingGeometry(5.8, 18.5, 64), waterMat);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = -0.36;
    waterSurface.receiveShadow = true;
    group.add(waterSurface);

    // 4 Curved Thai Wooden Arch Bridges spanning North, South, East, West
    const bridgeCoords: Array<[number, number, number]> = [
      [0, -6.95, 0],
      [0, 6.95, 0],
      [-6.95, 0, Math.PI / 2],
      [6.95, 0, Math.PI / 2],
    ];
    for (const [bx, bz, brot] of bridgeCoords) {
      group.add(
        createArchedBridge({
          x: bx,
          z: bz,
          rotY: brot,
          deckHex: '#8D5524',
          railHex: '#B91C1C',
          trimHex: '#F5C43D',
        }),
      );
    }

    // North-West Corner Waterfall Mountain Massif pouring into the canal
    group.add(
      createWaterfallMountain(-8.5, -8.5, Math.PI / 4, '#795548', '#43A047', '#26C6DA', updaters),
    );

    // 3 Other Corner Multi-Tiered Terraced Island Hills with Thai Sala Pavilions
    const cornerHills: Array<[number, number, number, number]> = [
      [8.6, -8.6, -Math.PI / 4, 2],
      [-8.6, 8.6, (3 * Math.PI) / 4, 3],
      [8.6, 8.6, -(3 * Math.PI) / 4, 4],
    ];
    for (const [hx, hz, hrot, seed] of cornerHills) {
      const hill = createSteppedTerrainMassif({
        x: hx,
        z: hz,
        baseY: -0.45,
        seed,
        tiers: [
          { rx: 2.3, rz: 2.1, height: 0.38, cliffHex: '#795548', topHex: '#2E7D32' },
          { rx: 1.75, rz: 1.6, height: 0.36, cliffHex: '#8D6E63', topHex: '#43A047' },
          { rx: 1.25, rz: 1.15, height: 0.28, cliffHex: '#A1887F', topHex: '#66BB6A' },
        ],
      });
      group.add(hill);

      const sala = createThaiSalaPavilion('#C92A2A', '#F5C43D', 0.86);
      sala.position.set(hx, 0.68, hz);
      sala.rotation.y = hrot;
      group.add(sala);
    }

    // 4 Side Terraced Island Banks (North, South, East, West outer islands) with Villas & Flowering Trees
    const sideBanks: Array<[number, number, number, number, number]> = [
      [0, -9.8, 5.2, 1.85, 10],
      [0, 9.8, 5.2, 1.85, 20],
      [-9.8, 0, 1.85, 5.2, 30],
      [9.8, 0, 1.85, 5.2, 40],
    ];
    for (const [sx, sz, rx, rz, seed] of sideBanks) {
      group.add(
        createSteppedTerrainMassif({
          x: sx,
          z: sz,
          baseY: -0.45,
          seed,
          tiers: [
            { rx, rz, height: 0.34, cliffHex: '#795548', topHex: '#388E3C' },
            { rx: rx * 0.78, rz: rz * 0.78, height: 0.28, cliffHex: '#8D6E63', topHex: '#4CAF50' },
          ],
        }),
      );
    }

    // Basalt / Sandstone Rock Column Clusters along canal banks
    const rockSpots: Array<[number, number]> = [
      [-6.5, -6.4],
      [6.5, -6.4],
      [-6.5, 6.4],
      [6.5, 6.4],
    ];
    for (const [rx, rz] of rockSpots) {
      group.add(createCliffColumnCluster(rx, rz, '#6D4C41', '#43A047', 5, 0.82));
    }

    // Lush Multi-Cluster Flowering Trees across the terraced hills
    const treeCoords: Array<[number, number, number, number]> = [
      [-9.6, -3.2, 0.3, 1.02],
      [-10.1, 2.8, 0.3, 1.1],
      [9.6, -3.2, 0.3, 1.05],
      [10.1, 2.8, 0.3, 0.98],
      [-3.2, -9.6, 0.3, 1.05],
      [3.2, -9.6, 0.3, 1.08],
      [-3.2, 9.6, 0.3, 1.0],
      [3.2, 9.6, 0.3, 1.04],
      [-6.8, -9.2, 0.5, 0.92],
      [6.8, -9.2, 0.65, 0.95],
    ];
    treeCoords.forEach(([tx, tz, ty, sc], i) => {
      const palette3: [string, string, string] =
        i % 3 === 0
          ? ['#D81B60', '#F06292', '#F8BBD0'] // Pink Cassia (กัลปพฤกษ์)
          : i % 3 === 1
            ? ['#F57F17', '#FFB300', '#FFE082'] // Golden Shower (ราชพฤกษ์)
            : ['#1B5E20', '#388E3C', '#81C784']; // Emerald Banyan
      const tree = createLushClusterTree('#5D4037', palette3, sc);
      tree.position.set(tx, ty, tz);
      group.add(tree);
    });

    // Suburban park villas nestled on the elevated side terraces
    const villaSpots: Array<[number, number, number, string]> = [
      [-9.5, -1.5, Math.PI / 2, '/models/city-suburban/building-type-d.glb'],
      [-9.5, 1.5, Math.PI / 2, '/models/city-suburban/building-type-b.glb'],
      [9.5, -1.5, -Math.PI / 2, '/models/city-suburban/building-type-f.glb'],
      [9.5, 1.5, -Math.PI / 2, '/models/city-suburban/building-type-c.glb'],
      [-1.6, -9.5, 0, '/models/city-suburban/building-type-f.glb'],
      [1.6, -9.5, 0, '/models/city-suburban/building-type-d.glb'],
    ];
    for (const [vx, vz, vrot, url] of villaSpots) {
      loadNormalizedGLB(url, 1.55)
        .then((villa) => {
          if (disposed) return;
          villa.position.set(vx, 0.28, vz);
          villa.rotation.y = vrot;
          group.add(villa);
        })
        .catch(() => {});
    }

    // Sailboats cruising along the emerald canal moat
    for (let b = 0; b < 4; b++) {
      const boatAnchor = new THREE.Group();
      group.add(boatAnchor);
      const baseAngle = (b / 4) * Math.PI * 2 + 0.4;
      loadNormalizedGLB('/models/watercraft/boat-sail-a.glb', 1.05)
        .then((boat) => {
          if (disposed) return;
          boatAnchor.add(boat);
        })
        .catch(() => {});
      updaters.push((t) => {
        const angle = baseAngle + t * 0.14;
        const r = 7.05;
        boatAnchor.position.set(
          Math.cos(angle) * r,
          -0.34 + Math.sin(t * 2.2 + b) * 0.03,
          Math.sin(angle) * r,
        );
        boatAnchor.rotation.y = -angle;
      });
    }
  } else if (theme === 'bangkok_metro') {
    // =========================================================================
    // THEME 2: มหานครกรุงเทพฯ (Stepped Metro Plazas, BTS Skytrain, Ferris Wheel & Ring Road)
    // =========================================================================
    const roadMat = new THREE.MeshStandardMaterial({ color: '#1E2433', roughness: 0.68 });
    const laneLineMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      emissive: '#EAB308',
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const neonTrimMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#0284C7',
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });

    const roadRing = new THREE.Mesh(new THREE.RingGeometry(6.05, 7.65, 64), roadMat);
    roadRing.rotation.x = -Math.PI / 2;
    roadRing.position.y = -0.31;
    roadRing.receiveShadow = true;

    const centerStripe = new THREE.Mesh(new THREE.RingGeometry(6.82, 6.89, 64), laneLineMat);
    centerStripe.rotation.x = -Math.PI / 2;
    centerStripe.position.y = -0.304;
    group.add(roadRing, centerStripe);

    // 4 Stepped Granite Metro District Plazas framing the highway
    const metroBlocks: Array<[number, number, number, number, number]> = [
      [0, -9.8, 5.8, 1.9, 1],
      [0, 9.8, 5.8, 1.9, 2],
      [-9.8, 0, 1.9, 5.8, 3],
      [9.8, 0, 1.9, 5.8, 4],
      [-8.8, -8.8, 2.3, 2.3, 5],
      [8.8, -8.8, 2.3, 2.3, 6],
      [-8.8, 8.8, 2.3, 2.3, 7],
      [8.8, 8.8, 2.3, 2.3, 8],
    ];
    for (const [mx, mz, rx, rz, seed] of metroBlocks) {
      group.add(
        createSteppedTerrainMassif({
          x: mx,
          z: mz,
          baseY: -0.45,
          seed,
          tiers: [
            { rx, rz, height: 0.36, cliffHex: '#1E293B', topHex: '#334155' },
            { rx: rx * 0.84, rz: rz * 0.84, height: 0.28, cliffHex: '#334155', topHex: '#475569' },
          ],
        }),
      );
    }

    // Elevated BTS Skytrain Viaduct Ring + Animated 3-Car Futuristic Skytrain
    const viaductRadius = 8.15;
    const viaductTrack = new THREE.Mesh(
      new THREE.TorusGeometry(viaductRadius, 0.14, 12, 72),
      new THREE.MeshStandardMaterial({ color: '#64748B', roughness: 0.5 }),
    );
    viaductTrack.rotation.x = Math.PI / 2;
    viaductTrack.scale.set(1, 1, 0.45);
    viaductTrack.position.y = 1.18;
    const viaductNeon = new THREE.Mesh(
      new THREE.TorusGeometry(viaductRadius, 0.035, 8, 72),
      neonTrimMat,
    );
    viaductNeon.rotation.x = Math.PI / 2;
    viaductNeon.position.y = 1.18;
    group.add(viaductTrack, viaductNeon);

    for (let p = 0; p < 16; p++) {
      const a = (p / 16) * Math.PI * 2;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 1.5, 10),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.6 }),
      );
      pillar.position.set(Math.cos(a) * viaductRadius, 0.42, Math.sin(a) * viaductRadius);
      pillar.castShadow = true;
      group.add(pillar);
    }

    // Animated 3-Car BTS Skytrain on the Elevated Viaduct
    const trainCarriers: THREE.Group[] = [];
    const trainBodyMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      roughness: 0.22,
      metalness: 0.3,
    });
    for (let c = 0; c < 3; c++) {
      const car = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.82), trainBodyMat);
      hull.position.y = 0.16;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.84), neonTrimMat);
      stripe.position.y = 0.16;
      const windows = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.68), laneLineMat);
      windows.position.y = 0.22;
      car.add(hull, stripe, windows);
      group.add(car);
      trainCarriers.push(car);
    }
    updaters.push((t) => {
      const headAngle = t * 0.32;
      trainCarriers.forEach((car, idx) => {
        const a = headAngle - idx * 0.11;
        car.position.set(Math.cos(a) * viaductRadius, 1.24, Math.sin(a) * viaductRadius);
        car.rotation.y = -a;
      });
    });

    // Illuminated Riverfront Ferris Wheel at North-East Plaza
    const ferris = createFerrisWheel(1.05, updaters);
    ferris.position.set(8.8, 0.28, -8.8);
    ferris.rotation.y = -Math.PI / 4;
    group.add(ferris);

    // Streetlights around the ring road
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const lamp = createStreetLamp(i % 2 === 0 ? '#FFD54F' : '#38BDF8');
      lamp.position.set(Math.cos(a) * 7.72, -0.32, Math.sin(a) * 7.72);
      group.add(lamp);
    }

    // Dense High-Rise Skyscraper Skyline on the stepped metro blocks
    const towerSpots: Array<[number, number, number, number, string]> = [
      [-8.8, -8.8, 0.4, 2.6, '/models/city-commercial/building-skyscraper-a.glb'],
      [-9.8, -3.2, Math.PI / 2, 2.35, '/models/city-commercial/building-skyscraper-c.glb'],
      [-9.8, 0.0, Math.PI / 2, 2.75, '/models/city-commercial/building-skyscraper-b.glb'],
      [-9.8, 3.2, Math.PI / 2, 2.3, '/models/city-commercial/building-skyscraper-a.glb'],
      [9.8, -3.2, -Math.PI / 2, 2.4, '/models/city-commercial/building-skyscraper-b.glb'],
      [9.8, 0.0, -Math.PI / 2, 2.7, '/models/city-commercial/building-skyscraper-c.glb'],
      [9.8, 3.2, -Math.PI / 2, 2.25, '/models/city-commercial/building-skyscraper-a.glb'],
      [-3.2, -9.8, 0, 2.55, '/models/city-commercial/building-skyscraper-b.glb'],
      [0.0, -10.0, 0, 2.95, '/models/city-commercial/building-skyscraper-c.glb'],
      [3.2, -9.8, 0, 2.5, '/models/city-commercial/building-skyscraper-a.glb'],
      [-8.8, 8.8, -0.4, 2.15, '/models/city-commercial/building-a.glb'],
      [8.8, 8.8, 0.4, 2.15, '/models/city-commercial/building-a.glb'],
    ];
    for (const [bx, bz, brot, bsize, url] of towerSpots) {
      loadNormalizedGLB(url, bsize)
        .then((tower) => {
          if (disposed) return;
          tower.position.set(bx, 0.28, bz);
          tower.rotation.y = brot;
          group.add(tower);
        })
        .catch(() => {});
    }

    // Animated Taxis & Sports Cars cruising on the Ring Road
    const vehicles = [
      { url: '/models/car/taxi.glb', radius: 6.45, speed: 0.32, dir: 1, offset: 0 },
      { url: '/models/car/sedan-sports.glb', radius: 7.22, speed: 0.27, dir: -1, offset: 2.1 },
      { url: '/models/car/race-future.glb', radius: 6.45, speed: 0.32, dir: 1, offset: 3.14 },
      { url: '/models/car/taxi.glb', radius: 7.22, speed: 0.27, dir: -1, offset: 5.2 },
    ];
    for (const v of vehicles) {
      const carAnchor = new THREE.Group();
      group.add(carAnchor);
      loadNormalizedGLB(v.url, 0.84)
        .then((car) => {
          if (disposed) return;
          carAnchor.add(car);
        })
        .catch(() => {});
      updaters.push((t) => {
        const angle = v.offset + t * v.speed * v.dir;
        carAnchor.position.set(Math.cos(angle) * v.radius, -0.31, Math.sin(angle) * v.radius);
        carAnchor.rotation.y = -angle + (v.dir > 0 ? 0 : Math.PI);
      });
    }
  } else if (theme === 'tropical_island') {
    // =========================================================================
    // THEME 3: เกาะสวรรค์อันดามัน (Limestone Karst Cliffs, Lagoon Waterfall, Lighthouse & Atolls)
    // =========================================================================
    const sandMat = new THREE.MeshStandardMaterial({ color: '#F5D594', roughness: 0.68 });
    const shallowCoralMat = new THREE.MeshPhysicalMaterial({
      color: '#18B4C9',
      roughness: 0.15,
      metalness: 0.06,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.88,
    });
    const foamMat = new THREE.MeshStandardMaterial({
      color: '#CCFBF1',
      emissive: '#99F6E4',
      emissiveIntensity: 0.25,
      roughness: 0.3,
      transparent: true,
      opacity: 0.78,
    });

    const beachRing = new THREE.Mesh(new THREE.RingGeometry(5.9, 6.95, 64), sandMat);
    beachRing.rotation.x = -Math.PI / 2;
    beachRing.position.y = -0.31;
    beachRing.receiveShadow = true;

    const lagoonSurface = new THREE.Mesh(new THREE.RingGeometry(6.9, 19.0, 64), shallowCoralMat);
    lagoonSurface.rotation.x = -Math.PI / 2;
    lagoonSurface.position.y = -0.36;
    lagoonSurface.receiveShadow = true;

    const waveFoam = new THREE.Mesh(new THREE.RingGeometry(6.88, 7.16, 64), foamMat);
    waveFoam.rotation.x = -Math.PI / 2;
    waveFoam.position.y = -0.305;
    group.add(beachRing, lagoonSurface, waveFoam);

    updaters.push((t) => {
      const s = 1 + Math.sin(t * 1.8) * 0.022;
      waveFoam.scale.set(s, s, 1);
    });

    // 4 Wooden Island Pier Bridges connecting the beach to outer atolls
    const pierCoords: Array<[number, number, number]> = [
      [0, -7.1, 0],
      [0, 7.1, 0],
      [-7.1, 0, Math.PI / 2],
      [7.1, 0, Math.PI / 2],
    ];
    for (const [px, pz, prot] of pierCoords) {
      group.add(
        createArchedBridge({
          x: px,
          z: pz,
          rotY: prot,
          deckHex: '#A47148',
          railHex: '#D4A373',
          trimHex: '#FDE68A',
        }),
      );
    }

    // North-West Tropical Lagoon Waterfall Cliff Island
    group.add(
      createWaterfallMountain(-8.6, -8.6, Math.PI / 4, '#8D6E63', '#2EBD59', '#38BDF8', updaters),
    );

    // North-East Rocky Headland with Red-and-White Striped Lighthouse & Rotating Light Beam
    const lighthouseIsland = createSteppedTerrainMassif({
      x: 8.6,
      z: -8.6,
      baseY: -0.45,
      seed: 19,
      tiers: [
        { rx: 2.35, rz: 2.1, height: 0.4, cliffHex: '#D4A373', topHex: '#F5D594' },
        { rx: 1.75, rz: 1.6, height: 0.45, cliffHex: '#78716C', topHex: '#57534E' },
        { rx: 1.15, rz: 1.1, height: 0.38, cliffHex: '#57534E', topHex: '#4ADE80' },
      ],
    });
    group.add(lighthouseIsland);
    const lighthouse = createLighthouse(0.95, updaters);
    lighthouse.position.set(8.6, 0.88, -8.6);
    group.add(lighthouse);

    // South-West & South-East Limestone Karst Atolls with Pirate Treasure Cove & Beach Cabanas
    const southAtolls: Array<[number, number, number]> = [
      [-8.6, 8.6, 25],
      [8.6, 8.6, 31],
    ];
    southAtolls.forEach(([ix, iz, seed], idx) => {
      group.add(
        createSteppedTerrainMassif({
          x: ix,
          z: iz,
          baseY: -0.45,
          seed,
          tiers: [
            { rx: 2.4, rz: 2.2, height: 0.34, cliffHex: '#E6C280', topHex: '#F5D594' },
            { rx: 1.65, rz: 1.5, height: 0.42, cliffHex: '#78716C', topHex: '#2EBD59' },
          ],
        }),
      );

      const palm1 = createPalmTree(1.05);
      palm1.position.set(ix - 0.55, 0.35, iz - 0.35);
      palm1.rotation.y = idx * 1.4;
      const palm2 = createPalmTree(0.88);
      palm2.position.set(ix + 0.55, 0.35, iz + 0.35);
      palm2.rotation.y = idx * 2.1 + 1;
      group.add(palm1, palm2);

      if (idx === 0) {
        loadNormalizedGLB('/models/pirate/chest.glb', 0.88)
          .then((chest) => {
            if (disposed) return;
            chest.position.set(ix, 0.38, iz);
            chest.rotation.y = Math.PI / 4;
            group.add(chest);
          })
          .catch(() => {});
      } else {
        const cabana = createThaiSalaPavilion('#EA580C', '#FACC15', 0.82);
        cabana.position.set(ix, 0.38, iz);
        cabana.rotation.y = -(3 * Math.PI) / 4;
        group.add(cabana);
      }
    });

    // Dramatic Andaman Limestone Karst Sea Stacks rising from the sea
    const karstSpots: Array<[number, number, number]> = [
      [-9.8, -2.5, 1.35],
      [9.8, 2.5, 1.25],
      [-2.8, -9.8, 1.4],
      [3.2, -9.8, 1.2],
    ];
    for (const [kx, kz, sc] of karstSpots) {
      group.add(createCliffColumnCluster(kx, kz, '#64748B', '#22C55E', 7, sc));
    }

    // Curved Coconut Palms along the sandy beach rim
    const beachPalms: Array<[number, number, number]> = [
      [-6.35, -2.8, 0.98],
      [-6.35, 2.8, 0.92],
      [6.35, -2.8, 0.95],
      [6.35, 2.8, 1.02],
      [-2.8, -6.35, 0.95],
      [2.8, -6.35, 1.02],
      [-2.8, 6.35, 0.96],
      [2.8, 6.35, 0.9],
    ];
    beachPalms.forEach(([px, pz, sc], idx) => {
      const p = createPalmTree(sc);
      p.position.set(px, -0.31, pz);
      p.rotation.y = idx * 0.85;
      group.add(p);
    });

    // Sailboats tacking around the turquoise Andaman lagoon
    for (let b = 0; b < 5; b++) {
      const boatGroup = new THREE.Group();
      group.add(boatGroup);
      const startAngle = (b / 5) * Math.PI * 2;
      loadNormalizedGLB('/models/watercraft/boat-sail-a.glb', 1.25)
        .then((boat) => {
          if (disposed) return;
          boatGroup.add(boat);
        })
        .catch(() => {});
      updaters.push((t) => {
        const angle = startAngle + t * 0.13;
        const r = 7.75 + (b % 2) * 0.95;
        boatGroup.position.set(
          Math.cos(angle) * r,
          -0.34 + Math.sin(t * 2.1 + b) * 0.045,
          Math.sin(angle) * r,
        );
        boatGroup.rotation.y = -angle;
        boatGroup.rotation.z = Math.sin(t * 1.7 + b) * 0.045;
      });
    }
  } else if (theme === 'royal_palace') {
    // =========================================================================
    // THEME 4: ท้องพระโรงทองคำ (Marble Citadel Terraces, Golden Bell Chedis & Sky Lanterns)
    // =========================================================================
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: '#F5C43D',
      metalness: 0.78,
      roughness: 0.2,
      clearcoat: 0.6,
    });
    const moatMat = new THREE.MeshPhysicalMaterial({
      color: '#1E1B4B',
      roughness: 0.18,
      metalness: 0.15,
      clearcoat: 0.85,
    });

    const lotusMoat = new THREE.Mesh(new THREE.RingGeometry(5.95, 7.85, 64), moatMat);
    lotusMoat.rotation.x = -Math.PI / 2;
    lotusMoat.position.y = -0.34;
    lotusMoat.receiveShadow = true;

    const goldInnerTrim = new THREE.Mesh(new THREE.RingGeometry(5.92, 6.08, 64), goldMat);
    goldInnerTrim.rotation.x = -Math.PI / 2;
    goldInnerTrim.position.y = -0.305;
    group.add(lotusMoat, goldInnerTrim);

    // 4 Royal White Marble & Gold Balustrade Bridges crossing the moat
    const royalBridges: Array<[number, number, number]> = [
      [0, -6.9, 0],
      [0, 6.9, 0],
      [-6.9, 0, Math.PI / 2],
      [6.9, 0, Math.PI / 2],
    ];
    for (const [bx, bz, brot] of royalBridges) {
      group.add(
        createArchedBridge({
          x: bx,
          z: bz,
          rotY: brot,
          deckHex: '#FFFDF7',
          railHex: '#F5C43D',
          trimHex: '#FDE047',
        }),
      );
    }

    // 4 Corner Stepped Marble Citadel Terraces with Grand Royal Pavilions + Golden Bell Chedis
    const palaceCorners: Array<[number, number, number, number]> = [
      [-8.7, -8.7, Math.PI / 4, 41],
      [8.7, -8.7, -Math.PI / 4, 42],
      [-8.7, 8.7, (3 * Math.PI) / 4, 43],
      [8.7, 8.7, -(3 * Math.PI) / 4, 44],
    ];
    for (const [px, pz, prot, seed] of palaceCorners) {
      group.add(
        createSteppedTerrainMassif({
          x: px,
          z: pz,
          baseY: -0.45,
          seed,
          tiers: [
            { rx: 2.4, rz: 2.4, height: 0.36, cliffHex: '#D6C7B2', topHex: '#FFFDF7' },
            { rx: 1.85, rz: 1.85, height: 0.34, cliffHex: '#E5D9C5', topHex: '#FEF3C7' },
            { rx: 1.32, rz: 1.32, height: 0.28, cliffHex: '#F5C43D', topHex: '#FFFBEB' },
          ],
        }),
      );

      const pavilion = createThaiSalaPavilion('#8C1D40', '#FFD700', 0.94);
      pavilion.position.set(px, 0.62, pz);
      pavilion.rotation.y = prot;
      group.add(pavilion);
    }

    // 4 Side Marble Terraces topped with Towering Golden Bell Chedis (พระเจดีย์ทองคำ)
    const chediSides: Array<[number, number, number]> = [
      [0, -9.8, 51],
      [0, 9.8, 52],
      [-9.8, 0, 53],
      [9.8, 0, 54],
    ];
    for (const [cx, cz, seed] of chediSides) {
      group.add(
        createSteppedTerrainMassif({
          x: cx,
          z: cz,
          baseY: -0.45,
          seed,
          tiers: [
            { rx: 2.8, rz: 2.0, height: 0.35, cliffHex: '#D6C7B2', topHex: '#FFFDF7' },
            { rx: 2.1, rz: 1.5, height: 0.32, cliffHex: '#F5C43D', topHex: '#FEF9C3' },
          ],
        }),
      );

      const chedi = createGoldenBellChedi(1.18);
      chedi.position.set(cx, 0.28, cz);
      group.add(chedi);
    }

    // Floating Khom Loi (Golden Sky Lanterns) gently drifting & glowing
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#FFCA28',
      emissive: '#FF8F00',
      emissiveIntensity: 0.88,
      roughness: 0.25,
    });
    for (let l = 0; l < 18; l++) {
      const a = (l / 18) * Math.PI * 2;
      const r = 7.2 + (l % 3) * 0.95;
      const baseY = 1.15 + (l % 4) * 0.58;
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.11, 0.36, 12),
        lanternMat,
      );
      lantern.position.set(Math.cos(a) * r, baseY, Math.sin(a) * r);
      group.add(lantern);
      updaters.push((t) => {
        lantern.position.y = baseY + Math.sin(t * 1.3 + l * 0.9) * 0.24;
        lantern.rotation.y = t * 0.4 + l;
      });
    }
  }

  return {
    group,
    palette,
    update: (elapsedSec: number) => {
      for (const fn of updaters) {
        fn(elapsedSec);
      }
    },
    dispose: () => {
      disposed = true;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    },
  };
}
