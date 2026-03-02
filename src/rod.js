import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// ROD PHOTORECEPTOR - The Night Watchman
// ============================================

let scene, camera, renderer, controls;
let cellGroup;
let clock = new THREE.Clock();
let lastFrameTime = 0;

// Interaction state
let activeFeature = null;
const organelleGroups = {};
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Animation state
let discInstancedMesh = null;
let discColors = null;
let photonActive = false;
let photonMesh = null;
let photonStartTime = 0;
let photonTargetDisc = 0;
let cascadeActive = false;
let cascadeStartTime = 0;
let cascadeOriginDisc = 0;
let vesicles = [];
let ribbonVesicleAnims = [];
let lastAutoPhotonTime = 0;

// Cell signaling state machine
let cellState = 'dark';       // 'dark' | 'inhibiting' | 'recovering'
let stateStartTime = 0;
let recoveryTimeout = null;

// Neighboring cells
let bipolarCellMesh = null;
let bipolarDendrite = null;

// Glutamate particle system
let glutamateInstanced = null;
let glutamatePositions = [];  // {y, vy, opacity, active}
const GLUTAMATE_COUNT = 30;

const DISC_COUNT = 150;
const OUTER_SEGMENT_HEIGHT = 25;
const OUTER_SEGMENT_RADIUS = 1.0;
const DISC_BASE_Y = 2; // Y offset where outer segment starts (above cilium)

// ============================================
// COLORS
// ============================================
const COLORS = {
  OUTER_MEMBRANE: 0x4a1a6b,
  DISC: 0x7b2d8e,
  DISC_EMISSIVE: 0x3d1647,
  CILIUM: 0x6366f1,
  ELLIPSOID_MEMBRANE: 0xd97706,
  MITOCHONDRIA: 0xef4444,
  MYOID_MEMBRANE: 0x06b6d4,
  GOLGI: 0xDAA520,
  ER: 0x40E0D0,
  NUCLEUS: 0x1e1b4b,
  NUCLEUS_INNER: 0x312e81,
  SYNAPTIC_TERMINAL: 0x14b8a6,
  SYNAPTIC_RIBBON: 0xf472b6,
  VESICLE: 0xfbbf24,
  BACKGROUND: 0x020208,
};

// ============================================
// INFO CONTENT
// ============================================
const INFO_CONTENT = {
  "OuterSegment": {
    title: "Outer Segment: The Light Catcher",
    description: "The outer segment is a cylindrical extension packed with ~800 stacked membranous discs. Each disc is loaded with rhodopsin, the light-sensitive protein that captures photons. The outer segment is continuously renewed—new discs form at the base while old ones are shed from the tip and recycled by the retinal pigment epithelium every ~10 days.",
    function: "Houses the phototransduction machinery that converts light into electrical signals."
  },
  "DiscStack": {
    title: "Disc Stack: Rhodopsin's Home",
    description: "Each disc is a flattened membrane sac containing ~100,000 rhodopsin molecules. Rod discs are uniquely detached from the plasma membrane, forming free-floating coin-like structures. This arrangement maximizes the surface area for light capture—like stacking hundreds of satellite dishes in a tube.",
    function: "Maximizes rhodopsin density for single-photon sensitivity."
  },
  "ConnectingCilium": {
    title: "Connecting Cilium: The Narrow Bridge",
    description: "A modified primary cilium with a 9+0 microtubule arrangement (nine outer doublets, no central pair). This slender bridge (~0.3 μm diameter) is the ONLY connection between the outer segment and inner segment. All proteins for the outer segment—including new rhodopsin molecules—must be transported through this bottleneck via intraflagellar transport (IFT).",
    function: "Sole transport corridor connecting the metabolic inner segment to the sensory outer segment."
  },
  "Ellipsoid": {
    title: "Ellipsoid: The Powerhouse Zone",
    description: "The ellipsoid is the widest part of the inner segment, packed with mitochondria. Photoreceptors are among the most metabolically active cells in the body—they consume more oxygen per gram than any other tissue. The dense mitochondrial cluster here powers the ion pumps that maintain the dark current and fuels protein synthesis.",
    function: "Provides massive ATP production to sustain the rod's enormous energy demands."
  },
  "Myoid": {
    title: "Myoid: The Protein Factory",
    description: "The myoid region contains the Golgi apparatus and endoplasmic reticulum responsible for synthesizing and processing the enormous quantities of protein needed by the outer segment. Rhodopsin is synthesized here, packaged into vesicles, and shipped up through the connecting cilium. A rod cell produces ~80 new discs per day.",
    function: "Synthesizes rhodopsin, membrane components, and other proteins for outer segment renewal."
  },
  "Nucleus": {
    title: "Nucleus: Compact and Streamlined",
    description: "Rod nuclei are remarkably compact with dense, tightly packed chromatin. In nocturnal mammals (mice, cats, rats), the chromatin is dramatically inverted—heterochromatin at the CENTER, euchromatin at the periphery—turning each nucleus into a tiny microlens that focuses light. Human rod nuclei use a conventional chromatin arrangement but are still among the most compact nuclei in the body, minimizing light scatter as photons pass through the outer nuclear layer.",
    function: "Houses genetic material in a compact nucleus that minimizes light scatter in the retina."
  },
  "SynapticTerminal": {
    title: "Synaptic Spherule: Continuous Transmitter",
    description: "The rod's synaptic terminal (spherule) contains a specialized synaptic ribbon—an electron-dense bar that tethers hundreds of vesicles for sustained glutamate release. Unlike conventional synapses that fire all-or-nothing, the ribbon synapse supports continuous, graded transmission that encodes light intensity with exquisite precision.",
    function: "Transmits graded signals to bipolar cells via continuous, modulated glutamate release."
  },
  "SynapticRibbon": {
    title: "Synaptic Ribbon: Vesicle Conveyor",
    description: "The ribbon is an elongated, plate-like protein scaffold (mainly RIBEYE protein) that tethers synaptic vesicles like ornaments on a Christmas tree. Vesicles slide down the ribbon toward the active zone, ensuring a continuous supply for sustained release. Ribbon synapses are found in cells that encode analog signals—photoreceptors, retinal bipolar cells, and inner ear hair cells.",
    function: "Organizes and delivers synaptic vesicles for sustained, graded neurotransmitter release."
  }
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.BACKGROUND);
  scene.fog = new THREE.FogExp2(COLORS.BACKGROUND, 0.003);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(12, 14, 30);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 70;
  controls.target.set(0, 14, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  setupLighting();
  createRodCell();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING - Purple-tinted, moody
// ============================================

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x443366, 1.2);
  scene.add(ambient);

  // Cool directional key light
  const keyLight = new THREE.DirectionalLight(0xc8d0ff, 2.0);
  keyLight.position.set(10, 35, 15);
  scene.add(keyLight);

  // Second directional from other side
  const fillLight = new THREE.DirectionalLight(0x9980cc, 0.8);
  fillLight.position.set(-10, 10, -10);
  scene.add(fillLight);

  // Purple fill near outer segment
  const purpleFill = new THREE.PointLight(0x9b4dca, 1.5, 60);
  purpleFill.position.set(-4, 26, 5);
  scene.add(purpleFill);

  // Second purple fill for lower outer segment
  const purpleFill2 = new THREE.PointLight(0x7b2d8e, 1.0, 40);
  purpleFill2.position.set(4, 18, 4);
  scene.add(purpleFill2);

  // Warm accent from below (ellipsoid glow)
  const warmAccent = new THREE.PointLight(0xd97706, 1.0, 30);
  warmAccent.position.set(2, 5, 3);
  scene.add(warmAccent);

  // Teal accent at synaptic terminal
  const tealAccent = new THREE.PointLight(0x14b8a6, 0.8, 25);
  tealAccent.position.set(-2, -10, 3);
  scene.add(tealAccent);

  // Hemisphere light
  const hemiLight = new THREE.HemisphereLight(0x6644aa, 0x112233, 0.8);
  scene.add(hemiLight);
}

