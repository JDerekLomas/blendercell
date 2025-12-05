import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// CONSTANTS & INFO CONTENT
// ============================================
const COLORS = {
  MEMBRANE: 0xa2c2e8,
  NUCLEUS: 0x2E1A47,
  CHROMATIN: 0x150a26,
  RER: 0x40E0D0,
  GOLGI: 0xFFD700,
  MITOCHONDRIA: 0xFF6347,
  LYSOSOME: 0x4ade80,
  CENTRIOLE: 0xf472b6,
  FREE_RIBOSOME: 0xcbd5e1,
  ANTIBODY: 0xfbbf24,
  MICROTUBULE: 0x475569
};

const DIMENSIONS = {
  CELL_RADIUS: 7.0,
  CELL_SCALE: new THREE.Vector3(1.5, 1.0, 1.0),
  NUCLEUS_RADIUS: 2.4,
  NUCLEUS_OFFSET: new THREE.Vector3(5.5, 0, 0),
  GOLGI_POS: new THREE.Vector3(1.8, 0, 0)
};

const INFO_CONTENT = {
  "Cell": {
    title: "The Antibody Factory",
    description: "Meet the Plasma Cell. It's not just a generic cell; it's a specialized biological machine designed for one thing: Speed. While other cells have varied jobs, this one has transformed into a high-speed factory.",
    function: "Produces and fires thousands of antibodies per second into the bloodstream to hunt down invaders."
  },
  "Antibodies": {
    title: "The Product (Antibodies)",
    description: "Look at the swarm of Y-shaped molecules surrounding the cell! These are antibodies (Immunoglobulins). Notice they are all identical? That's because this cell is programmed to make only ONE specific type of antibody that targets ONE specific germ.",
    function: "Lock onto viruses and bacteria, tagging them for destruction by the immune system."
  },
  "Nucleus": {
    title: "The CEO's Office (Nucleus)",
    description: "See how the nucleus is pushed off to the side? That's because the factory floor (RER) needs so much space! This dark sphere holds the master blueprints.",
    function: "Protects the DNA instructions needed to build the specific antibody this cell produces."
  },
  "RER": {
    title: "The Assembly Line (Rough ER)",
    description: "This massive maze of teal tubes takes up almost the whole cell. It's 'Rough' because it's covered in millions of tiny ribosomes (dots). It's the main factory floor.",
    function: "Reads instructions from the nucleus and assembles raw amino acids into antibody protein chains."
  },
  "Golgi": {
    title: "Shipping & Packaging (Golgi)",
    description: "Located in the clear zone near the nucleus (the 'Hof'). The Golgi takes the raw antibodies from the RER, polishes them, and packs them into bubbles.",
    function: "Modifies proteins and packages them into vesicles for export."
  },
  "Mitochondria": {
    title: "Power Plants (Mitochondria)",
    description: "Running a factory 24/7 takes a lot of energy. These red, bean-shaped engines are everywhere, burning fuel to keep the lights on.",
    function: "Generate ATP energy to power the intense protein synthesis."
  },
  "Vesicles": {
    title: "Delivery Trucks (Vesicles)",
    description: "Watch these bubbles streaming from the gold Golgi to the outer wall. They travel along microtubule tracks before fusing with the membrane to release their cargo.",
    function: "Transport the final product to the cell membrane to be released."
  },
  "Lysosomes": {
    title: "Janitors (Lysosomes)",
    description: "Every factory creates waste. These green spheres contain acid to melt down broken parts or recycling.",
    function: "Clean up waste and recycle old organelles."
  },
  "Centrioles": {
    title: "Logistics Managers (Centrioles)",
    description: "A pair of barrel structures near the center. They organize the 'roads' (microtubules) that the delivery trucks drive on.",
    function: "Organize the cytoskeleton to guide traffic inside the cell."
  },
  "Ribosomes": {
    title: "The Workers (Free Ribosomes)",
    description: "While the RER ribosomes build product for export, these free-floating specks build tools for the factory itself.",
    function: "Build proteins that stay inside the cell to keep it alive."
  },
  "Microtubules": {
    title: "The Roads (Microtubules)",
    description: "These thin tubes act as highways. Vesicles latch onto them and are motored towards the cell surface.",
    function: "Provide structural support and transport tracks for organelles."
  }
};

// ============================================
// SECRETION PATHS (Golgi to Membrane)
// ============================================
const SECRETION_PATHS = Array.from({ length: 8 }).map((_, i) => {
  const theta = (Math.PI * 2 * i) / 8 + (Math.random() * 0.5);
  const radius = 2.0 + Math.random() * 1.5;
  const y = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  return {
    start: new THREE.Vector3(1.8, 0, 0),
    end: new THREE.Vector3(-8.5 + Math.random(), y, z)
  };
});

// ============================================
// SCENE SETUP
// ============================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a); // Slate 900

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 12;
controls.maxDistance = 50;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enablePan = false;

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============================================
// STATE MANAGEMENT
// ============================================
let activeFeature = null;
const organelleGroups = {};
const clickableMeshes = [];

// ============================================
// BACKGROUND STARS (Atmosphere)
// ============================================
function createStarField() {
  const starCount = 5000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    // Distribute in a sphere shell far from camera
    const radius = 80 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Subtle color variation (white to light blue)
    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness + Math.random() * 0.2;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  return new THREE.Points(geometry, material);
}

const stars = createStarField();
scene.add(stars);

