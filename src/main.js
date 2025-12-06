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
  NUCLEUS_OFFSET: new THREE.Vector3(3.0, 0, 0), // Moved inward to stay inside cell
  GOLGI_POS: new THREE.Vector3(1.8, 0, 0)
};

const INFO_CONTENT = {
  "Cell": {
    title: "Plasma Cell: The Antibody Factory",
    description: "This is a Plasma Cell—a specialized B-cell transformed into a high-speed antibody factory. While other cells juggle many jobs, this one does just one thing: mass-produce antibodies. The entire cell has reorganized around this mission. Notice how the nucleus is pushed aside? That's to make room for the enormous Rough ER that dominates the cytoplasm.",
    function: "Produces thousands of identical antibodies per second to fight a specific pathogen."
  },
  "Nucleus": {
    title: "Nucleus: The Blueprint Vault",
    description: "The nucleus contains DNA—the master instructions for building antibodies. Here, the antibody gene is 'transcribed': an enzyme reads the DNA sequence and creates a messenger RNA (mRNA) copy. This mRNA exits through nuclear pores and travels to the Rough ER. Notice the nucleus is pushed to one side? Plasma cells sacrifice nuclear space to maximize their protein-making machinery.",
    function: "Stores DNA and produces mRNA transcripts that carry antibody-building instructions to the ribosomes."
  },
  "RER": {
    title: "Rough ER: The Assembly Line",
    description: "This massive network of membrane sheets is where antibodies are actually built. Ribosomes studding the surface read mRNA instructions and assemble amino acids into protein chains—a process called 'translation.' The rough ER is HUGE in plasma cells because antibody production never stops. Each ribosome can make about 2,000 antibodies per hour.",
    function: "Translates mRNA code into antibody proteins. The main production floor of the factory."
  },
  "Ribosomes": {
    title: "Ribosomes: The Protein Builders",
    description: "These tiny molecular machines read mRNA like a tape and build proteins one amino acid at a time. Ribosomes attached to the ER make proteins for export (like antibodies). Free-floating ribosomes in the cytoplasm make proteins the cell keeps for itself. Same machine, different destinations.",
    function: "Read genetic code and assemble amino acids into proteins. The workers on the assembly line."
  },
  "Golgi": {
    title: "Golgi Apparatus: Quality Control & Shipping",
    description: "Located in the clear 'Hof' zone near the nucleus, the Golgi receives raw antibody chains from the ER. Here they get finishing touches: sugar molecules are attached, the protein folds into its final Y-shape, and quality checks catch any defects. Approved antibodies are packaged into vesicles for export. Defective ones are sent to lysosomes for recycling.",
    function: "Modifies, folds, inspects, and packages antibodies. Only perfect products ship out."
  },
  "Vesicles": {
    title: "Vesicles: The Delivery System",
    description: "These membrane bubbles carry finished antibodies from the Golgi to the cell surface. They don't drift randomly—motor proteins (kinesins) actively walk them along microtubule tracks. At the membrane, vesicles fuse and release their cargo outside the cell. This release process is called exocytosis.",
    function: "Transport packaged antibodies to the cell membrane for release into the bloodstream."
  },
  "Antibodies": {
    title: "Antibodies: The Product",
    description: "These Y-shaped proteins are what the whole factory exists to produce. Each antibody is designed to recognize ONE specific target—like a lock fitting one key. The tips of the Y bind to molecules on pathogens (called antigens). When antibodies coat a virus or bacterium, they mark it for destruction by other immune cells.",
    function: "Bind to specific pathogens and tag them for destruction by the immune system."
  },
  "Mitochondria": {
    title: "Mitochondria: The Power Plants",
    description: "Antibody production burns through enormous amounts of energy. Every peptide bond, every vesicle movement, every molecular motor requires ATP. These bean-shaped organelles work constantly, converting glucose and oxygen into ATP through cellular respiration. Their internal folds (cristae) maximize the surface area for energy production.",
    function: "Generate ATP energy to power the cell's non-stop protein synthesis machinery."
  },
  "Lysosomes": {
    title: "Lysosomes: The Recycling Centers",
    description: "Not every protein folds correctly. When the Golgi's quality control rejects a misfolded antibody, it gets sent here. Lysosomes contain powerful digestive enzymes that break down defective proteins, worn-out organelles, and other cellular waste. The resulting amino acids are recycled back into the production supply chain.",
    function: "Break down and recycle failed proteins and cellular waste. Nothing goes to waste."
  },
  "Centrioles": {
    title: "Centrioles: The Traffic Organizers",
    description: "These barrel-shaped structures organize the microtubule network that vesicles travel on. In dividing cells, centrioles help separate chromosomes. But plasma cells rarely divide—they're terminally differentiated, focused entirely on antibody production. Here, centrioles mainly coordinate intracellular transport.",
    function: "Organize the microtubule cytoskeleton that serves as tracks for vesicle transport."
  },
  "Microtubules": {
    title: "Microtubules: The Highway System",
    description: "These hollow protein tubes form the transport infrastructure of the cell. Motor proteins (kinesin walking outward, dynein walking inward) grip the tubes and carry cargo along them. The network is dynamic—constantly growing and shrinking to adapt to the cell's changing needs.",
    function: "Provide structural support and serve as tracks for motor protein-driven transport."
  }
};

// ============================================
// SECRETION PATHS (Golgi to Membrane - constrained inside cell)
// ============================================
// Helper to clamp point to cell interior (ovoid: 1.5x in X, radius ~6.5)
function clampToCell(x, y, z, margin = 0.3) {
  const cellRadiusX = 6.5 - margin;
  const cellRadiusYZ = 6.5 - margin;

  // Check if outside ovoid
  const normalized = (x * x) / (cellRadiusX * cellRadiusX) +
                     (y * y) / (cellRadiusYZ * cellRadiusYZ) +
                     (z * z) / (cellRadiusYZ * cellRadiusYZ);

  if (normalized > 1) {
    // Scale back to surface
    const scale = 1 / Math.sqrt(normalized);
    return { x: x * scale, y: y * scale, z: z * scale };
  }
  return { x, y, z };
}