// ============================================
// MAIN ROD CELL
// ============================================

function createRodCell() {
  cellGroup = new THREE.Group();

  // Build from top to bottom
  // Y layout: synaptic terminal at bottom, outer segment at top
  // Outer Segment:    Y = 14 to 39  (height 25)
  // Connecting Cilium: Y = 12 to 14  (height 2)
  // Ellipsoid:        Y = 5 to 12   (height 7)
  // Myoid:            Y = -1 to 5   (height 6)
  // Nucleus:          Y = -7 to -1  (height 6)
  // Synaptic Terminal: Y = -10 to -7 (height 3)

  createOuterSegment();
  createDiscStack();
  createConnectingCilium();
  createEllipsoid();
  createMyoid();
  createNuclearRegion();
  createSynapticTerminal();
  createMembraneTransitions();
  createNeighboringCells();
  createGlutamateSystem();

  scene.add(cellGroup);
}

// ============================================
// OUTER SEGMENT - Transparent enclosing membrane
// ============================================

function createOuterSegment() {
  const meshes = [];

  // Enclosing membrane cylinder
  const memGeo = new THREE.CylinderGeometry(OUTER_SEGMENT_RADIUS, OUTER_SEGMENT_RADIUS, OUTER_SEGMENT_HEIGHT, 24, 1, true);
  const memMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.OUTER_MEMBRANE,
    emissive: 0x2a0d3d,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.2,
    roughness: 0.2,
    clearcoat: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const membrane = new THREE.Mesh(memGeo, memMat);
  membrane.position.y = 14 + OUTER_SEGMENT_HEIGHT / 2;
  membrane.userData.organelleName = "OuterSegment";
  meshes.push(membrane);
  cellGroup.add(membrane);

  // Top cap
  const capGeo = new THREE.CircleGeometry(OUTER_SEGMENT_RADIUS, 24);
  const capMat = memMat.clone();
  capMat.opacity = 0.3;
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 14 + OUTER_SEGMENT_HEIGHT;
  cellGroup.add(cap);

  // Bottom cap
  const bottomCap = new THREE.Mesh(capGeo.clone(), capMat.clone());
  bottomCap.rotation.x = Math.PI / 2;
  bottomCap.position.y = 14;
  cellGroup.add(bottomCap);

  organelleGroups['OuterSegment'] = { meshes, material: memMat };
}

// ============================================
// DISC STACK - InstancedMesh with per-disc color
// ============================================