// ============================================
// FLOATING CYTOPLASM PARTICLES
// ============================================
function createCytoplasmParticles() {
  const particleCount = 800;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    // Distribute inside an ovoid volume matching the cell
    const r = Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.5; // Ovoid stretch
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    velocities.push({
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.01,
      z: (Math.random() - 0.5) * 0.01
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    color: 0x88ccaa,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  particles.userData.velocities = velocities;

  return particles;
}

const cytoplasmParticles = createCytoplasmParticles();
scene.add(cytoplasmParticles);

// ============================================
// FOG FOR DEPTH
// ============================================
scene.fog = new THREE.FogExp2(0x0f172a, 0.008);

// ============================================
// LIGHTING
// ============================================
const ambientLight = new THREE.AmbientLight(0x8899aa, 0.5);
scene.add(ambientLight);

// Key light - warm from above-front
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(10, 20, 15);
scene.add(keyLight);

// Fill light - cool from left
const fillLight = new THREE.DirectionalLight(0x6688cc, 0.5);
fillLight.position.set(-20, 5, 0);
scene.add(fillLight);

// Rim light - warm accent from behind
const rimLight = new THREE.DirectionalLight(0xffaa66, 0.3);
rimLight.position.set(0, -5, -20);
scene.add(rimLight);

// Interior glow
const innerLight = new THREE.PointLight(0x66ddaa, 0.6, 20);
innerLight.position.set(0, 0, 0);
scene.add(innerLight);

// Subtle hemisphere light for natural feel
const hemiLight = new THREE.HemisphereLight(0xaaddff, 0x445566, 0.4);
scene.add(hemiLight);

// ============================================
// MAIN CELL GROUP (Ovoid Shape)
// ============================================
const cellGroup = new THREE.Group();
cellGroup.scale.copy(DIMENSIONS.CELL_SCALE);
scene.add(cellGroup);

// ============================================
// CELL MEMBRANE
// ============================================
const membraneGeometry = new THREE.SphereGeometry(DIMENSIONS.CELL_RADIUS, 64, 64);
const membraneMaterial = new THREE.MeshPhysicalMaterial({
  color: COLORS.MEMBRANE,
  transparent: true,
  opacity: 0.15,
  roughness: 0.1,
  metalness: 0.1,
  transmission: 0.6,
  thickness: 1.5,
  clearcoat: 1,
  side: THREE.DoubleSide,
  depthWrite: false
});
const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
membrane.raycast = () => {}; // Disable raycast on membrane
cellGroup.add(membrane);

organelleGroups['Membrane'] = { meshes: [membrane], material: membraneMaterial };

// ============================================
// NUCLEUS (Eccentric Position)
// ============================================
const nucleusGroup = new THREE.Group();
nucleusGroup.position.copy(DIMENSIONS.NUCLEUS_OFFSET);

// Nuclear envelope
const nuclearEnvelope = new THREE.Mesh(
  new THREE.SphereGeometry(DIMENSIONS.NUCLEUS_RADIUS, 64, 64),
  new THREE.MeshStandardMaterial({
    color: COLORS.NUCLEUS,
    roughness: 0.5,
    metalness: 0.2
  })
);
nuclearEnvelope.userData = { organelle: 'Nucleus' };
clickableMeshes.push(nuclearEnvelope);
nucleusGroup.add(nuclearEnvelope);

// Nucleoplasm inner glow
const nucleoplasm = new THREE.Mesh(
  new THREE.SphereGeometry(DIMENSIONS.NUCLEUS_RADIUS * 0.95, 48, 48),
  new THREE.MeshStandardMaterial({
    color: 0x3d1a5e,
    emissive: 0x1a0a2e,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8
  })
);
nucleusGroup.add(nucleoplasm);

// Nucleolus (2 of them)
for (let i = 0; i < 2; i++) {
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.5 + Math.random() * 0.2, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x553388,
      roughness: 0.6,
      emissive: 0x220044,
      emissiveIntensity: 0.5
    })
  );
  nucleolus.position.set(
    (Math.random() - 0.5) * 1.2,
    (Math.random() - 0.5) * 1.2,
    (Math.random() - 0.5) * 1.2
  );
  nucleusGroup.add(nucleolus);
}

// Chromatin strands
const chromatinMaterial = new THREE.MeshStandardMaterial({
  color: 0x9977dd,
  roughness: 0.5,
  emissive: 0x332255,
  emissiveIntensity: 0.2
});