const SECRETION_PATHS = Array.from({ length: 8 }).map((_, i) => {
  const theta = (Math.PI * 2 * i) / 8 + (Math.random() * 0.5);
  const radius = 2.0 + Math.random() * 1.5;
  const y = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;

  // End point near membrane but inside (left side of cell, towards -X)
  const rawEndX = -5.5 + Math.random() * 0.5; // Inside the ovoid X extent
  const clamped = clampToCell(rawEndX, y, z, 0.5);

  return {
    start: new THREE.Vector3(1.8, 0, 0),
    end: new THREE.Vector3(clamped.x, clamped.y, clamped.z)
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
// CELL MEMBRANE (Subtle - 10% default opacity)
// ============================================
const membraneGeometry = new THREE.SphereGeometry(DIMENSIONS.CELL_RADIUS, 64, 64);
const membraneMaterial = new THREE.MeshPhysicalMaterial({
  color: COLORS.MEMBRANE,
  transparent: true,
  opacity: 0.10, // 10% opacity as requested
  roughness: 0.2,
  metalness: 0.1,
  transmission: 0.6,
  thickness: 2.0,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false
});
const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
membrane.raycast = () => {}; // Disable raycast on membrane
cellGroup.add(membrane);

// Add a subtle inner glow/rim to make membrane more visible
const membraneRimGeometry = new THREE.SphereGeometry(DIMENSIONS.CELL_RADIUS * 0.99, 64, 64);
const membraneRimMaterial = new THREE.MeshBasicMaterial({
  color: 0x88ccff,
  transparent: true,
  opacity: 0.03,
  side: THREE.BackSide
});
const membraneRim = new THREE.Mesh(membraneRimGeometry, membraneRimMaterial);
cellGroup.add(membraneRim);

organelleGroups['Membrane'] = { meshes: [membrane, membraneRim], material: membraneMaterial };

// ============================================
// NUCLEUS (Eccentric Position - with detailed internal structure)
// ============================================
const nucleusGroup = new THREE.Group();
nucleusGroup.position.copy(DIMENSIONS.NUCLEUS_OFFSET);
// Counter-scale to keep nucleus spherical (parent cellGroup is 1.5x in X)
nucleusGroup.scale.set(1 / DIMENSIONS.CELL_SCALE.x, 1, 1);

// Nuclear envelope (outer membrane) - 50% opacity
const nuclearEnvelopeMat = new THREE.MeshPhysicalMaterial({
  color: COLORS.NUCLEUS,
  roughness: 0.4,
  metalness: 0.1,
  transparent: true,
  opacity: 0.5, // 50% opacity as requested
  side: THREE.DoubleSide,
  clearcoat: 0.3
});
const nuclearEnvelope = new THREE.Mesh(
  new THREE.SphereGeometry(DIMENSIONS.NUCLEUS_RADIUS, 64, 64),
  nuclearEnvelopeMat
);
nuclearEnvelope.userData = { organelle: 'Nucleus' };
clickableMeshes.push(nuclearEnvelope);
nucleusGroup.add(nuclearEnvelope);

// Inner nuclear membrane
const innerNuclearMembrane = new THREE.Mesh(
  new THREE.SphereGeometry(DIMENSIONS.NUCLEUS_RADIUS * 0.97, 48, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0x3a1850,
    roughness: 0.5,
    transparent: true,
    opacity: 0.4,
    side: THREE.BackSide
  })
);
nucleusGroup.add(innerNuclearMembrane);

// Nucleoplasm (inner fluid)
const nucleoplasm = new THREE.Mesh(
  new THREE.SphereGeometry(DIMENSIONS.NUCLEUS_RADIUS * 0.93, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0x2a1040,
    transparent: true,
    opacity: 0.3
  })
);
nucleusGroup.add(nucleoplasm);

// Nuclear lamina (mesh network under envelope)
const laminaMat = new THREE.MeshBasicMaterial({
  color: 0x6644aa,
  transparent: true,
  opacity: 0.2,
  wireframe: true
});
const lamina = new THREE.Mesh(
  new THREE.IcosahedronGeometry(DIMENSIONS.NUCLEUS_RADIUS * 0.96, 2),
  laminaMat
);
nucleusGroup.add(lamina);

// Nuclear pores (small torus shapes on surface)
const poreMat = new THREE.MeshStandardMaterial({
  color: 0x4422aa,
  roughness: 0.3,
  emissive: 0x221155,
  emissiveIntensity: 0.3
});

for (let i = 0; i < 40; i++) {
  // Distribute on sphere surface
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;

  const x = DIMENSIONS.NUCLEUS_RADIUS * Math.sin(phi) * Math.cos(theta);
  const y = DIMENSIONS.NUCLEUS_RADIUS * Math.sin(phi) * Math.sin(theta);
  const z = DIMENSIONS.NUCLEUS_RADIUS * Math.cos(phi);

  const pore = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.025, 8, 12),
    poreMat
  );
  pore.position.set(x, y, z);
  pore.lookAt(0, 0, 0);
  nucleusGroup.add(pore);
}

// Nucleolus (2-3 dense bodies)
const nucleolusMat = new THREE.MeshStandardMaterial({
  color: 0x553388,
  roughness: 0.4,
  emissive: 0x331166,
  emissiveIntensity: 0.5
});

for (let i = 0; i < 2; i++) {
  // Main nucleolus body
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.45 + Math.random() * 0.15, 24, 24),
    nucleolusMat
  );
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.5 + Math.random() * 0.5;
  nucleolus.position.set(
    Math.cos(angle) * dist,
    (Math.random() - 0.5) * 1.0,
    Math.sin(angle) * dist
  );

  // Fibrillar center (darker spot inside)
  const fibrillarCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0x220044,
      transparent: true,
      opacity: 0.8
    })
  );
  fibrillarCenter.position.copy(nucleolus.position);
  fibrillarCenter.position.x += (Math.random() - 0.5) * 0.1;

  nucleusGroup.add(nucleolus);
  nucleusGroup.add(fibrillarCenter);
}

// Chromatin - heterochromatin (dense, dark) and euchromatin (loose, lighter)
// Heterochromatin - dense clumps near periphery
const heterochromatinMat = new THREE.MeshStandardMaterial({
  color: 0x1a0a2e,
  roughness: 0.7,
  emissive: 0x0a0515,
  emissiveIntensity: 0.1
});

for (let i = 0; i < 15; i++) {
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const r = DIMENSIONS.NUCLEUS_RADIUS * (0.7 + Math.random() * 0.2);

  const clump = new THREE.Mesh(
    new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 8, 8),
    heterochromatinMat
  );
  clump.position.set(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
  clump.scale.set(1 + Math.random() * 0.5, 1, 1 + Math.random() * 0.3);
  nucleusGroup.add(clump);
}

// Euchromatin - loose, stringy chromatin throughout
const euchromatinMat = new THREE.MeshStandardMaterial({
  color: 0x9977dd,
  roughness: 0.5,
  emissive: 0x332255,
  emissiveIntensity: 0.2,
  transparent: true,
  opacity: 0.7
});

