import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// KERATINOCYTE - Skin Cell Visualization
// ============================================

let scene, camera, renderer, controls;
let cellGroup, nucleusGroup;
let clock = new THREE.Clock();

// Interaction state
let activeFeature = null;
const organelleGroups = {};
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============================================
// COLORS
// ============================================
const COLORS = {
  MEMBRANE: 0xE8D4B8,
  NUCLEUS: 0x4A3728,
  CHROMATIN: 0x2A1F18,
  TONOFILAMENT: 0xC9A86C,
  KERATOHYALIN: 0x6B5344,
  LAMELLAR: 0xF5E6D3,
  MITOCHONDRIA: 0xCD5C5C,
  GOLGI: 0xDAA520,
  RIBOSOME: 0x8B7355,
  DESMOSOME: 0x8B4513,
  LYSOSOME: 0x6B8E23,
  ER: 0x40E0D0  // Turquoise for ER
};

// ============================================
// INFO CONTENT
// ============================================
const INFO_CONTENT = {
  "Nucleus": {
    title: "Nucleus: Keratin Gene Control",
    description: "The nucleus contains the genes for keratin proteins—over 50 different types! Different keratins are expressed as the cell matures and moves through skin layers. In the deepest layer (stratum basale), the nucleus is active and the cell divides. As cells rise through the epidermis, the nucleus eventually breaks down and disappears.",
    function: "Controls which keratin genes are active at each stage of cell maturation."
  },
  "Tonofilaments": {
    title: "Tonofilaments: The Keratin Network",
    description: "These are bundles of intermediate filaments made of keratin protein—the same protein in your hair and nails. They form a dense internal scaffold that gives the cell mechanical strength. The filaments anchor to desmosomes, creating a continuous network across multiple cells that makes skin incredibly tear-resistant.",
    function: "Provide structural strength and anchor to desmosomes, making skin tough and resilient."
  },
  "Keratohyalin": {
    title: "Keratohyalin Granules: Keratin Glue",
    description: "These dense, irregularly-shaped granules appear in the stratum granulosum (granular layer). They contain proteins like filaggrin that will eventually 'glue' keratin filaments together into a solid mass. When the cell dies, these granules release their contents, cementing the keratin into the hard, flat corneocyte of the skin surface.",
    function: "Store proteins that will cross-link keratin filaments during terminal differentiation."
  },
  "LamellarBodies": {
    title: "Lamellar Bodies: Waterproof Lipid Packets",
    description: "These small organelles (100-300nm) contain stacked layers of lipids—fats arranged like pages in a book. The cell secretes these lipid packages into the space between cells, where they spread out to form a waterproof seal. This is why your skin keeps water in and keeps pathogens out.",
    function: "Package and secrete lipids that create the skin's waterproof barrier."
  },
  "Desmosomes": {
    title: "Desmosomes: Cell Rivets",
    description: "These disc-shaped structures are molecular rivets that bolt adjacent cells together. Inside the cell, keratin filaments anchor to the desmosome. Outside, cadherin proteins link to the neighboring cell's desmosome. The 'spiny' appearance of keratinocytes in the stratum spinosum comes from these desmosome connections.",
    function: "Mechanically link adjacent cells, creating tissue-wide structural integrity."
  },
  "Mitochondria": {
    title: "Mitochondria: Powering Protein Production",
    description: "Keratinocytes need energy to synthesize massive amounts of keratin protein. These mitochondria are particularly active in the basal and spinous layers where protein production is highest. As cells mature and fill with keratin, mitochondria are gradually destroyed.",
    function: "Generate ATP energy for keratin synthesis and cell maintenance."
  },
  "Golgi": {
    title: "Golgi Apparatus: Lipid Packaging Center",
    description: "The Golgi is especially important in keratinocytes because it produces lamellar bodies. Lipids synthesized in the ER are processed here, stacked into layers, and packaged for secretion. The Golgi also processes other proteins destined for the cell surface or secretion.",
    function: "Produces lamellar bodies and processes proteins for the skin barrier."
  },
  "Lysosomes": {
    title: "Lysosomes: Cellular Recycling",
    description: "As keratinocytes mature and prepare to die (terminal differentiation), lysosomes play a crucial role. They help break down the nucleus and other organelles, clearing the way for the cell to become a keratin-filled corneocyte. This controlled self-destruction is essential for forming the protective dead cell layer.",
    function: "Break down organelles during terminal differentiation to make room for keratin."
  },
  "Ribosomes": {
    title: "Ribosomes: Keratin Factories",
    description: "These tiny molecular machines read mRNA instructions and assemble keratin proteins one amino acid at a time. Keratinocytes are packed with ribosomes because they need to produce enormous quantities of keratin to fill the cell before it dies.",
    function: "Translate genetic code into keratin proteins that fill and strengthen the cell."
  },
  "ER": {
    title: "Endoplasmic Reticulum: Protein & Lipid Factory",
    description: "The rough ER (studded with ribosomes) synthesizes keratin proteins and membrane components. The smooth ER produces the lipids that will be packaged into lamellar bodies. In keratinocytes, the ER is particularly active producing both structural proteins and the lipids essential for skin's waterproof barrier.",
    function: "Produces keratin proteins on rough ER, synthesizes lipids on smooth ER for lamellar bodies."
  }
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1410);
  scene.fog = new THREE.FogExp2(0x1a1410, 0.015);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 6, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  setupLighting();
  createKeratinocyte();
  createNeighborCells();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x6b5344, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffeedd, 1.3);
  keyLight.position.set(10, 15, 10);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc9a86c, 0.4);
  fillLight.position.set(-15, 5, 0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffd700, 0.3);
  rimLight.position.set(0, -5, -15);
  scene.add(rimLight);

  const innerLight = new THREE.PointLight(0xc9a86c, 0.5, 15);
  innerLight.position.set(0, 0, 0);
  scene.add(innerLight);

  const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x4a3728, 0.3);
  scene.add(hemiLight);
}