function createDiscStack() {
  const meshes = [];

  const discGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.06, 20);
  const discMat = new THREE.MeshStandardMaterial({
    color: COLORS.DISC,
    emissive: COLORS.DISC,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  discInstancedMesh = new THREE.InstancedMesh(discGeo, discMat, DISC_COUNT);

  // Per-instance color buffer
  discColors = new Float32Array(DISC_COUNT * 3);
  const baseColor = new THREE.Color(COLORS.DISC);

  const matrix = new THREE.Matrix4();
  const spacing = (OUTER_SEGMENT_HEIGHT - 1) / DISC_COUNT;

  for (let i = 0; i < DISC_COUNT; i++) {
    const y = 14.5 + i * spacing;
    // Slight random tilt and offset for organic feel
    const tiltX = (Math.random() - 0.5) * 0.03;
    const tiltZ = (Math.random() - 0.5) * 0.03;
    const offX = (Math.random() - 0.5) * 0.05;
    const offZ = (Math.random() - 0.5) * 0.05;

    matrix.makeRotationFromEuler(new THREE.Euler(tiltX, 0, tiltZ));
    matrix.setPosition(offX, y, offZ);
    discInstancedMesh.setMatrixAt(i, matrix);

    // Base color
    discColors[i * 3] = baseColor.r;
    discColors[i * 3 + 1] = baseColor.g;
    discColors[i * 3 + 2] = baseColor.b;
  }

  discInstancedMesh.instanceColor = new THREE.InstancedBufferAttribute(discColors, 3);
  discInstancedMesh.userData.organelleName = "DiscStack";
  meshes.push(discInstancedMesh);
  cellGroup.add(discInstancedMesh);

  organelleGroups['DiscStack'] = { meshes, material: discMat };
}

// ============================================
// CONNECTING CILIUM - 9+0 microtubule doublets
// ============================================

function createConnectingCilium() {
  const meshes = [];
  const ciliumGroup = new THREE.Group();

  const tubuleMat = new THREE.MeshStandardMaterial({
    color: COLORS.CILIUM,
    emissive: COLORS.CILIUM,
    emissiveIntensity: 0.2,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
  });

  // 9 microtubule doublets in a ring
  const ringRadius = 0.12;
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius;

    // A-tubule
    const tubeA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 2, 6),
      tubuleMat
    );
    tubeA.position.set(x, 13, z);
    tubeA.userData.organelleName = "ConnectingCilium";
    meshes.push(tubeA);
    ciliumGroup.add(tubeA);

    // B-tubule (slightly offset)
    const bAngle = angle + 0.15;
    const tubeB = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 2, 6),
      tubuleMat
    );
    tubeB.position.set(
      Math.cos(bAngle) * (ringRadius + 0.025),
      13,
      Math.sin(bAngle) * (ringRadius + 0.025)
    );
    ciliumGroup.add(tubeB);
  }

  // Thin outer sheath
  const sheathGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 16, 1, true);
  const sheathMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.CILIUM,
    emissive: COLORS.CILIUM,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const sheath = new THREE.Mesh(sheathGeo, sheathMat);
  sheath.position.y = 13;
  ciliumGroup.add(sheath);

  cellGroup.add(ciliumGroup);
  organelleGroups['ConnectingCilium'] = { meshes, material: tubuleMat };
}

// ============================================
// ELLIPSOID - Dense mitochondria field
// ============================================

function createEllipsoid() {
  const meshes = [];
  const ellipsoidGroup = new THREE.Group();

  // Ellipsoid membrane
  const memGeo = new THREE.CylinderGeometry(1.5, 1.3, 7, 20, 1, true);
  const memMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.ELLIPSOID_MEMBRANE,
    emissive: 0x553300,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const membrane = new THREE.Mesh(memGeo, memMat);
  membrane.position.y = 8.5;
  cellGroup.add(membrane);

  // Dense mitochondria
  const mitoMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.MITOCHONDRIA,
    emissive: COLORS.MITOCHONDRIA,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.85,
    roughness: 0.4,
  });

  const mitoCount = 80;
  for (let i = 0; i < mitoCount; i++) {
    const length = 0.3 + Math.random() * 0.4;
    const radius = 0.08 + Math.random() * 0.05;

    const mito = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 4, 8),
      mitoMat
    );

    // Position within ellipsoid bounds
    let pos;
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.2;
      const y = 5.5 + Math.random() * 6;
      pos = new THREE.Vector3(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );
    } while (false);

    mito.position.copy(pos);
    mito.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    mito.userData.organelleName = "Ellipsoid";
    meshes.push(mito);
    ellipsoidGroup.add(mito);
  }

  cellGroup.add(ellipsoidGroup);
  organelleGroups['Ellipsoid'] = { meshes, material: mitoMat };
}

// ============================================
// MYOID - Golgi + rough ER
// ============================================