for (let i = 0; i < 20; i++) {
  const points = [];
  const startAngle = Math.random() * Math.PI * 2;
  const startR = Math.random() * 1.5;

  for (let j = 0; j < 6; j++) {
    const t = j / 5;
    const angle = startAngle + t * Math.PI * (0.5 + Math.random());
    const r = startR + (Math.random() - 0.5) * 0.8;
    const y = (Math.random() - 0.5) * 2.5;

    points.push(new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    ));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(curve, 24, 0.03, 6, false);
  const chromatin = new THREE.Mesh(tubeGeometry, euchromatinMat);
  nucleusGroup.add(chromatin);
}

cellGroup.add(nucleusGroup);
organelleGroups['Nucleus'] = {
  group: nucleusGroup,
  meshes: [nuclearEnvelope],
  labelOffset: new THREE.Vector3(0, 3, 0)
};

// ============================================
// GOLGI APPARATUS (Detailed Stacked Cisternae)
// ============================================
const golgiGroup = new THREE.Group();
golgiGroup.position.copy(DIMENSIONS.GOLGI_POS);
golgiGroup.rotation.set(0, 0, 0.2);

// Create curved, flattened cisterna shape
function createGolgiCisterna(width, depth, curvature, thickness) {
  const shape = new THREE.Shape();
  const segments = 32;

  // Create curved elongated shape
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
    bevelThickness: thickness * 0.3,
    bevelSize: thickness * 0.2,
    bevelSegments: 3,
    curveSegments: 24
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// Golgi materials - gradient from cis (receiving) to trans (shipping)
const golgiCisMat = new THREE.MeshPhysicalMaterial({
  color: 0xE6B800, // Lighter gold (cis face)
  roughness: 0.4,
  metalness: 0.1,
  emissive: 0x442200,
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.85
});

const golgiMedialMat = new THREE.MeshPhysicalMaterial({
  color: 0xFFD700, // Classic gold (medial)
  roughness: 0.35,
  metalness: 0.15,
  emissive: 0x553300,
  emissiveIntensity: 0.2,
  transparent: true,
  opacity: 0.9
});

const golgiTransMat = new THREE.MeshPhysicalMaterial({
  color: 0xDAA520, // Darker gold (trans face)
  roughness: 0.3,
  metalness: 0.2,
  emissive: 0x664400,
  emissiveIntensity: 0.25,
  transparent: true,
  opacity: 0.85
});

// Create 8 stacked cisternae with varying curvature
const cisternaCount = 8;
const stackSpacing = 0.18;
const baseWidth = 2.2;
const baseDepth = 0.8;

for (let i = 0; i < cisternaCount; i++) {
  const t = i / (cisternaCount - 1); // 0 to 1
  const width = baseWidth * (1 - t * 0.3); // Narrower toward trans
  const depth = baseDepth * (1 - t * 0.2);
  const curvature = 0.3 + t * 0.4; // More curved toward trans
  const thickness = 0.06 + Math.random() * 0.02;

  // Choose material based on position
  let mat;
  if (i < 2) mat = golgiCisMat.clone();
  else if (i < 6) mat = golgiMedialMat.clone();
  else mat = golgiTransMat.clone();

  const geometry = createGolgiCisterna(width, depth, curvature, thickness);
  const cisterna = new THREE.Mesh(geometry, mat);

  cisterna.position.y = (i - cisternaCount / 2) * stackSpacing;
  cisterna.position.x = t * 0.15; // Slight offset creating stack tilt
  cisterna.rotation.x = Math.PI / 2;
  cisterna.rotation.z = Math.PI / 2;

  cisterna.userData = { organelle: 'Golgi' };
  clickableMeshes.push(cisterna);
  golgiGroup.add(cisterna);
}

// Add fenestrations (small holes) represented as darker spots
const fenestrationMat = new THREE.MeshBasicMaterial({
  color: 0x1a1a00,
  transparent: true,
  opacity: 0.4
});

for (let i = 0; i < 30; i++) {
  const fenestration = new THREE.Mesh(
    new THREE.CircleGeometry(0.03 + Math.random() * 0.03, 8),
    fenestrationMat
  );
  fenestration.position.set(
    (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 1.2,
    (Math.random() - 0.5) * 1.5
  );
  fenestration.rotation.y = Math.PI / 2;
  golgiGroup.add(fenestration);
}

// Tubular network connecting cisternae
const tubuleMaterial = new THREE.MeshStandardMaterial({
  color: 0xCCAA00,
  roughness: 0.5,
  transparent: true,
  opacity: 0.6
});

for (let i = 0; i < 15; i++) {
  const startY = (Math.random() - 0.5) * 1.2;
  const endY = startY + (Math.random() - 0.5) * 0.4;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3((Math.random() - 0.5) * 0.2, startY, (Math.random() - 0.5) * 1.0),
    new THREE.Vector3((Math.random() - 0.5) * 0.15, (startY + endY) / 2, (Math.random() - 0.5) * 0.8),
    new THREE.Vector3((Math.random() - 0.5) * 0.2, endY, (Math.random() - 0.5) * 1.0)
  ]);

  const tubeGeom = new THREE.TubeGeometry(curve, 8, 0.015, 6, false);
  const tube = new THREE.Mesh(tubeGeom, tubuleMaterial);
  golgiGroup.add(tube);
}

// Budding vesicles - more of them, varying sizes
const budVesicleMat = new THREE.MeshStandardMaterial({
  color: COLORS.GOLGI,
  emissive: COLORS.GOLGI,
  emissiveIntensity: 0.4,
  transparent: true,
  opacity: 0.85
});

// Cis-side vesicles (arriving from ER)
for (let i = 0; i < 8; i++) {
  const vesicle = new THREE.Mesh(
    new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 12, 12),
    budVesicleMat.clone()
  );
  vesicle.material.color.setHex(0xAADD88); // Greenish - from ER
  vesicle.position.set(
    -0.3 + Math.random() * 0.2,
    -0.8 + Math.random() * 0.3,
    (Math.random() - 0.5) * 1.5
  );
  golgiGroup.add(vesicle);
}

// Trans-side vesicles (departing)
for (let i = 0; i < 15; i++) {
  const vesicle = new THREE.Mesh(
    new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 12, 12),
    budVesicleMat.clone()
  );
  vesicle.position.set(
    0.2 + Math.random() * 0.3,
    0.7 + Math.random() * 0.4,
    (Math.random() - 0.5) * 1.8
  );
  golgiGroup.add(vesicle);
}