// ============================================
// MAIN KERATINOCYTE
// ============================================

function createKeratinocyte() {
  cellGroup = new THREE.Group();

  createMembrane();
  createNucleus();

  // Define desmosome positions FIRST - tonofilaments will connect to these
  defineDesmosomePositions();

  // Now create tonofilaments that connect nucleus to desmosomes
  createTonofilaments();

  createKeratohyalinGranules();
  createLamellarBodies();

  // Create desmosomes at the predefined positions
  createDesmosomes();

  createMitochondria();
  createGolgi();
  createER();  // ER with ribosomes
  createLysosomes();
  createRibosomes();  // Free ribosomes (in addition to ER-bound ones)

  scene.add(cellGroup);
}

// ============================================
// CELL MEMBRANE
// ============================================

function createMembrane() {
  const membraneGeo = new THREE.DodecahedronGeometry(5, 1);
  membraneGeo.scale(1, 0.7, 1);

  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.MEMBRANE,
    transparent: true,
    opacity: 0.12,
    roughness: 0.2,
    clearcoat: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  membrane.raycast = () => {};
  cellGroup.add(membrane);
}

// ============================================
// NUCLEUS
// ============================================

function createNucleus() {
  nucleusGroup = new THREE.Group();
  const meshes = [];

  const envelopeGeo = new THREE.SphereGeometry(1.6, 32, 24);
  const envelopeMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.NUCLEUS,
    transparent: true,
    opacity: 0.55,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const envelope = new THREE.Mesh(envelopeGeo, envelopeMat);
  envelope.userData.organelleName = "Nucleus";
  meshes.push(envelope);
  nucleusGroup.add(envelope);

  const nucleoplasmGeo = new THREE.SphereGeometry(1.5, 24, 16);
  const nucleoplasmMat = new THREE.MeshStandardMaterial({
    color: 0x3D2817,
    transparent: true,
    opacity: 0.6
  });
  nucleusGroup.add(new THREE.Mesh(nucleoplasmGeo, nucleoplasmMat));

  const nucleolusGeo = new THREE.SphereGeometry(0.35, 16, 12);
  const nucleolusMat = new THREE.MeshStandardMaterial({ color: 0x1A0F0A, roughness: 0.6 });
  const nucleolus = new THREE.Mesh(nucleolusGeo, nucleolusMat);
  nucleolus.position.set(0.3, 0.2, 0.3);
  nucleusGroup.add(nucleolus);

  // Chromatin
  const chromatinMat = new THREE.MeshStandardMaterial({
    color: COLORS.CHROMATIN,
    transparent: true,
    opacity: 0.8
  });
  for (let i = 0; i < 6; i++) {
    const chromatin = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 6, 4), chromatinMat);
    const angle = (i / 6) * Math.PI * 2;
    chromatin.position.set(Math.cos(angle) * 0.9, (Math.random() - 0.5) * 1, Math.sin(angle) * 0.9);
    nucleusGroup.add(chromatin);
  }

  cellGroup.add(nucleusGroup);
  organelleGroups['Nucleus'] = { meshes, group: nucleusGroup, material: envelopeMat };
}

// ============================================
// DESMOSOME POSITIONS - Define first, shared by desmosomes and tonofilaments
// ============================================

// Store desmosome positions globally so tonofilaments can connect to them
const desmosomePositions = [];