function createMyoid() {
  const meshes = [];
  const myoidGroup = new THREE.Group();

  // Myoid membrane
  const memGeo = new THREE.CylinderGeometry(1.3, 1.1, 6, 20, 1, true);
  const memMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.MYOID_MEMBRANE,
    emissive: 0x033d4a,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const membrane = new THREE.Mesh(memGeo, memMat);
  membrane.position.y = 2;
  cellGroup.add(membrane);

  // Simple Golgi stack
  const golgiGroup = new THREE.Group();
  const golgiMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.GOLGI,
    emissive: 0x553300,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.75,
    roughness: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  for (let i = 0; i < 5; i++) {
    const width = 0.8 - i * 0.05;
    const cisterna = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.03, 0.4),
      golgiMat
    );
    cisterna.position.y = 2.5 + i * 0.1;
    cisterna.position.x = 0.5;
    // Slight curve via rotation
    cisterna.rotation.z = -0.1 + i * 0.04;
    cisterna.userData.organelleName = "Myoid";
    meshes.push(cisterna);
    golgiGroup.add(cisterna);
  }

  // Golgi vesicles
  const vesicleMat = new THREE.MeshStandardMaterial({
    color: COLORS.GOLGI,
    emissive: COLORS.GOLGI,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.7,
  });
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 6),
      vesicleMat
    );
    v.position.set(
      0.5 + (Math.random() - 0.5) * 0.4,
      2.2 + Math.random() * 0.8,
      (Math.random() - 0.5) * 0.5
    );
    golgiGroup.add(v);
  }
  myoidGroup.add(golgiGroup);

  // Simple ER tubes
  const erMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.ER,
    transparent: true,
    opacity: 0.4,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.3 + Math.random() * 0.6;
    const y1 = 0 + Math.random() * 4;
    const y2 = y1 + 0.5 + Math.random() * 1.5;

    const start = new THREE.Vector3(Math.cos(angle) * r, y1, Math.sin(angle) * r);
    const end = new THREE.Vector3(
      Math.cos(angle + 0.5) * (r + 0.2),
      y2,
      Math.sin(angle + 0.5) * (r + 0.2)
    );
    const mid = start.clone().lerp(end, 0.5);
    mid.x += (Math.random() - 0.5) * 0.3;
    mid.z += (Math.random() - 0.5) * 0.3;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.03, 6, false);
    const tube = new THREE.Mesh(tubeGeo, erMat);
    tube.userData.organelleName = "Myoid";
    meshes.push(tube);
    myoidGroup.add(tube);
  }

  // Ribosomes dotting the ER
  const riboMat = new THREE.MeshStandardMaterial({
    color: 0x2299aa,
    roughness: 0.5,
    emissive: 0x115566,
    emissiveIntensity: 0.2
  });
  const riboGeo = new THREE.SphereGeometry(0.02, 4, 4);
  const riboCount = 50;
  const ribosomes = new THREE.InstancedMesh(riboGeo, riboMat, riboCount);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < riboCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.8;
    matrix.setPosition(
      Math.cos(angle) * r,
      0.5 + Math.random() * 3.5,
      Math.sin(angle) * r
    );
    ribosomes.setMatrixAt(i, matrix);
  }
  myoidGroup.add(ribosomes);

  cellGroup.add(myoidGroup);
  organelleGroups['Myoid'] = { meshes, material: golgiMat };
}

// ============================================
// NUCLEAR REGION - Elongated nucleus with inverted chromatin
// ============================================

function createNuclearRegion() {
  const meshes = [];
  const nucleusGroup = new THREE.Group();

  // Nuclear envelope - elongated sphere
  const envelopeGeo = new THREE.SphereGeometry(1.0, 24, 16);
  envelopeGeo.scale(1, 2.5, 1);
  const envelopeMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.NUCLEUS,
    transparent: true,
    opacity: 0.5,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const envelope = new THREE.Mesh(envelopeGeo, envelopeMat);
  envelope.position.y = -4;
  envelope.userData.organelleName = "Nucleus";
  meshes.push(envelope);
  nucleusGroup.add(envelope);

  // Inverted chromatin: heterochromatin at CENTER
  const heteroGeo = new THREE.SphereGeometry(0.6, 16, 12);
  heteroGeo.scale(1, 2, 1);
  const heteroMat = new THREE.MeshStandardMaterial({
    color: 0x0f0d2e,
    roughness: 0.7,
    transparent: true,
    opacity: 0.9,
  });
  const heterochromatin = new THREE.Mesh(heteroGeo, heteroMat);
  heterochromatin.position.y = -4;
  nucleusGroup.add(heterochromatin);

  // Euchromatin at periphery (ring-like)
  const euchromatinMat = new THREE.MeshStandardMaterial({
    color: COLORS.NUCLEUS_INNER,
    transparent: true,
    opacity: 0.6,
    roughness: 0.5,
  });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const euChunk = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 4),
      euchromatinMat
    );
    euChunk.position.set(
      Math.cos(angle) * 0.75,
      -4 + (Math.random() - 0.5) * 3,
      Math.sin(angle) * 0.75
    );
    nucleusGroup.add(euChunk);
  }

  // Nucleolus
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x080620, roughness: 0.6 })
  );
  nucleolus.position.set(0.2, -3.5, 0.15);
  nucleusGroup.add(nucleolus);

  // Nuclear membrane
  const nucMemGeo = new THREE.CylinderGeometry(1.1, 1.1, 6, 20, 1, true);
  const nucMemMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.NUCLEUS,
    emissive: 0x1a1550,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const nucMem = new THREE.Mesh(nucMemGeo, nucMemMat);
  nucMem.position.y = -4;
  cellGroup.add(nucMem);

  cellGroup.add(nucleusGroup);
  organelleGroups['Nucleus'] = { meshes, material: envelopeMat };
}

// ============================================
// SYNAPTIC TERMINAL - Spherule with ribbon + vesicles
// ============================================

