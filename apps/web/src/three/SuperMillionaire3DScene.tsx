import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BoardMapTheme, DiceRollResult, GameState } from '@super-millionaire/shared';
import {
  createBoardCanvasTexturePair,
  tileIndexToWorldXZ,
  type TileWorldCoords,
} from './boardTexture';
import {
  createDesignerToyToken,
  createFallbackModel,
  createOwnerBuildingMesh,
  createTileLandmarkModel,
  loadNormalizedGLB,
  MODEL_URLS,
} from './modelLoader';
import {
  createCardDeckMesh,
  createDiceMesh,
  createMortgageBadgeTexture,
  getDiceTargetQuaternion,
} from './dice3dMesh';
import {
  createBoardEnvironment,
  type BoardEnvironmentController,
} from './boardEnvironmentMap';

// Pre-allocated scratch math & building plinths outside animate() for steady 60 FPS
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _tumbleQuat = new THREE.Quaternion();
const _tumbleAxis1 = new THREE.Vector3(1.1, 0.72, 0.58).normalize();
const _tumbleAxis2 = new THREE.Vector3(-0.85, 0.68, 0.92).normalize();
const _housePlinthGeo = new THREE.BoxGeometry(0.21, 0.032, 0.21);
const _housePlinthMat = new THREE.MeshStandardMaterial({
  color: '#15803D',
  roughness: 0.62,
  metalness: 0.08,
});
const _hotelPlinthGeo = new THREE.BoxGeometry(0.46, 0.055, 0.46);
const _hotelPlinthMat = new THREE.MeshStandardMaterial({
  color: '#D97706',
  emissive: '#F59E0B',
  emissiveIntensity: 0.35,
  roughness: 0.26,
  metalness: 0.64,
});

export interface SuperMillionaire3DSceneProps {
  gameState: GameState;
  displayPositions: Record<string, number>;
  animatingPlayerId?: string | null;
  hopSpotlightTile?: number | null;
  recentlyBuilt?: { tileIndex: number; kind: 'house' | 'hotel'; key: number } | null;
  cashTransferFx?: {
    key: number;
    kind: 'RENT' | 'TAX' | 'PASS_START';
    amount: number;
    payerTileIndex?: number;
    recipientTileIndex?: number;
  } | null;
  selectedTileIndex: number | null;
  onSelectTile: (tileIndex: number) => void;
  myPlayerId?: string | null;
  isSpectator?: boolean;
  cameraMode: 'isometric' | 'topdown';
  followMode: 'owner' | 'off';
  focusOwnerTrigger?: number;
  resetCameraTrigger: number;
  isThrowingDice: boolean;
  throwKey: number;
  thrownDiceFaces: DiceRollResult | null;
  activeCardDraw?: { deck: 'chance' | 'chest'; key: number } | null;
}

interface TokenRuntime {
  root: THREE.Group;
  modelHolder: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  tokenId: number;
  currentX: number;
  currentZ: number;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  targetYaw: number;
  hopStartMs: number;
  hopDurationMs: number;
  isHopping: boolean;
  tileIndex: number;
  disposables: Array<{ dispose: () => void }>;
}

interface BuildingRuntime {
  group: THREE.Group;
  signature: string;
  popStartMs: number;
  isPopping: boolean;
}

interface FlyingCoinRuntime {
  group: THREE.Group;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  startMs: number;
  durationMs: number;
}

interface DiceThrowState {
  active: boolean;
  startMs: number;
  durationMs: number;
  die1TargetQuat: THREE.Quaternion;
  die2TargetQuat: THREE.Quaternion;
}

function getTravelYaw(tileIndex: number): number {
  const idx = ((tileIndex % 40) + 40) % 40;
  if (idx <= 9) return -Math.PI / 2; // bottom row moving -X
  if (idx <= 19) return Math.PI; // left column moving -Z
  if (idx <= 29) return Math.PI / 2; // top row moving +X
  return 0; // right column moving +Z
}

function getInnerBuildingPositions(
  coords: TileWorldCoords,
  count: number,
  isHotel: boolean,
): Array<{ x: number; z: number; rotY: number }> {
  const inset = 0.34;
  if (isHotel) {
    if (coords.edge === 'bottom') return [{ x: coords.x, z: coords.z - inset, rotY: 0 }];
    if (coords.edge === 'left') return [{ x: coords.x + inset, z: coords.z, rotY: Math.PI / 2 }];
    if (coords.edge === 'top') return [{ x: coords.x, z: coords.z + inset, rotY: Math.PI }];
    if (coords.edge === 'right') return [{ x: coords.x - inset, z: coords.z, rotY: -Math.PI / 2 }];
    return [{ x: coords.x, z: coords.z, rotY: 0 }];
  }

  const slots: Array<{ x: number; z: number; rotY: number }> = [];
  const step = 0.21;
  const startOffset = -((count - 1) * step) / 2;
  for (let i = 0; i < count; i++) {
    const offset = startOffset + i * step;
    if (coords.edge === 'bottom') {
      slots.push({ x: coords.x + offset, z: coords.z - inset, rotY: 0 });
    } else if (coords.edge === 'left') {
      slots.push({ x: coords.x + inset, z: coords.z + offset, rotY: Math.PI / 2 });
    } else if (coords.edge === 'top') {
      slots.push({ x: coords.x + offset, z: coords.z + inset, rotY: Math.PI });
    } else if (coords.edge === 'right') {
      slots.push({ x: coords.x - inset, z: coords.z + offset, rotY: -Math.PI / 2 });
    } else {
      slots.push({ x: coords.x + offset, z: coords.z, rotY: 0 });
    }
  }
  return slots;
}