for (let i = 0; i < 12; i++) {
  const points = [];
  for (let j = 0; j < 4; j++) {
    points.push(new THREE.Vector3(
      (Math.random() - 0.5) * 1.8,
      (Math.random() - 0.5) * 1.8,
      (Math.random() - 0.5) * 1.8
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
  const chromatin = new THREE.Mesh(tubeGeometry, chromatinMaterial);
  nucleusGroup.add(chromatin);
}

cellGroup.add(nucleusGroup);
organelleGroups['Nucleus'] = {
  group: nucleusGroup,
  meshes: [nuclearEnvelope, nucleoplasm],
  labelOffset: new THREE.Vector3(0, 3, 0)
};

// ============================================
// GOLGI APPARATUS (Curved Cisternae)
// ============================================
const golgiGroup = new THREE.Group();
golgiGroup.position.copy(DIMENSIONS.GOLGI_POS);
golgiGroup.rotation.set(0, 0, 0.3);

const golgiMaterial = new THREE.MeshStandardMaterial({
  color: COLORS.GOLGI,
  roughness: 0.3,
  emissive: 0x332200,
  emissiveIntensity: 0.2
});

// 6 curved torus cisternae
for (let i = 0; i < 6; i++) {
  const scale = 1 - Math.abs(i - 2.5) * 0.12;
  const cisterna = new THREE.Mesh(
    new THREE.TorusGeometry(1.4 * scale, 0.1, 16, 32, Math.PI * 1.5),
    golgiMaterial.clone()
  );
  cisterna.position.y = (i - 2.5) * 0.25;
  cisterna.position.x = (i - 2.5) * 0.08;
  cisterna.rotation.x = Math.PI / 2;
  cisterna.scale.z = 0.3;
  cisterna.userData = { organelle: 'Golgi' };
  clickableMeshes.push(cisterna);
  golgiGroup.add(cisterna);
}

// Budding vesicles
const budVesicleMat = new THREE.MeshStandardMaterial({
  color: COLORS.GOLGI,
  emissive: COLORS.GOLGI,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.8
});

for (let i = 0; i < 12; i++) {
  const vesicle = new THREE.Mesh(
    new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 12, 12),
    budVesicleMat
  );
  const angle = Math.random() * Math.PI * 2;
  const r = 1.5 + Math.random() * 0.3;
  vesicle.position.set(
    Math.cos(angle) * r * 0.3,
    (Math.random() - 0.5) * 1.2,
    Math.sin(angle) * r
  );
  golgiGroup.add(vesicle);
}

cellGroup.add(golgiGroup);
organelleGroups['Golgi'] = {
  group: golgiGroup,
  meshes: golgiGroup.children,
  labelOffset: new THREE.Vector3(0, 2, 0)
};

// ============================================
// CENTRIOLES (9-Triplet Structure)
// ============================================
const centriolesGroup = new THREE.Group();
centriolesGroup.position.set(3.2, 0.5, 0.5);
centriolesGroup.rotation.set(0.5, 0.5, 0);

const centrioleMat = new THREE.MeshStandardMaterial({
  color: COLORS.CENTRIOLE,
  roughness: 0.3,
  emissive: 0x602040,
  emissiveIntensity: 0.1
});

// Create two perpendicular centrioles
for (let c = 0; c < 2; c++) {
  const centrioleUnit = new THREE.Group();

  // 9 triplets of microtubules
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    for (let t = 0; t < 3; t++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8),
        centrioleMat
      );
      const r = 0.08 + t * 0.018;
      tube.position.set(
        Math.cos(angle + t * 0.12) * r,
        0,
        Math.sin(angle + t * 0.12) * r
      );
      tube.userData = { organelle: 'Centrioles' };
      clickableMeshes.push(tube);
      centrioleUnit.add(tube);
    }
  }

  if (c === 1) {
    centrioleUnit.rotation.z = Math.PI / 2;
    centrioleUnit.position.x = 0.2;
  }
  centriolesGroup.add(centrioleUnit);
}

// PCM cloud (pericentriolar material)
const pcmGeom = new THREE.SphereGeometry(0.25, 16, 16);
const pcmMat = new THREE.MeshStandardMaterial({
  color: COLORS.CENTRIOLE,
  transparent: true,
  opacity: 0.2,
  roughness: 0.8
});
const pcm = new THREE.Mesh(pcmGeom, pcmMat);
pcm.position.set(0.1, 0, 0);
centriolesGroup.add(pcm);

cellGroup.add(centriolesGroup);
organelleGroups['Centrioles'] = {
  group: centriolesGroup,
  meshes: centriolesGroup.children,
  labelOffset: new THREE.Vector3(0, 0.8, 0)
};

// ============================================
// ROUGH ER (Procedural Curved Cisternae Sheets)
// ============================================
const rerGroup = new THREE.Group();

// RER Material - translucent teal
const rerMaterial = new THREE.MeshPhysicalMaterial({
  color: COLORS.RER,
  roughness: 0.3,
  metalness: 0.1,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.6,
  transmission: 0.2,
  emissive: 0x003333,
  emissiveIntensity: 0.15
});