// Coated vesicles (clathrin-coated look)
const coatedVesicleMat = new THREE.MeshStandardMaterial({
  color: 0xCC8800,
  roughness: 0.7,
  emissive: 0x442200,
  emissiveIntensity: 0.2
});

for (let i = 0; i < 6; i++) {
  const vesicle = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.07, 0), // Faceted look
    coatedVesicleMat
  );
  vesicle.position.set(
    0.35 + Math.random() * 0.2,
    0.5 + Math.random() * 0.5,
    (Math.random() - 0.5) * 1.2
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
// CENTRIOLES (9-Triplet Structure) - Made larger for visibility
// ============================================
const centriolesGroup = new THREE.Group();
// Position near nucleus but NOT overlapping (nucleus at x=3, radius=2.4)
// Place centrioles in the "cell center" area between nucleus and Golgi
centriolesGroup.position.set(0.5, 2.0, 2.0);
centriolesGroup.rotation.set(0.3, 0.3, 0);

const centrioleMat = new THREE.MeshStandardMaterial({
  color: COLORS.CENTRIOLE,
  roughness: 0.3,
  emissive: 0x802060,
  emissiveIntensity: 0.3
});

// Create two perpendicular centrioles (scaled up 3x)
for (let c = 0; c < 2; c++) {
  const centrioleUnit = new THREE.Group();

  // 9 triplets of microtubules
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    for (let t = 0; t < 3; t++) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8),
        centrioleMat
      );
      const r = 0.2 + t * 0.05;
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
    centrioleUnit.position.x = 0.5;
  }
  centriolesGroup.add(centrioleUnit);
}

// PCM cloud (pericentriolar material) - larger
const pcmGeom = new THREE.SphereGeometry(0.7, 16, 16);
const pcmMat = new THREE.MeshStandardMaterial({
  color: COLORS.CENTRIOLE,
  transparent: true,
  opacity: 0.15,
  roughness: 0.8
});
const pcm = new THREE.Mesh(pcmGeom, pcmMat);
pcm.position.set(0.25, 0, 0);
centriolesGroup.add(pcm);

cellGroup.add(centriolesGroup);
organelleGroups['Centrioles'] = {
  group: centriolesGroup,
  meshes: centriolesGroup.children,
  labelOffset: new THREE.Vector3(0, 0.8, 0)
};

// ============================================
// ROUGH ER (Convoluted Folded Tubular Network)
// ============================================
const rerGroup = new THREE.Group();

// Create procedural ribosome bump texture
function createRibosomeBumpTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark base
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 256, 256);

  // Add ribosome bumps (small circles)
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 3;

    // Gradient for 3D bump look
    const gradient = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(0.5, '#888');
    gradient.addColorStop(1, '#333');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

const ribosomeBumpTexture = createRibosomeBumpTexture();

// RER Material - translucent teal with ribosome bump texture (20% opacity)
const rerMaterial = new THREE.MeshPhysicalMaterial({
  color: COLORS.RER,
  roughness: 0.6,
  metalness: 0.05,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.20, // 20% opacity as requested
  emissive: 0x115555,
  emissiveIntensity: 0.3,
  bumpMap: ribosomeBumpTexture,
  bumpScale: 0.15
});

// Cell boundary check (ovoid shape: stretched in X)
function isInsideCell(x, y, z, margin = 0.5) {
  // Cell is scaled 1.5x in X, radius 7
  const cellRadiusX = 6.5 - margin; // Slightly inside membrane
  const cellRadiusYZ = 6.5 - margin;
  const normalized = (x * x) / (cellRadiusX * cellRadiusX) +
                     (y * y) / (cellRadiusYZ * cellRadiusYZ) +
                     (z * z) / (cellRadiusYZ * cellRadiusYZ);
  return normalized < 1;
}

// Avoid nucleus region
function avoidsNucleus(x, y, z, margin = 0.8) {
  const nucX = DIMENSIONS.NUCLEUS_OFFSET.x;
  const nucR = DIMENSIONS.NUCLEUS_RADIUS + margin;
  const dist = Math.sqrt((x - nucX) * (x - nucX) + y * y + z * z);
  return dist > nucR;
}

// ============================================
// SHEET-BASED ER SYSTEM (Space-filling membrane sheets)
// ============================================

// Create an undulating membrane sheet (cisterna)
function createERSheet(width, depth, wavesX, wavesZ, amplitude, segments = 40) {
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i); // PlaneGeometry uses Y for the second dimension

    // Smooth undulating waves
    const wave1 = Math.sin(x * wavesX * 0.5) * amplitude;
    const wave2 = Math.sin(z * wavesZ * 0.5) * amplitude * 0.6;
    const wave3 = Math.cos((x + z) * 0.3) * amplitude * 0.3;

    // Combined smooth undulation
    const y = wave1 + wave2 + wave3;

    positions.setZ(i, y);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Create curved cisterna (bent sheet)
