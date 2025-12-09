import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createMitochondriaField,
  generateSphericalMitochondriaPositions,
  createSimpleGolgi,
  createSimpleER,
  createInstancedLysosomes,
  generateLysosomePositions,
  getMeshesFromGroup
} from './organelles/index.js';

// ============================================
// MACROPHAGE - "The Hunter"
// Anatomically Accurate 3D Visualization
// ============================================
// Based on research:
// - Size: ~21μm diameter (largest white blood cell)
// - Shape: Amoeboid, irregular, constantly changing
// - Nucleus: Kidney/horseshoe-shaped, eccentric
// - Many lysosomes (0.2-0.8μm)
// - Phagosomes containing engulfed material
// - Dynamic pseudopods (lamellipodia, filopodia)
// ============================================

let scene, camera, renderer, controls;
let macrophageGroup, cellBody, nucleus;
let clock = new THREE.Clock();
let isExploring = false;

// Organelles
let lysosomes = [];
let phagosomes = [];
let mitochondria = [];

// Pseudopods for animation
let pseudopods = [];
let filopodia = [];

// Target bacteria for phagocytosis demo
let bacteria = [];
let activeBacterium = null;
let phagocytosisProgress = 0;
let isPhagocytosing = false;

// Surface features
let surfaceRuffles = [];
let receptors = [];

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let clickableMeshes = [];
let activeOrganelle = null;

// Organelle information for popup
const organelleInfo = {
  'Nucleus': {
    name: 'Nucleus',
    subtitle: 'Command Center',
    description: 'The rounded nucleus (with subtle indentation from its monocyte origin) is positioned eccentrically in the macrophage. It contains the genetic instructions for producing all the enzymes and receptors needed for phagocytosis. Unlike most cells, macrophages can survive for months in tissues.',
    color: '#a855f7'
  },
  'Lysosomes': {
    name: 'Lysosomes',
    subtitle: 'Digestive Factories',
    description: 'Macrophages contain 40+ lysosomes packed with over 50 different digestive enzymes. After phagocytosis, lysosomes fuse with phagosomes to create phagolysosomes, where pathogens are destroyed by acidic pH and enzymatic attack.',
    color: '#22c55e'
  },
  'Phagosomes': {
    name: 'Phagosomes',
    subtitle: 'Capture Vesicles',
    description: 'These membrane-bound compartments form when the macrophage engulfs a pathogen. They contain partially digested bacteria and debris. Phagosomes mature by fusing with lysosomes to complete the destruction process.',
    color: '#f59e0b'
  },
  'Mitochondria': {
    name: 'Mitochondria',
    subtitle: 'Energy Powerhouses',
    description: 'Phagocytosis is energy-intensive. These organelles produce the ATP needed to extend pseudopods, engulf pathogens, and power the digestive machinery. Macrophages have abundant mitochondria to fuel their hunting activities.',
    color: '#ef4444'
  },
  'Golgi': {
    name: 'Golgi Apparatus',
    subtitle: 'Protein Processing',
    description: 'The Golgi processes and packages digestive enzymes destined for lysosomes. It also modifies surface receptors that help the macrophage recognize pathogens through pattern recognition.',
    color: '#fbbf24'
  },
  'Pseudopods': {
    name: 'Pseudopods',
    subtitle: 'Hunting Arms',
    description: 'These dynamic arm-like extensions allow the macrophage to crawl through tissues and surround prey. Driven by actin polymerization, pseudopods can extend and retract in seconds to capture bacteria.',
    color: '#d4a574'
  },
  'Membrane': {
    name: 'Cell Membrane',
    subtitle: 'Active Surface',
    description: 'The macrophage membrane is covered with pattern recognition receptors (PRRs) that detect bacterial molecules. Surface ruffles increase the membrane area for efficient phagocytosis.',
    color: '#fda4af'
  },
  'Bacteria': {
    name: 'E. coli Bacteria',
    subtitle: 'The Prey',
    description: 'These rod-shaped bacteria (1-2μm) are common targets for macrophages. Their cell wall contains lipopolysaccharide (LPS), which macrophage receptors recognize as "foreign." Once detected, the macrophage extends pseudopods to engulf and digest the bacterium in about 30 minutes.',
    color: '#16a34a'
  }
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1520); // Brighter purple-tinted background
  scene.fog = new THREE.Fog(0x1a1520, 30, 80); // Push fog back for better visibility

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  setupLighting();
  createMacrophage();
  createBacteria();
  createEnvironment();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  // Match plasma cell lighting setup exactly
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

  // Interior glow - golden-amber for macrophage warmth
  const innerLight = new THREE.PointLight(0xffcc66, 0.8, 20);
  innerLight.position.set(0, 0, 0);
  scene.add(innerLight);

  // Subtle hemisphere light for natural feel
  const hemiLight = new THREE.HemisphereLight(0xaaddff, 0x445566, 0.4);
  scene.add(hemiLight);
}