// Create a curved cisterna sheet (like a wavy pancake)
function createCisternaSheet(width, height, curvature, waveFreq, waveAmp) {
  const segW = 32;
  const segH = 24;
  const geometry = new THREE.PlaneGeometry(width, height, segW, segH);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = 0;

    // Main curvature - wrap around like a curved sheet
    const curveAmount = curvature * (1 - Math.pow(x / (width / 2), 2));
    z += curveAmount;

    // Organic waviness
    z += Math.sin(x * waveFreq + Math.random() * 0.3) * waveAmp;
    z += Math.sin(y * waveFreq * 1.5) * waveAmp * 0.6;

    // Edge rolling (reticulon protein effect)
    const edgeDistX = Math.abs(x) / (width / 2);
    const edgeDistY = Math.abs(y) / (height / 2);
    const edgeDist = Math.max(edgeDistX, edgeDistY);

    if (edgeDist > 0.7) {
      const rollAmount = (edgeDist - 0.7) / 0.3;
      z += rollAmount * rollAmount * 0.15;
    }

    // Add slight thickness variation
    z += (Math.random() - 0.5) * 0.02;

    positions.setZ(i, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Generate stacked cisternae in multiple clusters
const cisternaStacks = [
  // Main stack - wrapping around nucleus on left side
  { pos: [-3.5, 0, 0], rot: [0, 0.8, 0], count: 6, spacing: 0.18, width: 3.5, height: 2.5 },
  // Secondary stack - below
  { pos: [-4.5, -1.5, 1], rot: [0.3, 1.2, 0.1], count: 4, spacing: 0.15, width: 3, height: 2 },
  // Upper stack
  { pos: [-3, 1.5, -0.5], rot: [-0.2, 0.6, 0], count: 5, spacing: 0.16, width: 2.8, height: 2.2 },
  // Far left (tail)
  { pos: [-6, 0.3, 0.5], rot: [0.1, 1.0, 0.1], count: 4, spacing: 0.14, width: 2.5, height: 1.8 },
  // Near nucleus
  { pos: [-1.5, 0.5, 1.5], rot: [0.2, 0.4, -0.1], count: 3, spacing: 0.15, width: 2, height: 1.5 },
  // Additional fill stacks
  { pos: [-5, 1, -1.5], rot: [-0.3, 1.4, 0.2], count: 4, spacing: 0.14, width: 2.2, height: 1.6 },
  { pos: [-4, -0.8, -1], rot: [0.15, 1.1, -0.1], count: 3, spacing: 0.13, width: 2.4, height: 1.7 }
];

// Create all cisterna sheets
const allCisternae = [];
cisternaStacks.forEach((stack, stackIdx) => {
  for (let i = 0; i < stack.count; i++) {
    const curvature = 0.2 + Math.random() * 0.1;
    const waveFreq = 2 + Math.random();
    const waveAmp = 0.04 + Math.random() * 0.02;

    const geometry = createCisternaSheet(
      stack.width * (0.9 + Math.random() * 0.2),
      stack.height * (0.9 + Math.random() * 0.2),
      curvature,
      waveFreq,
      waveAmp
    );

    const cisterna = new THREE.Mesh(geometry, rerMaterial.clone());

    // Position within stack
    const yOffset = (i - stack.count / 2) * stack.spacing;
    cisterna.position.set(
      stack.pos[0] + (Math.random() - 0.5) * 0.1,
      stack.pos[1] + yOffset,
      stack.pos[2] + (Math.random() - 0.5) * 0.1
    );

    // Apply stack rotation with slight variation
    cisterna.rotation.set(
      stack.rot[0] + (Math.random() - 0.5) * 0.1,
      stack.rot[1] + (Math.random() - 0.5) * 0.1,
      stack.rot[2] + (Math.random() - 0.5) * 0.05
    );

    cisterna.userData = { organelle: 'RER' };
    clickableMeshes.push(cisterna);
    rerGroup.add(cisterna);
    allCisternae.push(cisterna);
  }
});

// ============================================
// INSTANCED RIBOSOMES ON RER
// ============================================
const ribosomeCount = 1200;
const ribosomeGeom = new THREE.SphereGeometry(0.04, 6, 6);
const ribosomeMat = new THREE.MeshStandardMaterial({
  color: 0x2288aa,
  roughness: 0.6,
  emissive: 0x114455,
  emissiveIntensity: 0.2
});

const ribosomeInstances = new THREE.InstancedMesh(ribosomeGeom, ribosomeMat, ribosomeCount);
const riboDummy = new THREE.Object3D();

let riboIdx = 0;
allCisternae.forEach((cisterna) => {
  // Get world matrix for this cisterna
  cisterna.updateMatrixWorld();
  const cisternaMatrix = cisterna.matrixWorld;

  // Scatter ribosomes on this sheet
  const ribosPerSheet = Math.floor(ribosomeCount / allCisternae.length);
  const positions = cisterna.geometry.attributes.position;

  for (let r = 0; r < ribosPerSheet && riboIdx < ribosomeCount; r++) {
    // Pick a random vertex region
    const vertIdx = Math.floor(Math.random() * positions.count);
    const localPos = new THREE.Vector3(
      positions.getX(vertIdx) + (Math.random() - 0.5) * 0.3,
      positions.getY(vertIdx) + (Math.random() - 0.5) * 0.3,
      positions.getZ(vertIdx) + (Math.random() > 0.5 ? 0.05 : -0.05) // Both sides
    );

    // Transform to world space
    localPos.applyMatrix4(cisternaMatrix);

    riboDummy.position.copy(localPos);
    riboDummy.scale.setScalar(0.8 + Math.random() * 0.4);
    riboDummy.updateMatrix();
    ribosomeInstances.setMatrixAt(riboIdx, riboDummy.matrix);
    riboIdx++;
  }
});

ribosomeInstances.instanceMatrix.needsUpdate = true;
ribosomeInstances.userData = { organelle: 'RER' };
clickableMeshes.push(ribosomeInstances);
rerGroup.add(ribosomeInstances);

// ============================================
// ER TUBULES (connecting network)
// ============================================
const tubuleMat = new THREE.MeshPhysicalMaterial({
  color: 0x55ddcc,
  roughness: 0.3,
  transparent: true,
  opacity: 0.5,
  emissive: 0x224444,
  emissiveIntensity: 0.1
});

// Create connecting tubules between stacks
for (let i = 0; i < 15; i++) {
  const stack1 = cisternaStacks[Math.floor(Math.random() * cisternaStacks.length)];
  const stack2 = cisternaStacks[Math.floor(Math.random() * cisternaStacks.length)];

  if (stack1 === stack2) continue;

  const start = new THREE.Vector3(...stack1.pos);
  const end = new THREE.Vector3(...stack2.pos);

  // Add some randomness
  start.add(new THREE.Vector3(
    (Math.random() - 0.5) * 1,
    (Math.random() - 0.5) * 0.8,
    (Math.random() - 0.5) * 1
  ));
  end.add(new THREE.Vector3(
    (Math.random() - 0.5) * 1,
    (Math.random() - 0.5) * 0.8,
    (Math.random() - 0.5) * 1
  ));

  // Create curved path
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y += (Math.random() - 0.5) * 0.5;
  mid.z += (Math.random() - 0.5) * 0.5;

  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const tubeGeom = new THREE.TubeGeometry(curve, 12, 0.06, 8, false);
  const tubule = new THREE.Mesh(tubeGeom, tubuleMat);
  tubule.userData = { organelle: 'RER' };
  rerGroup.add(tubule);
}

cellGroup.add(rerGroup);
organelleGroups['RER'] = {
  group: rerGroup,
  meshes: rerGroup.children,
  labelOffset: new THREE.Vector3(-5, 5, 0)
};

// ============================================
// MITOCHONDRIA (with Cristae)
// ============================================
const mitochondriaGroup = new THREE.Group();
const mitoCount = 35;

const mitoOuterMat = new THREE.MeshPhysicalMaterial({
  color: COLORS.MITOCHONDRIA,
  roughness: 0.4,
  transparent: true,
  opacity: 0.8,
  clearcoat: 0.3
});

const mitoInnerMat = new THREE.MeshStandardMaterial({
  color: 0xff8866,
  roughness: 0.5,
  emissive: 0x331100,
  emissiveIntensity: 0.3
});

// Use instancing for performance
const mitoGeom = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
const mitoInstancedMesh = new THREE.InstancedMesh(mitoGeom, mitoOuterMat, mitoCount);
mitoInstancedMesh.userData = { organelle: 'Mitochondria' };
clickableMeshes.push(mitoInstancedMesh);

const dummy = new THREE.Object3D();
for (let i = 0; i < mitoCount; i++) {
  const x = (Math.random() - 0.7) * 12;
  const y = (Math.random() - 0.5) * 6;
  const z = (Math.random() - 0.5) * 6;

  if (Math.sqrt(y * y + z * z) < 6) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.scale.setScalar(0.8 + Math.random() * 0.4);
    dummy.updateMatrix();
    mitoInstancedMesh.setMatrixAt(i, dummy.matrix);
  }
}
mitoInstancedMesh.instanceMatrix.needsUpdate = true;
mitochondriaGroup.add(mitoInstancedMesh);

cellGroup.add(mitochondriaGroup);
organelleGroups['Mitochondria'] = {
  group: mitochondriaGroup,
  meshes: [mitoInstancedMesh],
  labelOffset: new THREE.Vector3(-4, -3, 3)
};

// ============================================
// LYSOSOMES
// ============================================
const lysosomesGroup = new THREE.Group();
const lysoCount = 15;

const lysoMat = new THREE.MeshStandardMaterial({
  color: COLORS.LYSOSOME,
  roughness: 0.5,
  emissive: 0x104010,
  emissiveIntensity: 0.1
});

const lysoGeom = new THREE.SphereGeometry(0.22, 16, 16);
const lysoInstancedMesh = new THREE.InstancedMesh(lysoGeom, lysoMat, lysoCount);
lysoInstancedMesh.userData = { organelle: 'Lysosomes' };
clickableMeshes.push(lysoInstancedMesh);

for (let i = 0; i < lysoCount; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 6
  );
  dummy.updateMatrix();
  lysoInstancedMesh.setMatrixAt(i, dummy.matrix);
}
lysoInstancedMesh.instanceMatrix.needsUpdate = true;
lysosomesGroup.add(lysoInstancedMesh);