function createSynapticTerminal() {
  const terminalMeshes = [];
  const ribbonMeshes = [];
  const terminalGroup = new THREE.Group();

  // Spherule body
  const spheruleGeo = new THREE.SphereGeometry(1.2, 20, 16);
  spheruleGeo.scale(1, 0.8, 1);
  const spheruleMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.SYNAPTIC_TERMINAL,
    emissive: 0x0a5c52,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.25,
    roughness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const spherule = new THREE.Mesh(spheruleGeo, spheruleMat);
  spherule.position.y = -8.5;
  spherule.userData.organelleName = "SynapticTerminal";
  terminalMeshes.push(spherule);
  terminalGroup.add(spherule);

  // Synaptic invagination (dip at bottom)
  const invagGeo = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const invagMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const invagination = new THREE.Mesh(invagGeo, invagMat);
  invagination.position.y = -9.2;
  invagination.rotation.x = Math.PI;
  terminalGroup.add(invagination);

  // Synaptic Ribbon - elongated plate
  const ribbonGeo = new THREE.BoxGeometry(0.05, 0.6, 0.3);
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: COLORS.SYNAPTIC_RIBBON,
    emissive: COLORS.SYNAPTIC_RIBBON,
    emissiveIntensity: 0.3,
    roughness: 0.3,
  });
  const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbon.position.set(0, -8.5, 0);
  ribbon.userData.organelleName = "SynapticRibbon";
  ribbonMeshes.push(ribbon);
  terminalGroup.add(ribbon);

  // Tethered vesicles around ribbon
  const vesicleMat = new THREE.MeshStandardMaterial({
    color: COLORS.VESICLE,
    emissive: COLORS.VESICLE,
    emissiveIntensity: 0.25,
    roughness: 0.3,
  });

  const vesicleGeo = new THREE.SphereGeometry(0.05, 8, 6);
  const tetherMat = new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.4 });

  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.1 + Math.random() * 0.15;
    const yOff = (Math.random() - 0.5) * 0.5;

    const vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
    const vx = Math.cos(angle) * dist;
    const vy = -8.5 + yOff;
    const vz = Math.sin(angle) * dist;
    vesicle.position.set(vx, vy, vz);
    terminalGroup.add(vesicle);
    vesicles.push(vesicle);

    // Tether line
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -8.5 + yOff * 0.3, 0),
      new THREE.Vector3(vx, vy, vz)
    ]);
    const tether = new THREE.Line(tetherGeo, tetherMat);
    terminalGroup.add(tether);
  }

  // A few vesicles near the invagination (ready to release)
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(vesicleGeo, vesicleMat.clone());
    v.position.set(
      (Math.random() - 0.5) * 0.3,
      -9.0 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.3
    );
    terminalGroup.add(v);
  }

  cellGroup.add(terminalGroup);
  organelleGroups['SynapticTerminal'] = { meshes: terminalMeshes, material: spheruleMat };
  organelleGroups['SynapticRibbon'] = { meshes: ribbonMeshes, material: ribbonMat };
}

// ============================================
// MEMBRANE TRANSITIONS - Smooth tapered connections
// ============================================

function createMembraneTransitions() {
  const transitionMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a2870,
    emissive: 0x2a1040,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.2,
    roughness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Outer segment to cilium (tapered)
  const t1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, OUTER_SEGMENT_RADIUS, 0.5, 16),
    transitionMat
  );
  t1.position.y = 14.25;
  cellGroup.add(t1);

  // Cilium to ellipsoid (expanding)
  const t2 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 0.15, 0.5, 16),
    transitionMat
  );
  t2.position.y = 11.75;
  cellGroup.add(t2);

  // Ellipsoid to myoid
  const t3 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.5, 0.5, 16),
    transitionMat
  );
  t3.position.y = 4.75;
  cellGroup.add(t3);

  // Myoid to nucleus
  const t4 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, 0.5, 16),
    transitionMat
  );
  t4.position.y = -1.25;
  cellGroup.add(t4);

  // Nucleus to synaptic terminal
  const t5 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.1, 0.5, 16),
    transitionMat
  );
  t5.position.y = -7.25;
  cellGroup.add(t5);
}

// ============================================
// NEIGHBORING CELLS
// ============================================

function createNeighboringCells() {
  // RPE cell (top, above outer segment)
  const rpeGroup = new THREE.Group();
  const rpeMat = new THREE.MeshStandardMaterial({
    color: 0x3a2510,
    emissive: 0x1a0f05,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.6,
    roughness: 0.8,
  });
  const rpeSlab = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.4, 5),
    rpeMat
  );
  rpeSlab.position.y = 40;
  rpeGroup.add(rpeSlab);

  // Melanin granules inside RPE
  const melaninMat = new THREE.MeshStandardMaterial({
    color: 0x0a0604,
    roughness: 0.9,
  });
  for (let i = 0; i < 10; i++) {
    const granule = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 4),
      melaninMat
    );
    granule.position.set(
      (Math.random() - 0.5) * 4,
      40 + (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 4
    );
    rpeGroup.add(granule);
  }
  cellGroup.add(rpeGroup);

  // Adjacent rods (ghostly outlines)
  const ghostMat = new THREE.MeshStandardMaterial({
    color: 0x6644aa,
    transparent: true,
    opacity: 0.1,
    roughness: 0.5,
    depthWrite: false,
  });
  for (const xOffset of [-3, 3]) {
    const ghostRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 49, 12, 1, true),
      ghostMat.clone()
    );
    ghostRod.material.opacity = 0.15 + Math.random() * 0.05;
    ghostRod.position.set(xOffset, 14.5, 0); // center of span
    cellGroup.add(ghostRod);
  }

  // Bipolar cell (below synapse)
  const bipolarGroup = new THREE.Group();
  const bipolarMat = new THREE.MeshStandardMaterial({
    color: 0x8899bb,
    emissive: 0x445566,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
    roughness: 0.4,
  });

  // Soma
  bipolarCellMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 8),
    bipolarMat
  );
  bipolarCellMesh.position.y = -12;
  bipolarGroup.add(bipolarCellMesh);

  // Dendrite reaching up into invagination
  bipolarDendrite = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6),
    bipolarMat.clone()
  );
  bipolarDendrite.material.opacity = 0.6;
  bipolarDendrite.position.y = -10.6; // spans from -12 to -9.2
  bipolarGroup.add(bipolarDendrite);

  cellGroup.add(bipolarGroup);

  // Light to illuminate the synapse/glutamate region
  const synapseLight = new THREE.PointLight(0xfbbf24, 0.8, 15);
  synapseLight.position.set(1, -10, 2);
  cellGroup.add(synapseLight);
}