// ============================================
// AMOEBOID CELL BODY
// Uses noise-deformed sphere for organic shape
// ============================================

function createAmoeboidGeometry(baseRadius = 3, detail = 64) {
  const geometry = new THREE.IcosahedronGeometry(baseRadius, 4);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  // Apply organic deformation
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);

    // Normalize to get direction
    const dir = vertex.clone().normalize();

    // Multi-octave noise for organic shape
    const noise1 = Math.sin(dir.x * 3 + dir.y * 2) * Math.cos(dir.z * 2.5) * 0.3;
    const noise2 = Math.sin(dir.x * 5 + dir.z * 4) * 0.15;
    const noise3 = Math.cos(dir.y * 4 + dir.x * 3) * 0.1;

    const displacement = 1 + noise1 + noise2 + noise3;

    vertex.multiplyScalar(displacement);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createMacrophage() {
  macrophageGroup = new THREE.Group();

  // Main cell body - amoeboid shape
  const bodyGeometry = createAmoeboidGeometry(3, 64);
  // Based on research: Macrophage ~21μm diameter
  // Using radius 3 = diameter 6 as our scale unit
  // So 1 unit ≈ 3.5μm
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd4a574,
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    transmission: 0.6, // 60% transmission = 40% opaque - more visible membrane
    thickness: 0.5,
    attenuationColor: new THREE.Color(0x8b6914),
    attenuationDistance: 3.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35, // Increased opacity for better visibility
  });

  cellBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
  cellBody.userData = { organelle: 'Membrane' };
  // Don't add membrane to clickableMeshes - it blocks clicks on internal organelles
  macrophageGroup.add(cellBody);

  // Create internal structures
  createNucleus();
  createLysosomes();
  createPhagosomes();
  createMitochondria();
  createGolgi();
  createER();

  // Create surface features
  createPseudopods();
  createFilopodia();
  createSurfaceRuffles();
  createReceptors();

  scene.add(macrophageGroup);
}

// ============================================
// NUCLEUS - Rounded with slight indentation
// Macrophage nuclei are more rounded than monocyte nuclei
// but retain some lobulation
// ============================================

function createNucleus() {
  const nucleusGroup = new THREE.Group();

  // Scale: 1 unit ≈ 3.5 μm
  // Nucleus diameter: ~5-7 μm → ~1.5-2 units diameter → radius ~0.85
  const nucleusRadius = 0.85;

  // Create rounded nucleus with slight indentation (not kidney-shaped)
  // Use a deformed sphere for more organic, rounded shape
  const nucleusGeometry = new THREE.SphereGeometry(nucleusRadius, 32, 32);
  const positions = nucleusGeometry.attributes.position;

  // Apply subtle indentation on one side (legacy of monocyte origin)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // Slight indentation on -x side
    const indentFactor = Math.max(0, -x / nucleusRadius) * 0.15;
    const newX = x + indentFactor * nucleusRadius;

    // Slight organic variation
    const noise = Math.sin(x * 3 + y * 2) * Math.cos(z * 2.5) * 0.03;

    positions.setXYZ(i, newX * (1 + noise), y * (1 + noise * 0.5), z * (1 + noise * 0.5));
  }
  nucleusGeometry.computeVertexNormals();

  const nucleusMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4a2882,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.3,
    transmission: 0.1,
  });

  const nucleusMesh = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
  nucleusGroup.add(nucleusMesh);

  // Add nucleolus (~1-2 μm → ~0.4 units)
  const nucleolusGeometry = new THREE.SphereGeometry(0.25, 16, 16);
  const nucleolusMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d1a4a,
    roughness: 0.5,
  });
  const nucleolus = new THREE.Mesh(nucleolusGeometry, nucleolusMaterial);
  nucleolus.position.set(0.2, 0.1, 0);
  nucleusGroup.add(nucleolus);

  // Chromatin spots (condensed chromatin regions)
  for (let i = 0; i < 10; i++) {
    const chromatinGeom = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8);
    const chromatinMat = new THREE.MeshBasicMaterial({
      color: 0x1a0d2e,
      transparent: true,
      opacity: 0.7,
    });
    const chromatin = new THREE.Mesh(chromatinGeom, chromatinMat);

    // Distribute inside nucleus
    const r = Math.random() * nucleusRadius * 0.7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    chromatin.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    nucleusGroup.add(chromatin);
  }

  // Position nucleus eccentrically (pushed to one side)
  nucleusGroup.position.set(1.0, 0.2, 0);

  // Make nucleus clickable
  nucleusGroup.userData = { organelle: 'Nucleus' };
  nucleusGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData = { organelle: 'Nucleus' };
      clickableMeshes.push(child);
    }
  });

  nucleus = nucleusGroup;
  macrophageGroup.add(nucleusGroup);
}