cellGroup.add(lysosomesGroup);
organelleGroups['Lysosomes'] = {
  group: lysosomesGroup,
  meshes: [lysoInstancedMesh],
  labelOffset: new THREE.Vector3(-3, 2, 4)
};

// ============================================
// FREE RIBOSOMES
// ============================================
const ribosomesGroup = new THREE.Group();
const riboCount = 400;

const riboMat = new THREE.MeshBasicMaterial({
  color: COLORS.FREE_RIBOSOME,
  transparent: true,
  opacity: 0.6
});

const freeRiboGeom = new THREE.DodecahedronGeometry(0.05, 0);
const freeRiboInstancedMesh = new THREE.InstancedMesh(freeRiboGeom, riboMat, riboCount);
freeRiboInstancedMesh.userData = { organelle: 'Ribosomes' };
clickableMeshes.push(freeRiboInstancedMesh);

let freeRiboIdx = 0;
for (let i = 0; i < riboCount * 1.5 && freeRiboIdx < riboCount; i++) {
  const x = (Math.random() - 0.5) * 14;
  const y = (Math.random() - 0.5) * 8;
  const z = (Math.random() - 0.5) * 8;

  const distToNuc = Math.sqrt(
    Math.pow(x - DIMENSIONS.NUCLEUS_OFFSET.x, 2) +
    Math.pow(y - DIMENSIONS.NUCLEUS_OFFSET.y, 2) +
    Math.pow(z - DIMENSIONS.NUCLEUS_OFFSET.z, 2)
  );

  if (distToNuc > DIMENSIONS.NUCLEUS_RADIUS + 0.5) {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    freeRiboInstancedMesh.setMatrixAt(freeRiboIdx, dummy.matrix);
    freeRiboIdx++;
  }
}
freeRiboInstancedMesh.instanceMatrix.needsUpdate = true;
ribosomesGroup.add(freeRiboInstancedMesh);