function createCurvedCisterna(radius, arcAngle, height, waves, amplitude, segments = 50) {
  const geometry = new THREE.PlaneGeometry(radius * arcAngle, height, segments, Math.floor(segments / 2));
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    let u = positions.getX(i); // Along the arc
    let v = positions.getY(i); // Height

    // Convert to curved surface (cylindrical mapping)
    const angle = (u / radius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Add smooth undulation along the curve
    const wave1 = Math.sin(angle * waves) * amplitude;
    const wave2 = Math.sin(v * 2 + angle * waves * 0.5) * amplitude * 0.4;

    // Radial displacement for undulation
    const radialOffset = wave1 + wave2;
    const newX = Math.cos(angle) * (radius + radialOffset);
    const newZ = Math.sin(angle) * (radius + radialOffset);

    positions.setXYZ(i, newX, v, newZ);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Store ER sheets for ribosome placement
const rerSheets = [];

// Stacked horizontal cisternae (classic ER look) - spread out, avoid hof (x > 0)
const erStackCount = 16;
const erStackSpacing = 0.45;
const erBaseY = -3.0;

// Helper to check if position is in the hof zone (Golgi area)
function avoidsHof(x, y, z) {
  // Hof is the clear zone around Golgi at (1.8, 0, 0) and nucleus at (3, 0, 0)
  // Keep ER away from x > 0 in the central region
  if (x > 0 && Math.abs(y) < 2.5 && Math.abs(z) < 2.5) return false;
  return true;
}

for (let s = 0; s < erStackCount; s++) {
  const y = erBaseY + s * erStackSpacing;
  // Shift ER more to the left (negative X) to leave room for hof
  const xOffset = -3.5 + (Math.random() - 0.5) * 1.5;

  // Vary size based on position (larger in middle)
  const sizeFactor = 1 - Math.abs(s - erStackCount / 2) / (erStackCount / 2) * 0.3;
  const width = 6.0 * sizeFactor;
  const depth = 5.5 * sizeFactor;

  // Skip if outside cell, in nucleus, or in hof
  if (!isInsideCell(xOffset, y, 0, 1.5)) continue;
  if (!avoidsNucleus(xOffset, y, 0, 1.2)) continue;
  if (!avoidsHof(xOffset, y, 0)) continue;

  const sheet = new THREE.Mesh(
    createERSheet(width, depth, 3 + Math.random() * 2, 2 + Math.random() * 2, 0.15 + Math.random() * 0.1),
    rerMaterial.clone()
  );

  sheet.position.set(xOffset, y, 0);
  sheet.rotation.x = -Math.PI / 2; // Lay flat
  sheet.rotation.z = (Math.random() - 0.5) * 0.3; // Slight rotation variation

  sheet.userData = { organelle: 'RER' };
  clickableMeshes.push(sheet);
  rerGroup.add(sheet);
  rerSheets.push(sheet);
}

// Curved cisternae wrapping around (more 3D) - spread wider, avoid hof
const curvedCount = 12;
for (let c = 0; c < curvedCount; c++) {
  const angle = (c / curvedCount) * Math.PI * 2;
  const radius = 2.5 + Math.random() * 2.0;
  const height = 2.5 + Math.random() * 2.0;
  // Spread more to negative X and wider Z
  const xPos = Math.cos(angle) * 2.0 - 3.0;
  const zPos = Math.sin(angle) * 4.0;
  const yPos = (Math.random() - 0.5) * 5;

  if (!isInsideCell(xPos, yPos, zPos, 1.5)) continue;
  if (!avoidsNucleus(xPos, yPos, zPos, 1.5)) continue;
  if (!avoidsHof(xPos, yPos, zPos)) continue;

  const curved = new THREE.Mesh(
    createCurvedCisterna(radius, Math.PI * 0.8, height, 4 + Math.random() * 3, 0.12),
    rerMaterial.clone()
  );

  curved.position.set(xPos, yPos, zPos);
  curved.rotation.y = angle + Math.PI / 2;

  curved.userData = { organelle: 'RER' };
  clickableMeshes.push(curved);
  rerGroup.add(curved);
  rerSheets.push(curved);
}

// Vertical sheet walls (connecting stacks) - spread wider, avoid hof
for (let v = 0; v < 10; v++) {
  const xPos = -5.5 + v * 0.9 + (Math.random() - 0.5) * 0.5;
  const zPos = (Math.random() - 0.5) * 8;
  const yPos = (Math.random() - 0.5) * 2;

  if (!isInsideCell(xPos, yPos, zPos, 1.5)) continue;
  if (!avoidsNucleus(xPos, yPos, zPos, 1.2)) continue;
  if (!avoidsHof(xPos, yPos, zPos)) continue;

  const vertSheet = new THREE.Mesh(
    createERSheet(3.5, 5.0, 2, 3, 0.2),
    rerMaterial.clone()
  );

  vertSheet.position.set(xPos, yPos, zPos);
  vertSheet.rotation.y = Math.random() * Math.PI;

  vertSheet.userData = { organelle: 'RER' };
  clickableMeshes.push(vertSheet);
  rerGroup.add(vertSheet);
  rerSheets.push(vertSheet);
}

// Legacy torus function for regenerate (keeping compatibility)
function createConvolutedTorus(majorRadius, minorRadius, folds, amplitude, smoothness = 80) {
  const tubularSegments = Math.max(80, smoothness * 2);
  const radialSegments = Math.max(12, Math.floor(smoothness / 5));
  const geometry = new THREE.TorusGeometry(majorRadius, minorRadius, radialSegments, tubularSegments);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i);
    let y = positions.getY(i);
    let z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const fold1 = Math.sin(angle * folds) * amplitude;
    const fold2 = Math.sin(angle * folds * 0.5 + 1.2) * amplitude * 0.3;
    const totalRadialFold = fold1 + fold2;
    const radialDir = Math.sqrt(x * x + z * z);
    if (radialDir > 0.01) {
      x += (x / radialDir) * totalRadialFold;
      z += (z / radialDir) * totalRadialFold;
    }
    y += Math.cos(angle * folds * 0.7 + 0.5) * amplitude * 0.4;
    positions.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Placeholder for rerTori (for regenerate compatibility)
const rerTori = rerSheets;
const rerLayers = [];

// ============================================
// INSTANCED RIBOSOMES ON RER (studded appearance)
// ============================================
const rerRibosomeCount = 1000;
const rerRibosomeGeom = new THREE.SphereGeometry(0.02, 4, 4);
const rerRibosomeMat = new THREE.MeshStandardMaterial({
  color: 0x2299aa,
  roughness: 0.5,
  emissive: 0x115566,
  emissiveIntensity: 0.3
});

const rerRibosomeInstances = new THREE.InstancedMesh(rerRibosomeGeom, rerRibosomeMat, rerRibosomeCount);
const riboDummy = new THREE.Object3D();

let riboIdx = 0;
rerTori.forEach((torus) => {
  torus.updateMatrixWorld();
  const torusMatrix = torus.matrixWorld;

  const ribosPerTorus = Math.floor(rerRibosomeCount / rerTori.length);
  const positions = torus.geometry.attributes.position;

  for (let r = 0; r < ribosPerTorus && riboIdx < rerRibosomeCount; r++) {
    const vertIdx = Math.floor(Math.random() * positions.count);
    const localPos = new THREE.Vector3(
      positions.getX(vertIdx),
      positions.getY(vertIdx),
      positions.getZ(vertIdx)
    );

    // Offset slightly outward from surface
    localPos.normalize().multiplyScalar(localPos.length() + 0.05);

    // Transform to world space
    const worldPos = localPos.clone().applyMatrix4(torusMatrix);

    // Only place if inside cell
    if (isInsideCell(worldPos.x, worldPos.y, worldPos.z, 0.3)) {
      riboDummy.position.copy(worldPos);
      riboDummy.scale.setScalar(0.7 + Math.random() * 0.6);
      riboDummy.updateMatrix();
      rerRibosomeInstances.setMatrixAt(riboIdx, riboDummy.matrix);
      riboIdx++;
    }
  }
});

rerRibosomeInstances.instanceMatrix.needsUpdate = true;
rerRibosomeInstances.userData = { organelle: 'RER' };
clickableMeshes.push(rerRibosomeInstances);
rerGroup.add(rerRibosomeInstances);

// ============================================
// ER CONNECTING TUBULES (winding paths between tori)
// ============================================
const tubuleMat = new THREE.MeshPhysicalMaterial({
  color: 0x55ddcc,
  roughness: 0.3,
  transparent: true,
  opacity: 0.5,
  emissive: 0x224444,
  emissiveIntensity: 0.15
});

// Create winding tubules connecting the network
for (let i = 0; i < 25; i++) {
  const layer1 = rerLayers[Math.floor(Math.random() * rerLayers.length)];
  const layer2 = rerLayers[Math.floor(Math.random() * rerLayers.length)];

  if (layer1 === layer2) continue;

  const start = new THREE.Vector3(
    layer1.pos[0] + (Math.random() - 0.5) * layer1.radius,
    layer1.pos[1] + (Math.random() - 0.5) * 0.5,
    layer1.pos[2] + (Math.random() - 0.5) * layer1.radius
  );
  const end = new THREE.Vector3(
    layer2.pos[0] + (Math.random() - 0.5) * layer2.radius,
    layer2.pos[1] + (Math.random() - 0.5) * 0.5,
    layer2.pos[2] + (Math.random() - 0.5) * layer2.radius
  );

  // Check bounds
  if (!isInsideCell(start.x, start.y, start.z, 0.5)) continue;
  if (!isInsideCell(end.x, end.y, end.z, 0.5)) continue;

  // Create winding path with multiple control points
  const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.33);
  const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.66);
  mid1.y += (Math.random() - 0.5) * 1.0;
  mid1.z += (Math.random() - 0.5) * 0.8;
  mid2.y += (Math.random() - 0.5) * 1.0;
  mid2.z += (Math.random() - 0.5) * 0.8;

  const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
  const tubeGeom = new THREE.TubeGeometry(curve, 16, 0.04, 6, false);
  const tubule = new THREE.Mesh(tubeGeom, tubuleMat);
  tubule.userData = { organelle: 'RER' };
  rerGroup.add(tubule);
}