// ============================================
// LYSOSOMES - Many, varied sizes
// Key feature of macrophages
// ============================================

function createLysosomes() {
  const lysoCount = 40; // Macrophages have MANY lysosomes

  const lysoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x22c55e,
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x0a3d1a,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.85,
  });

  for (let i = 0; i < lysoCount; i++) {
    // Varied sizes (0.2-0.8μm scaled to scene)
    const size = 0.1 + Math.random() * 0.25;
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const lysosome = new THREE.Mesh(geometry, lysoMaterial.clone());

    // Distribute throughout cytoplasm, avoiding nucleus
    // Keep within radius 1.8 to stay safely inside amoeboid membrane
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3.5
      );
    } while (pos.distanceTo(new THREE.Vector3(1.0, 0.2, 0)) < 1.3 || pos.length() > 1.8);

    lysosome.position.copy(pos);
    lysosome.userData.originalPos = pos.clone();
    lysosome.userData.phase = Math.random() * Math.PI * 2;
    lysosome.userData.organelle = 'Lysosomes';
    clickableMeshes.push(lysosome);

    lysosomes.push(lysosome);
    macrophageGroup.add(lysosome);
  }
}

// ============================================
// PHAGOSOMES - Containing engulfed material
// ============================================

function createPhagosomes() {
  const phagoCount = 4;

  for (let i = 0; i < phagoCount; i++) {
    const phagoGroup = new THREE.Group();

    // Phagosome membrane
    const size = 0.4 + Math.random() * 0.4;
    const membraneGeometry = new THREE.SphereGeometry(size, 16, 16);
    const membraneMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb45309,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
    phagoGroup.add(membrane);

    // Contents (partially digested bacteria - same scale as live bacteria)
    const contentsCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < contentsCount; j++) {
      const contentGeom = new THREE.CapsuleGeometry(0.05, 0.12, 4, 8);
      const contentMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7,
      });
      const content = new THREE.Mesh(contentGeom, contentMat);
      content.position.set(
        (Math.random() - 0.5) * size * 0.5,
        (Math.random() - 0.5) * size * 0.5,
        (Math.random() - 0.5) * size * 0.5
      );
      content.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      phagoGroup.add(content);
    }

    // Position phagosomes - keep within radius 2.0 to stay inside membrane
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 3.5
      );
    } while (pos.distanceTo(new THREE.Vector3(1.0, 0.2, 0)) < 1.3 || pos.length() > 1.8);

    phagoGroup.position.copy(pos);
    phagoGroup.userData.originalPos = pos.clone();
    phagoGroup.userData.phase = Math.random() * Math.PI * 2;
    phagoGroup.userData.organelle = 'Phagosomes';
    phagoGroup.traverse((child) => {
      if (child.isMesh) {
        child.userData = { organelle: 'Phagosomes' };
        clickableMeshes.push(child);
      }
    });

    phagosomes.push(phagoGroup);
    macrophageGroup.add(phagoGroup);
  }
}

// ============================================
// MITOCHONDRIA - Accurate count and proportions
// Scale: 1 unit ≈ 3.5 μm
// Mitochondria: ~0.5 μm diameter, 1-2 μm length (similar to E. coli!)
// Count: ~250 per macrophage
// All uniform appearance using instancing for consistency
// ============================================

function createMitochondria() {
  const nucleusPos = new THREE.Vector3(1.0, 0.2, 0);
  const mitoCount = 250;

  // Generate positions throughout cytoplasm, avoiding nucleus
  // Cell body radius is 3, but amoeboid deformation can indent ~0.5-1.0
  // Keep organelles within radius 2.0 to stay safely inside membrane
  const positions = generateSphericalMitochondriaPositions({
    count: mitoCount,
    radiusX: 2.0,
    radiusY: 1.8,
    radiusZ: 2.0,
    minRadius: 0.6,
    excludeRegions: [{ center: nucleusPos, radius: 1.2 }]
  });

  // Accurate size: ~0.5 μm diameter → 0.14 units radius
  // Length: 1-2 μm → 0.28-0.57 units (using 0.4 average)
  // Note: Mitochondria are similar in size to E. coli bacteria!
  const mitoGeometry = new THREE.CapsuleGeometry(0.07, 0.35, 6, 10);
  const mitoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x881111,
    emissiveIntensity: 0.25, // Glow for "energy" visualization
    clearcoat: 0.2
  });

  const instancedMesh = new THREE.InstancedMesh(mitoGeometry, mitoMaterial, mitoCount);
  instancedMesh.userData = { organelle: 'Mitochondria' };

  const dummy = new THREE.Object3D();
  for (let i = 0; i < mitoCount; i++) {
    dummy.position.copy(positions[i]);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  clickableMeshes.push(instancedMesh);
  macrophageGroup.add(instancedMesh);
}

