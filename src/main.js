import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// SCENE SETUP
// ============================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 20;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

// ============================================
// LIGHTING
// ============================================
const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
scene.add(ambientLight);

// Main light from above-front
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(5, 10, 5);
scene.add(keyLight);

// Cool fill from left
const fillLight = new THREE.DirectionalLight(0x4488ff, 0.6);
fillLight.position.set(-8, 2, 0);
scene.add(fillLight);

// Warm rim light from back
const rimLight = new THREE.DirectionalLight(0xff6644, 0.4);
rimLight.position.set(0, 0, -10);
scene.add(rimLight);

// Internal glow light
const innerLight = new THREE.PointLight(0x88ffaa, 0.5, 8);
innerLight.position.set(0, 0, 0);
scene.add(innerLight);

// ============================================
// HELPER FUNCTIONS
// ============================================
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPointInSphere(radius) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

// ============================================
// CELL MEMBRANE - Outer boundary
// ============================================
const membraneGeometry = new THREE.SphereGeometry(3, 64, 64);
const membraneMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccaa,
  transparent: true,
  opacity: 0.15,
  roughness: 0.1,
  metalness: 0.0,
  transmission: 0.6,
  thickness: 0.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false
});
const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
scene.add(membrane);

// Membrane detail - phospholipid bilayer hint
const membraneInner = new THREE.Mesh(
  new THREE.SphereGeometry(2.95, 64, 64),
  new THREE.MeshPhysicalMaterial({
    color: 0xaaddbb,
    transparent: true,
    opacity: 0.08,
    roughness: 0.3,
    side: THREE.BackSide,
    depthWrite: false
  })
);
scene.add(membraneInner);

// ============================================
// NUCLEUS - The control center
// ============================================
const nucleusGroup = new THREE.Group();

// Nuclear envelope (double membrane)
const nuclearEnvelope = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 48, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0x6644aa,
    transparent: true,
    opacity: 0.4,
    roughness: 0.2,
    transmission: 0.3,
    thickness: 0.3,
    clearcoat: 0.5,
    side: THREE.DoubleSide
  })
);
nucleusGroup.add(nuclearEnvelope);

// Nucleoplasm (inner nuclear material)
const nucleoplasm = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 48, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0x8866cc,
    transparent: true,
    opacity: 0.6,
    roughness: 0.4,
    emissive: 0x221133,
    emissiveIntensity: 0.3
  })
);
nucleusGroup.add(nucleoplasm);

// Nucleolus (where ribosomes are made)
const nucleolus = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x553388,
    roughness: 0.6,
    emissive: 0x110022,
    emissiveIntensity: 0.5
  })
);
nucleolus.position.set(0.3, 0.2, 0.2);
nucleusGroup.add(nucleolus);

// Chromatin strands (DNA material)
const chromatinMaterial = new THREE.MeshStandardMaterial({
  color: 0x9977dd,
  roughness: 0.5,
  emissive: 0x332255,
  emissiveIntensity: 0.2
});

for (let i = 0; i < 8; i++) {
  const curve = new THREE.CatmullRomCurve3([
    randomPointInSphere(0.7),
    randomPointInSphere(0.8),
    randomPointInSphere(0.7),
    randomPointInSphere(0.8)
  ]);
  const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
  const chromatin = new THREE.Mesh(tubeGeometry, chromatinMaterial);
  nucleusGroup.add(chromatin);
}

nucleusGroup.position.set(0, 0.2, 0);
scene.add(nucleusGroup);

// ============================================
// MITOCHONDRIA - Powerhouses
// ============================================
const mitochondria = [];