function getMultiTokenOffset(slotIndex: number, totalOnTile: number): { dx: number; dz: number } {
  if (totalOnTile <= 1) return { dx: 0, dz: 0 };
  if (totalOnTile === 2) {
    return slotIndex === 0 ? { dx: -0.22, dz: -0.14 } : { dx: 0.22, dz: 0.14 };
  }
  const angle = (slotIndex / totalOnTile) * Math.PI * 2 - Math.PI / 4;
  const radius = totalOnTile <= 4 ? 0.25 : totalOnTile <= 6 ? 0.3 : 0.35;
  return {
    dx: Math.cos(angle) * radius,
    dz: Math.sin(angle) * radius,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function normalizeAngle(rad: number): number {
  let a = (rad + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

function lerpAngle(current: number, target: number, alpha: number): number {
  const diff = normalizeAngle(target - current);
  return current + diff * alpha;
}

export function SuperMillionaire3DScene(props: SuperMillionaire3DSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const latestPropsRef = useRef(props);
  latestPropsRef.current = props;

  // Imperative scene refs shared between mount & reactive effects
  const sceneBundleRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    tokenLayer: THREE.Group;
    buildingLayer: THREE.Group;
    plaqueLayer: THREE.Group;
    coinLayer: THREE.Group;
    tokens: Map<string, TokenRuntime>;
    buildings: Map<number, BuildingRuntime>;
    plaques: Map<number, { plaqueMesh: THREE.Mesh; plaqueMat: THREE.MeshStandardMaterial; mortgagePlane: THREE.Mesh }>;
    flyingCoins: FlyingCoinRuntime[];
    selectedRing: THREE.Mesh;
    spotlightRing: THREE.Mesh;
    hoverRing: THREE.Mesh;
    die1Mesh: THREE.Mesh;
    die2Mesh: THREE.Mesh;
    chestDeckGroup: THREE.Group;
    chanceDeckGroup: THREE.Group;
    deckDrawFx: {
      active: boolean;
      deck: 'chance' | 'chest';
      startMs: number;
      durationMs: number;
      lastKey: number;
    };
    diceThrow: DiceThrowState;
    cameraLerp: { active: boolean; targetPos: THREE.Vector3; targetLook: THREE.Vector3 };
    userManualOverride: boolean;
    orbitYaw: number;
    boardTopMat: THREE.MeshStandardMaterial;
    boardTexPair: { south: THREE.CanvasTexture; north: THREE.CanvasTexture; dispose: () => void };
    feltMat: THREE.MeshStandardMaterial;
    frameMat: THREE.MeshStandardMaterial;
    hemiLight: THREE.HemisphereLight;
    envController: BoardEnvironmentController;
    activeMapTheme: BoardMapTheme;
    activeTopOrientation: 'south' | 'north';
    lastBuildKey: number;
    lastCashFxKey: number;
    lastThrowKey: number;
  } | null>(null);

  // Initialize Three.js Scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError('เบราว์เซอร์ไม่รองรับ WebGL 3D กรุณาเปิดการเร่งความเร็วกราฟิก');
      return;
    }

    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 280);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const initialTheme = latestPropsRef.current.gameState.mapTheme ?? 'siam_park';
    const envController = createBoardEnvironment(initialTheme);
    scene.background = new THREE.Color(envController.palette.backgroundHex);
    scene.fog = new THREE.Fog(envController.palette.fogHex, 24, 44);
    scene.add(envController.group);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    if (latestPropsRef.current.cameraMode === 'topdown') {
      camera.position.set(0, 15.8, 0.01);
    } else {
      camera.position.set(0, 11.5, 11.2);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.minDistance = 6.5;
    controls.maxDistance = 28;
    controls.target.set(0, 0, 0);
    controls.update();

    // Warm tabletop studio lighting
    const hemiLight = new THREE.HemisphereLight(
      '#FFF8E6',
      '#163523',
      envController.palette.ambientIntensity,
    );
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#FFF5DB', 1.65);
    sunLight.position.set(7.5, 15.5, 9.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 42;
    sunLight.shadow.camera.left = -12.5;
    sunLight.shadow.camera.right = 12.5;
    sunLight.shadow.camera.top = 12.5;
    sunLight.shadow.camera.bottom = -12.5;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#93C5FD', 0.48);
    rimLight.position.set(-9, 8, -8);
    scene.add(rimLight);

    const centerGlow = new THREE.PointLight('#FFE08A', 0.42, 22);
    centerGlow.position.set(0, 4.5, 0);
    scene.add(centerGlow);

    // Deep basin floor beneath the 3D terrain & water moat
    const feltGeo = new THREE.CircleGeometry(26, 64);
    const feltMat = new THREE.MeshStandardMaterial({
      color: envController.palette.tableClothHex,
      roughness: envController.palette.tableRoughness,
      metalness: 0.04,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = -0.52;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Outer mahogany wood bevel frame
    const frameGeo = new THREE.BoxGeometry(11.46, 0.3, 11.46);
    const frameMat = new THREE.MeshStandardMaterial({
      color: envController.palette.rimHex,
      roughness: 0.55,
      metalness: 0.12,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.2;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    scene.add(frameMesh);

    // 11x11 Board Slab with Dual South/North Upright 2048x2048 CanvasTextures
    const boardTexPair = createBoardCanvasTexturePair(renderer.capabilities.getMaxAnisotropy());
    const boardSideMat = new THREE.MeshStandardMaterial({
      color: '#185931',
      roughness: 0.65,
      metalness: 0.06,
    });
    const boardTopMat = new THREE.MeshStandardMaterial({
      map: boardTexPair.south,
      roughness: 0.52,
      metalness: 0.04,
    });
    const boardGeo = new THREE.BoxGeometry(11, 0.34, 11);
    const boardMesh = new THREE.Mesh(boardGeo, [
      boardSideMat,
      boardSideMat,
      boardTopMat,
      boardSideMat,
      boardSideMat,
      boardSideMat,
    ]);
    boardMesh.position.y = -0.17;
    boardMesh.receiveShadow = true;
    boardMesh.castShadow = true;
    scene.add(boardMesh);

    // 3D Stacked Card Decks in Board Center (aligned with illustrated deck trays)
    const chestDeck = createCardDeckMesh('กองทุน', '#0F766E', '#F4D15A');
    chestDeck.group.position.set(-2.75, 0, -2.45);
    chestDeck.group.rotation.y = Math.PI / 4;
    scene.add(chestDeck.group);

    const chanceDeck = createCardDeckMesh('เสี่ยงโชค', '#EA580C', '#FFF7D6');
    chanceDeck.group.position.set(2.75, 0, 2.45);
    chanceDeck.group.rotation.y = Math.PI / 4;
    scene.add(chanceDeck.group);

    // Layer Groups
    const hitboxLayer = new THREE.Group();
    const plaqueLayer = new THREE.Group();
    const buildingLayer = new THREE.Group();
    const tokenLayer = new THREE.Group();
    const coinLayer = new THREE.Group();
    scene.add(hitboxLayer, plaqueLayer, buildingLayer, tokenLayer, coinLayer);

    // 40 Invisible Raycastable Tile Hitboxes + Owner Plaque Placeholders
    const hitboxGeo = new THREE.BoxGeometry(0.96, 0.04, 0.96);
    const hitboxMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const plaqueGeo = new THREE.BoxGeometry(0.56, 0.045, 0.12);
    const mortgageTex = createMortgageBadgeTexture();
    const mortgageGeo = new THREE.PlaneGeometry(0.68, 0.34);
    const mortgageMat = new THREE.MeshBasicMaterial({
      map: mortgageTex,
      transparent: true,
      depthWrite: false,
    });

    const plaques = new Map<
      number,
      { plaqueMesh: THREE.Mesh; plaqueMat: THREE.MeshStandardMaterial; mortgagePlane: THREE.Mesh }
    >();

    for (let idx = 0; idx < 40; idx++) {
      const coords = tileIndexToWorldXZ(idx);
      const hit = new THREE.Mesh(hitboxGeo, hitboxMat);
      hit.position.set(coords.x, 0.02, coords.z);
      hit.userData.tileIndex = idx;
      hitboxLayer.add(hit);

      if (coords.edge !== 'corner') {
        const plaqueMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.32,
          metalness: 0.45,
        });
        const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
        plaqueMesh.castShadow = true;
        plaqueMesh.visible = false;
        const outerOffset = 0.41;
        if (coords.edge === 'bottom') {
          plaqueMesh.position.set(coords.x, 0.025, coords.z + outerOffset);
        } else if (coords.edge === 'left') {
          plaqueMesh.position.set(coords.x - outerOffset, 0.025, coords.z);
          plaqueMesh.rotation.y = Math.PI / 2;
        } else if (coords.edge === 'top') {
          plaqueMesh.position.set(coords.x, 0.025, coords.z - outerOffset);
        } else {
          plaqueMesh.position.set(coords.x + outerOffset, 0.025, coords.z);
          plaqueMesh.rotation.y = Math.PI / 2;
        }
        plaqueLayer.add(plaqueMesh);

        const mortgagePlane = new THREE.Mesh(mortgageGeo, mortgageMat);
        mortgagePlane.position.set(coords.x, 0.032, coords.z);
        mortgagePlane.rotation.x = -Math.PI / 2;
        if (coords.edge === 'left') mortgagePlane.rotation.z = -Math.PI / 2;
        else if (coords.edge === 'top') mortgagePlane.rotation.z = Math.PI;
        else if (coords.edge === 'right') mortgagePlane.rotation.z = Math.PI / 2;
        mortgagePlane.visible = false;
        plaqueLayer.add(mortgagePlane);

        plaques.set(idx, { plaqueMesh, plaqueMat, mortgagePlane });
      }
    }

    // Glowing Golden Highlight Rings (Selected, Hop Spotlight, Hover)
    const ringGeo = new THREE.RingGeometry(0.41, 0.48, 32);
    const makeRing = (color: string, opacity: number) => {
      const mat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.022;
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };
    const selectedRing = makeRing('#FACC15', 0.92);
    const spotlightRing = makeRing('#F59E0B', 0.95);
    const hoverRing = makeRing('#FEF08A', 0.55);

    // 2 Realistic 3D Dice
    const die1 = createDiceMesh();
    const die2 = createDiceMesh();
    die1.mesh.position.set(-0.52, 0.26, 0.36);
    die2.mesh.position.set(0.52, 0.26, -0.26);
    die1.mesh.rotation.set(0, 0.28, 0);
    die2.mesh.rotation.set(0, -0.35, 0);
    scene.add(die1.mesh, die2.mesh);

    const bundle = {
      scene,
      camera,
      controls,
      tokenLayer,
      buildingLayer,
      plaqueLayer,
      coinLayer,
      tokens: new Map<string, TokenRuntime>(),
      buildings: new Map<number, BuildingRuntime>(),
      plaques,
      flyingCoins: [] as FlyingCoinRuntime[],
      selectedRing,
      spotlightRing,
      hoverRing,
      die1Mesh: die1.mesh,
      die2Mesh: die2.mesh,
      chestDeckGroup: chestDeck.group,
      chanceDeckGroup: chanceDeck.group,
      deckDrawFx: {
        active: false,
        deck: 'chance' as 'chance' | 'chest',
        startMs: 0,
        durationMs: 720,
        lastKey: -1,
      },
      diceThrow: {
        active: false,
        startMs: 0,
        durationMs: 880,
        die1TargetQuat: getDiceTargetQuaternion(1, 0.24),
        die2TargetQuat: getDiceTargetQuaternion(1, -0.28),
      },
      cameraLerp: {
        active: false,
        targetPos: new THREE.Vector3(0, 11.5, 11.2),
        targetLook: new THREE.Vector3(0, 0, 0),
      },
      userManualOverride: false,
      orbitYaw: 0,
      boardTopMat,
      boardTexPair,
      feltMat,
      frameMat,
      hemiLight,
      envController: envController as BoardEnvironmentController,
      activeMapTheme: initialTheme,
      activeTopOrientation: 'south' as 'south' | 'north',
      lastBuildKey: -1,
      lastCashFxKey: -1,
      lastThrowKey: 0,
    };
    sceneBundleRef.current = bundle;

    // Cancel auto camera lerp/follow as soon as user manually drags or zooms
    const onControlStart = () => {
      bundle.cameraLerp.active = false;
      bundle.userManualOverride = true;
    };
    controls.addEventListener('start', onControlStart);

    // Pointer Raycasting (Click vs Orbit Drag < 6px)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const getTileUnderPointer = (ev: PointerEvent): number | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitboxLayer.children, false);
      if (hits.length > 0 && typeof hits[0].object.userData.tileIndex === 'number') {
        return hits[0].object.userData.tileIndex as number;
      }
      return null;
    };

    const onPointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (dist >= 6) return;
      const tileIdx = getTileUnderPointer(ev);
      if (tileIdx !== null) {
        latestPropsRef.current.onSelectTile(tileIdx);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const tileIdx = getTileUnderPointer(ev);
      if (tileIdx !== null) {
        const coords = tileIndexToWorldXZ(tileIdx);
        hoverRing.position.set(coords.x, 0.021, coords.z);
        hoverRing.visible = true;
        renderer.domElement.style.cursor = 'pointer';
      } else {
        hoverRing.visible = false;
        renderer.domElement.style.cursor = 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // ResizeObserver for crisp responsive viewport
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 280);
        const h = Math.max(entry.contentRect.height, 280);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    // Render Loop
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const currentProps = latestPropsRef.current;

      // 1. Animate player tokens (smooth XZ + parabolic hop arc + yaw + active ring pulse)
      const currentPlayer = currentProps.gameState.players[currentProps.gameState.currentTurnIndex];
      bundle.tokens.forEach((runtime, playerId) => {
        if (runtime.isHopping) {
          const elapsed = now - runtime.hopStartMs;
          const progress = Math.min(1, elapsed / runtime.hopDurationMs);
          const eased = easeInOutCubic(progress);
          runtime.root.position.x = THREE.MathUtils.lerp(runtime.startX, runtime.targetX, eased);
          runtime.root.position.z = THREE.MathUtils.lerp(runtime.startZ, runtime.targetZ, eased);
          runtime.root.position.y = Math.sin(progress * Math.PI) * 0.62;
          if (progress >= 1) {
            runtime.isHopping = false;
            runtime.currentX = runtime.targetX;
            runtime.currentZ = runtime.targetZ;
            runtime.root.position.set(runtime.targetX, 0, runtime.targetZ);
          }
        } else {
          runtime.root.position.x = THREE.MathUtils.lerp(runtime.root.position.x, runtime.targetX, 0.22);
          runtime.root.position.z = THREE.MathUtils.lerp(runtime.root.position.z, runtime.targetZ, 0.22);
          runtime.root.position.y = THREE.MathUtils.lerp(runtime.root.position.y, 0, 0.22);
          runtime.currentX = runtime.root.position.x;
          runtime.currentZ = runtime.root.position.z;
        }

        runtime.modelHolder.rotation.y = lerpAngle(
          runtime.modelHolder.rotation.y,
          runtime.targetYaw,
          0.18,
        );

        const isActive = currentPlayer?.id === playerId || currentProps.animatingPlayerId === playerId;
        if (isActive) {
          runtime.ringMat.emissiveIntensity = 0.55 + Math.sin(now * 0.008) * 0.35;
        } else {
          runtime.ringMat.emissiveIntensity = 0.14;
        }
      });

      // 2. Animate building construction spring drop-in
      bundle.buildings.forEach((b) => {
        if (!b.isPopping) return;
        const progress = Math.min(1, (now - b.popStartMs) / 550);
        // Damped spring overshoot
        const s = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 2.5);
        const scale = Math.max(0.05, s);
        b.group.scale.setScalar(scale);
        b.group.position.y = Math.max(0, (1 - progress) * (1 - progress) * 1.15);
        if (progress >= 1) {
          b.isPopping = false;
          b.group.scale.setScalar(1);
          b.group.position.y = 0;
        }
      });

      // 3. Smooth Continuous 3D Dice Throw with 4 Parabolic Cushioned Bounces & Quaternion Slerp
      if (bundle.diceThrow.active) {
        const elapsed = now - bundle.diceThrow.startMs;
        const progress = Math.min(1, elapsed / bundle.diceThrow.durationMs);
        // Smooth quintic deceleration for horizontal glide
        const posEase = 1 - Math.pow(1 - progress, 4.5);
        const rotEase = 1 - Math.pow(1 - Math.min(1, progress * 1.03), 3.8);

        // True parabolic gravity arcs (4 * u * (1 - u)) across 4 cushioned bounces
        const computeBounce = (p: number): number => {
          if (p < 0.44) {
            const u = p / 0.44;
            return 4 * u * (1 - u) * 1.85;
          }
          if (p < 0.72) {
            const u = (p - 0.44) / 0.28;
            return 4 * u * (1 - u) * 0.68;
          }
          if (p < 0.90) {
            const u = (p - 0.72) / 0.18;
            return 4 * u * (1 - u) * 0.22;
          }
          const u = (p - 0.90) / 0.10;
          return 4 * u * (1 - u) * 0.05;
        };

        const b1 = computeBounce(progress);
        const b2 = computeBounce(Math.min(1, Math.max(0, (progress - 0.025) / 0.975)));
        const curveArc = Math.sin(progress * Math.PI) * 0.32;

        bundle.die1Mesh.position.set(
          THREE.MathUtils.lerp(-2.35, -0.52, posEase) - curveArc,
          0.26 + b1,
          THREE.MathUtils.lerp(2.55, 0.36, posEase),
        );
        bundle.die2Mesh.position.set(
          THREE.MathUtils.lerp(2.25, 0.52, posEase) + curveArc,
          0.26 + b2,
          THREE.MathUtils.lerp(2.35, -0.26, posEase),
        );

        const spinDecay = (1 - rotEase) * (1 - rotEase);
        _tumbleQuat.setFromAxisAngle(_tumbleAxis1, spinDecay * Math.PI * 6.2);
        bundle.die1Mesh.quaternion.copy(_tumbleQuat).multiply(bundle.diceThrow.die1TargetQuat);

        _tumbleQuat.setFromAxisAngle(_tumbleAxis2, -spinDecay * Math.PI * 5.8);
        bundle.die2Mesh.quaternion.copy(_tumbleQuat).multiply(bundle.diceThrow.die2TargetQuat);

        if (progress >= 1) {
          bundle.diceThrow.active = false;
          bundle.die1Mesh.position.set(-0.52, 0.26, 0.36);
          bundle.die2Mesh.position.set(0.52, 0.26, -0.26);
          bundle.die1Mesh.quaternion.copy(bundle.diceThrow.die1TargetQuat);
          bundle.die2Mesh.quaternion.copy(bundle.diceThrow.die2TargetQuat);
        }
      }

      // 3b. Animate 3D Deck Pulse when drawing Chance / Chest card
      if (bundle.deckDrawFx.active) {
        const p = Math.min(1, (now - bundle.deckDrawFx.startMs) / bundle.deckDrawFx.durationMs);
        const deckGroup =
          bundle.deckDrawFx.deck === 'chance' ? bundle.chanceDeckGroup : bundle.chestDeckGroup;
        const lift = Math.sin(p * Math.PI) * 0.65;
        const popScale = 1 + Math.sin(p * Math.PI) * 0.22;
        deckGroup.position.y = lift;
        deckGroup.scale.setScalar(popScale);
        if (p >= 1) {
          bundle.deckDrawFx.active = false;
          deckGroup.position.y = 0;
          deckGroup.scale.setScalar(1);
        }
      }

      // 4. Animate Flying 3D Gold Coins
      for (let i = bundle.flyingCoins.length - 1; i >= 0; i--) {
        const coin = bundle.flyingCoins[i];
        const elapsed = now - coin.startMs;
        if (elapsed < 0) {
          coin.group.visible = false;
          continue;
        }
        coin.group.visible = true;
        const p = Math.min(1, elapsed / coin.durationMs);
        const eased = easeInOutCubic(p);
        coin.group.position.set(
          THREE.MathUtils.lerp(coin.startX, coin.endX, eased),
          0.42 + Math.sin(p * Math.PI) * 2.35,
          THREE.MathUtils.lerp(coin.startZ, coin.endZ, eased),
        );
        coin.group.rotation.y += 0.28;
        const scale = (p > 0.84 ? Math.max(0.15, (1 - p) / 0.16) : 1) * 1.24;
        coin.group.scale.setScalar(scale);

        if (p >= 1) {
          bundle.coinLayer.remove(coin.group);
          bundle.flyingCoins.splice(i, 1);
        }
      }

      // 5. Pulse highlight rings & animate outer 3D environment
      if (bundle.spotlightRing.visible) {
        const pulse = 1 + Math.sin(now * 0.01) * 0.08;
        bundle.spotlightRing.scale.set(pulse, pulse, 1);
      }
      bundle.envController.update(now * 0.001);

      // 6. Smooth Non-Spinning Follow-Behind Camera (tracks behind owner's character without rotating the board)
      const camOffsetX = camera.position.x - controls.target.x;
      const camOffsetZ = camera.position.z - controls.target.z;
      if (camOffsetX * camOffsetX + camOffsetZ * camOffsetZ > 0.02) {
        bundle.orbitYaw = Math.atan2(camOffsetX, camOffsetZ);
      }

      if (bundle.cameraLerp.active) {
        camera.position.lerp(bundle.cameraLerp.targetPos, 0.09);
        controls.target.lerp(bundle.cameraLerp.targetLook, 0.1);
        if (
          camera.position.distanceTo(bundle.cameraLerp.targetPos) < 0.04 &&
          controls.target.distanceTo(bundle.cameraLerp.targetLook) < 0.03
        ) {
          bundle.cameraLerp.active = false;
        }
      } else if (
        currentProps.followMode === 'owner' &&
        currentProps.cameraMode === 'isometric' &&
        !bundle.userManualOverride
      ) {
        const ownerId =
          !currentProps.isSpectator && currentProps.myPlayerId
            ? currentProps.myPlayerId
            : null;
        const isOwnerDiceThrow = Boolean(
          bundle.diceThrow.active && ownerId && currentPlayer?.id === ownerId,
        );
        if (currentProps.gameState.phase === 'TURN_ORDER_ROLL' || isOwnerDiceThrow) {
          // Hold steady center framing over the dice tray at the current viewing angle (zero rotation)
          const diceDist = 9.0;
          _targetGoal.set(0, 0.1, 0);
          _camGoal.set(
            Math.sin(bundle.orbitYaw) * diceDist,
            9.2,
            Math.cos(bundle.orbitYaw) * diceDist,
          );
          camera.position.lerp(_camGoal, 0.075);
          controls.target.lerp(_targetGoal, 0.085);
        } else if (ownerId) {
          // Follow behind the owner's character smoothly by translating camera & target (never spinning orbitYaw!)
          const ownerToken = bundle.tokens.get(ownerId);
          if (ownerToken) {
            const tx = ownerToken.root.position.x;
            const tz = ownerToken.root.position.z;
            const isOwnerTurn = currentPlayer?.id === ownerId;
            const isOwnerAnimating = currentProps.animatingPlayerId === ownerId;

            if (isOwnerTurn || isOwnerAnimating) {
              // Close follow-behind on owner's turn or movement
              const trackFactor = isOwnerAnimating ? 0.72 : 0.62;
              _targetGoal.set(tx * trackFactor, 0.25, tz * trackFactor);
              const followDist = isOwnerAnimating ? 7.6 : 8.4;
              const followHeight = isOwnerAnimating ? 6.6 : 7.5;
              _camGoal.set(
                _targetGoal.x + Math.sin(bundle.orbitYaw) * followDist,
                followHeight,
                _targetGoal.z + Math.cos(bundle.orbitYaw) * followDist,
              );
              controls.target.lerp(_targetGoal, 0.08);
              camera.position.lerp(_camGoal, 0.07);
            } else {
              // Calm wider overview anchored gently behind owner during other players' turns
              _targetGoal.set(tx * 0.28, 0.1, tz * 0.28);
              const restDist = 10.2;
              const restHeight = 9.6;
              _camGoal.set(
                _targetGoal.x + Math.sin(bundle.orbitYaw) * restDist,
                restHeight,
                _targetGoal.z + Math.cos(bundle.orbitYaw) * restDist,
              );
              controls.target.lerp(_targetGoal, 0.055);
              camera.position.lerp(_camGoal, 0.05);
            }
          }
        }
      }

      // Dynamic South/North Top-Edge Artwork Alignment (keeps #20..#30 upright from ANY orbit side!)
      const viewYawAbs = Math.abs(
        normalizeAngle(
          Math.atan2(
            camera.position.x - controls.target.x,
            camera.position.z - controls.target.z,
          ),
        ),
      );
      if (bundle.activeTopOrientation === 'south' && viewYawAbs > 2.02) {
        bundle.activeTopOrientation = 'north';
        bundle.boardTopMat.map = bundle.boardTexPair.north;
        bundle.boardTopMat.needsUpdate = true;
      } else if (bundle.activeTopOrientation === 'north' && viewYawAbs < 1.82) {
        bundle.activeTopOrientation = 'south';
        bundle.boardTopMat.map = bundle.boardTexPair.south;
        bundle.boardTopMat.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);

      bundle.tokens.forEach((rt) => rt.disposables.forEach((d) => d.dispose()));
      bundle.plaques.forEach((p) => p.plaqueMat.dispose());

      die1.dispose();
      die2.dispose();
      chestDeck.dispose();
      chanceDeck.dispose();
      bundle.envController.dispose();
      boardTexPair.dispose();
      boardSideMat.dispose();
      boardTopMat.dispose();
      boardGeo.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      feltGeo.dispose();
      feltMat.dispose();
      hitboxGeo.dispose();
      hitboxMat.dispose();
      plaqueGeo.dispose();
      mortgageTex.dispose();
      mortgageGeo.dispose();
      mortgageMat.dispose();
      ringGeo.dispose();
      (selectedRing.material as THREE.Material).dispose();
      (spotlightRing.material as THREE.Material).dispose();
      (hoverRing.material as THREE.Material).dispose();

      controls.dispose();
      renderer.dispose();
      sceneBundleRef.current = null;
    };
  }, []);

  // Sync Deed Plaques, Mortgage Badges, Owner-Colored 3D Houses/Hotels & Tile Location Landmarks
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;

    const playerById = new Map(props.gameState.players.map((p) => [p.id, p]));
    const occupiedTiles = new Set<number>();
    for (const p of props.gameState.players) {
      if (!p.isBankrupt) {
        const pos = props.displayPositions[p.id] ?? p.position;
        occupiedTiles.add(pos);
      }
    }
    if (props.hopSpotlightTile !== null && props.hopSpotlightTile !== undefined) {
      occupiedTiles.add(props.hopSpotlightTile);
    }

    const isNewBuild =
      props.recentlyBuilt && props.recentlyBuilt.key !== bundle.lastBuildKey;
    if (props.recentlyBuilt) {
      bundle.lastBuildKey = props.recentlyBuilt.key;
    }

    Object.values(props.gameState.deeds).forEach((deed) => {
      const owner = deed.ownerId ? playerById.get(deed.ownerId) : undefined;
      const plaqueInfo = bundle.plaques.get(deed.tileIndex);
      if (plaqueInfo) {
        if (owner) {
          plaqueInfo.plaqueMesh.visible = true;
          plaqueInfo.plaqueMat.color.set(owner.color);
          plaqueInfo.plaqueMat.emissive.set(deed.isMortgaged ? '#000000' : owner.color);
          plaqueInfo.plaqueMat.emissiveIntensity = deed.isMortgaged ? 0 : 0.24;
          plaqueInfo.mortgagePlane.visible = deed.isMortgaged;
        } else {
          plaqueInfo.plaqueMesh.visible = false;
          plaqueInfo.mortgagePlane.visible = false;
        }
      }

      const hasBuildings = deed.hasHotel || deed.houses > 0;
      const isOccupied = occupiedTiles.has(deed.tileIndex);
      const showLandmark = !hasBuildings && (Boolean(owner) || isOccupied);
      const ownerColor = owner?.color ?? '#E3BE3B';

      // Buildings / Landmark diff per tile (includes owner color so ownership changes update color immediately)
      const sig = hasBuildings
        ? `B:${ownerColor}:${deed.hasHotel ? 'H' : deed.houses}`
        : showLandmark
          ? `L:${owner?.color ?? 'UNOWNED'}`
          : 'NONE';

      const existing = bundle.buildings.get(deed.tileIndex);
      if (existing && existing.signature === sig) {
        if (isNewBuild && props.recentlyBuilt?.tileIndex === deed.tileIndex) {
          existing.popStartMs = performance.now();
          existing.isPopping = true;
        }
        return;
      }

      if (existing) {
        bundle.buildingLayer.remove(existing.group);
        bundle.buildings.delete(deed.tileIndex);
      }

      if (sig === 'NONE') return;

      const coords = tileIndexToWorldXZ(deed.tileIndex);
      const group = new THREE.Group();

      if (hasBuildings) {
        const count = deed.hasHotel ? 1 : Math.min(4, deed.houses);
        const positions = getInnerBuildingPositions(coords, count, deed.hasHotel);
        const shouldPop = isNewBuild && props.recentlyBuilt?.tileIndex === deed.tileIndex;

        const plinthMat = new THREE.MeshStandardMaterial({
          color: ownerColor,
          emissive: ownerColor,
          emissiveIntensity: deed.hasHotel ? 0.32 : 0.18,
          roughness: 0.28,
          metalness: 0.45,
        });

        positions.forEach((pos) => {
          const slot = new THREE.Group();
          slot.position.set(pos.x, 0, pos.z);
          slot.rotation.y = pos.rotY;

          const plinthHeight = deed.hasHotel ? 0.055 : 0.032;
          const plinth = new THREE.Mesh(
            deed.hasHotel ? _hotelPlinthGeo : _housePlinthGeo,
            plinthMat,
          );
          plinth.position.y = plinthHeight / 2;
          plinth.castShadow = true;
          plinth.receiveShadow = true;
          slot.add(plinth);

          const modelAnchor = new THREE.Group();
          modelAnchor.position.y = plinthHeight;
          const targetSize = deed.hasHotel ? 0.62 : 0.36;
          const kind = deed.hasHotel ? 'hotel' : 'house';
          const buildingMesh = createOwnerBuildingMesh(kind, ownerColor, targetSize);
          modelAnchor.add(buildingMesh);
          slot.add(modelAnchor);

          group.add(slot);
        });

        bundle.buildingLayer.add(group);
        bundle.buildings.set(deed.tileIndex, {
          group,
          signature: sig,
          popStartMs: shouldPop ? performance.now() : 0,
          isPopping: Boolean(shouldPop),
        });
      } else if (showLandmark) {
        // Show 3D Location Landmark miniature on inner side of tile when landed on or owned
        const positions = getInnerBuildingPositions(coords, 1, true);
        const pos = positions[0]!;
        const slot = new THREE.Group();
        slot.position.set(pos.x, 0, pos.z);
        slot.rotation.y = pos.rotY;

        const landmark = createTileLandmarkModel(
          deed.tileIndex,
          owner?.color ?? null,
          owner ? 0.44 : 0.48,
        );
        slot.add(landmark);
        group.add(slot);

        bundle.buildingLayer.add(group);
        bundle.buildings.set(deed.tileIndex, {
          group,
          signature: sig,
          popStartMs: performance.now(),
          isPopping: true,
        });
      }
    });
  }, [
    props.gameState.deeds,
    props.gameState.players,
    props.displayPositions,
    props.hopSpotlightTile,
    props.recentlyBuilt,
  ]);

  // Sync Player Tokens & Hop Animations
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;

    const activePlayers = props.gameState.players.filter((p) => !p.isBankrupt);
    const activeIds = new Set(activePlayers.map((p) => p.id));

    // Remove bankrupt/removed player tokens
    bundle.tokens.forEach((rt, id) => {
      if (!activeIds.has(id)) {
        bundle.tokenLayer.remove(rt.root);
        rt.disposables.forEach((d) => d.dispose());
        bundle.tokens.delete(id);
      }
    });

    // Group players sharing a tile so they spread cleanly
    const byTile = new Map<number, string[]>();
    for (const p of activePlayers) {
      const tileIdx = props.displayPositions[p.id] ?? p.position;
      const list = byTile.get(tileIdx) ?? [];
      list.push(p.id);
      byTile.set(tileIdx, list);
    }

    const now = performance.now();
    for (const player of activePlayers) {
      const tileIdx = props.displayPositions[player.id] ?? player.position;
      const occupants = byTile.get(tileIdx) ?? [player.id];
      const slotIdx = occupants.indexOf(player.id);
      const coords = tileIndexToWorldXZ(tileIdx);
      const offset = getMultiTokenOffset(slotIdx, occupants.length);
      const tx = coords.x + offset.dx;
      const tz = coords.z + offset.dz;
      const yaw = getTravelYaw(tileIdx);

      let runtime = bundle.tokens.get(player.id);
      if (runtime && runtime.tokenId !== player.tokenId) {
        bundle.tokenLayer.remove(runtime.root);
        runtime.disposables.forEach((d) => d.dispose());
        bundle.tokens.delete(player.id);
        runtime = undefined;
      }
      if (!runtime) {
        const root = new THREE.Group();
        root.position.set(tx, 0, tz);

        const baseGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.07, 24);
        const baseMat = new THREE.MeshStandardMaterial({
          color: '#1E1B18',
          roughness: 0.3,
          metalness: 0.65,
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.035;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;

        const ringGeo = new THREE.TorusGeometry(0.25, 0.032, 12, 28);
        const ringMat = new THREE.MeshStandardMaterial({
          color: player.color,
          emissive: player.color,
          emissiveIntensity: 0.25,
          roughness: 0.25,
          metalness: 0.72,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.065;

        const modelHolder = new THREE.Group();
        modelHolder.position.y = 0.07;
        modelHolder.rotation.y = yaw;

        const tokenCount = MODEL_URLS.tokens.length;
        const tokenIdx = ((player.tokenId % tokenCount) + tokenCount) % tokenCount;
        const toyToken = createDesignerToyToken(tokenIdx, player.color, 0.72);
        modelHolder.add(toyToken);

        root.add(baseMesh, ringMesh, modelHolder);
        bundle.tokenLayer.add(root);

        runtime = {
          root,
          modelHolder,
          ringMat,
          tokenId: player.tokenId,
          currentX: tx,
          currentZ: tz,
          startX: tx,
          startZ: tz,
          targetX: tx,
          targetZ: tz,
          targetYaw: yaw,
          hopStartMs: 0,
          hopDurationMs: 420,
          isHopping: false,
          tileIndex: tileIdx,
          disposables: [baseGeo, baseMat, ringGeo, ringMat],
        };
        bundle.tokens.set(player.id, runtime);
      } else {
        const dist = Math.hypot(tx - runtime.targetX, tz - runtime.targetZ);
        if (dist > 0.08) {
          runtime.startX = runtime.root.position.x;
          runtime.startZ = runtime.root.position.z;
          runtime.targetX = tx;
          runtime.targetZ = tz;
          runtime.targetYaw = yaw;
          runtime.tileIndex = tileIdx;
          runtime.hopStartMs = now;
          runtime.hopDurationMs = 420;
          runtime.isHopping = true;
        }
      }
    }
  }, [props.gameState.players, props.displayPositions, props.animatingPlayerId]);

  // Sync Selected & Hop Spotlight Rings
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;

    if (props.selectedTileIndex !== null) {
      const c = tileIndexToWorldXZ(props.selectedTileIndex);
      bundle.selectedRing.position.set(c.x, 0.024, c.z);
      bundle.selectedRing.visible = true;
    } else {
      bundle.selectedRing.visible = false;
    }

    if (props.hopSpotlightTile !== null && props.hopSpotlightTile !== undefined) {
      const c = tileIndexToWorldXZ(props.hopSpotlightTile);
      bundle.spotlightRing.position.set(c.x, 0.025, c.z);
      bundle.spotlightRing.visible = true;
    } else {
      bundle.spotlightRing.visible = false;
    }
  }, [props.selectedTileIndex, props.hopSpotlightTile]);

  // Trigger 3D Dice Throw Animation (single continuous throw per throwKey; no 72ms restarts!)
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;

    const faces = props.gameState.lastDice ?? props.thrownDiceFaces;
    const d1 = faces?.die1 ?? 1;
    const d2 = faces?.die2 ?? 1;
    const target1Quat = getDiceTargetQuaternion(d1, 0.24);
    const target2Quat = getDiceTargetQuaternion(d2, -0.28);

    if (props.throwKey > 0 && props.throwKey !== bundle.lastThrowKey) {
      bundle.lastThrowKey = props.throwKey;
      const rollerId = props.gameState.players[props.gameState.currentTurnIndex]?.id;
      const ownerId = !props.isSpectator ? props.myPlayerId : null;
      if (ownerId && rollerId === ownerId) {
        bundle.userManualOverride = false;
      }
      bundle.diceThrow = {
        active: true,
        startMs: performance.now(),
        durationMs: 1020,
        die1TargetQuat: target1Quat,
        die2TargetQuat: target2Quat,
      };
    } else if (bundle.diceThrow.active) {
      bundle.diceThrow.die1TargetQuat = target1Quat;
      bundle.diceThrow.die2TargetQuat = target2Quat;
    } else {
      bundle.die1Mesh.quaternion.copy(target1Quat);
      bundle.die2Mesh.quaternion.copy(target2Quat);
    }
  }, [props.throwKey, props.gameState.lastDice, props.thrownDiceFaces]);

  // Sync 3D Outer Environment Map Theme when gameState.mapTheme changes
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;
    const nextTheme = props.gameState.mapTheme ?? 'siam_park';
    if (bundle.activeMapTheme === nextTheme) return;

    bundle.scene.remove(bundle.envController.group);
    bundle.envController.dispose();

    const nextEnv = createBoardEnvironment(nextTheme);
    bundle.envController = nextEnv;
    bundle.activeMapTheme = nextTheme;
    bundle.scene.add(nextEnv.group);

    bundle.scene.background = new THREE.Color(nextEnv.palette.backgroundHex);
    bundle.scene.fog = new THREE.Fog(nextEnv.palette.fogHex, 24, 44);
    bundle.feltMat.color.set(nextEnv.palette.tableClothHex);
    bundle.feltMat.roughness = nextEnv.palette.tableRoughness;
    bundle.frameMat.color.set(nextEnv.palette.rimHex);
    bundle.hemiLight.intensity = nextEnv.palette.ambientIntensity;
  }, [props.gameState.mapTheme]);

  // Trigger 3D Deck Lift Pulse when Chance/Chest Card Draws
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle || !props.activeCardDraw) return;
    if (props.activeCardDraw.key === bundle.deckDrawFx.lastKey) return;
    bundle.deckDrawFx = {
      active: true,
      deck: props.activeCardDraw.deck,
      startMs: performance.now(),
      durationMs: 720,
      lastKey: props.activeCardDraw.key,
    };
  }, [props.activeCardDraw]);

  // Re-engage smooth owner-pawn orbit focus only on owner actions/movement/toggle (never on other players' turns)
  const ownerId = !props.isSpectator && props.myPlayerId ? props.myPlayerId : null;
  const currentTurnPlayerId = props.gameState.players[props.gameState.currentTurnIndex]?.id ?? null;
  const isOwnersTurnNow = Boolean(ownerId && currentTurnPlayerId === ownerId);
  const ownerDisplayPos = ownerId ? props.displayPositions[ownerId] : undefined;
  const prevFollowPhaseRef = useRef(props.gameState.phase);

  useEffect(() => {
    const prevPhase = prevFollowPhaseRef.current;
    prevFollowPhaseRef.current = props.gameState.phase;
    const justFinishedTurnOrder =
      prevPhase === 'TURN_ORDER_ROLL' && props.gameState.phase === 'AWAIT_ROLL';

    const bundle = sceneBundleRef.current;
    if (!bundle) return;
    if (props.cameraMode !== 'isometric' || props.followMode === 'off' || !ownerId) return;
    if (
      isOwnersTurnNow ||
      props.animatingPlayerId === ownerId ||
      justFinishedTurnOrder
    ) {
      bundle.userManualOverride = false;
      bundle.cameraLerp.active = false;
    }
  }, [
    ownerId,
    isOwnersTurnNow,
    ownerDisplayPos,
    props.gameState.phase,
    props.followMode,
    props.focusOwnerTrigger,
    props.animatingPlayerId,
    props.cameraMode,
  ]);

  // Trigger Flying 3D Gold Coins on Cash Transfer FX
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle || !props.cashTransferFx) return;
    if (props.cashTransferFx.key === bundle.lastCashFxKey) return;
    bundle.lastCashFxKey = props.cashTransferFx.key;

    const startCoords =
      props.cashTransferFx.payerTileIndex !== undefined
        ? tileIndexToWorldXZ(props.cashTransferFx.payerTileIndex)
        : { x: 0, z: 0 };
    const endCoords =
      props.cashTransferFx.recipientTileIndex !== undefined
        ? tileIndexToWorldXZ(props.cashTransferFx.recipientTileIndex)
        : { x: 0, z: 0 };

    const coinCount = 7;
    const baseNow = performance.now();
    for (let i = 0; i < coinCount; i++) {
      const coinGroup = new THREE.Group();
      const jitterX = ((i % 3) - 1) * 0.16;
      const jitterZ = (Math.floor(i / 3) - 1) * 0.16;
      coinGroup.position.set(startCoords.x + jitterX, 0.42, startCoords.z + jitterZ);
      coinGroup.visible = false;

      const fallback = createFallbackModel('coin', 0.4);
      coinGroup.add(fallback);

      loadNormalizedGLB(MODEL_URLS.coin, 0.4)
        .then((model) => {
          if (!coinGroup.parent) return;
          coinGroup.remove(fallback);
          coinGroup.add(model);
        })
        .catch(() => {
          // Keep golden fallback coin
        });

      bundle.coinLayer.add(coinGroup);
      bundle.flyingCoins.push({
        group: coinGroup,
        startX: startCoords.x + jitterX,
        startZ: startCoords.z + jitterZ,
        endX: endCoords.x,
        endZ: endCoords.z,
        startMs: baseNow + i * 65,
        durationMs: 960,
      });
    }
  }, [props.cashTransferFx]);

  // Smooth Camera Mode Lerp & Reset
  const prevResetTriggerRef = useRef(0);
  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;

    const isExplicitReset = props.resetCameraTrigger !== prevResetTriggerRef.current;
    prevResetTriggerRef.current = props.resetCameraTrigger;

    bundle.userManualOverride = isExplicitReset || props.cameraMode === 'topdown';
    bundle.cameraLerp = {
      active: true,
      targetPos:
        props.cameraMode === 'topdown'
          ? new THREE.Vector3(0, 15.8, 0.01)
          : new THREE.Vector3(0, 11.5, 11.2),
      targetLook: new THREE.Vector3(0, 0, 0),
    };
  }, [props.cameraMode, props.resetCameraTrigger]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border border-amber-400/40 bg-emerald-950/90 p-6 text-center text-amber-100">
        <div>
          <p className="font-display text-base font-bold">ไม่สามารถเปิดฉาก 3 มิติได้</p>
          <p className="mt-1 text-xs text-amber-200/80">{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none"
      aria-label="กระดานเกมซุปเปอร์เศรษฐี 3 มิติ"
    />
  );
}