cellGroup.add(rerGroup);
organelleGroups['RER'] = {
  group: rerGroup,
  meshes: rerGroup.children,
  labelOffset: new THREE.Vector3(-3, 3, 0)
};

// ============================================
// MITOCHONDRIA (with Cristae & Internal Structure)
// ============================================
const mitochondriaGroup = new THREE.Group();
const mitoCount = 60; // Plasma cells have high energy demands for antibody production

// Outer membrane - semi-transparent
const mitoOuterMat = new THREE.MeshPhysicalMaterial({
  color: COLORS.MITOCHONDRIA,
  roughness: 0.3,
  transparent: true,
  opacity: 0.5, // 50% opacity as requested
  clearcoat: 0.4,
  side: THREE.DoubleSide
});

// Inner membrane - slightly darker
const mitoInnerMat = new THREE.MeshPhysicalMaterial({
  color: 0xCC4030,
  roughness: 0.4,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide
});

// Cristae material - folded inner membrane
const cristaeMat = new THREE.MeshStandardMaterial({
  color: 0xDD5544,
  roughness: 0.5,
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide
});

// Matrix material (inner fluid)
const matrixMat = new THREE.MeshBasicMaterial({
  color: 0xFF8866,
  transparent: true,
  opacity: 0.25
});

// Create a single detailed mitochondrion
// Real mitochondria: 0.5-1μm diameter × 1-7μm length; nucleus ~6μm diameter
// Real ratio: nucleus/mito diameter = 6/0.75 = 8:1
// Scaled: nucleus radius 2.4 (diam 4.8), so mito diameter ~0.6 (radius 0.3)
// Length typically 2-4x diameter, so length ~1.2-2.0
function createMitochondrion(scale = 1) {
  const mitoUnit = new THREE.Group();

  // Outer membrane (capsule) - properly proportioned to nucleus (8:1 ratio)
  const outerGeom = new THREE.CapsuleGeometry(0.30 * scale, 1.0 * scale, 8, 16);
  const outer = new THREE.Mesh(outerGeom, mitoOuterMat.clone());
  outer.userData = { organelle: 'Mitochondria' };
  mitoUnit.add(outer);

  // Inner membrane (slightly smaller capsule)
  const innerGeom = new THREE.CapsuleGeometry(0.26 * scale, 0.9 * scale, 8, 16);
  const inner = new THREE.Mesh(innerGeom, mitoInnerMat.clone());
  mitoUnit.add(inner);

  // Matrix (innermost, opaque core)
  const matrixGeom = new THREE.CapsuleGeometry(0.20 * scale, 0.7 * scale, 4, 8);
  const matrix = new THREE.Mesh(matrixGeom, matrixMat.clone());
  mitoUnit.add(matrix);

  // Cristae - folded inner membrane sheets
  const cristaeCount = 4 + Math.floor(Math.random() * 3);
  for (let c = 0; c < cristaeCount; c++) {
    const t = (c + 0.5) / cristaeCount; // 0 to 1 along length
    const yPos = (t - 0.5) * 0.8 * scale;

    // Create wavy sheet using PlaneGeometry with vertex displacement
    const sheetWidth = 0.4 * scale * (1 - Math.abs(t - 0.5) * 0.5);
    const sheetHeight = 0.12 * scale;
    const sheetGeom = new THREE.PlaneGeometry(sheetWidth, sheetHeight, 12, 4);

    // Add waves to the sheet
    const positions = sheetGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // Sinusoidal folding
      const wave = Math.sin(x * 12) * 0.03 * scale;
      positions.setZ(i, wave);
    }
    sheetGeom.computeVertexNormals();

    const crista = new THREE.Mesh(sheetGeom, cristaeMat.clone());
    crista.position.y = yPos;
    crista.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    crista.rotation.z = (Math.random() - 0.5) * 0.5;
    mitoUnit.add(crista);

    // Add a second crista at angle for depth
    const crista2 = crista.clone();
    crista2.rotation.y = Math.PI / 3;
    crista2.position.x = (Math.random() - 0.5) * 0.08 * scale;
    mitoUnit.add(crista2);
  }

  return mitoUnit;
}

// Place mitochondria throughout cell
const mitoPositions = [];
let mitoIdx = 0;
for (let attempts = 0; attempts < mitoCount * 5 && mitoIdx < mitoCount; attempts++) {
  const x = (Math.random() - 0.5) * 11;
  const y = (Math.random() - 0.5) * 11;
  const z = (Math.random() - 0.5) * 11;

  // Larger margin since mitochondria are bigger now
  if (isInsideCell(x, y, z, 1.8) && avoidsNucleus(x, y, z, 1.2)) {
    const scale = 0.5 + Math.random() * 0.4; // Smaller scale range since base size is larger
    const mito = createMitochondrion(scale);

    mito.position.set(x, y, z);
    mito.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI * 0.5
    );

    // Make outer membrane clickable
    mito.children[0].userData = { organelle: 'Mitochondria' };
    clickableMeshes.push(mito.children[0]);

    mitochondriaGroup.add(mito);
    mitoPositions.push({ x, y, z });
    mitoIdx++;
  }
}