// ============================================
// GOLGI APPARATUS - Using shared organelle library
// ============================================

function createGolgi() {
  const golgiGroup = createSimpleGolgi({
    position: new THREE.Vector3(-0.8, -0.5, 0.5),
    cisternaCount: 5,
    scale: 0.8,
    organelleName: 'Golgi'
  });

  golgiGroup.rotation.z = 0.2;

  // Make Golgi clickable
  golgiGroup.traverse((child) => {
    if (child.isMesh) {
      child.userData = { organelle: 'Golgi' };
      clickableMeshes.push(child);
    }
  });

  macrophageGroup.add(golgiGroup);
}

// ============================================
// ENDOPLASMIC RETICULUM - Using shared organelle library
// ============================================

function createER() {
  const erGroup = createSimpleER({
    position: new THREE.Vector3(0, 0, 0),
    tubeCount: 20,
    spreadRadius: 1.6, // Keep inside membrane (cell radius 3, but amoeboid deformation can indent 0.5-1.0)
    tubeRadius: 0.04,
    organelleName: 'ER'
  });

  macrophageGroup.add(erGroup);
}

// ============================================
// PSEUDOPODS - Dynamic arm-like extensions
// Improved with tapered, organic shapes
// ============================================

function createPseudopods() {
  const podCount = 6;

  for (let i = 0; i < podCount; i++) {
    const podGroup = new THREE.Group();
    const angle = (i / podCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const length = 2.0 + Math.random() * 1.5;
    const yOffset = (Math.random() - 0.5) * 1.5;

    // Create more organic curved path with multiple control points
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.cos(angle) * length * 0.3,
        yOffset * 0.3,
        Math.sin(angle) * length * 0.3
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.1) * length * 0.6,
        yOffset * 0.6 + (Math.random() - 0.5) * 0.3,
        Math.sin(angle + 0.1) * length * 0.6
      ),
      new THREE.Vector3(
        Math.cos(angle) * length * 0.85,
        yOffset * 0.8,
        Math.sin(angle) * length * 0.85
      ),
      new THREE.Vector3(
        Math.cos(angle - 0.05) * length,
        yOffset,
        Math.sin(angle - 0.05) * length
      )
    ]);

    // Main pseudopod body - tapered tube
    const segments = 30;
    const radiusFunc = (t) => {
      // Taper from thick base to thin tip with slight bulge
      const base = 0.5 - t * 0.35;
      const bulge = Math.sin(t * Math.PI) * 0.1;
      return Math.max(0.08, base + bulge);
    };

    // Create custom tapered geometry
    const points = curve.getPoints(segments);
    const frames = curve.computeFrenetFrames(segments);

    const podGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const radialSegments = 12;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const radius = radiusFunc(t);
      const point = points[j];
      const N = frames.normals[j];
      const B = frames.binormals[j];

      for (let k = 0; k <= radialSegments; k++) {
        const theta = (k / radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;

        vertices.push(
          point.x + radius * nx,
          point.y + radius * ny,
          point.z + radius * nz
        );
        normals.push(nx, ny, nz);
        uvs.push(k / radialSegments, t);
      }
    }

    for (let j = 0; j < segments; j++) {
      for (let k = 0; k < radialSegments; k++) {
        const a = j * (radialSegments + 1) + k;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    podGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    podGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    podGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    podGeometry.setIndex(indices);

    const podMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd4a574,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });

    const pseudopod = new THREE.Mesh(podGeometry, podMaterial);

    // Add membrane-like end cap (lamellipodium)
    const tipRadius = radiusFunc(1);
    const capGeometry = new THREE.SphereGeometry(tipRadius * 1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe0b090,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.copy(points[points.length - 1]);
    cap.lookAt(points[points.length - 2]);

    podGroup.add(pseudopod);
    podGroup.add(cap);

    // Position at cell surface
    const surfacePoint = new THREE.Vector3(
      Math.cos(angle) * 2.9,
      yOffset * 0.3,
      Math.sin(angle) * 2.9
    );
    podGroup.position.copy(surfacePoint);

    podGroup.userData.angle = angle;
    podGroup.userData.baseLength = length;
    podGroup.userData.phase = Math.random() * Math.PI * 2;
    podGroup.userData.organelle = 'Pseudopods';

    pseudopod.userData.organelle = 'Pseudopods';
    clickableMeshes.push(pseudopod);

    pseudopods.push(podGroup);
    macrophageGroup.add(podGroup);
  }
}