function defineDesmosomePositions() {
  // Place desmosomes at cell-cell contact points
  const cellRadius = 4.6;

  // Match neighbor cell positions (hexagonal packing)
  // contactDist = 9.2, so directions are at angles: 0, 60, 120, 180, 240, 300 degrees
  const neighborAngles = [
    0,                    // +X
    Math.PI,              // -X
    Math.PI / 3,          // +X +Z
    -Math.PI / 3,         // +X -Z
    Math.PI * 2 / 3,      // -X +Z
    -Math.PI * 2 / 3,     // -X -Z
    Math.PI / 2,          // +Z
    -Math.PI / 2,         // -Z
  ];

  // Create desmosomes facing each neighbor cell
  neighborAngles.forEach(angle => {
    const neighborDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

    // Multiple desmosomes per neighbor contact (spread vertically and slightly horizontally)
    for (let d = 0; d < 4; d++) {
      const yOffset = ((d % 3) - 1) * 0.5;
      const angleOffset = ((d % 2) - 0.5) * 0.12;

      const adjustedDir = neighborDir.clone();
      adjustedDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

      const pos = adjustedDir.clone().multiplyScalar(cellRadius);
      pos.y = yOffset * 0.7;

      desmosomePositions.push({
        position: pos,
        normal: adjustedDir.clone()
      });
    }
  });
}

// ============================================
// TONOFILAMENTS - Network connecting desmosomes, avoiding nucleus
// ============================================

const NUCLEUS_RADIUS = 1.6;

// Helper to check if a point is inside the nucleus
function isInsideNucleus(point, margin = 0.2) {
  return point.length() < (NUCLEUS_RADIUS + margin);
}

function createTonofilaments() {
  const meshes = [];
  const filamentMat = new THREE.MeshStandardMaterial({
    color: COLORS.TONOFILAMENT,
    transparent: true,
    opacity: 0.6,
    roughness: 0.5,
    emissive: COLORS.TONOFILAMENT,
    emissiveIntensity: 0.08
  });

  // 1. Filaments from desmosomes to perinuclear region (NOT through nucleus)
  desmosomePositions.forEach((desmo) => {
    const start = desmo.position.clone();

    // End at perinuclear region (just outside nucleus)
    const dir = desmo.position.clone().normalize();
    const end = dir.clone().multiplyScalar(NUCLEUS_RADIUS + 0.5);

    // Midpoint - push outward to avoid nucleus
    const mid = start.clone().lerp(end, 0.5);
    // Ensure midpoint stays outside nucleus
    if (isInsideNucleus(mid, 0.3)) {
      mid.normalize().multiplyScalar(NUCLEUS_RADIUS + 0.8);
    }
    mid.y += (Math.random() - 0.5) * 0.3;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.04, 5, false);
    const tube = new THREE.Mesh(tubeGeo, filamentMat);
    tube.userData.organelleName = "Tonofilaments";
    meshes.push(tube);
    cellGroup.add(tube);
  });

  // 2. Filaments connecting adjacent desmosomes (route AROUND nucleus)
  for (let i = 0; i < desmosomePositions.length; i++) {
    const pos1 = desmosomePositions[i].position;

    for (let j = i + 1; j < desmosomePositions.length; j++) {
      const pos2 = desmosomePositions[j].position;
      const dist = pos1.distanceTo(pos2);

      // Only connect nearby desmosomes
      if (dist < 4.5 && Math.random() > 0.3) {
        const start = pos1.clone();
        const end = pos2.clone();

        // Calculate midpoint and ENSURE it's outside nucleus
        const mid = start.clone().lerp(end, 0.5);
        const midDist = mid.length();

        // Push midpoint outward if too close to nucleus
        if (midDist < NUCLEUS_RADIUS + 1.0) {
          // Push radially outward
          mid.normalize().multiplyScalar(NUCLEUS_RADIUS + 1.2 + Math.random() * 0.3);
        }
        mid.y += (Math.random() - 0.5) * 0.25;

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const tubeGeo = new THREE.TubeGeometry(curve, 10, 0.03, 5, false);
        const tube = new THREE.Mesh(tubeGeo, filamentMat);
        tube.userData.organelleName = "Tonofilaments";
        meshes.push(tube);
        cellGroup.add(tube);
      }
    }
  }

  // 3. Perinuclear cage (filaments looping AROUND nucleus surface)
  for (let r = 0; r < 2; r++) {
    const ringRadius = NUCLEUS_RADIUS + 0.4 + r * 0.35;
    const yOffset = (r - 0.5) * 0.6;
    const points = [];

    for (let s = 0; s <= 16; s++) {
      const angle = (s / 16) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 0.15,
        yOffset + (Math.random() - 0.5) * 0.1,
        Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 0.15
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.025, 5, true);
    const tube = new THREE.Mesh(tubeGeo, filamentMat);
    tube.userData.organelleName = "Tonofilaments";
    meshes.push(tube);
    cellGroup.add(tube);
  }

  organelleGroups['Tonofilaments'] = { meshes, material: filamentMat };
}

// ============================================
// KERATOHYALIN GRANULES - Use instancing
// ============================================

