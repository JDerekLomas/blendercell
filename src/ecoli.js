import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// E. COLI - Gram-Negative Bacterium
// ============================================

let scene, camera, renderer, controls;
let cellGroup;
let clock = new THREE.Clock();

// Interaction state
let activeFeature = null;
const organelleGroups = {};
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Animation state
let flagellaGroups = [];
let ribosomeInstanced = null;
let nucleoidMesh = null;
let piliMeshes = [];

// ============================================
// COLORS - Green/teal bacterial palette
// ============================================
const COLORS = {
  OUTER_MEMBRANE: 0x5BA88F,
  INNER_MEMBRANE: 0x7EC8A0,
  PEPTIDOGLYCAN: 0xC4D69A,
  NUCLEOID: 0x2B5EA7,
  RIBOSOME: 0xD4A853,
  FLAGELLUM: 0xE8D5B0,
  PILUS: 0xBFA87A,
  PLASMID: 0x6B8DD6,
  INCLUSION: 0xE8E8E8,
  CYTOPLASM: 0x8FD4B0,
};

// ============================================
// INFO CONTENT
// ============================================
const INFO_CONTENT = {
  "OuterMembrane": {
    title: "Outer Membrane: LPS Shield",
    description: "The outer membrane is unique to Gram-negative bacteria. It contains lipopolysaccharide (LPS)—a potent endotoxin that triggers immune responses. Porins embedded in this membrane act as selective gates, allowing nutrients in while keeping antibiotics out. This double-membrane architecture is why Gram-negative bacteria are notoriously resistant to many drugs.",
    function: "Selective permeability barrier with LPS endotoxin; provides intrinsic antibiotic resistance."
  },
  "InnerMembrane": {
    title: "Plasma Membrane: The Powerhouse",
    description: "Unlike eukaryotes that use mitochondria, E. coli generates ATP right here in its plasma membrane. The electron transport chain and ATP synthase are embedded directly in this lipid bilayer. It also handles active transport, sensing the environment through chemoreceptors, and anchoring the flagellar motor.",
    function: "Energy production (oxidative phosphorylation), nutrient transport, and signal sensing."
  },
  "Peptidoglycan": {
    title: "Peptidoglycan: Structural Mesh",
    description: "A thin but critical layer of cross-linked sugar chains (NAG-NAM) sandwiched between the two membranes. In Gram-negatives like E. coli, this layer is only 1-3 molecules thick—much thinner than in Gram-positive bacteria. Penicillin works by blocking peptidoglycan synthesis, causing the cell to burst from osmotic pressure.",
    function: "Maintains cell shape and resists osmotic lysis; target of beta-lactam antibiotics."
  },
  "Nucleoid": {
    title: "Nucleoid: Circular Chromosome",
    description: "E. coli's single circular chromosome (~4.6 million base pairs) is compacted into this irregular region through supercoiling and binding to nucleoid-associated proteins (NAPs). There's no membrane around it—it sits right in the cytoplasm. The chromosome encodes about 4,300 genes and can be replicated in just 40 minutes during rapid growth.",
    function: "Stores genetic information; enables rapid replication (20-minute doubling time)."
  },
  "Ribosomes": {
    title: "Ribosomes: Protein Factories",
    description: "E. coli contains about 20,000 ribosomes during active growth—so many they make up 25% of the cell's dry weight. These 70S ribosomes (smaller than eukaryotic 80S) are the target of many antibiotics including tetracycline, chloramphenicol, and aminoglycosides. During fast growth, ribosomes are mostly concentrated near the nucleoid.",
    function: "Translate mRNA into proteins; 70S size distinguishes them as antibiotic targets."
  },
  "Flagella": {
    title: "Flagella: Molecular Motors",
    description: "Each flagellum is a helical filament made of flagellin protein, driven by a rotary motor embedded in the cell envelope. The motor spins at up to 300 Hz (18,000 RPM), powered by proton flow across the membrane. When all flagella spin counterclockwise, they bundle together for a smooth 'run.' Clockwise rotation causes 'tumbling'—random reorientation.",
    function: "Propulsion at ~30 μm/s (15 body lengths/sec); enables chemotaxis toward nutrients."
  },
  "Pili": {
    title: "Pili: Attachment & DNA Transfer",
    description: "Type 1 pili (fimbriae) are short, hair-like appendages that help E. coli attach to surfaces—critical for colonizing the gut or causing urinary tract infections. The F-pilus (sex pilus) is longer and used for conjugation: transferring plasmid DNA to another bacterium. This horizontal gene transfer can spread antibiotic resistance.",
    function: "Surface adhesion, biofilm formation, and horizontal gene transfer via conjugation."
  },
  "Plasmids": {
    title: "Plasmids: Mobile Genetic Elements",
    description: "These small circular DNA molecules replicate independently of the chromosome. E. coli can carry multiple plasmids simultaneously, each encoding 'bonus' genes—often antibiotic resistance, virulence factors, or metabolic capabilities. Plasmids can be shared between bacteria through conjugation, making them key drivers of antibiotic resistance spread.",
    function: "Carry accessory genes (antibiotic resistance, virulence); transferable between cells."
  },
  "InclusionBodies": {
    title: "Storage Granules",
    description: "When nutrients are abundant, E. coli stores excess carbon as glycogen granules and polyhydroxybutyrate (PHB). These electron-dense bodies serve as energy reserves for lean times. Some strains also accumulate polyphosphate granules (volutin). Under stress conditions, misfolded proteins can also aggregate into inclusion bodies.",
    function: "Energy storage (glycogen, PHB); nutrient reserves for starvation conditions."
  }
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1a12);
  scene.fog = new THREE.FogExp2(0x0a1a12, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(8, 5, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.minDistance = 4;
  controls.maxDistance = 35;

  setupLighting();
  createCell();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================
function setupLighting() {
  // Ambient - cool green tint
  const ambient = new THREE.AmbientLight(0x4a7a5a, 0.5);
  scene.add(ambient);

  // Key light - warm white from top-right
  const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
  keyLight.position.set(8, 10, 5);
  scene.add(keyLight);

  // Fill light - cool from left
  const fillLight = new THREE.DirectionalLight(0x8ec8f0, 0.4);
  fillLight.position.set(-6, 2, -3);
  scene.add(fillLight);

  // Rim light - green accent from behind
  const rimLight = new THREE.DirectionalLight(0x5bdd8f, 0.6);
  rimLight.position.set(-2, -3, -8);
  scene.add(rimLight);

  // Hemisphere for subtle gradient
  const hemi = new THREE.HemisphereLight(0x6aaa8a, 0x1a3328, 0.3);
  scene.add(hemi);
}

// ============================================
// CELL CREATION
// ============================================
function createCell() {
  cellGroup = new THREE.Group();

  createOuterMembrane();
  createPeptidoglycan();
  createInnerMembrane();
  createNucleoid();
  createRibosomes();
  createPlasmids();
  createInclusionBodies();
  createFlagella();
  createPili();

  scene.add(cellGroup);
}

// --- Outer Membrane ---
function createOuterMembrane() {
  // Rod shape: capsule = cylinder + hemispheres
  const length = 8; // ~2μm represented as 8 units
  const radius = 2.8;

  const geometry = new THREE.CapsuleGeometry(radius, length, 32, 48);
  // Rotate to lay on side (along X axis)
  geometry.rotateZ(Math.PI / 2);

  const material = new THREE.MeshPhysicalMaterial({
    color: COLORS.OUTER_MEMBRANE,
    transparent: true,
    opacity: 0.12,
    roughness: 0.3,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.organelleName = "OuterMembrane";
  organelleGroups["OuterMembrane"] = mesh;
  cellGroup.add(mesh);

  // LPS bumps on outer surface
  const bumpCount = 120;
  const bumpGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const bumpMat = new THREE.MeshStandardMaterial({
    color: 0x7dd4a8,
    emissive: 0x2a6b4a,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.5,
  });

  for (let i = 0; i < bumpCount; i++) {
    const bump = new THREE.Mesh(bumpGeo, bumpMat);
    const pos = randomPointOnCapsule(radius + 0.05, length);
    bump.position.copy(pos);
    bump.userData.organelleName = "OuterMembrane";
    cellGroup.add(bump);
  }
}

// --- Peptidoglycan Layer ---
function createPeptidoglycan() {
  const length = 8;
  const radius = 2.55;

  const geometry = new THREE.CapsuleGeometry(radius, length, 24, 36);
  geometry.rotateZ(Math.PI / 2);

  const material = new THREE.MeshPhysicalMaterial({
    color: COLORS.PEPTIDOGLYCAN,
    transparent: true,
    opacity: 0.08,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    wireframe: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.organelleName = "Peptidoglycan";
  organelleGroups["Peptidoglycan"] = mesh;
  cellGroup.add(mesh);
}

// --- Inner Membrane ---
function createInnerMembrane() {
  const length = 7.6;
  const radius = 2.3;

  const geometry = new THREE.CapsuleGeometry(radius, length, 28, 40);
  geometry.rotateZ(Math.PI / 2);

  const material = new THREE.MeshPhysicalMaterial({
    color: COLORS.INNER_MEMBRANE,
    transparent: true,
    opacity: 0.15,
    roughness: 0.25,
    metalness: 0.1,
    clearcoat: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.organelleName = "InnerMembrane";
  organelleGroups["InnerMembrane"] = mesh;
  cellGroup.add(mesh);
}

// --- Nucleoid ---
function createNucleoid() {
  const group = new THREE.Group();

  // No solid blob — nucleoid is tangled DNA fibers, not a membrane-bound structure
  const fiberMat = new THREE.MeshStandardMaterial({
    color: 0x4080CC,
    emissive: 0x2050AA,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.8,
  });

  // Dense tangled loops filling an irregular region
  const loopCount = 25;
  for (let i = 0; i < loopCount; i++) {
    const points = [];
    const segments = 40;
    // Each loop starts from a random point in the nucleoid region
    const cx = -0.3 + (Math.random() - 0.5) * 1.5;
    const cy = (Math.random() - 0.5) * 0.8;
    const cz = (Math.random() - 0.5) * 0.8;
    const loopRadius = 0.3 + Math.random() * 0.9;
    const tiltX = Math.random() * Math.PI;
    const tiltY = Math.random() * Math.PI;
    const tiltZ = Math.random() * Math.PI;

    for (let j = 0; j <= segments; j++) {
      const t = (j / segments) * Math.PI * 2;
      // Base circle
      let x = Math.cos(t) * loopRadius;
      let y = Math.sin(t) * loopRadius * (0.4 + Math.random() * 0.3);
      let z = Math.sin(t * 1.5) * loopRadius * 0.3;
      // Apply random tilt
      const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
      const cosY = Math.cos(tiltY), sinY = Math.sin(tiltY);
      let y2 = y * cosX - z * sinX;
      let z2 = y * sinX + z * cosX;
      let x2 = x * cosY + z2 * sinY;
      let z3 = -x * sinY + z2 * cosY;
      // Add wobble
      x2 += Math.sin(t * 3 + i) * 0.08;
      y2 += Math.cos(t * 2.5 + i * 0.7) * 0.06;
      points.push(new THREE.Vector3(cx + x2, cy + y2, cz + z3));
    }
    const curve = new THREE.CatmullRomCurve3(points, true); // closed loops
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.035, 5, true);
    const tube = new THREE.Mesh(tubeGeo, fiberMat);
    group.add(tube);
  }

  group.userData.organelleName = "Nucleoid";
  nucleoidMesh = group;
  organelleGroups["Nucleoid"] = group;
  cellGroup.add(group);
}

// --- Ribosomes (InstancedMesh) ---
function createRibosomes() {
  const count = 400;
  const geometry = new THREE.SphereGeometry(0.07, 6, 6);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.RIBOSOME,
    emissive: COLORS.RIBOSOME,
    emissiveIntensity: 0.2,
    roughness: 0.5,
  });

  ribosomeInstanced = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const innerRadius = 2.0;
  const halfLength = 3.5;

  for (let i = 0; i < count; i++) {
    const pos = randomPointInCapsuleInterior(innerRadius, halfLength);
    // Skip positions that overlap with nucleoid region
    if (pos.distanceTo(new THREE.Vector3(-0.3, 0, 0)) < 1.8) {
      // Try again
      const newPos = randomPointInCapsuleInterior(innerRadius, halfLength);
      pos.copy(newPos);
    }
    dummy.position.copy(pos);
    const s = 0.8 + Math.random() * 0.4;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    ribosomeInstanced.setMatrixAt(i, dummy.matrix);
  }

  ribosomeInstanced.userData.organelleName = "Ribosomes";
  organelleGroups["Ribosomes"] = ribosomeInstanced;
  cellGroup.add(ribosomeInstanced);
}

// --- Plasmids ---
function createPlasmids() {
  const plasmidMat = new THREE.MeshStandardMaterial({
    color: COLORS.PLASMID,
    emissive: COLORS.PLASMID,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.8,
  });

  const plasmidPositions = [
    new THREE.Vector3(2.5, 0.5, 0.8),
    new THREE.Vector3(-2.8, -0.3, -0.5),
    new THREE.Vector3(1.5, -0.8, -1.2),
  ];

  const group = new THREE.Group();

  plasmidPositions.forEach((pos) => {
    const torusGeo = new THREE.TorusGeometry(0.25, 0.035, 12, 24);
    const torus = new THREE.Mesh(torusGeo, plasmidMat);
    torus.position.copy(pos);
    // Random tilt
    torus.rotation.x = Math.random() * Math.PI;
    torus.rotation.y = Math.random() * Math.PI;
    group.add(torus);
  });

  group.userData.organelleName = "Plasmids";
  organelleGroups["Plasmids"] = group;
  cellGroup.add(group);
}

// --- Inclusion Bodies ---
function createInclusionBodies() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.INCLUSION,
    emissive: 0xaaaaaa,
    emissiveIntensity: 0.1,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const positions = [
    { pos: new THREE.Vector3(2.0, 0.3, -0.5), size: 0.25 },
    { pos: new THREE.Vector3(-1.5, -0.6, 0.8), size: 0.2 },
    { pos: new THREE.Vector3(3.0, -0.2, 0.3), size: 0.18 },
    { pos: new THREE.Vector3(-2.0, 0.5, -0.7), size: 0.22 },
    { pos: new THREE.Vector3(0.5, 0.7, 1.0), size: 0.15 },
  ];

  positions.forEach(({ pos, size }) => {
    const geo = new THREE.SphereGeometry(size, 10, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    group.add(mesh);
  });

  group.userData.organelleName = "InclusionBodies";
  organelleGroups["InclusionBodies"] = group;
  cellGroup.add(group);
}

// --- Flagella ---
function createFlagella() {
  const flagMat = new THREE.MeshStandardMaterial({
    color: COLORS.FLAGELLUM,
    emissive: 0x8a7a5a,
    emissiveIntensity: 0.15,
    roughness: 0.4,
  });

  // 6 peritrichous flagella emerging from random points on the cell body
  const flagellaOrigins = [
    { pos: new THREE.Vector3(3.5, 1.5, 0.5), dir: new THREE.Vector3(1, 0.6, 0.3) },
    { pos: new THREE.Vector3(-3.0, 1.0, 1.2), dir: new THREE.Vector3(-0.8, 0.5, 0.6) },
    { pos: new THREE.Vector3(1.0, -1.8, 1.5), dir: new THREE.Vector3(0.2, -0.7, 0.8) },
    { pos: new THREE.Vector3(-1.5, 1.5, -1.5), dir: new THREE.Vector3(-0.3, 0.6, -0.8) },
    { pos: new THREE.Vector3(3.0, -1.0, -1.0), dir: new THREE.Vector3(0.9, -0.4, -0.5) },
    { pos: new THREE.Vector3(-3.5, -0.5, -0.8), dir: new THREE.Vector3(-1.0, -0.2, -0.4) },
  ];

  const flagGroup = new THREE.Group();

  flagellaOrigins.forEach(({ pos, dir }) => {
    dir.normalize();
    const points = [];
    const helixLength = 12 + Math.random() * 6;
    const helixRadius = 0.4;
    const helixPitch = 1.2;
    const segments = 80;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const along = t * helixLength;

      // Build coordinate frame along direction
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(dir.dot(up)) > 0.9) up.set(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(dir, up).normalize();
      const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();

      const angle = along / helixPitch * Math.PI * 2;
      const damping = 1 - t * 0.3; // Taper toward tip
      const x = pos.x + dir.x * along + right.x * Math.cos(angle) * helixRadius * damping + realUp.x * Math.sin(angle) * helixRadius * damping;
      const y = pos.y + dir.y * along + right.y * Math.cos(angle) * helixRadius * damping + realUp.y * Math.sin(angle) * helixRadius * damping;
      const z = pos.z + dir.z * along + right.z * Math.cos(angle) * helixRadius * damping + realUp.z * Math.sin(angle) * helixRadius * damping;

      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.05, 6, false);
    const tube = new THREE.Mesh(tubeGeo, flagMat);
    flagGroup.add(tube);
  });

  flagGroup.userData.organelleName = "Flagella";
  flagellaGroups.push(flagGroup);
  organelleGroups["Flagella"] = flagGroup;
  cellGroup.add(flagGroup);
}

// --- Pili ---
function createPili() {
  const piliMat = new THREE.MeshStandardMaterial({
    color: COLORS.PILUS,
    emissive: 0x6a5a3a,
    emissiveIntensity: 0.1,
    roughness: 0.5,
  });

  const group = new THREE.Group();
  const piliCount = 40;

  for (let i = 0; i < piliCount; i++) {
    const origin = randomPointOnCapsule(2.8, 8);
    const normal = origin.clone().normalize();
    // Pili point outward from surface
    const length = 1.5 + Math.random() * 2.0;

    const points = [];
    const segments = 12;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const wobble = 0.05 * Math.sin(t * Math.PI * 4);
      points.push(new THREE.Vector3(
        origin.x + normal.x * t * length + wobble,
        origin.y + normal.y * t * length + wobble * Math.cos(i),
        origin.z + normal.z * t * length + wobble * Math.sin(i)
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.02, 4, false);
    const tube = new THREE.Mesh(tubeGeo, piliMat);
    piliMeshes.push(tube);
    group.add(tube);
  }

  group.userData.organelleName = "Pili";
  organelleGroups["Pili"] = group;
  cellGroup.add(group);
}

// ============================================
// GEOMETRY HELPERS
// ============================================

// Random point on capsule surface (capsule along X axis)
function randomPointOnCapsule(radius, length) {
  const halfLength = length / 2;
  // Decide: hemisphere or cylinder section (weighted by surface area)
  const cylArea = 2 * Math.PI * radius * length;
  const capArea = 4 * Math.PI * radius * radius;
  const totalArea = cylArea + capArea;

  if (Math.random() < cylArea / totalArea) {
    // Cylinder section
    const angle = Math.random() * Math.PI * 2;
    const x = (Math.random() - 0.5) * length;
    return new THREE.Vector3(
      x,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius
    );
  } else {
    // Hemisphere caps
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const side = Math.random() < 0.5 ? 1 : -1;
    return new THREE.Vector3(
      side * (halfLength + Math.sin(phi) * Math.cos(theta) * radius * 0.3 + radius * Math.cos(phi)),
      Math.sin(phi) * Math.sin(theta) * radius,
      Math.sin(phi) * Math.cos(theta) * radius
    );
  }
}

// Random point inside capsule interior
function randomPointInCapsuleInterior(radius, halfLength) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = (Math.random() - 0.5) * (halfLength * 2 + radius * 2);
    const y = (Math.random() - 0.5) * radius * 2;
    const z = (Math.random() - 0.5) * radius * 2;

    // Check if inside capsule
    const absX = Math.abs(x);
    if (absX <= halfLength) {
      // Cylinder section
      if (y * y + z * z < radius * radius * 0.85) {
        return new THREE.Vector3(x, y, z);
      }
    } else {
      // Hemisphere cap
      const cx = absX - halfLength;
      if (cx * cx + y * y + z * z < radius * radius * 0.85) {
        return new THREE.Vector3(x, y, z);
      }
    }
  }
  return new THREE.Vector3(0, 0, 0);
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);

  // Zoom buttons
  window.addEventListener('zoom', (e) => {
    const factor = e.detail === 'in' ? 0.8 : 1.2;
    camera.position.multiplyScalar(factor);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Collect all clickable meshes
  const clickables = [];
  Object.values(organelleGroups).forEach(obj => {
    if (obj.isMesh) {
      clickables.push(obj);
    } else if (obj.isGroup) {
      obj.traverse(child => {
        if (child.isMesh) clickables.push(child);
      });
    } else if (obj.isInstancedMesh) {
      clickables.push(obj);
    }
  });

  const intersects = raycaster.intersectObjects(clickables, false);

  // Skip through transparent envelope layers to find internal structures
  const ENVELOPE_NAMES = new Set(["OuterMembrane", "InnerMembrane", "Peptidoglycan"]);

  let chosenName = null;
  for (const hit of intersects) {
    let obj = hit.object;
    let name = obj.userData.organelleName;
    if (!name && obj.parent) {
      name = obj.parent.userData.organelleName;
      if (!name && obj.parent.parent) {
        name = obj.parent.parent.userData.organelleName;
      }
    }
    if (!name || !INFO_CONTENT[name]) continue;

    // Prefer non-envelope hits; fall back to envelope if nothing else
    if (!ENVELOPE_NAMES.has(name)) {
      chosenName = name;
      break;
    }
    if (!chosenName) {
      chosenName = name; // keep as fallback
    }
  }

  if (chosenName) {
    showPopup(INFO_CONTENT[chosenName]);
  }
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const clickables = [];
  Object.values(organelleGroups).forEach(obj => {
    if (obj.isMesh) clickables.push(obj);
    else if (obj.isGroup) {
      obj.traverse(child => {
        if (child.isMesh) clickables.push(child);
      });
    } else if (obj.isInstancedMesh) clickables.push(obj);
  });

  const intersects = raycaster.intersectObjects(clickables, false);
  renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
}

function showPopup(info) {
  const popup = document.getElementById('info-popup');
  document.getElementById('popup-title').textContent = info.title;
  document.getElementById('popup-description').textContent = info.description;
  document.getElementById('popup-function').textContent = info.function;
  popup.classList.remove('hidden');
  popup.style.display = 'flex';
}

// ============================================
// ANIMATION
// ============================================
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  controls.update();

  // Gentle nucleoid pulsation
  if (nucleoidMesh) {
    const scale = 1 + Math.sin(time * 0.5) * 0.02;
    nucleoidMesh.scale.set(scale, scale, scale);
    nucleoidMesh.rotation.y = time * 0.05;
  }

  // Flagella wave animation - rotate the whole group slowly
  flagellaGroups.forEach(group => {
    group.children.forEach((tube, i) => {
      // Subtle undulation by rotating each flagellum slightly
      tube.rotation.x = Math.sin(time * 2 + i * 1.5) * 0.03;
      tube.rotation.z = Math.cos(time * 1.8 + i * 2) * 0.02;
    });
  });

  // Subtle cell body rotation/drift
  if (cellGroup) {
    cellGroup.rotation.x = Math.sin(time * 0.15) * 0.02;
    cellGroup.rotation.z = Math.cos(time * 0.12) * 0.015;
  }

  // Update scale bar based on zoom level
  updateScaleBar();

  renderer.render(scene, camera);
}

// ============================================
// SCALE BAR
// ============================================
// Cell is ~2μm long. Body = capsule with length=8, radius=2.8 → total ~13.6 units = 2μm
// So 1μm ≈ 6.8 units
const UNITS_PER_MICRON = 6.8;

function updateScaleBar() {
  const scaleBar = document.getElementById('scale-bar');
  const scaleValue = document.getElementById('scale-value');
  if (!scaleBar || !scaleValue) return;

  // Project a known world-space distance to screen pixels
  const dist = camera.position.length();
  const fovRad = camera.fov * Math.PI / 180;
  const worldHeightVisible = 2 * dist * Math.tan(fovRad / 2);
  const pixelsPerUnit = window.innerHeight / worldHeightVisible;

  // Choose a nice scale bar size (target ~60-120px on screen)
  const targetPx = 80;
  const worldUnitsForTarget = targetPx / pixelsPerUnit;
  const micronsForTarget = worldUnitsForTarget / UNITS_PER_MICRON;

  // Snap to nice values in nm/μm
  const niceValues = [
    { val: 0.01, label: '10 nm' },
    { val: 0.02, label: '20 nm' },
    { val: 0.05, label: '50 nm' },
    { val: 0.1, label: '100 nm' },
    { val: 0.2, label: '200 nm' },
    { val: 0.5, label: '500 nm' },
    { val: 1, label: '1 μm' },
    { val: 2, label: '2 μm' },
    { val: 5, label: '5 μm' },
    { val: 10, label: '10 μm' },
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