// ============================================
// FILOPODIA - Thin finger-like projections
// ============================================

function createFilopodia() {
  const filoCount = 15;

  const filoMaterial = new THREE.MeshBasicMaterial({
    color: 0xc4956a,
    transparent: true,
    opacity: 0.7,
  });

  for (let i = 0; i < filoCount; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI;

    const dir = new THREE.Vector3(
      Math.cos(angle1) * Math.cos(angle2),
      Math.sin(angle2),
      Math.sin(angle1) * Math.cos(angle2)
    );

    const length = 0.8 + Math.random() * 1.2;
    const start = dir.clone().multiplyScalar(2.8);
    const end = dir.clone().multiplyScalar(2.8 + length);

    const geometry = new THREE.CylinderGeometry(0.03, 0.01, length, 6);
    const filopodium = new THREE.Mesh(geometry, filoMaterial);

    filopodium.position.copy(start.clone().add(end).multiplyScalar(0.5));
    filopodium.lookAt(end);
    filopodium.rotateX(Math.PI / 2);

    filopodium.userData.phase = Math.random() * Math.PI * 2;
    filopodium.userData.dir = dir;
    filopodium.userData.baseLength = length;

    filopodia.push(filopodium);
    macrophageGroup.add(filopodium);
  }
}

// ============================================
// SURFACE RUFFLES
// ============================================

function createSurfaceRuffles() {
  const ruffleCount = 12;

  const ruffleMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8956a,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < ruffleCount; i++) {
    const width = 0.5 + Math.random() * 0.5;
    const height = 0.2 + Math.random() * 0.3;

    const geometry = new THREE.PlaneGeometry(width, height, 8, 4);
    const positions = geometry.attributes.position;

    // Add waves
    for (let j = 0; j < positions.count; j++) {
      const x = positions.getX(j);
      const wave = Math.sin(x * 8) * 0.05;
      positions.setZ(j, wave);
    }
    geometry.computeVertexNormals();

    const ruffle = new THREE.Mesh(geometry, ruffleMaterial);

    // Position on surface
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = (Math.random() - 0.5) * Math.PI * 0.8;

    ruffle.position.set(
      Math.cos(angle1) * Math.cos(angle2) * 3,
      Math.sin(angle2) * 3,
      Math.sin(angle1) * Math.cos(angle2) * 3
    );
    ruffle.lookAt(0, 0, 0);
    ruffle.rotateZ(Math.random() * Math.PI);

    ruffle.userData.phase = Math.random() * Math.PI * 2;

    surfaceRuffles.push(ruffle);
    macrophageGroup.add(ruffle);
  }
}

// ============================================
// SURFACE RECEPTORS
// ============================================

function createReceptors() {
  const receptorCount = 60;

  const receptorMaterial = new THREE.MeshBasicMaterial({
    color: 0xf87171,
    transparent: true,
    opacity: 0.8,
  });

  for (let i = 0; i < receptorCount; i++) {
    const geometry = new THREE.SphereGeometry(0.05, 6, 6);
    const receptor = new THREE.Mesh(geometry, receptorMaterial);

    // Distribute on cell surface
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 3.0 + Math.random() * 0.1;

    receptor.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );

    receptors.push(receptor);
    macrophageGroup.add(receptor);
  }
}

// ============================================
// BACTERIA - Targets for phagocytosis
// E. coli: ~0.5 μm diameter, 1-2 μm length (similar to mitochondria!)
// ============================================