function createKeratohyalinGranules() {
  const granuleGeo = new THREE.IcosahedronGeometry(0.25, 0);
  const granuleMat = new THREE.MeshStandardMaterial({
    color: COLORS.KERATOHYALIN,
    transparent: true,
    opacity: 0.75,
    roughness: 0.7
  });

  const count = 12;
  const instanced = new THREE.InstancedMesh(granuleGeo, granuleMat, count);
  const matrix = new THREE.Matrix4();
  const positions = [];

  for (let i = 0; i < count; i++) {
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6
      );
    } while (pos.length() < 2.2 || pos.length() > 3.8);

    positions.push(pos);
    matrix.setPosition(pos);
    matrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0));
    matrix.setPosition(pos);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.userData.organelleName = "Keratohyalin";
  instanced.userData.positions = positions;
  cellGroup.add(instanced);

  organelleGroups['Keratohyalin'] = { meshes: [instanced], material: granuleMat };
}

// ============================================
// LAMELLAR BODIES - Simplified, instanced
// ============================================

function createLamellarBodies() {
  const bodyGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.LAMELLAR,
    transparent: true,
    opacity: 0.6,
    roughness: 0.4
  });

  const count = 10;
  const instanced = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const matrix = new THREE.Matrix4();

  for (let i = 0; i < count; i++) {
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 5
      );
    } while (pos.length() < 2 || pos.length() > 3.5);

    matrix.setPosition(pos);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.userData.organelleName = "LamellarBodies";
  cellGroup.add(instanced);

  organelleGroups['LamellarBodies'] = { meshes: [instanced], material: bodyMat };
}

// ============================================
// DESMOSOMES - Cell-cell junctions at predefined positions
// ============================================

function createDesmosomes() {
  const meshes = [];

  // Desmosome material - disc-like structures
  const desmosomeMat = new THREE.MeshStandardMaterial({
    color: COLORS.DESMOSOME,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85
  });

  // Bridge/linker material - the extracellular connection
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xA0522D,
    roughness: 0.5,
    transparent: true,
    opacity: 0.7
  });

  // Create a desmosome at each predefined position
  desmosomePositions.forEach((desmo) => {
    const desmoGroup = new THREE.Group();

    // Inner plaque (cytoplasmic side - where tonofilaments attach)
    const innerPlaqueGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12);
    const innerPlaque = new THREE.Mesh(innerPlaqueGeo, desmosomeMat);
    innerPlaque.userData.organelleName = "Desmosomes";
    meshes.push(innerPlaque);
    desmoGroup.add(innerPlaque);

    // Outer plaque (at membrane)
    const outerPlaqueGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12);
    const outerPlaque = new THREE.Mesh(outerPlaqueGeo, desmosomeMat);
    outerPlaque.position.y = 0.06;
    desmoGroup.add(outerPlaque);

    // Extracellular bridge - shows connection across cell gap
    const bridgeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8);
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.y = 0.2;
    desmoGroup.add(bridge);

    // Small cadherins - the actual binding proteins (simplified as small spheres)
    const cadherinGeo = new THREE.SphereGeometry(0.03, 6, 4);
    for (let c = 0; c < 4; c++) {
      const cadherin = new THREE.Mesh(cadherinGeo, desmosomeMat);
      const angle = (c / 4) * Math.PI * 2;
      cadherin.position.set(
        Math.cos(angle) * 0.06,
        0.18 + Math.random() * 0.08,
        Math.sin(angle) * 0.06
      );
      desmoGroup.add(cadherin);
    }

    // Position and orient the desmosome to face outward from cell
    desmoGroup.position.copy(desmo.position);

    // Orient so cylinder points outward (normal direction)
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, desmo.normal);
    desmoGroup.quaternion.copy(quaternion);

    cellGroup.add(desmoGroup);
  });

  organelleGroups['Desmosomes'] = { meshes, material: desmosomeMat };
}

// ============================================
// MITOCHONDRIA - Fewer, simpler
// ============================================

function createMitochondria() {
  const meshes = [];
  const outerMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.MITOCHONDRIA,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const count = 15;
  for (let i = 0; i < count; i++) {
    const length = 0.35 + Math.random() * 0.25;
    const radius = 0.1 + Math.random() * 0.04;

    const mito = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 4, 8),
      outerMat
    );

    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6
      );
    } while (pos.length() < 2 || pos.length() > 4);

    mito.position.copy(pos);
    mito.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mito.userData.organelleName = "Mitochondria";
    meshes.push(mito);
    cellGroup.add(mito);
  }

  organelleGroups['Mitochondria'] = { meshes, material: outerMat };
}

// ============================================
// GOLGI APPARATUS - Plasma cell style curved cisternae
// ============================================

// Helper to create curved cisterna shape
function createGolgiCisterna(width, depth, curvature, thickness) {
  const shape = new THREE.Shape();
  const segments = 24;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const curve = Math.sin(t * Math.PI) * curvature;
    if (i === 0) {
      shape.moveTo(x, curve + depth / 2);
    } else {
      shape.lineTo(x, curve + depth / 2);
    }
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const curve = Math.sin(t * Math.PI) * curvature;
    shape.lineTo(x, curve - depth / 2);
  }
  shape.closePath();

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: thickness * 0.15,
    bevelSegments: 2,
    curveSegments: 16
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

