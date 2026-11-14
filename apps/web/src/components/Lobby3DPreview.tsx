import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  BOARD_MAP_THEMES,
  TOKEN_NAMES,
  type BoardMapTheme,
} from '@super-millionaire/shared';
import { Map as MapIcon, RotateCw, Sparkles } from 'lucide-react';
import {
  createBoardEnvironment,
  type BoardEnvironmentController,
} from '../three/boardEnvironmentMap';
import { createBoardCanvasTexturePair } from '../three/boardTexture';
import { createDesignerToyToken } from '../three/modelLoader';

export type LobbyPreviewFocus = 'character' | 'map';

export interface Lobby3DPreviewProps {
  mapTheme: BoardMapTheme;
  tokenId: number;
  playerColor: string;
  focusMode: LobbyPreviewFocus;
  onChangeFocusMode: (mode: LobbyPreviewFocus) => void;
  compact?: boolean;
}

export function Lobby3DPreview({
  mapTheme,
  tokenId,
  playerColor,
  focusMode,
  onChangeFocusMode,
  compact = false,
}: Lobby3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    hemiLight: THREE.HemisphereLight;
    basinMat: THREE.MeshStandardMaterial;
    frameMat: THREE.MeshStandardMaterial;
    pedestalRingMat: THREE.MeshStandardMaterial;
    characterHolder: THREE.Group;
    envController: BoardEnvironmentController;
    activeTheme: BoardMapTheme;
    activeTokenId: number;
    activeColor: string;
    focusMode: LobbyPreviewFocus;
    userDragging: boolean;
    orbitAngle: number;
  } | null>(null);

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
      return;
    }

    const width = Math.max(container.clientWidth, 240);
    const height = Math.max(container.clientHeight, 200);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const envController = createBoardEnvironment(mapTheme);
    scene.background = new THREE.Color(envController.palette.backgroundHex);
    scene.fog = new THREE.Fog(envController.palette.fogHex, 20, 42);
    scene.add(envController.group);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 75);
    if (focusMode === 'character') {
      camera.position.set(0, 2.35, 3.85);
    } else {
      camera.position.set(0, 11.2, 14.8);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 2.4;
    controls.maxDistance = 26;
    if (focusMode === 'character') {
      controls.target.set(0, 1.05, 0);
    } else {
      controls.target.set(0, 0.2, 0);
    }
    controls.update();

    const hemiLight = new THREE.HemisphereLight(
      '#FFF8E6',
      '#163523',
      envController.palette.ambientIntensity,
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFF6E0', 1.75);
    keyLight.position.set(6.5, 13.5, 8.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 38;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#93C5FD', 0.62);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    const heroSpot = new THREE.PointLight('#FFE08A', 0.85, 12);
    heroSpot.position.set(0, 3.6, 1.8);
    scene.add(heroSpot);

    // Basin floor beneath water & terrain
    const basinGeo = new THREE.CircleGeometry(24, 56);
    const basinMat = new THREE.MeshStandardMaterial({
      color: envController.palette.tableClothHex,
      roughness: envController.palette.tableRoughness,
      metalness: 0.05,
    });
    const basinMesh = new THREE.Mesh(basinGeo, basinMat);
    basinMesh.rotation.x = -Math.PI / 2;
    basinMesh.position.y = -0.52;
    basinMesh.receiveShadow = true;
    scene.add(basinMesh);

    // Miniature central board slab & frame
    const frameGeo = new THREE.BoxGeometry(11.46, 0.3, 11.46);
    const frameMat = new THREE.MeshStandardMaterial({
      color: envController.palette.rimHex,
      roughness: 0.52,
      metalness: 0.14,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.2;
    frameMesh.receiveShadow = true;
    scene.add(frameMesh);

    const boardTexPair = createBoardCanvasTexturePair(
      renderer.capabilities.getMaxAnisotropy(),
    );
    const boardGeo = new THREE.BoxGeometry(11.0, 0.28, 11.0);
    const boardSideMat = new THREE.MeshStandardMaterial({
      color: '#185931',
      roughness: 0.62,
      metalness: 0.06,
    });
    const boardTopMat = new THREE.MeshStandardMaterial({
      map: boardTexPair.south,
      roughness: 0.5,
      metalness: 0.04,
    });
    const boardMesh = new THREE.Mesh(boardGeo, [
      boardSideMat,
      boardSideMat,
      boardTopMat,
      boardSideMat,
      boardSideMat,
      boardSideMat,
    ]);
    boardMesh.position.y = -0.14;
    boardMesh.receiveShadow = true;
    scene.add(boardMesh);

    // Center Hero Showcase Pedestal for the 3D Character Pawn
    const pedestalGroup = new THREE.Group();
    const pedStep1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.32, 0.14, 36),
      new THREE.MeshStandardMaterial({ color: '#271E17', roughness: 0.35, metalness: 0.4 }),
    );
    pedStep1.position.y = 0.07;
    pedStep1.receiveShadow = true;
    pedStep1.castShadow = true;

    const pedGoldTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.04, 1.12, 0.08, 36),
      new THREE.MeshStandardMaterial({ color: '#F5C43D', roughness: 0.24, metalness: 0.78 }),
    );
    pedGoldTrim.position.y = 0.17;
    pedGoldTrim.receiveShadow = true;

    const pedTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.0, 0.09, 36),
      new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.3 }),
    );
    pedTop.position.y = 0.24;
    pedTop.receiveShadow = true;

    const pedestalRingMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      emissive: playerColor,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.65,
    });
    const pedGlowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.038, 14, 36),
      pedestalRingMat,
    );
    pedGlowRing.rotation.x = Math.PI / 2;
    pedGlowRing.position.y = 0.27;

    pedestalGroup.add(pedStep1, pedGoldTrim, pedTop, pedGlowRing);
    scene.add(pedestalGroup);

    const characterHolder = new THREE.Group();
    characterHolder.position.y = 0.285;
    const initialToy = createDesignerToyToken(tokenId, playerColor, 1.85);
    characterHolder.add(initialToy);
    scene.add(characterHolder);

    const bundle = {
      scene,
      camera,
      controls,
      hemiLight,
      basinMat,
      frameMat,
      pedestalRingMat,
      characterHolder,
      envController,
      activeTheme: mapTheme,
      activeTokenId: tokenId,
      activeColor: playerColor,
      focusMode,
      userDragging: false,
      orbitAngle: 0,
    };
    stateRef.current = bundle;

    const onStart = () => {
      bundle.userDragging = true;
    };
    const onEnd = () => {
      bundle.userDragging = false;
      bundle.orbitAngle = Math.atan2(
        camera.position.x - controls.target.x,
        camera.position.z - controls.target.z,
      );
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 240);
        const h = Math.max(entry.contentRect.height, 200);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    const goalPos = new THREE.Vector3();
    const goalTarget = new THREE.Vector3();
    let rafId = 0;
    let prevTime = performance.now() * 0.001;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      const dt = Math.min(0.05, Math.max(0.001, t - prevTime));
      prevTime = t;

      bundle.envController.update(t);

      // Calm, frame-rate-independent breathing & slow turntable rotation on the 3D character
      bundle.characterHolder.rotation.y = t * 0.26;
      bundle.characterHolder.position.y = 0.285 + Math.sin(t * 1.9) * 0.025;

      if (!bundle.userDragging) {
        if (bundle.focusMode === 'character') {
          goalTarget.set(0, 1.08, 0);
          const r = 3.75;
          bundle.orbitAngle += dt * 0.045;
          goalPos.set(
            Math.sin(bundle.orbitAngle) * r,
            2.25,
            Math.cos(bundle.orbitAngle) * r,
          );
        } else {
          goalTarget.set(0, 0.15, 0);
          const r = 15.2;
          bundle.orbitAngle += dt * 0.065;
          goalPos.set(
            Math.sin(bundle.orbitAngle) * r,
            10.8,
            Math.cos(bundle.orbitAngle) * r,
          );
        }
        camera.position.lerp(goalPos, 0.06);
        controls.target.lerp(goalTarget, 0.075);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      boardTexPair.dispose();
      boardGeo.dispose();
      boardSideMat.dispose();
      boardTopMat.dispose();
      bundle.envController.dispose();
      controls.dispose();
      renderer.dispose();
      stateRef.current = null;
    };
  }, []);

  // Reactively swap 3D Map Theme when selected in Lobby
  useEffect(() => {
    const bundle = stateRef.current;
    if (!bundle || bundle.activeTheme === mapTheme) return;

    bundle.scene.remove(bundle.envController.group);
    bundle.envController.dispose();

    const nextEnv = createBoardEnvironment(mapTheme);
    bundle.envController = nextEnv;
    bundle.activeTheme = mapTheme;
    bundle.scene.add(nextEnv.group);

    bundle.scene.background = new THREE.Color(nextEnv.palette.backgroundHex);
    bundle.scene.fog = new THREE.Fog(nextEnv.palette.fogHex, 20, 42);
    bundle.basinMat.color.set(nextEnv.palette.tableClothHex);
    bundle.basinMat.roughness = nextEnv.palette.tableRoughness;
    bundle.frameMat.color.set(nextEnv.palette.rimHex);
    bundle.hemiLight.intensity = nextEnv.palette.ambientIntensity;
  }, [mapTheme]);

  // Reactively swap 3D Character Figurine & Color when selected in Lobby
  useEffect(() => {
    const bundle = stateRef.current;
    if (!bundle) return;
    if (bundle.activeTokenId === tokenId && bundle.activeColor === playerColor) return;

    bundle.activeTokenId = tokenId;
    bundle.activeColor = playerColor;
    bundle.pedestalRingMat.color.set(playerColor);
    bundle.pedestalRingMat.emissive.set(playerColor);

    while (bundle.characterHolder.children.length > 0) {
      const child = bundle.characterHolder.children[0]!;
      bundle.characterHolder.remove(child);
    }
    const nextToy = createDesignerToyToken(tokenId, playerColor, 1.85);
    bundle.characterHolder.add(nextToy);
  }, [tokenId, playerColor]);

  // Reactively update focus camera mode
  useEffect(() => {
    const bundle = stateRef.current;
    if (!bundle) return;
    bundle.focusMode = focusMode;
    bundle.userDragging = false;
  }, [focusMode]);

  const themeMeta =
    BOARD_MAP_THEMES.find((t) => t.id === mapTheme) ?? BOARD_MAP_THEMES[0]!;
  const tokenName = TOKEN_NAMES[((tokenId % TOKEN_NAMES.length) + TOKEN_NAMES.length) % TOKEN_NAMES.length];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/35 bg-stone-950 shadow-[0_14px_34px_rgba(0,0,0,0.55)]">
      {/* Live 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className={`w-full cursor-grab active:cursor-grabbing ${
          compact ? 'h-[230px] sm:h-[250px]' : 'h-[250px] sm:h-[290px]'
        }`}
      />

      {/* Top Overlay: Current Selection Badge & Camera Mode Switcher */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent p-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-black/65 px-2.5 py-1 text-xs backdrop-blur-xs">
          <span
            className="h-2.5 w-2.5 rounded-full border border-white/60"
            style={{ backgroundColor: playerColor }}
          />
          <span className="font-extrabold text-amber-100">{tokenName}</span>
          <span className="text-stone-400">•</span>
          <span className="font-semibold text-emerald-300">{themeMeta.name}</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-amber-400/35 bg-black/75 p-1 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => onChangeFocusMode('character')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
              focusMode === 'character'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-amber-100/80 hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>ดูตัวละคร</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeFocusMode('map')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
              focusMode === 'map'
                ? 'bg-amber-400 text-stone-950 shadow'
                : 'text-amber-100/80 hover:bg-white/10'
            }`}
          >
            <MapIcon className="h-3 w-3" />
            <span>ดูฉากแผนที่</span>
          </button>
        </div>
      </div>

      {/* Bottom Interactive Hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 py-1.5 text-[10px] font-medium text-amber-100/75">
        <span>{themeMeta.subtitle}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-amber-200/80">
          <RotateCw className="h-3 w-3" />
          ลากเพื่อหมุนดู 360°
        </span>
      </div>
    </div>
  );
}