cellGroup.add(ribosomesGroup);
organelleGroups['Ribosomes'] = {
  group: ribosomesGroup,
  meshes: [freeRiboInstancedMesh],
  labelOffset: new THREE.Vector3(0, -5, 0)
};

// ============================================
// MICROTUBULES (Transport Highways)
// ============================================
const microtubulesGroup = new THREE.Group();

const mtMat = new THREE.MeshStandardMaterial({
  color: COLORS.MICROTUBULE,
  transparent: true,
  opacity: 0.5
});

SECRETION_PATHS.forEach((path, i) => {
  const vec = new THREE.Vector3().subVectors(path.end, path.start);
  const length = vec.length();
  const midPoint = new THREE.Vector3().addVectors(path.start, path.end).multiplyScalar(0.5);

  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vec.clone().normalize());

  const tubeGeom = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
  const tube = new THREE.Mesh(tubeGeom, mtMat);
  tube.position.copy(midPoint);
  tube.quaternion.copy(quaternion);
  tube.userData = { organelle: 'Microtubules' };
  clickableMeshes.push(tube);
  microtubulesGroup.add(tube);
});

cellGroup.add(microtubulesGroup);
organelleGroups['Microtubules'] = {
  group: microtubulesGroup,
  meshes: microtubulesGroup.children,
  labelOffset: new THREE.Vector3(-3, -1, 0)
};

// ============================================
// SECRETORY VESICLES (Animated)
// ============================================
const vesiclesGroup = new THREE.Group();
const vesicleCount = SECRETION_PATHS.length * 2;

const vesicleMat = new THREE.MeshStandardMaterial({
  color: COLORS.GOLGI,
  emissive: COLORS.GOLGI,
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.8
});

const vesicleGeom = new THREE.SphereGeometry(1, 12, 12);
const vesicleInstances = new THREE.InstancedMesh(vesicleGeom, vesicleMat, vesicleCount);
vesicleInstances.userData = { organelle: 'Vesicles' };
clickableMeshes.push(vesicleInstances);
vesiclesGroup.add(vesicleInstances);

// Store vesicle animation data
const vesicleParticles = Array.from({ length: vesicleCount }).map((_, i) => ({
  pathIndex: i % SECRETION_PATHS.length,
  offset: Math.random() * 10.0
}));

cellGroup.add(vesiclesGroup);
organelleGroups['Vesicles'] = {
  group: vesiclesGroup,
  meshes: [vesicleInstances],
  labelOffset: new THREE.Vector3(-2, 2, 3)
};

// ============================================
// ANTIBODY STREAM (Y-shaped molecules)
// ============================================
const antibodiesGroup = new THREE.Group();
const antibodyCount = SECRETION_PATHS.length * 8;

// Create Y-shaped antibody geometry
function createAntibodyGeometry() {
  const shape = new THREE.Shape();

  shape.moveTo(0.06, -0.2);
  shape.lineTo(0.06, 0.05);
  shape.lineTo(0.25, 0.3);
  shape.lineTo(0.15, 0.35);
  shape.lineTo(0, 0.15);
  shape.lineTo(-0.15, 0.35);
  shape.lineTo(-0.25, 0.3);
  shape.lineTo(-0.06, 0.05);
  shape.lineTo(-0.06, -0.2);
  shape.lineTo(0.06, -0.2);

  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  return geometry;
}

const antibodyGeom = createAntibodyGeometry();
const antibodyMat = new THREE.MeshStandardMaterial({
  color: COLORS.ANTIBODY,
  emissive: COLORS.ANTIBODY,
  emissiveIntensity: 0.8
});

const antibodyInstances = new THREE.InstancedMesh(antibodyGeom, antibodyMat, antibodyCount);
antibodyInstances.userData = { organelle: 'Antibodies' };
clickableMeshes.push(antibodyInstances);
antibodiesGroup.add(antibodyInstances);

const antibodyParticles = Array.from({ length: antibodyCount }).map((_, i) => ({
  pathIndex: i % SECRETION_PATHS.length,
  offset: Math.random() * 10.0
}));

cellGroup.add(antibodiesGroup);
organelleGroups['Antibodies'] = {
  group: antibodiesGroup,
  meshes: [antibodyInstances],
  labelOffset: new THREE.Vector3(-10, 0, 8)
};

// ============================================
// UI FUNCTIONALITY
// ============================================
const introModal = document.getElementById('intro-modal');
const uiOverlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const closeInfoBtn = document.getElementById('close-info-btn');
const hintContainer = document.getElementById('hint-container');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const labelContainer = document.getElementById('label-container');
const organelleGrid = document.getElementById('organelle-grid');

// Populate organelle grid
Object.entries(INFO_CONTENT).forEach(([key, data]) => {
  if (key === 'Cell') return;

  const card = document.createElement('div');
  card.className = 'bg-slate-800/50 p-5 rounded-lg border border-slate-700 hover:border-teal-500/50 transition-colors';
  card.innerHTML = `
    <h4 class="text-lg font-bold text-teal-200 mb-2">${data.title}</h4>
    <p class="text-sm text-slate-400 mb-3 leading-relaxed">${data.description}</p>
    <div class="text-xs font-semibold text-teal-500 uppercase tracking-wide">
      Role: <span class="text-slate-300 normal-case">${data.function}</span>
    </div>
  `;
  organelleGrid.appendChild(card);
});