// ============================================
// GLUTAMATE PARTICLE SYSTEM
// ============================================

function createGlutamateSystem() {
  const geo = new THREE.SphereGeometry(0.08, 8, 6);
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.VESICLE,
    emissive: COLORS.VESICLE,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 1.0,
  });

  glutamateInstanced = new THREE.InstancedMesh(geo, mat, GLUTAMATE_COUNT);
  glutamateInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const matrix = new THREE.Matrix4();
  for (let i = 0; i < GLUTAMATE_COUNT; i++) {
    const y = -9.0 - Math.random() * 3.0; // spread between synapse and bipolar
    const x = (Math.random() - 0.5) * 0.4;
    const z = (Math.random() - 0.5) * 0.4;
    matrix.setPosition(x, y, z);
    glutamateInstanced.setMatrixAt(i, matrix);

    glutamatePositions.push({
      x, y, z,
      vy: -(0.8 + Math.random() * 0.7), // downward velocity
      opacity: 1.0,
      active: true,
    });
  }

  cellGroup.add(glutamateInstanced);
}

function updateGlutamate(time, delta) {
  if (!glutamateInstanced) return;

  const matrix = new THREE.Matrix4();
  const stateElapsed = time - stateStartTime;

  for (let i = 0; i < GLUTAMATE_COUNT; i++) {
    const p = glutamatePositions[i];

    if (cellState === 'dark') {
      // Full stream: particles fall from synapse to bipolar
      p.active = true;
      p.opacity = 0.9;
      p.y += p.vy * delta;
      p.x += (Math.random() - 0.5) * 0.02; // slight lateral drift

      // Recycle when past bipolar cell
      if (p.y < -12.5) {
        p.y = -9.0;
        p.x = (Math.random() - 0.5) * 0.4;
        p.z = (Math.random() - 0.5) * 0.4;
      }
    } else if (cellState === 'inhibiting') {
      // Decelerate and fade
      const fadeProgress = Math.min(stateElapsed / 0.5, 1.0);
      const speedScale = 1.0 - fadeProgress;
      p.opacity = Math.max(0, 0.9 * (1.0 - fadeProgress));
      p.y += p.vy * delta * speedScale;

      if (p.y < -12.5) {
        p.y = -9.0;
        p.active = false;
      }
    } else if (cellState === 'recovering') {
      // Gradually resume
      const resumeProgress = Math.min(stateElapsed / 1.5, 1.0);
      p.active = true;
      p.opacity = 0.9 * resumeProgress;
      p.y += p.vy * delta * resumeProgress;

      if (p.y < -12.5) {
        p.y = -9.0;
        p.x = (Math.random() - 0.5) * 0.4;
        p.z = (Math.random() - 0.5) * 0.4;
      }
    }

    // Update instance matrix
    const scale = p.active ? Math.max(p.opacity, 0.01) : 0.001;
    matrix.makeScale(scale, scale, scale);
    matrix.setPosition(p.x, p.y, p.z);
    glutamateInstanced.setMatrixAt(i, matrix);
  }

  glutamateInstanced.instanceMatrix.needsUpdate = true;

  // Bipolar cell response
  if (bipolarCellMesh) {
    if (cellState === 'inhibiting' && stateElapsed > 0.4 && stateElapsed < 1.2) {
      // Brief emissive flash when glutamate stops
      const flashT = (stateElapsed - 0.4) / 0.8;
      const flash = Math.sin(flashT * Math.PI);
      bipolarCellMesh.material.emissiveIntensity = 0.15 + flash * 0.8;
      bipolarCellMesh.material.emissive.setHex(0x88aaff);
    } else {
      bipolarCellMesh.material.emissiveIntensity = 0.15;
      bipolarCellMesh.material.emissive.setHex(0x334455);
    }
  }
}

// ============================================
// STATUS UI
// ============================================

function updateStatusUI() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!dot || !text) return;

  const time = clock.getElapsedTime();

  if (cellState === 'dark') {
    // Pulsing amber
    const pulse = 0.7 + Math.sin(time * 3) * 0.3;
    dot.style.backgroundColor = `rgba(251, 191, 36, ${pulse})`;
    dot.style.boxShadow = `0 0 6px rgba(251, 191, 36, ${pulse * 0.5})`;
    text.textContent = 'Dark: Channels open \u2014 Glutamate releasing';
  } else if (cellState === 'inhibiting') {
    dot.style.backgroundColor = 'rgb(96, 165, 250)';
    dot.style.boxShadow = '0 0 6px rgba(96, 165, 250, 0.5)';
    text.textContent = 'Light detected: Channels closing \u2014 Signal reduced';
  } else if (cellState === 'recovering') {
    const stateElapsed = time - stateStartTime;
    const fadeIn = Math.min(stateElapsed / 1.5, 1.0);
    dot.style.backgroundColor = `rgba(251, 191, 36, ${fadeIn})`;
    dot.style.boxShadow = `0 0 6px rgba(251, 191, 36, ${fadeIn * 0.5})`;
    text.textContent = 'Recovering: Dark current resuming...';
  }
}

