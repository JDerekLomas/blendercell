import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0812);
  scene.fog = new THREE.Fog(0x0a0812, 20, 60);

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
  const ambient = new THREE.AmbientLight(0x222222, 0.8);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
  mainLight.position.set(5, 10, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xeab308, 0.3);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfef3c7, 0.4);
  rimLight.position.set(0, -5, 5);
  scene.add(rimLight);

  // Subtle glow
  const pointLight = new THREE.PointLight(0xeab308, 0.3, 20);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
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
    transmission: 0.8, // 80% transmission = 20% opaque - lets user see inside
    thickness: 0.5,
    attenuationColor: new THREE.Color(0x8b6914),
    attenuationDistance: 3.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2, // 20% opaque as requested
  });

  cellBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
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
// KIDNEY-SHAPED NUCLEUS
// Eccentric position, distinctive shape
// ============================================

function createNucleus() {
  const nucleusGroup = new THREE.Group();

  // Create kidney shape using modified torus
  const kidneyGeometry = new THREE.TorusGeometry(0.8, 0.5, 16, 32, Math.PI * 1.5);
  const nucleusMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4a2882,
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.3,
    transmission: 0.1,
  });

  const kidneyMesh = new THREE.Mesh(kidneyGeometry, nucleusMaterial);
  kidneyMesh.rotation.x = Math.PI / 2;

  // Add caps to close the kidney shape
  const capGeometry = new THREE.SphereGeometry(0.5, 16, 16);
  const cap1 = new THREE.Mesh(capGeometry, nucleusMaterial);
  cap1.position.set(0.8, 0, 0);
  cap1.scale.set(1, 1, 0.8);

  const cap2 = new THREE.Mesh(capGeometry, nucleusMaterial);
  cap2.position.set(-0.5, 0, 0.6);
  cap2.scale.set(0.9, 0.9, 0.7);

  nucleusGroup.add(kidneyMesh);
  nucleusGroup.add(cap1);
  nucleusGroup.add(cap2);

  // Add nucleolus
  const nucleolusGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const nucleolusMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d1a4a,
    roughness: 0.5,
  });
  const nucleolus = new THREE.Mesh(nucleolusGeometry, nucleolusMaterial);
  nucleolus.position.set(0.2, 0, 0);
  nucleusGroup.add(nucleolus);

  // Chromatin spots
  for (let i = 0; i < 8; i++) {
    const chromatinGeom = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 8, 8);
    const chromatinMat = new THREE.MeshBasicMaterial({
      color: 0x1a0d2e,
      transparent: true,
      opacity: 0.7,
    });
    const chromatin = new THREE.Mesh(chromatinGeom, chromatinMat);
    const angle = (i / 8) * Math.PI * 1.5;
    chromatin.position.set(
      Math.cos(angle) * 0.6,
      (Math.random() - 0.5) * 0.3,
      Math.sin(angle) * 0.4
    );
    nucleusGroup.add(chromatin);
  }

  // Position nucleus eccentrically (pushed to one side)
  nucleusGroup.position.set(1.2, 0.3, 0);
  nucleusGroup.rotation.z = 0.3;

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
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 5
      );
    } while (pos.distanceTo(new THREE.Vector3(1.2, 0.3, 0)) < 1.5 || pos.length() > 2.8);

    lysosome.position.copy(pos);
    lysosome.userData.originalPos = pos.clone();
    lysosome.userData.phase = Math.random() * Math.PI * 2;

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

    // Position phagosomes
    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 4
      );
    } while (pos.distanceTo(new THREE.Vector3(1.2, 0.3, 0)) < 1.8 || pos.length() > 2.5);

    phagoGroup.position.copy(pos);
    phagoGroup.userData.originalPos = pos.clone();
    phagoGroup.userData.phase = Math.random() * Math.PI * 2;

    phagosomes.push(phagoGroup);
    macrophageGroup.add(phagoGroup);
  }
}

// ============================================
// MITOCHONDRIA
// ============================================