cellGroup.add(mitochondriaGroup);
organelleGroups['Mitochondria'] = {
  group: mitochondriaGroup,
  meshes: mitochondriaGroup.children.map(m => m.children[0]),
  labelOffset: new THREE.Vector3(-3, -2, 2)
};

// Shared dummy object for instanced mesh positioning
const dummy = new THREE.Object3D();

// ============================================
// LYSOSOMES - Constrained inside cell
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

let lysoIdx = 0;
for (let attempts = 0; attempts < lysoCount * 3 && lysoIdx < lysoCount; attempts++) {
  const x = (Math.random() - 0.5) * 10;
  const y = (Math.random() - 0.5) * 10;
  const z = (Math.random() - 0.5) * 10;

  if (isInsideCell(x, y, z, 1.0) && avoidsNucleus(x, y, z, 0.5)) {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    lysoInstancedMesh.setMatrixAt(lysoIdx, dummy.matrix);
    lysoIdx++;
  }
}
lysoInstancedMesh.instanceMatrix.needsUpdate = true;
lysosomesGroup.add(lysoInstancedMesh);

cellGroup.add(lysosomesGroup);
organelleGroups['Lysosomes'] = {
  group: lysosomesGroup,
  meshes: [lysoInstancedMesh],
  labelOffset: new THREE.Vector3(-2, 2, 3)
};

// ============================================
// FREE RIBOSOMES - Constrained inside cell
// ============================================
const ribosomesGroup = new THREE.Group();
const riboCount = 200;

const riboMat = new THREE.MeshBasicMaterial({
  color: COLORS.FREE_RIBOSOME,
  transparent: true,
  opacity: 0.6
});

const freeRiboGeom = new THREE.DodecahedronGeometry(0.012, 0); // Smaller than RER ribosomes
const freeRiboInstancedMesh = new THREE.InstancedMesh(freeRiboGeom, riboMat, riboCount);
freeRiboInstancedMesh.userData = { organelle: 'Ribosomes' };
clickableMeshes.push(freeRiboInstancedMesh);