// ============================================
// PHOTON ANIMATION
// ============================================

function firePhoton() {
  if (photonActive || cascadeActive) return;

  // Create photon mesh
  if (!photonMesh) {
    const photonGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const photonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 1.0,
    });
    photonMesh = new THREE.Mesh(photonGeo, photonMat);

    // Inner glow halo
    const haloGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      emissive: 0xc4b5fd,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.4,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    photonMesh.add(halo);

    // Outer glow
    const outerGlowGeo = new THREE.SphereGeometry(1.2, 12, 8);
    const outerGlowMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.15,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    photonMesh.add(outerGlow);

    // Moving point light that follows the photon
    const photonLight = new THREE.PointLight(0xc4b5fd, 3.0, 10);
    photonMesh.add(photonLight);

    cellGroup.add(photonMesh);
  }

  photonMesh.visible = true;
  photonActive = true;
  photonStartTime = clock.getElapsedTime();
  photonTargetDisc = Math.floor(Math.random() * (DISC_COUNT - 20)) + 10;

  // Start position above the outer segment
  photonMesh.position.set(
    (Math.random() - 0.5) * 0.5,
    14 + OUTER_SEGMENT_HEIGHT + 3,
    (Math.random() - 0.5) * 0.5
  );
}

function updatePhoton(time) {
  if (!photonActive || !photonMesh) return;

  const elapsed = time - photonStartTime;
  const duration = 1.5; // seconds to travel down

  if (elapsed < duration) {
    // Descend through outer segment
    const t = elapsed / duration;
    const startY = 14 + OUTER_SEGMENT_HEIGHT + 3;
    const spacing = (OUTER_SEGMENT_HEIGHT - 1) / DISC_COUNT;
    const targetY = 14.5 + photonTargetDisc * spacing;
    photonMesh.position.y = startY + (targetY - startY) * t;

    // Dramatic shimmer
    photonMesh.material.emissiveIntensity = 3.0 + Math.sin(elapsed * 20) * 1.0;
  } else {
    // Hit the disc — start cascade
    photonMesh.visible = false;
    photonActive = false;
    startCascade(photonTargetDisc);
  }
}

function startCascade(originDisc) {
  cascadeActive = true;
  cascadeStartTime = clock.getElapsedTime();
  cascadeOriginDisc = originDisc;

  // Transition to inhibiting state
  cellState = 'inhibiting';
  stateStartTime = clock.getElapsedTime();
}

function updateCascade(time) {
  if (!cascadeActive || !discInstancedMesh) return;

  const elapsed = time - cascadeStartTime;
  const cascadeDuration = 2.0;
  const spreadSpeed = 80; // discs per second

  const baseColor = new THREE.Color(COLORS.DISC);
  const darkColor = new THREE.Color(0x4a1a4a); // darkened disc (channels closed)

  if (elapsed > cascadeDuration) {
    // Don't snap back — tint discs darker (channels closed)
    for (let i = 0; i < DISC_COUNT; i++) {
      discColors[i * 3] = darkColor.r;
      discColors[i * 3 + 1] = darkColor.g;
      discColors[i * 3 + 2] = darkColor.b;
    }
    discInstancedMesh.instanceColor.needsUpdate = true;
    cascadeActive = false;

    // Begin recovery after 2s
    if (recoveryTimeout) clearTimeout(recoveryTimeout);
    recoveryTimeout = setTimeout(() => {
      cellState = 'recovering';
      stateStartTime = clock.getElapsedTime();

      // Full dark state restored after another 2s
      recoveryTimeout = setTimeout(() => {
        cellState = 'dark';
        stateStartTime = clock.getElapsedTime();
      }, 2000);
    }, 2000);

    return;
  }

  const flashColor = new THREE.Color(0xffffff);
  const waveColor = new THREE.Color(0x6b7280); // cool dark grey — "shutting down"

  const spreadRadius = elapsed * spreadSpeed;

  for (let i = 0; i < DISC_COUNT; i++) {
    const dist = Math.abs(i - cascadeOriginDisc);

    if (dist <= spreadRadius) {
      const waveProgress = (spreadRadius - dist) / spreadSpeed;
      const intensity = Math.max(0, 1 - waveProgress * 2);

      if (dist === 0 && elapsed < 0.3) {
        // Origin disc flashes white (genuine photon absorption)
        const flashIntensity = 1 - elapsed / 0.3;
        const c = baseColor.clone().lerp(flashColor, flashIntensity);
        discColors[i * 3] = c.r;
        discColors[i * 3 + 1] = c.g;
        discColors[i * 3 + 2] = c.b;
      } else if (intensity > 0) {
        const c = baseColor.clone().lerp(waveColor, intensity * 0.6);
        discColors[i * 3] = c.r;
        discColors[i * 3 + 1] = c.g;
        discColors[i * 3 + 2] = c.b;
      } else {
        // Behind the wave — darken slightly
        const c = baseColor.clone().lerp(darkColor, 0.3);
        discColors[i * 3] = c.r;
        discColors[i * 3 + 1] = c.g;
        discColors[i * 3 + 2] = c.b;
      }
    } else {
      discColors[i * 3] = baseColor.r;
      discColors[i * 3 + 1] = baseColor.g;
      discColors[i * 3 + 2] = baseColor.b;
    }
  }

  discInstancedMesh.instanceColor.needsUpdate = true;
}