function createMitochondrion() {
  const group = new THREE.Group();

  // Outer membrane - elongated capsule shape
  const length = randomInRange(0.4, 0.7);
  const radius = randomInRange(0.12, 0.18);

  const outerGeom = new THREE.CapsuleGeometry(radius, length, 16, 16);
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: 0xff6655,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
    clearcoat: 0.3
  });
  const outer = new THREE.Mesh(outerGeom, outerMat);
  group.add(outer);

  // Inner membrane with cristae (folds)
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xff8866,
    roughness: 0.5,
    emissive: 0x331100,
    emissiveIntensity: 0.3
  });

  // Create cristae folds
  for (let i = 0; i < 4; i++) {
    const foldGeom = new THREE.TorusGeometry(radius * 0.7, 0.02, 8, 16, Math.PI);
    const fold = new THREE.Mesh(foldGeom, innerMat);
    fold.position.y = (i - 1.5) * (length / 4);
    fold.rotation.x = Math.PI / 2;
    fold.rotation.z = Math.random() * 0.5 - 0.25;
    group.add(fold);
  }

  return group;
}

// Place mitochondria around the cell
for (let i = 0; i < 12; i++) {
  const mito = createMitochondrion();
  const pos = randomPointInSphere(2.2);

  // Keep away from nucleus
  if (pos.length() < 1.5) {
    pos.normalize().multiplyScalar(1.8);
  }

  mito.position.copy(pos);
  mito.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );

  mitochondria.push(mito);
  scene.add(mito);
}

// ============================================
// ENDOPLASMIC RETICULUM - Protein factory
// ============================================
const erGroup = new THREE.Group();

// Materials
const roughERMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x3399cc,
  transparent: true,
  opacity: 0.55,
  roughness: 0.3,
  side: THREE.DoubleSide,
  depthWrite: false
});

const smoothERMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x44bbdd,
  transparent: true,
  opacity: 0.45,
  roughness: 0.25,
  clearcoat: 0.2
});

const ribosomeMat = new THREE.MeshStandardMaterial({
  color: 0x225588,
  roughness: 0.6
});

// Shared ribosome geometry
const ribosomeGeom = new THREE.SphereGeometry(0.02, 6, 6);

// ============================================
// ROUGH ER - Stacked curved cisternae near nucleus
// ============================================