function createBacteria() {
  const bacCount = 12; // More bacteria for active hunting scene

  for (let i = 0; i < bacCount; i++) {
    const bacGroup = new THREE.Group();

    // Rod-shaped bacterium (E. coli: ~1-2μm length, ~0.5μm diameter)
    // At our scale: 1 unit ≈ 3.5μm, so bacteria should be ~0.4-0.6 units long
    // Radius ~0.07 (diameter 0.14 ≈ 0.5μm), length ~0.3 (total ~0.44 units ≈ 1.5μm)
    const bodyGeometry = new THREE.CapsuleGeometry(0.07, 0.3, 8, 12);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x16a34a,
      roughness: 0.5,
      metalness: 0.0,
      emissive: 0x052e16,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bacGroup.add(body);

    // Flagella
    const flagellaMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.6,
    });

    // Flagella scaled to match smaller bacteria
    for (let f = 0; f < 3; f++) {
      const points = [];
      for (let p = 0; p < 10; p++) {
        points.push(new THREE.Vector3(
          Math.sin(p * 0.8) * 0.03,
          -0.2 - p * 0.05,
          Math.cos(p * 0.8) * 0.03
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const flagGeom = new THREE.TubeGeometry(curve, 20, 0.008, 6, false);
      const flagellum = new THREE.Mesh(flagGeom, flagellaMaterial);
      flagellum.rotation.y = (f / 3) * Math.PI * 2;
      bacGroup.add(flagellum);
    }

    // Random position around macrophage
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * 4;
    bacGroup.position.set(
      Math.cos(angle) * dist,
      (Math.random() - 0.5) * 4,
      Math.sin(angle) * dist
    );
    bacGroup.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    bacGroup.userData.angle = angle;
    bacGroup.userData.phase = Math.random() * Math.PI * 2;
    bacGroup.userData.speed = 0.3 + Math.random() * 0.3;
    bacGroup.userData.alive = true;
    bacGroup.userData.organelle = 'Bacteria';
    bacGroup.userData.beingEaten = false;
    bacGroup.userData.eatProgress = 0;

    // Make bacteria clickable
    bacGroup.traverse((child) => {
      if (child.isMesh) {
        child.userData = { organelle: 'Bacteria' };
        clickableMeshes.push(child);
      }
    });

    bacteria.push(bacGroup);
    scene.add(bacGroup);
  }
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Create star field like plasma cell for atmospheric depth
  createStarField();

  // Floating cytoplasm/tissue particles inside viewing area
  createTissueParticles();

  // Add fog for depth perception
  scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

  // Collagen fiber network in background (tissue context)
  createCollagenNetwork();

  // Floating cells in background (other immune cells)
  createBackgroundCells();
}

function createStarField() {
  const starCount = 4000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const radius = 60 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Warm amber/pink tones for tissue environment
    const brightness = 0.4 + Math.random() * 0.4;
    colors[i * 3] = brightness + Math.random() * 0.2;
    colors[i * 3 + 1] = brightness * 0.7;
    colors[i * 3 + 2] = brightness * 0.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true
  });

  scene.add(new THREE.Points(geometry, material));
}

function createTissueParticles() {
  const particleCount = 600;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const r = Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.06,
    color: 0xeebb88,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true
  });

  scene.add(new THREE.Points(geometry, material));
}

function createCollagenNetwork() {
  const collagenMaterial = new THREE.MeshBasicMaterial({
    color: 0x886655,
    transparent: true,
    opacity: 0.2,
  });

  for (let i = 0; i < 20; i++) {
    const points = [];
    const startPos = new THREE.Vector3(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 30,
      -20 - Math.random() * 30
    );

    for (let j = 0; j < 4; j++) {
      points.push(new THREE.Vector3(
        startPos.x + (Math.random() - 0.5) * 15,
        startPos.y + (Math.random() - 0.5) * 10,
        startPos.z + j * 5
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 16, 0.15 + Math.random() * 0.2, 6, false);
    const fiber = new THREE.Mesh(tubeGeometry, collagenMaterial);
    scene.add(fiber);
  }
}

function createBackgroundCells() {
  // Distant cells (red blood cells, other leukocytes)
  const cellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcc6666,
    roughness: 0.5,
    transparent: true,
    opacity: 0.3,
  });

  for (let i = 0; i < 8; i++) {
    const size = 0.8 + Math.random() * 1.2;
    const cellGeometry = new THREE.SphereGeometry(size, 12, 12);
    const cell = new THREE.Mesh(cellGeometry, cellMaterial.clone());

    cell.position.set(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 25,
      -15 - Math.random() * 25
    );

    // Slight deformation for organic look
    cell.scale.set(
      1 + (Math.random() - 0.5) * 0.3,
      1 + (Math.random() - 0.5) * 0.3,
      1 + (Math.random() - 0.5) * 0.3
    );

    scene.add(cell);
  }
}