// Gradually restore disc colors during recovery
function updateDiscRecovery(time) {
  if (!discInstancedMesh) return;
  if (cellState !== 'recovering' && cellState !== 'dark') return;
  if (cascadeActive) return;

  const baseColor = new THREE.Color(COLORS.DISC);

  if (cellState === 'recovering') {
    const darkColor = new THREE.Color(0x4a1a4a);
    const progress = Math.min((time - stateStartTime) / 2.0, 1.0);
    const c = darkColor.clone().lerp(baseColor, progress);
    for (let i = 0; i < DISC_COUNT; i++) {
      discColors[i * 3] = c.r;
      discColors[i * 3 + 1] = c.g;
      discColors[i * 3 + 2] = c.b;
    }
    discInstancedMesh.instanceColor.needsUpdate = true;
  } else if (cellState === 'dark') {
    // Ensure discs are base color
    const current = discColors[0];
    if (Math.abs(current - baseColor.r) > 0.01) {
      for (let i = 0; i < DISC_COUNT; i++) {
        discColors[i * 3] = baseColor.r;
        discColors[i * 3 + 1] = baseColor.g;
        discColors[i * 3 + 2] = baseColor.b;
      }
      discInstancedMesh.instanceColor.needsUpdate = true;
    }
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('click', onMouseClick);

  document.getElementById('close-popup')?.addEventListener('click', hidePopup);

  // Fire Photon button
  window.addEventListener('firePhoton', () => firePhoton());

  // Zoom buttons
  window.addEventListener('zoom', (e) => {
    const zoomFactor = e.detail === 'in' ? 0.8 : 1.2;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = camera.position.distanceTo(controls.target);
    const newDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, dist * zoomFactor));
    camera.position.copy(controls.target.clone().add(dir.multiplyScalar(newDist)));
  });
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

  const clickables = [];
  Object.values(organelleGroups).forEach(group => {
    if (group.meshes) clickables.push(...group.meshes);
  });

  const intersects = raycaster.intersectObjects(clickables, true);

  if (intersects.length > 0) {
    let obj = intersects[0].object;

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
// SCALE BAR
// ============================================

function updateScaleBar() {
  const dist = camera.position.distanceTo(controls.target);
  // The cell is ~50μm total, mapped to ~49 units (from -10 to 39)
  // 1 unit ≈ 1μm
  const fov = camera.fov * Math.PI / 180;
  const viewHeight = 2 * dist * Math.tan(fov / 2);
  const pixelsPerUnit = window.innerHeight / viewHeight;
  const barWidthPx = 60;
  const barMicrons = barWidthPx / pixelsPerUnit;

  // Round to nice numbers
  let niceValue;
  if (barMicrons < 2) niceValue = 1;
  else if (barMicrons < 5) niceValue = 2;
  else if (barMicrons < 10) niceValue = 5;
  else if (barMicrons < 25) niceValue = 10;
  else if (barMicrons < 50) niceValue = 25;
  else niceValue = 50;

  const barEl = document.getElementById('scale-bar');
  const valEl = document.getElementById('scale-value');
  if (barEl && valEl) {
    barEl.style.width = (niceValue * pixelsPerUnit) + 'px';
    valEl.textContent = niceValue + ' μm';
  }
}

// ============================================
// ANIMATION
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const delta = Math.min(time - lastFrameTime, 0.05); // cap delta to avoid jumps
  lastFrameTime = time;

  // Photon animation
  updatePhoton(time);
  updateCascade(time);
  updateDiscRecovery(time);

  // Glutamate and status
  updateGlutamate(time, delta);
  updateStatusUI();

  // Auto-fire photon every ~12 seconds (gives 6-7s of visible dark state)
  if (time - lastAutoPhotonTime > 12 && !photonActive && !cascadeActive) {
    // Only auto-fire if intro modal is hidden and in dark state
    const introModal = document.getElementById('intro-modal');
    if (introModal && introModal.classList.contains('hidden') && cellState === 'dark') {
      firePhoton();
      lastAutoPhotonTime = time;
    }
  }

  // Gentle cell sway
  if (cellGroup) {
    cellGroup.rotation.y = Math.sin(time * 0.15) * 0.02;
    cellGroup.rotation.x = Math.sin(time * 0.1) * 0.01;
  }

  // Mitochondria pulse in ellipsoid
  const ellipsoidGroup = organelleGroups['Ellipsoid'];
  if (ellipsoidGroup && ellipsoidGroup.material) {
    ellipsoidGroup.material.emissiveIntensity = 0.12 + Math.sin(time * 2) * 0.05;
  }

  // Vesicle subtle bobbing
  vesicles.forEach((v, i) => {
    v.position.y += Math.sin(time * 1.5 + i * 0.7) * 0.0003;
  });

  // Scale bar
  updateScaleBar();

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// START
// ============================================

init();