// Create a curved cisterna (flattened, wavy sheet with rolled edges)
function createCisterna(width, height, curvature, waveFreq, waveAmp) {
  const segW = 24;
  const segH = 16;
  const geometry = new THREE.PlaneGeometry(width, height, segW, segH);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = 0;

    // Curve the sheet to wrap around nucleus
    const curveAmount = curvature * (1 - Math.pow(x / (width / 2), 2));
    z += curveAmount;

    // Add organic waviness
    z += Math.sin(x * waveFreq) * waveAmp;
    z += Math.sin(y * waveFreq * 1.3 + x * 0.5) * waveAmp * 0.5;

    // Roll the edges (characteristic of ER sheets)
    const edgeDistX = Math.abs(x) / (width / 2);
    const edgeDistY = Math.abs(y) / (height / 2);
    const edgeDist = Math.max(edgeDistX, edgeDistY);

    if (edgeDist > 0.7) {
      const rollAmount = (edgeDist - 0.7) / 0.3;
      z += rollAmount * rollAmount * 0.08;
      // Curl the edge inward slightly
      if (edgeDistY > 0.7) {
        positions.setY(i, y * (1 - rollAmount * 0.1));
      }
    }

    positions.setZ(i, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Create stacked cisternae emanating from nucleus
const cisternaStack = new THREE.Group();
const numCisternae = 5;
const stackSpacing = 0.12;

for (let i = 0; i < numCisternae; i++) {
  const cisterna = new THREE.Mesh(
    createCisterna(1.0, 0.6, 0.15, 4, 0.03),
    roughERMaterial.clone()
  );

  // Stack them with slight offset
  cisterna.position.set(
    0.08 * i,
    i * stackSpacing - (numCisternae * stackSpacing) / 2,
    0
  );

  // Slight rotation variation
  cisterna.rotation.z = (Math.random() - 0.5) * 0.1;

  // Add ribosomes to this cisterna
  const ribosomeCount = 25 + Math.floor(Math.random() * 15);
  for (let r = 0; r < ribosomeCount; r++) {
    const ribosome = new THREE.Mesh(ribosomeGeom, ribosomeMat);
    ribosome.position.set(
      randomInRange(-0.45, 0.45),
      randomInRange(-0.25, 0.25),
      0.025 * (Math.random() > 0.5 ? 1 : -1) // Both sides
    );
    cisterna.add(ribosome);
  }

  cisternaStack.add(cisterna);
}

// Position the stack near the nucleus, extending outward
cisternaStack.position.set(1.4, 0.1, 0.3);
cisternaStack.rotation.y = -0.3;
erGroup.add(cisternaStack);

// Second stack on other side of nucleus
const cisternaStack2 = cisternaStack.clone();
cisternaStack2.position.set(-0.8, -0.2, 1.3);
cisternaStack2.rotation.y = Math.PI * 0.6;
erGroup.add(cisternaStack2);

// Third partial stack
const cisternaStack3 = new THREE.Group();
for (let i = 0; i < 3; i++) {
  const cisterna = new THREE.Mesh(
    createCisterna(0.7, 0.5, 0.12, 5, 0.025),
    roughERMaterial.clone()
  );
  cisterna.position.set(0.06 * i, i * 0.1 - 0.1, 0);

  // Ribosomes
  for (let r = 0; r < 18; r++) {
    const ribosome = new THREE.Mesh(ribosomeGeom, ribosomeMat);
    ribosome.position.set(
      randomInRange(-0.3, 0.3),
      randomInRange(-0.2, 0.2),
      0.025 * (Math.random() > 0.5 ? 1 : -1)
    );
    cisterna.add(ribosome);
  }

  cisternaStack3.add(cisterna);
}
cisternaStack3.position.set(0.5, 0.4, -1.4);
cisternaStack3.rotation.y = Math.PI * 1.2;
erGroup.add(cisternaStack3);

// ============================================
// SMOOTH ER - Interconnected tubular network
// ============================================

// Create network nodes (junction points)
const serNodes = [];
const numNodes = 20;

// Generate nodes in a shell around the cell periphery
for (let i = 0; i < numNodes; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 1.8 + Math.random() * 0.6; // Between rough ER and membrane

  serNodes.push(new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    (Math.random() - 0.5) * 1.5, // Flatten vertically
    r * Math.sin(phi) * Math.sin(theta)
  ));
}

// Connect nodes to form tubular network with 3-way junctions
const connectedPairs = new Set();

function connectNodes(nodeA, nodeB) {
  const key = `${Math.min(nodeA, nodeB)}-${Math.max(nodeA, nodeB)}`;
  if (connectedPairs.has(key)) return;
  connectedPairs.add(key);

  const start = serNodes[nodeA];
  const end = serNodes[nodeB];

  // Create curved tube between nodes
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  // Add some curve to avoid straight lines
  mid.x += (Math.random() - 0.5) * 0.3;
  mid.y += (Math.random() - 0.5) * 0.2;
  mid.z += (Math.random() - 0.5) * 0.3;

  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const tubeGeom = new THREE.TubeGeometry(curve, 10, 0.035, 8, false);
  const tube = new THREE.Mesh(tubeGeom, smoothERMaterial);
  erGroup.add(tube);
}

// Connect each node to 2-3 nearest neighbors (creating 3-way junctions)
for (let i = 0; i < numNodes; i++) {
  // Find nearest neighbors
  const distances = [];
  for (let j = 0; j < numNodes; j++) {
    if (i !== j) {
      distances.push({
        index: j,
        dist: serNodes[i].distanceTo(serNodes[j])
      });
    }
  }
  distances.sort((a, b) => a.dist - b.dist);

  // Connect to 2-3 nearest
  const numConnections = 2 + Math.floor(Math.random() * 2);
  for (let c = 0; c < Math.min(numConnections, distances.length); c++) {
    if (distances[c].dist < 1.5) { // Only connect if close enough
      connectNodes(i, distances[c].index);
    }
  }
}

// Add junction spheres at nodes
const junctionMat = new THREE.MeshPhysicalMaterial({
  color: 0x55ccdd,
  transparent: true,
  opacity: 0.5,
  roughness: 0.3
});
const junctionGeom = new THREE.SphereGeometry(0.05, 12, 12);

for (const node of serNodes) {
  const junction = new THREE.Mesh(junctionGeom, junctionMat);
  junction.position.copy(node);
  erGroup.add(junction);
}

// ============================================
// TRANSITION TUBES - Connect rough ER to smooth ER
// ============================================

// Create tubes from rough ER stacks toward smooth ER network
function createTransitionTube(startPos, endNode) {
  const end = serNodes[endNode];
  const mid1 = startPos.clone().lerp(end, 0.33);
  const mid2 = startPos.clone().lerp(end, 0.66);
  mid1.y += (Math.random() - 0.5) * 0.2;
  mid2.y += (Math.random() - 0.5) * 0.2;

  const curve = new THREE.CatmullRomCurve3([startPos, mid1, mid2, end]);

  // Tube that transitions from flattened to round
  const tubeGeom = new THREE.TubeGeometry(curve, 16, 0.04, 8, false);
  const tube = new THREE.Mesh(tubeGeom, smoothERMaterial);
  erGroup.add(tube);
}

// Connect from rough ER stacks to nearby smooth ER nodes
const stack1Edge = new THREE.Vector3(1.8, 0.1, 0.3);
const stack2Edge = new THREE.Vector3(-1.2, -0.2, 1.5);
const stack3Edge = new THREE.Vector3(0.8, 0.4, -1.6);

// Find closest smooth ER nodes to each stack
for (const stackEdge of [stack1Edge, stack2Edge, stack3Edge]) {
  const distances = serNodes.map((node, idx) => ({
    index: idx,
    dist: stackEdge.distanceTo(node)
  }));
  distances.sort((a, b) => a.dist - b.dist);

  // Connect to 2 nearest nodes
  for (let i = 0; i < 2; i++) {
    createTransitionTube(stackEdge, distances[i].index);
  }
}

scene.add(erGroup);

// ============================================
// GOLGI APPARATUS - Shipping center
// ============================================
const golgiGroup = new THREE.Group();

const golgiMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffcc44,
  transparent: true,
  opacity: 0.6,
  roughness: 0.3,
  side: THREE.DoubleSide
});