function createGolgi() {
  const golgiGroup = new THREE.Group();
  // Position Golgi adjacent to nucleus - concave face toward nucleus
  golgiGroup.position.set(2.2, 0, 0);  // Just outside nucleus radius
  golgiGroup.rotation.set(0, Math.PI, 0.15);  // Rotate so concave faces nucleus (toward -x)
  const meshes = [];

  // Golgi materials - gradient from cis to trans
  const golgiCisMat = new THREE.MeshPhysicalMaterial({
    color: 0xE6B800,
    roughness: 0.4,
    emissive: 0x442200,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const golgiMedialMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFD700,
    roughness: 0.35,
    emissive: 0x553300,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const golgiTransMat = new THREE.MeshPhysicalMaterial({
    color: 0xDAA520,
    roughness: 0.3,
    emissive: 0x664400,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // Create 6 stacked cisternae
  const cisternaCount = 6;
  const stackSpacing = 0.12;
  const baseWidth = 1.4;
  const baseDepth = 0.5;

  for (let i = 0; i < cisternaCount; i++) {
    const t = i / (cisternaCount - 1);
    const width = baseWidth * (1 - t * 0.25);
    const depth = baseDepth * (1 - t * 0.15);
    const curvature = 0.2 + t * 0.3;
    const thickness = 0.04;

    let mat;
    if (i < 2) mat = golgiCisMat;
    else if (i < 4) mat = golgiMedialMat;
    else mat = golgiTransMat;

    const geometry = createGolgiCisterna(width, depth, curvature, thickness);
    const cisterna = new THREE.Mesh(geometry, mat);

    cisterna.position.y = (i - cisternaCount / 2) * stackSpacing;
    cisterna.position.x = t * 0.1;
    cisterna.rotation.x = Math.PI / 2;
    cisterna.rotation.z = Math.PI / 2;

    cisterna.userData.organelleName = "Golgi";
    meshes.push(cisterna);
    golgiGroup.add(cisterna);
  }

  // Budding vesicles
  const vesicleMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLGI,
    emissive: COLORS.GOLGI,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8
  });

  // Cis-side vesicles (arriving from ER)
  for (let i = 0; i < 4; i++) {
    const vesicle = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.02, 8, 8),
      vesicleMat.clone()
    );
    vesicle.material.color.setHex(0xAADD88);
    vesicle.position.set(
      -0.2 + Math.random() * 0.15,
      -0.5 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.8
    );
    golgiGroup.add(vesicle);
  }

  // Trans-side vesicles (departing - lamellar body precursors in keratinocytes!)
  for (let i = 0; i < 6; i++) {
    const vesicle = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + Math.random() * 0.025, 8, 8),
      vesicleMat
    );
    vesicle.position.set(
      0.15 + Math.random() * 0.2,
      0.4 + Math.random() * 0.25,
      (Math.random() - 0.5) * 1.0
    );
    golgiGroup.add(vesicle);
  }

  cellGroup.add(golgiGroup);
  organelleGroups['Golgi'] = { meshes, group: golgiGroup, material: golgiMedialMat };
}

// ============================================
// ENDOPLASMIC RETICULUM - Plasma cell style folding
// ============================================

// Helper to create undulating membrane sheet (plasma cell parameters)
function createERSheet(width, depth, wavesX, wavesZ, amplitude, segments = 40) {
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);

    // Smooth undulating waves (plasma cell style)
    const wave1 = Math.sin(x * wavesX * 0.5) * amplitude;
    const wave2 = Math.sin(z * wavesZ * 0.5) * amplitude * 0.6;
    const wave3 = Math.cos((x + z) * 0.3) * amplitude * 0.3;

    const y = wave1 + wave2 + wave3;
    positions.setZ(i, y);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Helper to create curved cisterna (bent sheet wrapping around)