function createMitochondria() {
  const mitoCount = 15;

  const mitoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xef4444,
    roughness: 0.4,
    metalness: 0.0,
    transparent: true,
    opacity: 0.8,
  });

  for (let i = 0; i < mitoCount; i++) {
    const geometry = new THREE.CapsuleGeometry(0.12, 0.3, 8, 8);
    const mito = new THREE.Mesh(geometry, mitoMaterial.clone());

    let pos;
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 5
      );
    } while (pos.distanceTo(new THREE.Vector3(1.2, 0.3, 0)) < 1.3 || pos.length() > 2.7);

    mito.position.copy(pos);
    mito.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    mitochondria.push(mito);
    macrophageGroup.add(mito);
  }
}

// ============================================
// GOLGI APPARATUS
// ============================================

function createGolgi() {
  const golgiGroup = new THREE.Group();

  const golgiMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  // Stack of curved cisternae
  for (let i = 0; i < 5; i++) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0, 0.3),
      new THREE.Vector3(0.5, 0, 0)
    );
    const geometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
    const cisterna = new THREE.Mesh(geometry, golgiMaterial);
    cisterna.position.y = (i - 2) * 0.15;
    golgiGroup.add(cisterna);
  }

  golgiGroup.position.set(-0.8, -0.5, 0.5);
  golgiGroup.rotation.z = 0.2;
  macrophageGroup.add(golgiGroup);
}

// ============================================
// ENDOPLASMIC RETICULUM
// ============================================

function createER() {
  const erMaterial = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.3,
  });

  for (let i = 0; i < 20; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ),
      new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ),
      new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ),
    ]);

    const geometry = new THREE.TubeGeometry(curve, 12, 0.03, 6, false);
    const tube = new THREE.Mesh(geometry, erMaterial);
    macrophageGroup.add(tube);
  }
}

// ============================================
// PSEUDOPODS - Dynamic arm-like extensions
// ============================================

function createPseudopods() {
  const podCount = 5;

  const podMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd4a574,
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.2,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < podCount; i++) {
    const angle = (i / podCount) * Math.PI * 2 + Math.random() * 0.5;
    const length = 1.5 + Math.random() * 1.5;

    // Create curved pseudopod
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(
        Math.cos(angle) * length * 0.6,
        (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * length * 0.6
      ),
      new THREE.Vector3(
        Math.cos(angle) * length,
        (Math.random() - 0.5) * 0.8,
        Math.sin(angle) * length
      )
    );

    const geometry = new THREE.TubeGeometry(curve, 20, 0.4, 12, false);
    const pseudopod = new THREE.Mesh(geometry, podMaterial.clone());

    // Start position at cell surface
    const surfacePoint = new THREE.Vector3(
      Math.cos(angle) * 2.8,
      (Math.random() - 0.5) * 0.5,
      Math.sin(angle) * 2.8
    );
    pseudopod.position.copy(surfacePoint);

    pseudopod.userData.angle = angle;
    pseudopod.userData.baseLength = length;
    pseudopod.userData.phase = Math.random() * Math.PI * 2;

    pseudopods.push(pseudopod);
    macrophageGroup.add(pseudopod);
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
// ============================================

function createBacteria() {
  const bacCount = 5;

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

    bacteria.push(bacGroup);
    scene.add(bacGroup);
  }
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Tissue-like background particles
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x4a3728,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
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

  // Animate bacteria (swimming toward macrophage)
  bacteria.forEach((bac) => {
    if (bac.userData.alive) {
      const phase = bac.userData.phase;
      const speed = bac.userData.speed;

      // Swim toward macrophage
      const dir = new THREE.Vector3().subVectors(
        macrophageGroup.position,
        bac.position
      ).normalize();

      bac.position.add(dir.multiplyScalar(0.01 * speed));

      // Wobble motion
      bac.rotation.x += 0.02;
      bac.rotation.z = Math.sin(time * 3 + phase) * 0.3;

      // Check if close enough to be "eaten"
      if (bac.position.distanceTo(macrophageGroup.position) < 4) {
        // Start moving toward cell surface
        bac.position.add(dir.multiplyScalar(0.02));
      }

      if (bac.position.distanceTo(macrophageGroup.position) < 3.2) {
        // "Captured" - fade out
        bac.userData.alive = false;
        bac.visible = false;

        // Respawn after delay
        setTimeout(() => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 8 + Math.random() * 4;
          bac.position.set(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * dist
          );
          bac.userData.alive = true;
          bac.visible = true;
        }, 3000 + Math.random() * 2000);
      }
    }
  });

  controls.update();
  renderer.render(scene, camera);
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
  });
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