// ============================================
// ANIMATION
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Animate macrophage body (subtle pulsing/breathing)
  if (macrophageGroup) {
    macrophageGroup.rotation.y = time * 0.1;
    macrophageGroup.position.y = Math.sin(time * 0.3) * 0.1;

    // Slight scale breathing
    const breathe = 1 + Math.sin(time * 0.5) * 0.02;
    cellBody.scale.set(breathe, breathe * 0.98, breathe);
  }

  // Animate lysosomes (Brownian motion)
  lysosomes.forEach((lyso, i) => {
    const orig = lyso.userData.originalPos;
    const phase = lyso.userData.phase;
    lyso.position.x = orig.x + Math.sin(time * 1.5 + phase) * 0.05;
    lyso.position.y = orig.y + Math.cos(time * 1.3 + phase) * 0.05;
    lyso.position.z = orig.z + Math.sin(time * 1.1 + phase + 1) * 0.05;
  });

  // Animate phagosomes
  phagosomes.forEach((phago) => {
    const orig = phago.userData.originalPos;
    const phase = phago.userData.phase;
    phago.position.x = orig.x + Math.sin(time * 0.8 + phase) * 0.03;
    phago.position.y = orig.y + Math.cos(time * 0.7 + phase) * 0.03;
    phago.rotation.y = time * 0.2 + phase;
  });

  // Animate pseudopods (extending/retracting)
  pseudopods.forEach((pod, i) => {
    const phase = pod.userData.phase;
    const scale = 0.8 + Math.sin(time * 0.4 + phase) * 0.3;
    pod.scale.set(scale, scale, scale);
  });

  // Animate filopodia (probing motion)
  filopodia.forEach((filo, i) => {
    const phase = filo.userData.phase;
    const extend = 1 + Math.sin(time * 2 + phase) * 0.2;
    filo.scale.y = extend;
  });

  // Animate surface ruffles
  surfaceRuffles.forEach((ruffle) => {
    const phase = ruffle.userData.phase;
    ruffle.rotation.z += 0.01;
    const positions = ruffle.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const wave = Math.sin(x * 8 + time * 3 + phase) * 0.05;
      positions.setZ(i, wave);
    }
    positions.needsUpdate = true;
  });

  // Animate bacteria (swimming toward macrophage with dramatic phagocytosis)
  bacteria.forEach((bac) => {
    if (bac.userData.alive && !bac.userData.beingEaten) {
      const phase = bac.userData.phase;
      const speed = bac.userData.speed;

      // Swim toward macrophage
      const dir = new THREE.Vector3().subVectors(
        macrophageGroup.position,
        bac.position
      ).normalize();

      bac.position.add(dir.multiplyScalar(0.01 * speed));

      // Wobble motion (swimming)
      bac.rotation.x += 0.02;
      bac.rotation.z = Math.sin(time * 3 + phase) * 0.3;

      // Check if close enough to start phagocytosis
      const dist = bac.position.distanceTo(macrophageGroup.position);
      if (dist < 4) {
        // Speed up as it gets closer (being pulled in)
        bac.position.add(dir.multiplyScalar(0.015));
      }

      if (dist < 3.5) {
        // Start being eaten!
        bac.userData.beingEaten = true;
        bac.userData.eatProgress = 0;
        bac.userData.eatStartPos = bac.position.clone();
        // Set target position once when capture begins
        bac.userData.eatTargetPos = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2
        );
      }
    }

    // Phagocytosis animation - bacteria being engulfed
    if (bac.userData.beingEaten) {
      bac.userData.eatProgress += 0.008; // Slow dramatic engulfment
      const progress = bac.userData.eatProgress;

      // Move bacteria into the cell
      const startPos = bac.userData.eatStartPos;
      const targetPos = bac.userData.eatTargetPos;

      // Lerp position into the cell
      bac.position.lerpVectors(startPos, targetPos, Math.min(progress, 1));

      // Shrink as it's being digested
      const scale = Math.max(0, 1 - progress * 0.8);
      bac.scale.setScalar(scale);

      // Rotate frantically (struggling)
      bac.rotation.x += 0.1 * (1 - progress);
      bac.rotation.y += 0.15 * (1 - progress);

      // Change color to grey as it's digested
      bac.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.color) {
            const grey = 0.3 + 0.7 * (1 - progress);
            child.material.color.setRGB(grey * 0.09, grey * 0.64, grey * 0.29);
          }
          if (child.material.emissiveIntensity !== undefined) {
            child.material.emissiveIntensity = 0.3 * (1 - progress);
          }
        }
      });

      // Fully digested
      if (progress >= 1.2) {
        bac.userData.alive = false;
        bac.userData.beingEaten = false;
        bac.visible = false;

        // Respawn after delay
        setTimeout(() => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 10 + Math.random() * 5;
          bac.position.set(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * dist
          );
          bac.scale.setScalar(1);
          bac.userData.alive = true;
          bac.userData.eatProgress = 0;
          bac.visible = true;

          // Reset color
          bac.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
              child.material.color.setHex(0x16a34a);
              if (child.material.emissiveIntensity !== undefined) {
                child.material.emissiveIntensity = 0.3;
              }
            }
          });
        }, 4000 + Math.random() * 3000);
      }
    }
  });

  // Update dynamic scale bar based on camera distance
  updateScaleBar();

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// DYNAMIC SCALE BAR
// Updates based on camera zoom level
// ============================================