// Stacked cisternae (flattened sacs)
for (let i = 0; i < 5; i++) {
  const cisternaGeom = new THREE.TorusGeometry(0.3, 0.06, 8, 24, Math.PI * 1.5);

  // Flatten it
  const cisterna = new THREE.Mesh(cisternaGeom, golgiMaterial.clone());
  cisterna.material.opacity = 0.5 + i * 0.08;
  cisterna.scale.y = 0.3;
  cisterna.position.y = i * 0.12 - 0.24;
  cisterna.position.x = i * 0.05;
  golgiGroup.add(cisterna);
}

// Vesicles budding off
const vesicleMat = new THREE.MeshPhysicalMaterial({
  color: 0xffdd66,
  transparent: true,
  opacity: 0.7,
  roughness: 0.2
});

for (let i = 0; i < 6; i++) {
  const vesicle = new THREE.Mesh(
    new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 12, 12),
    vesicleMat
  );
  const angle = Math.random() * Math.PI - Math.PI / 2;
  vesicle.position.set(
    0.35 + Math.random() * 0.2,
    Math.random() * 0.4 - 0.2,
    Math.sin(angle) * 0.3
  );
  golgiGroup.add(vesicle);
}

golgiGroup.position.set(-1.8, 0.3, 1);
golgiGroup.rotation.y = Math.PI / 4;
scene.add(golgiGroup);

// ============================================
// LYSOSOMES - Digestive organelles
// ============================================
const lysosomeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88dd44,
  transparent: true,
  opacity: 0.7,
  roughness: 0.4,
  emissive: 0x224400,
  emissiveIntensity: 0.2
});

for (let i = 0; i < 8; i++) {
  const size = randomInRange(0.08, 0.14);
  const lysosome = new THREE.Mesh(
    new THREE.SphereGeometry(size, 16, 16),
    lysosomeMaterial
  );
  const pos = randomPointInSphere(2.4);
  if (pos.length() < 1.5) pos.normalize().multiplyScalar(1.8);
  lysosome.position.copy(pos);
  scene.add(lysosome);
}

// ============================================
// CENTROSOME - Cell division organizer
// ============================================
const centrosomeGroup = new THREE.Group();