let freeRiboIdx = 0;
for (let i = 0; i < riboCount * 2 && freeRiboIdx < riboCount; i++) {
  const x = (Math.random() - 0.5) * 12;
  const y = (Math.random() - 0.5) * 10;
  const z = (Math.random() - 0.5) * 10;

  // Must be inside cell and avoid nucleus
  if (isInsideCell(x, y, z, 0.5) && avoidsNucleus(x, y, z, 0.5)) {
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

// Organelle info popup elements
const organellePopup = document.getElementById('organelle-popup');
const popupTitle = document.getElementById('popup-title');
const popupDescription = document.getElementById('popup-description');
const popupFunction = document.getElementById('popup-function');
const closePopupBtn = document.getElementById('close-popup-btn');

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

// Close organelle popup
closePopupBtn.addEventListener('click', () => {
  organellePopup.classList.add('hidden');
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
// ER PARAMETER CONTROLS
// ============================================
const erPanel = document.getElementById('er-panel');
const erSettingsBtn = document.getElementById('er-settings-btn');
const closeErPanelBtn = document.getElementById('close-er-panel');
const regenerateErBtn = document.getElementById('regenerate-er-btn');

const foldSlider = document.getElementById('fold-slider');
const ampSlider = document.getElementById('amp-slider');
const smoothSlider = document.getElementById('smooth-slider');
const tubeSlider = document.getElementById('tube-slider');
const opacitySlider = document.getElementById('opacity-slider');
const membraneSlider = document.getElementById('membrane-slider');

const foldValue = document.getElementById('fold-value');
const ampValue = document.getElementById('amp-value');
const smoothValue = document.getElementById('smooth-value');
const tubeValue = document.getElementById('tube-value');
const opacityValue = document.getElementById('opacity-value');
const membraneValue = document.getElementById('membrane-value');

// ER Parameters state
const erParams = {
  folds: 34,
  amplitude: 0.82,
  smoothness: 48,
  tubeThickness: 0.40,
  opacity: 0.20,        // 20% ER opacity
  membraneOpacity: 0.10 // 10% cell membrane opacity
};

// Toggle panel
erSettingsBtn.addEventListener('click', () => {
  erPanel.classList.toggle('hidden');
});

closeErPanelBtn.addEventListener('click', () => {
  erPanel.classList.add('hidden');
});

// Update display values
foldSlider.addEventListener('input', (e) => {
  erParams.folds = parseInt(e.target.value);
  foldValue.textContent = erParams.folds;
});

ampSlider.addEventListener('input', (e) => {
  erParams.amplitude = parseInt(e.target.value) / 100;
  ampValue.textContent = erParams.amplitude.toFixed(2);
});

smoothSlider.addEventListener('input', (e) => {
  erParams.smoothness = parseInt(e.target.value);
  smoothValue.textContent = erParams.smoothness;
});

tubeSlider.addEventListener('input', (e) => {
  erParams.tubeThickness = parseInt(e.target.value) / 100;
  tubeValue.textContent = erParams.tubeThickness.toFixed(2);
});

opacitySlider.addEventListener('input', (e) => {
  erParams.opacity = parseInt(e.target.value) / 100;
  opacityValue.textContent = erParams.opacity.toFixed(2);
  // Live update ER opacity
  rerGroup.traverse((child) => {
    if (child.material && child.material.opacity !== undefined) {
      child.material.opacity = erParams.opacity;
    }
  });
});

membraneSlider.addEventListener('input', (e) => {
  erParams.membraneOpacity = parseInt(e.target.value) / 100;
  membraneValue.textContent = erParams.membraneOpacity.toFixed(2);
  // Live update membrane opacity
  membraneMaterial.opacity = erParams.membraneOpacity;
  membraneRimMaterial.opacity = erParams.membraneOpacity * 0.3;
  membraneWireMaterial.opacity = erParams.membraneOpacity * 0.6;
});

// Regenerate ER with new parameters
regenerateErBtn.addEventListener('click', () => {
  regenerateER(erParams);
});

// Function to regenerate ER with new parameters
function regenerateER(params) {
  // Remove old ER meshes
  while (rerGroup.children.length > 0) {
    const child = rerGroup.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
    rerGroup.remove(child);
  }

  // Remove old from clickables
  const rerClickableIndices = [];
  clickableMeshes.forEach((mesh, idx) => {
    if (mesh.userData && mesh.userData.organelle === 'RER') {
      rerClickableIndices.push(idx);
    }
  });
  for (let i = rerClickableIndices.length - 1; i >= 0; i--) {
    clickableMeshes.splice(rerClickableIndices[i], 1);
  }

  // Create new ER material with updated opacity
  const newRerMaterial = new THREE.MeshPhysicalMaterial({
    color: COLORS.RER,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: params.opacity,
    emissive: 0x115555,
    emissiveIntensity: 0.2,
    bumpMap: ribosomeBumpTexture,
    bumpScale: 0.15
  });

  // Generate new tori with current parameters
  const newRerTori = [];
  const baseRerLayers = [
    { pos: [-2.0, 0, 0], radius: 2.5, rot: [0, 0, 0] },
    { pos: [-2.0, 0.4, 0], radius: 2.8, rot: [0.1, 0.2, 0] },
    { pos: [-2.0, -0.4, 0], radius: 2.3, rot: [-0.1, -0.1, 0] },
    { pos: [-1.5, 2.0, 0], radius: 2.0, rot: [0.3, 0, 0.1] },
    { pos: [-2.5, 2.5, 0.5], radius: 1.8, rot: [0.4, 0.2, 0] },
    { pos: [-1.5, -2.0, 0], radius: 2.0, rot: [-0.3, 0, -0.1] },
    { pos: [-2.5, -2.5, -0.5], radius: 1.6, rot: [-0.4, -0.2, 0] },
    { pos: [-1.0, 0.5, 2.5], radius: 1.5, rot: [0.5, 0, 0.3] },
    { pos: [-1.0, -0.5, -2.5], radius: 1.5, rot: [-0.5, 0, -0.3] },
    { pos: [-2.0, 1.0, 2.0], radius: 1.3, rot: [0.3, 0.3, 0.2] },
    { pos: [-2.0, -1.0, -2.0], radius: 1.3, rot: [-0.3, -0.3, -0.2] },
    { pos: [-4.0, 0, 1.5], radius: 1.2, rot: [0.2, 0.8, 0] },
    { pos: [-4.0, 0, -1.5], radius: 1.2, rot: [-0.2, -0.8, 0] },
    { pos: [-4.5, 1.5, 0], radius: 1.0, rot: [0.5, 0.5, 0.2] },
    { pos: [-4.5, -1.5, 0], radius: 1.0, rot: [-0.5, -0.5, -0.2] },
    { pos: [0.5, 0.5, 1.0], radius: 0.8, rot: [0.2, 0.5, 0.1] },
    { pos: [0.5, -0.5, -1.0], radius: 0.8, rot: [-0.2, -0.5, -0.1] },
  ];

  baseRerLayers.forEach((layer) => {
    if (!isInsideCell(layer.pos[0], layer.pos[1], layer.pos[2], 1.0)) return;
    if (!avoidsNucleus(layer.pos[0], layer.pos[1], layer.pos[2], 1.0)) return;

    const geometry = createConvolutedTorus(layer.radius, params.tubeThickness, params.folds, params.amplitude, params.smoothness);
    const torus = new THREE.Mesh(geometry, newRerMaterial.clone());

    torus.position.set(layer.pos[0], layer.pos[1], layer.pos[2]);
    torus.rotation.set(layer.rot[0], layer.rot[1], layer.rot[2]);

    torus.userData = { organelle: 'RER' };
    clickableMeshes.push(torus);
    rerGroup.add(torus);
    newRerTori.push(torus);
  });

  // Recreate ribosomes on new tori
  const newRiboCount = 2000;
  const newRiboGeom = new THREE.SphereGeometry(0.02, 4, 4);
  const newRiboMat = new THREE.MeshStandardMaterial({
    color: 0x2299aa,
    roughness: 0.5,
    emissive: 0x115566,
    emissiveIntensity: 0.3
  });

  const newRiboInstances = new THREE.InstancedMesh(newRiboGeom, newRiboMat, newRiboCount);
  const riboDummyNew = new THREE.Object3D();

  let newRiboIdx = 0;
  newRerTori.forEach((torus) => {
    torus.updateMatrixWorld();
    const torusMatrix = torus.matrixWorld;
    const ribosPerTorus = Math.floor(newRiboCount / newRerTori.length);
    const positions = torus.geometry.attributes.position;

    for (let r = 0; r < ribosPerTorus && newRiboIdx < newRiboCount; r++) {
      const vertIdx = Math.floor(Math.random() * positions.count);
      const localPos = new THREE.Vector3(
        positions.getX(vertIdx),
        positions.getY(vertIdx),
        positions.getZ(vertIdx)
      );
      localPos.normalize().multiplyScalar(localPos.length() + 0.05);
      const worldPos = localPos.clone().applyMatrix4(torusMatrix);

      if (isInsideCell(worldPos.x, worldPos.y, worldPos.z, 0.3)) {
        riboDummyNew.position.copy(worldPos);
        riboDummyNew.scale.setScalar(0.7 + Math.random() * 0.6);
        riboDummyNew.updateMatrix();
        newRiboInstances.setMatrixAt(newRiboIdx, riboDummyNew.matrix);
        newRiboIdx++;
      }
    }
  });

  newRiboInstances.instanceMatrix.needsUpdate = true;
  newRiboInstances.userData = { organelle: 'RER' };
  clickableMeshes.push(newRiboInstances);
  rerGroup.add(newRiboInstances);

  console.log(`ER regenerated: folds=${params.folds}, amp=${params.amplitude}, tube=${params.tubeThickness}`);
}

// ============================================
// ORGANELLE INFO POPUP
// ============================================
function showOrganellePopup(feature) {
  if (!feature || !INFO_CONTENT[feature]) {
    organellePopup.classList.add('hidden');
    return;
  }

  const info = INFO_CONTENT[feature];
  popupTitle.textContent = info.title;
  popupDescription.textContent = info.description;
  popupFunction.textContent = info.function;

  // Fixed position on left side - no positioning needed
  organellePopup.classList.remove('hidden');
}

function hideOrganellePopup() {
  organellePopup.classList.add('hidden');
}

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

  // Hide popup when deselecting
  if (!feature) {
    hideOrganellePopup();
  }

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
      // Show popup with organelle info on left side panel
      showOrganellePopup(organelle);
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

// Apply user's preferred ER parameters at launch
regenerateER(erParams);

console.log('PlasmaCell loaded - The Antibody Story:', Object.keys(organelleGroups));