function updateScaleBar() {
  const scaleBar = document.getElementById('scale-bar');
  const scaleValue = document.getElementById('scale-value');
  if (!scaleBar || !scaleValue || !camera) return;

  // Get camera distance from origin
  const cameraDistance = camera.position.length();

  // At default distance (~12), we show 5 μm at 60px
  // Scale: 1 unit = 3.5 μm
  // At distance 12, about 1.4 units fit in 60px worth of view

  // Calculate apparent scale based on zoom
  // Closer = larger apparent size, farther = smaller
  const baseDistance = 12;
  const zoomFactor = baseDistance / cameraDistance;

  // Choose appropriate scale value based on zoom
  let scaleUm, barWidth;

  if (zoomFactor > 2) {
    // Very close - show 1 μm
    scaleUm = 1;
    barWidth = 40 * zoomFactor / 2;
  } else if (zoomFactor > 1) {
    // Close - show 2 μm
    scaleUm = 2;
    barWidth = 50 * zoomFactor / 1.5;
  } else if (zoomFactor > 0.5) {
    // Normal - show 5 μm
    scaleUm = 5;
    barWidth = 60 * zoomFactor;
  } else if (zoomFactor > 0.25) {
    // Far - show 10 μm
    scaleUm = 10;
    barWidth = 50 * zoomFactor * 2;
  } else {
    // Very far - show 20 μm
    scaleUm = 20;
    barWidth = 60 * zoomFactor * 4;
  }

  // Clamp bar width to reasonable range
  barWidth = Math.max(30, Math.min(100, barWidth));

  scaleBar.style.width = `${barWidth}px`;
  scaleValue.textContent = `${scaleUm} μm`;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const startBtn = document.getElementById('start-btn');
  const introModal = document.getElementById('intro-modal');
  const uiOverlay = document.getElementById('ui-overlay');

  startBtn.addEventListener('click', () => {
    introModal.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    isExploring = true;
    gsapLikeAnimation(camera.position, { x: 0, y: 3, z: 12 }, 1500);
  });

  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoBtn = document.getElementById('close-info-btn');

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

  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');

  zoomInBtn.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, 2);
  });

  zoomOutBtn.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, -2);
  });

  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 3, z: 12 }, 1000);
    controls.target.set(0, 0, 0);
    hideOrganellePopup();
  });

  // Click detection for organelles
  renderer.domElement.addEventListener('click', onMouseClick);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
}

// ============================================
// ORGANELLE CLICK INTERACTION
// ============================================

function onMouseClick(event) {
  const introModal = document.getElementById('intro-modal');
  const infoModal = document.getElementById('info-modal');

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

    if (organelle && organelleInfo[organelle]) {
      activeOrganelle = organelle;
      showOrganellePopup(organelle);
    }
  } else {
    hideOrganellePopup();
  }
}

function onMouseMove(event) {
  const introModal = document.getElementById('intro-modal');
  if (introModal && !introModal.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableMeshes, true);

  document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'auto';
}

function showOrganellePopup(organelleName) {
  const info = organelleInfo[organelleName];
  if (!info) return;

  // Create or get popup element
  let popup = document.getElementById('organelle-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'organelle-popup';
    popup.className = 'fixed left-4 top-1/2 -translate-y-1/2 z-50 max-w-sm';
    popup.innerHTML = `
      <div class="glass-strong rounded-2xl p-5 animate-slide-in">
        <div class="flex items-center gap-3 mb-3">
          <div id="popup-icon" class="w-10 h-10 rounded-full flex items-center justify-center">
            <div class="w-5 h-5 rounded-full"></div>
          </div>
          <div>
            <h3 id="popup-title" class="text-lg font-bold text-white"></h3>
            <p id="popup-subtitle" class="text-xs text-slate-400"></p>
          </div>
        </div>
        <p id="popup-description" class="text-sm text-slate-300 leading-relaxed"></p>
      </div>
    `;
    document.body.appendChild(popup);

    // Add styles if not present
    if (!document.getElementById('popup-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-styles';
      style.textContent = `
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px) translateY(-50%); }
          to { opacity: 1; transform: translateX(0) translateY(-50%); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
        .glass-strong {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Update content
  document.getElementById('popup-title').textContent = info.name;
  document.getElementById('popup-subtitle').textContent = info.subtitle;
  document.getElementById('popup-description').textContent = info.description;

  // Update icon color
  const iconContainer = document.getElementById('popup-icon');
  iconContainer.style.backgroundColor = info.color + '33';
  iconContainer.querySelector('div').style.backgroundColor = info.color;

  popup.classList.remove('hidden');
}

function hideOrganellePopup() {
  const popup = document.getElementById('organelle-popup');
  if (popup) {
    popup.classList.add('hidden');
  }
  activeOrganelle = null;
}

function gsapLikeAnimation(obj, target, duration) {
  const start = { x: obj.x, y: obj.y, z: obj.z };
  const startTime = performance.now();

  function update() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    obj.x = start.x + (target.x - start.x) * eased;
    obj.y = start.y + (target.y - start.y) * eased;
    obj.z = start.z + (target.z - start.z) * eased;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  update();
}

// ============================================
// INITIALIZE
// ============================================

init();
