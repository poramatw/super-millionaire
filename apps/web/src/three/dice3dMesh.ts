import * as THREE from 'three';

const PIP_LAYOUTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.28, 0.23],
    [0.72, 0.23],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.77],
    [0.72, 0.77],
  ],
};

function createDiceFaceTexture(value: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm ivory die face with beveled shading
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#FFFDF7');
    grad.addColorStop(0.6, '#F7EED9');
    grad.addColorStop(1, '#DFD0B0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle inset rounded border
    ctx.strokeStyle = 'rgba(130, 102, 58, 0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(12, 12, size - 24, size - 24, 28);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(18, 18, size - 36, size - 36, 22);
    ctx.stroke();

    const pips = PIP_LAYOUTS[value] ?? PIP_LAYOUTS[1];
    const isOne = value === 1;
    const radius = isOne ? 30 : 20;

    for (const [nx, ny] of pips) {
      const px = nx * size;
      const py = ny * size;

      // Recessed pip shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.beginPath();
      ctx.arc(px + 2, py + 2, radius + 1, 0, Math.PI * 2);
      ctx.fill();

      // Pip color (crimson red for 1, charcoal obsidian for 2..6)
      ctx.fillStyle = isOne ? '#C8232C' : '#1E1A16';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Specular glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(px - radius * 0.28, py - radius * 0.28, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z] -> [3, 4, 1, 6, 2, 5].
 */
export function createDiceMesh(): {
  mesh: THREE.Mesh;
  dispose: () => void;
} {
  const faceOrder = [3, 4, 1, 6, 2, 5] as const;
  const textures = faceOrder.map((val) => createDiceFaceTexture(val));
  const materials = textures.map(
    (map) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.24,
        metalness: 0.04,
      }),
  );

  const geometry = new THREE.BoxGeometry(0.52, 0.52, 0.52);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export function getDiceTargetEuler(value: number): THREE.Euler {
  switch (value) {
    case 1:
      return new THREE.Euler(0, 0, 0);
    case 2:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 3:
      return new THREE.Euler(0, 0, Math.PI / 2);
    case 4:
      return new THREE.Euler(0, 0, -Math.PI / 2);
    case 5:
      return new THREE.Euler(Math.PI / 2, 0, 0);
    case 6:
    default:
      return new THREE.Euler(Math.PI, 0, 0);
  }
}

export function createCardDeckMesh(
  label: string,
  primaryHex: string,
  secondaryHex: string,
): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, 512, 320);

    ctx.strokeStyle = '#FFF7D6';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, 476, 284);

    ctx.strokeStyle = secondaryHex;
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 10]);
    ctx.strokeRect(34, 34, 444, 252);
    ctx.setLineDash([]);

    ctx.fillStyle = '#FFFDF5';
    ctx.font = '800 68px "Prompt", "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 256, 178);

    ctx.fillStyle = secondaryHex;
    ctx.font = '700 26px "JetBrains Mono", monospace';
    ctx.fillText('ซุปเปอร์เศรษฐี No.9028', 256, 232);
  }

  const topTex = new THREE.CanvasTexture(canvas);
  topTex.colorSpace = THREE.SRGBColorSpace;
  topTex.needsUpdate = true;

  const sideMat = new THREE.MeshStandardMaterial({
    color: '#F5EED8',
    roughness: 0.72,
  });
  const topMat = new THREE.MeshStandardMaterial({
    map: topTex,
    roughness: 0.48,
  });

  const geo = new THREE.BoxGeometry(1.45, 0.22, 0.92);
  const deck = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  deck.position.y = 0.11;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  return {
    group,
    dispose: () => {
      geo.dispose();
      sideMat.dispose();
      topMat.dispose();
      topTex.dispose();
    },
  };
}

export function createMortgageBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(24, 20, 18, 0.86)';
    ctx.beginPath();
    ctx.roundRect(8, 16, 240, 96, 18);
    ctx.fill();

    ctx.strokeStyle = '#F87171';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#FEE2E2';
    ctx.font = '800 54px "Prompt", "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('จำนอง', 128, 82);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