// Two centrioles at right angles
const centrioleMat = new THREE.MeshStandardMaterial({
  color: 0xddddff,
  roughness: 0.3,
  metalness: 0.2
});

for (let c = 0; c < 2; c++) {
  const centrioleGroup = new THREE.Group();

  // Microtubule triplets forming cylinder
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    for (let t = 0; t < 3; t++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8),
        centrioleMat
      );
      const r = 0.08 + t * 0.02;
      tube.position.set(
        Math.cos(angle + t * 0.1) * r,
        0,
        Math.sin(angle + t * 0.1) * r
      );
      centrioleGroup.add(tube);
    }
  }

  if (c === 1) {
    centrioleGroup.rotation.x = Math.PI / 2;
    centrioleGroup.position.y = 0.15;
  }
  centrosomeGroup.add(centrioleGroup);
}

centrosomeGroup.position.set(1.5, -0.5, -1.2);
scene.add(centrosomeGroup);

// ============================================
// RIBOSOMES - Free floating
// ============================================
const freeRibosomeMat = new THREE.MeshStandardMaterial({
  color: 0x3399bb,
  roughness: 0.5
});

for (let i = 0; i < 80; i++) {
  const ribosome = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 6, 6),
    freeRibosomeMat
  );
  const pos = randomPointInSphere(2.6);
  if (pos.length() < 1.3) pos.normalize().multiplyScalar(1.5);
  ribosome.position.copy(pos);
  scene.add(ribosome);
}

// ============================================
// CYTOSKELETON - Structural support
// ============================================
const cytoskeletonMat = new THREE.MeshBasicMaterial({
  color: 0x666688,
  transparent: true,
  opacity: 0.15
});

// Microtubules - radiating from centrosome
for (let i = 0; i < 15; i++) {
  const end = randomPointInSphere(2.8);
  end.y = randomInRange(-2, 2);

  const curve = new THREE.CatmullRomCurve3([
    centrosomeGroup.position.clone(),
    new THREE.Vector3(
      (centrosomeGroup.position.x + end.x) / 2 + randomInRange(-0.3, 0.3),
      (centrosomeGroup.position.y + end.y) / 2 + randomInRange(-0.3, 0.3),
      (centrosomeGroup.position.z + end.z) / 2 + randomInRange(-0.3, 0.3)
    ),
    end
  ]);

  const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.008, 4, false);
  const microtubule = new THREE.Mesh(tubeGeom, cytoskeletonMat);
  scene.add(microtubule);
}

// ============================================
// ANIMATION
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Gentle membrane pulsing
  membrane.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.01);
  membraneInner.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.01);

  // Nucleus subtle movement
  nucleusGroup.position.y = 0.2 + Math.sin(elapsed * 0.3) * 0.05;
  nucleusGroup.rotation.y = elapsed * 0.05;

  // Mitochondria drift
  mitochondria.forEach((mito, i) => {
    mito.position.x += Math.sin(elapsed * 0.2 + i) * 0.001;
    mito.position.y += Math.cos(elapsed * 0.15 + i * 0.5) * 0.001;
    mito.rotation.z += 0.001;
  });

  // Golgi subtle rotation
  golgiGroup.rotation.y = Math.PI / 4 + Math.sin(elapsed * 0.2) * 0.1;

  // ER gentle wave
  erGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.05;

  // Inner light flicker
  innerLight.intensity = 0.5 + Math.sin(elapsed * 2) * 0.1;

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

console.log('Cell model loaded - organelles:', {
  membrane: 'Outer boundary (green, transparent)',
  nucleus: 'Control center with chromatin (purple)',
  mitochondria: 'Powerhouses (red/orange, 12 total)',
  roughER: 'Protein synthesis (blue sheets with ribosomes)',
  smoothER: 'Lipid synthesis (light blue tubes)',
  golgi: 'Packaging center (yellow stacks)',
  lysosomes: 'Digestive vesicles (green)',
  centrosome: 'Cell division organizer (white)',
  ribosomes: 'Protein builders (small blue dots)',
  cytoskeleton: 'Structural support (faint lines)'
});