// Start button
startBtn.addEventListener('click', () => {
  introModal.classList.add('hidden');
  uiOverlay.classList.remove('hidden');
});

// Info modal
infoBtn.addEventListener('click', () => {
  infoModal.classList.remove('hidden');
});

closeInfoBtn.addEventListener('click', () => {
  infoModal.classList.add('hidden');
});

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    infoModal.classList.add('hidden');
  }
});

// Reset button
resetBtn.addEventListener('click', () => {
  setActiveFeature(null);
});

// Zoom controls
zoomInBtn.addEventListener('click', () => {
  controls.dollyIn(1.3);
  controls.update();
});

zoomOutBtn.addEventListener('click', () => {
  controls.dollyOut(1.3);
  controls.update();
});

// ============================================
// SELECTION & GHOST MODE
// ============================================
function setActiveFeature(feature) {
  activeFeature = feature;

  // Update reset button visibility and clickability
  resetBtn.style.opacity = feature ? '1' : '0';
  resetBtn.style.pointerEvents = feature ? 'auto' : 'none';

  // Update hint visibility
  hintContainer.style.opacity = feature ? '0' : '1';
  hintContainer.style.transform = feature ? 'translate(-50%, 40px)' : 'translate(-50%, 0)';

  // Update membrane opacity
  membraneMaterial.opacity = feature ? 0.02 : 0.15;

  // Update all organelles
  Object.entries(organelleGroups).forEach(([name, data]) => {
    const isSelected = name === feature;
    const hasSelection = feature !== null;

    if (data.meshes) {
      data.meshes.forEach(mesh => {
        if (mesh.material) {
          if (mesh.material.opacity !== undefined) {
            const baseOpacity = mesh.material.userData?.baseOpacity || mesh.material.opacity;
            if (!mesh.material.userData) mesh.material.userData = {};
            mesh.material.userData.baseOpacity = baseOpacity;

            if (!hasSelection) {
              mesh.material.opacity = baseOpacity;
            } else if (isSelected) {
              mesh.material.opacity = baseOpacity;
            } else {
              mesh.material.opacity = baseOpacity * 0.1;
            }
          }
        }
      });
    }

    if (data.group) {
      data.group.traverse(child => {
        if (child.material) {
          const mat = child.material;
          if (mat.opacity !== undefined) {
            const baseOpacity = mat.userData?.baseOpacity || mat.opacity;
            if (!mat.userData) mat.userData = {};
            mat.userData.baseOpacity = baseOpacity;

            if (!hasSelection) {
              mat.opacity = baseOpacity;
            } else if (isSelected) {
              mat.opacity = baseOpacity;
            } else {
              mat.opacity = baseOpacity * 0.1;
            }
            mat.transparent = true;
          }
        }
      });
    }
  });

  // Update label
  updateLabel();
}

// ============================================
// LABEL SYSTEM
// ============================================
let currentLabel = null;

function updateLabel() {
  // Remove existing label
  if (currentLabel) {
    currentLabel.remove();
    currentLabel = null;
  }

  if (!activeFeature || !INFO_CONTENT[activeFeature]) return;

  const info = INFO_CONTENT[activeFeature];
  const orgData = organelleGroups[activeFeature];

  // Create label element
  const label = document.createElement('div');
  label.className = 'organelle-label animate-zoom-in';
  label.innerHTML = `
    <div class="label-container">${info.title}</div>
    <div class="label-line"></div>
    <div class="label-dot animate-pulse"></div>
  `;
  labelContainer.appendChild(label);
  currentLabel = label;

  // Store world position for updates
  label.userData = {
    worldPos: orgData?.labelOffset?.clone() || new THREE.Vector3(0, 2, 0),
    orgData: orgData
  };
}

function updateLabelPosition() {
  if (!currentLabel || !activeFeature) return;

  const orgData = organelleGroups[activeFeature];
  if (!orgData) return;

  // Get world position
  let worldPos = new THREE.Vector3();

  if (orgData.group) {
    orgData.group.getWorldPosition(worldPos);
  } else if (orgData.meshes && orgData.meshes[0]) {
    orgData.meshes[0].getWorldPosition(worldPos);
  }

  // Add label offset
  if (orgData.labelOffset) {
    worldPos.add(orgData.labelOffset.clone().applyMatrix4(cellGroup.matrixWorld));
  }

  // Project to screen
  const screenPos = worldPos.project(camera);

  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

  currentLabel.style.left = x + 'px';
  currentLabel.style.top = y + 'px';

  // Hide if behind camera
  currentLabel.style.display = screenPos.z > 1 ? 'none' : 'block';
}