function createCurvedCisterna(radius, arcAngle, height, waves, amplitude, segments = 40) {
  const geometry = new THREE.PlaneGeometry(radius * arcAngle, height, segments, Math.floor(segments / 2));
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    let u = positions.getX(i);
    let v = positions.getY(i);

    const angle = (u / radius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const wave1 = Math.sin(angle * waves) * amplitude;
    const wave2 = Math.sin(v * 2 + angle * waves * 0.5) * amplitude * 0.4;

    const radialOffset = wave1 + wave2;
    const newX = Math.cos(angle) * (radius + radialOffset);
    const newZ = Math.sin(angle) * (radius + radialOffset);

    positions.setXYZ(i, newX, v, newZ);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Store ER sheets for ribosome placement
const erSheets = [];

function createER() {
  const erGroup = new THREE.Group();
  const meshes = [];

  const erMaterial = new THREE.MeshPhysicalMaterial({
    color: COLORS.ER,
    transparent: true,
    opacity: 0.5,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  // EXACT plasma cell parameters:
  // erStackCount = 16, erStackSpacing = 0.45
  // width = 6.0 * sizeFactor, depth = 5.5 * sizeFactor
  // waves: 3 + random*2, 2 + random*2, amplitude: 0.15 + random*0.1

  const erStackCount = 16;
  const erStackSpacing = 0.45;
  const erBaseY = -3.0;

  for (let s = 0; s < erStackCount; s++) {
    const y = erBaseY + s * erStackSpacing;

    // Vary size based on position (larger in middle) - plasma cell style
    const sizeFactor = 1 - Math.abs(s - erStackCount / 2) / (erStackCount / 2) * 0.3;
    const width = 6.0 * sizeFactor;
    const depth = 5.5 * sizeFactor;

    // Position on opposite side from Golgi
    const xOffset = -3.5 + (Math.random() - 0.5) * 1.5;

    // Plasma cell wave parameters
    const sheet = new THREE.Mesh(
      createERSheet(width, depth, 3 + Math.random() * 2, 2 + Math.random() * 2, 0.15 + Math.random() * 0.1),
      erMaterial.clone()
    );

    sheet.position.set(xOffset, y, 0);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = (Math.random() - 0.5) * 0.3;

    sheet.userData.organelleName = "ER";
    meshes.push(sheet);
    erGroup.add(sheet);
    erSheets.push(sheet);
  }

  // Curved cisternae wrapping around - plasma cell style
  const curvedCount = 12;
  for (let c = 0; c < curvedCount; c++) {
    const angle = (c / curvedCount) * Math.PI * 2;
    const radius = 2.5 + Math.random() * 2.0;
    const height = 2.5 + Math.random() * 2.0;
    const xPos = Math.cos(angle) * 2.0 - 3.0;
    const zPos = Math.sin(angle) * 4.0;
    const yPos = (Math.random() - 0.5) * 5;

    const curved = new THREE.Mesh(
      createCurvedCisterna(radius, Math.PI * 0.8, height, 4 + Math.random() * 3, 0.12),
      erMaterial.clone()
    );

    curved.position.set(xPos, yPos, zPos);
    curved.rotation.y = angle + Math.PI / 2;

    curved.userData.organelleName = "ER";
    meshes.push(curved);
    erGroup.add(curved);
    erSheets.push(curved);
  }

  // Vertical connecting sheets - plasma cell style
  for (let v = 0; v < 10; v++) {
    const xPos = -5.5 + v * 0.9 + (Math.random() - 0.5) * 0.5;
    const zPos = (Math.random() - 0.5) * 8;
    const yPos = (Math.random() - 0.5) * 2;

    const vertSheet = new THREE.Mesh(
      createERSheet(3.5, 5.0, 2, 3, 0.2),
      erMaterial.clone()
    );

    vertSheet.position.set(xPos, yPos, zPos);
    vertSheet.rotation.y = Math.random() * Math.PI;

    vertSheet.userData.organelleName = "ER";
    meshes.push(vertSheet);
    erGroup.add(vertSheet);
    erSheets.push(vertSheet);
  }

  // Instanced ribosomes studding the ER
  const riboGeo = new THREE.SphereGeometry(0.02, 4, 4);
  const riboMat = new THREE.MeshStandardMaterial({
    color: 0x2299aa,
    roughness: 0.5,
    emissive: 0x115566,
    emissiveIntensity: 0.2
  });

  const riboCount = 300;
  const ribosomes = new THREE.InstancedMesh(riboGeo, riboMat, riboCount);
  const matrix = new THREE.Matrix4();

  for (let i = 0; i < riboCount; i++) {
    const sheetIdx = Math.floor(Math.random() * erStackCount);
    const y = erBaseY + sheetIdx * erStackSpacing + 0.02 + Math.random() * 0.04;
    const x = -3.5 + (Math.random() - 0.5) * 5;
    const z = (Math.random() - 0.5) * 5;

    matrix.setPosition(x, y, z);
    ribosomes.setMatrixAt(i, matrix);
  }

  erGroup.add(ribosomes);

  cellGroup.add(erGroup);
  organelleGroups['ER'] = { meshes, group: erGroup, material: erMaterial };
}

// ============================================
// LYSOSOMES - Instanced
// ============================================

function createLysosomes() {
  const lysoGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const lysoMat = new THREE.MeshStandardMaterial({
    color: COLORS.LYSOSOME,
    transparent: true,
    opacity: 0.7,
    roughness: 0.5
  });

  const count = 8;
  const instanced = new THREE.InstancedMesh(lysoGeo, lysoMat, count);
  const matrix = new THREE.Matrix4();

  for (let i = 0; i < count; i++) {
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 5
      );
    } while (pos.length() < 2 || pos.length() > 3.5);

    matrix.setPosition(pos);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.userData.organelleName = "Lysosomes";
  cellGroup.add(instanced);

  organelleGroups['Lysosomes'] = { meshes: [instanced], material: lysoMat };
}

// ============================================
// RIBOSOMES - Instanced
// ============================================

function createRibosomes() {
  const riboGeo = new THREE.SphereGeometry(0.025, 4, 3);
  const riboMat = new THREE.MeshStandardMaterial({
    color: COLORS.RIBOSOME,
    roughness: 0.6
  });

  const count = 80;
  const instanced = new THREE.InstancedMesh(riboGeo, riboMat, count);
  const matrix = new THREE.Matrix4();

  for (let i = 0; i < count; i++) {
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 6
      );
    } while (pos.length() < 1.8 || pos.length() > 4);

    matrix.setPosition(pos);
    instanced.setMatrixAt(i, matrix);
  }

  instanced.userData.organelleName = "Ribosomes";
  cellGroup.add(instanced);

  organelleGroups['Ribosomes'] = { meshes: [instanced], material: riboMat };
}

// ============================================
// NEIGHBOR CELLS - With desmosomes on exterior face toward main cell
// ============================================

function createNeighborCells() {
  const neighborMat = new THREE.MeshStandardMaterial({
    color: 0xD4B896,
    transparent: true,
    opacity: 0.55,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });

  // Desmosome material
  const desmosomeMat = new THREE.MeshStandardMaterial({
    color: COLORS.DESMOSOME,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85
  });

  // Cell dimensions: main cell radius ~4.6, neighbor radius ~4.2
  // Gap between cells should be small (desmosome length ~0.3-0.5)
  // So center-to-center distance = 4.6 + 4.2 + 0.4 = ~9.2
  // But cells are flattened (0.7 in Y), so they can overlap slightly in XZ

  // First ring neighbors - tightly packed, touching the main cell
  const cellGap = 0.4; // Small gap for desmosomes
  const mainRadius = 4.6;
  const neighborRadius = 4.2;
  const contactDist = mainRadius + neighborRadius + cellGap; // ~9.2

  const firstRingPositions = [
    [contactDist, 0, 0], [-contactDist, 0, 0],
    [contactDist * 0.5, 0, contactDist * 0.866], [contactDist * 0.5, 0, -contactDist * 0.866],
    [-contactDist * 0.5, 0, contactDist * 0.866], [-contactDist * 0.5, 0, -contactDist * 0.866],
    [0, 0, contactDist], [0, 0, -contactDist],
  ];

  // Second ring - slightly farther
  const secondDist = contactDist * 1.8;
  const secondRingPositions = [
    [secondDist * 0.7, 0, secondDist * 0.5], [secondDist * 0.7, 0, -secondDist * 0.5],
    [-secondDist * 0.7, 0, secondDist * 0.5], [-secondDist * 0.7, 0, -secondDist * 0.5],
    [secondDist * 0.4, 0, secondDist * 0.8], [-secondDist * 0.4, 0, secondDist * 0.8],
    [secondDist * 0.4, 0, -secondDist * 0.8], [-secondDist * 0.4, 0, -secondDist * 0.8],
  ];

  // Create first ring neighbors with desmosomes on their exterior
  firstRingPositions.forEach(pos => {
    const neighborGeo = new THREE.DodecahedronGeometry(4.2, 0);
    neighborGeo.scale(1, 0.7, 1);

    const neighbor = new THREE.Mesh(neighborGeo, neighborMat.clone());
    neighbor.position.set(...pos);
    neighbor.rotation.set(0, Math.random() * Math.PI * 2, 0);
    scene.add(neighbor);

    // Direction from neighbor toward main cell
    const neighborVec = new THREE.Vector3(...pos);
    const toMainCell = neighborVec.clone().normalize().negate();
    const neighborRadius = 4.2;

    // Add desmosomes on the EXTERIOR face of neighbor cell (facing main cell)
    const desmoCount = 5;
    for (let d = 0; d < desmoCount; d++) {
      const desmoGroup = new THREE.Group();

      // Spread desmosomes across the contact face
      const angleOffset = ((d / desmoCount) - 0.5) * 0.8;
      const yOffset = ((d % 3) - 1) * 0.7;

      // Position on neighbor cell surface facing main cell
      const desmoDir = toMainCell.clone();
      desmoDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

      const surfacePos = neighborVec.clone().add(
        desmoDir.clone().multiplyScalar(neighborRadius)
      );
      surfacePos.y += yOffset * 0.7;

      // Inner plaque (disc on cell surface)
      const plaqueGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10);
      const plaque = new THREE.Mesh(plaqueGeo, desmosomeMat);
      desmoGroup.add(plaque);

      // Outer dense plaque
      const outerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8);
      const outer = new THREE.Mesh(outerGeo, desmosomeMat);
      outer.position.y = 0.04;
      desmoGroup.add(outer);

      // Small extracellular projection
      const projGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6);
      const proj = new THREE.Mesh(projGeo, desmosomeMat.clone());
      proj.material.opacity = 0.6;
      proj.position.y = 0.1;
      desmoGroup.add(proj);

      desmoGroup.position.copy(surfacePos);

      // Orient to face outward from neighbor cell (toward main cell)
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(up, desmoDir);
      desmoGroup.quaternion.copy(quaternion);

      scene.add(desmoGroup);
    }
  });

  // Create second ring neighbors (no detailed desmosomes)
  secondRingPositions.forEach(pos => {
    const distance = Math.sqrt(pos[0]**2 + pos[2]**2);

    const neighborGeo = new THREE.DodecahedronGeometry(3.8, 0);
    neighborGeo.scale(1, 0.7, 1);

    const mat = neighborMat.clone();
    mat.opacity = Math.max(0.3, 0.5 - distance / 35);

    const neighbor = new THREE.Mesh(neighborGeo, mat);
    neighbor.position.set(...pos);
    neighbor.rotation.set(0, Math.random() * Math.PI * 2, 0);
    scene.add(neighbor);
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onMouseClick);

  document.getElementById('close-popup')?.addEventListener('click', hidePopup);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// CLICK HANDLING
// ============================================

function onMouseClick(event) {
  const introModal = document.getElementById('intro-modal');
  if (introModal && !introModal.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Get all clickable objects
  const clickables = [];
  Object.values(organelleGroups).forEach(group => {
    if (group.meshes) clickables.push(...group.meshes);
  });

  const intersects = raycaster.intersectObjects(clickables, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;

    // Walk up to find organelleName
    while (obj && !obj.userData.organelleName) {
      obj = obj.parent;
    }

    const name = obj?.userData?.organelleName;
    if (name && INFO_CONTENT[name]) {
      activeFeature = name;
      showPopup(INFO_CONTENT[name]);
      highlightOrganelle(name);
    }
  } else {
    activeFeature = null;
    hidePopup();
    resetHighlight();
  }
}

function highlightOrganelle(name) {
  Object.entries(organelleGroups).forEach(([key, group]) => {
    const isSelected = key === name;
    if (group.material) {
      if (group.material.userData?.baseOpacity === undefined) {
        group.material.userData = { baseOpacity: group.material.opacity };
      }
      group.material.opacity = isSelected
        ? group.material.userData.baseOpacity
        : group.material.userData.baseOpacity * 0.2;
    }
  });
}

function resetHighlight() {
  Object.values(organelleGroups).forEach(group => {
    if (group.material && group.material.userData?.baseOpacity !== undefined) {
      group.material.opacity = group.material.userData.baseOpacity;
    }
  });
}

function showPopup(content) {
  const popup = document.getElementById('info-popup');
  document.getElementById('popup-title').textContent = content.title;
  document.getElementById('popup-description').textContent = content.description;
  document.getElementById('popup-function').textContent = content.function;

  popup.classList.remove('hidden');
  popup.classList.add('flex');
}

function hidePopup() {
  const popup = document.getElementById('info-popup');
  popup.classList.add('hidden');
  popup.classList.remove('flex');
}

// ============================================
// ANIMATION
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  if (cellGroup) {
    cellGroup.scale.setScalar(1 + Math.sin(time * 0.5) * 0.01);
  }

  if (nucleusGroup) {
    nucleusGroup.position.y = Math.sin(time * 0.3) * 0.05;
  }

  controls.update();

  // Update scale bar based on zoom level
  updateScaleBar();

  renderer.render(scene, camera);
}

// ============================================
// DYNAMIC SCALE BAR
// Cell is ~12μm. Membrane dodecahedron radius=5, diameter=10 units = 12μm
// 1μm ≈ 0.833 units
// ============================================
const UNITS_PER_MICRON = 10 / 12;

function updateScaleBar() {
  const scaleBar = document.getElementById('scale-bar');
  const scaleValue = document.getElementById('scale-value');
  if (!scaleBar || !scaleValue) return;

  const dist = camera.position.length();
  const fovRad = camera.fov * Math.PI / 180;
  const worldHeightVisible = 2 * dist * Math.tan(fovRad / 2);
  const pixelsPerUnit = window.innerHeight / worldHeightVisible;

  const targetPx = 80;
  const worldUnitsForTarget = targetPx / pixelsPerUnit;
  const micronsForTarget = worldUnitsForTarget / UNITS_PER_MICRON;

  const niceValues = [
    { val: 0.1, label: '100 nm' },
    { val: 0.2, label: '200 nm' },
    { val: 0.5, label: '500 nm' },
    { val: 1, label: '1 μm' },
    { val: 2, label: '2 μm' },
    { val: 5, label: '5 μm' },
    { val: 10, label: '10 μm' },
    { val: 20, label: '20 μm' },
  ];

  let best = niceValues[0];
  let bestDiff = Infinity;
  for (const nv of niceValues) {
    const diff = Math.abs(nv.val - micronsForTarget);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = nv;
    }
  }

  const barPx = best.val * UNITS_PER_MICRON * pixelsPerUnit;
  scaleBar.style.width = Math.round(barPx) + 'px';
  scaleValue.textContent = best.label;
}

// ============================================
// START
// ============================================

init();