// ============================================
// CLICK DETECTION
// ============================================
function onMouseClick(event) {
  if (introModal && !introModal.classList.contains('hidden')) return;
  if (infoModal && !infoModal.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(clickableMeshes, true);

  if (intersects.length > 0) {
    let organelle = null;

    // Find the organelle name from the intersected object
    for (const intersect of intersects) {
      let obj = intersect.object;
      while (obj) {
        if (obj.userData && obj.userData.organelle) {
          organelle = obj.userData.organelle;
          break;
        }
        obj = obj.parent;
      }
      if (organelle) break;
    }

    if (organelle) {
      setActiveFeature(organelle);
    }
  } else {
    // Clicked empty space - deselect
    if (activeFeature) {
      setActiveFeature(null);
    }
  }
}

renderer.domElement.addEventListener('click', onMouseClick);

// Hover cursor
function onMouseMove(event) {
  if (introModal && !introModal.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, true);

  document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'auto';
}

renderer.domElement.addEventListener('mousemove', onMouseMove);

// ============================================
// ANIMATION LOOP
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const cycleDuration = 6.0;
  const transitionPoint = 0.75;

  // Cell gentle rotation
  cellGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.1;
  cellGroup.rotation.z = Math.cos(elapsed * 0.05) * 0.05;

  // Membrane pulse
  membrane.scale.setScalar(1 + Math.sin(elapsed * 0.5) * 0.01);

  // Nucleus slow rotation
  nucleusGroup.rotation.y = elapsed * 0.02;

  // Golgi bob
  golgiGroup.position.y = Math.sin(elapsed * 0.5) * 0.2;

  // Animate vesicles along microtubules
  vesicleParticles.forEach((p, i) => {
    const path = SECRETION_PATHS[p.pathIndex];
    const rawProgress = ((elapsed + p.offset) % cycleDuration) / cycleDuration;
    const stageProgress = rawProgress / transitionPoint;

    if (rawProgress < transitionPoint) {
      const currentPos = new THREE.Vector3().lerpVectors(path.start, path.end, stageProgress);

      let s = 0.25;
      if (stageProgress < 0.1) s = stageProgress * 2.5;
      if (stageProgress > 0.9) s = (1 - stageProgress) * 2.5;

      // Offset to ride on top of microtubule
      const dir = new THREE.Vector3().subVectors(path.end, path.start).normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const perp = new THREE.Vector3().crossVectors(dir, worldUp).normalize();
      if (perp.lengthSq() === 0) perp.set(1, 0, 0);
      const localUp = new THREE.Vector3().crossVectors(perp, dir).normalize();
      currentPos.add(localUp.multiplyScalar(s + 0.03));

      dummy.position.copy(currentPos);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      vesicleInstances.setMatrixAt(i, dummy.matrix);
    } else {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      vesicleInstances.setMatrixAt(i, dummy.matrix);
    }
  });
  vesicleInstances.instanceMatrix.needsUpdate = true;

  // Animate antibodies streaming outward
  antibodyParticles.forEach((p, i) => {
    const path = SECRETION_PATHS[p.pathIndex];
    const rawProgress = ((elapsed + p.offset) % cycleDuration) / cycleDuration;

    if (rawProgress >= transitionPoint) {
      const stageProgress = (rawProgress - transitionPoint) / (1.0 - transitionPoint);
      const direction = new THREE.Vector3().subVectors(path.end, path.start).normalize();
      const startPos = path.end.clone();

      const travelDist = stageProgress * 6.0;
      const currentPos = startPos.add(direction.multiplyScalar(travelDist));

      currentPos.y += Math.sin(elapsed * 5 + i) * 0.2 * stageProgress;
      currentPos.z += Math.cos(elapsed * 5 + i) * 0.2 * stageProgress;

      dummy.position.copy(currentPos);
      dummy.rotation.set(elapsed * 2, elapsed * 1.5, i);

      let s = 0.25;
      if (stageProgress < 0.1) s = stageProgress * 2.5;
      if (stageProgress > 0.8) s = (1 - stageProgress) * 1.25;

      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      antibodyInstances.setMatrixAt(i, dummy.matrix);
    } else {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      antibodyInstances.setMatrixAt(i, dummy.matrix);
    }
  });
  antibodyInstances.instanceMatrix.needsUpdate = true;

  // Inner light flicker
  innerLight.intensity = 0.6 + Math.sin(elapsed * 2) * 0.15;

  // Animate stars slow rotation
  stars.rotation.y = elapsed * 0.02;
  stars.rotation.x = elapsed * 0.01;

  // Animate cytoplasm particles (Brownian motion)
  const cytoPositions = cytoplasmParticles.geometry.attributes.position;
  const velocities = cytoplasmParticles.userData.velocities;

  for (let i = 0; i < velocities.length; i++) {
    let x = cytoPositions.getX(i);
    let y = cytoPositions.getY(i);
    let z = cytoPositions.getZ(i);

    // Apply velocity with slight randomness
    x += velocities[i].x + (Math.random() - 0.5) * 0.002;
    y += velocities[i].y + (Math.random() - 0.5) * 0.002;
    z += velocities[i].z + (Math.random() - 0.5) * 0.002;

    // Keep within ovoid bounds
    const distSq = (x / 1.5) * (x / 1.5) + y * y + z * z;
    if (distSq > 64) { // r=8 squared
      // Bounce back toward center
      velocities[i].x *= -0.8;
      velocities[i].y *= -0.8;
      velocities[i].z *= -0.8;
    }

    // Occasionally change direction
    if (Math.random() < 0.001) {
      velocities[i].x = (Math.random() - 0.5) * 0.01;
      velocities[i].y = (Math.random() - 0.5) * 0.01;
      velocities[i].z = (Math.random() - 0.5) * 0.01;
    }

    cytoPositions.setXYZ(i, x, y, z);
  }
  cytoPositions.needsUpdate = true;

  // Update label position
  updateLabelPosition();

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

console.log('BlenderCell loaded - Plasma Cell with all features:', Object.keys(organelleGroups));
