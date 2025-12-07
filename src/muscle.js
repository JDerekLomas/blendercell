import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// SKELETAL MUSCLE FIBER - "The Power Generator"
// Anatomically Accurate 3D Visualization
// ============================================
// Based on research:
// - Fiber diameter: 50-100μm
// - Sarcomere length: ~3μm (resting), ~2μm (contracted)
// - A-band: 1.6μm (constant)
// - Thick filaments (myosin): 1.65μm long, 15nm diameter
// - Thin filaments (actin): 1.0μm long, 7-8nm diameter
// - Z-line width: 30-100nm
// - T-tubules: at A-I junctions, 20-40nm diameter
// - Triads: T-tubule + 2 terminal cisternae
// ============================================

let scene, camera, renderer, controls;
let muscleGroup;
let clock = new THREE.Clock();
let isContracting = false;
let contractionPhase = 0;

// Sarcomere components for animation
let sarcomeres = [];
let thinFilaments = [];
let zLines = [];

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0612);
  scene.fog = new THREE.Fog(0x0a0612, 25, 80);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 20);

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
  controls.maxDistance = 40;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;

  setupLighting();
  createMuscleFiber();
  createEnvironment();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x333333, 0.8);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xfff0f5, 1.2);
  mainLight.position.set(10, 15, 10);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xec4899, 0.3);
  fillLight.position.set(-10, 0, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.3);
  rimLight.position.set(0, -5, 10);
  scene.add(rimLight);

  // Subtle glow from mitochondria
  const pointLight = new THREE.PointLight(0xa855f7, 0.2, 20);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
}

// ============================================
// MUSCLE FIBER STRUCTURE
// ============================================

function createMuscleFiber() {
  muscleGroup = new THREE.Group();

  // Create multiple myofibrils in parallel
  const myofibrilCount = 5;
  const myofibrilSpacing = 2.5;

  for (let m = 0; m < myofibrilCount; m++) {
    const yOffset = (m - (myofibrilCount - 1) / 2) * myofibrilSpacing;
    createMyofibril(0, yOffset, 0);
  }

  // Create sarcolemma (cell membrane)
  createSarcolemma();

  // Create peripheral nuclei
  createNuclei();

  // Create mitochondria between myofibrils
  createMitochondria();

  // Create T-tubules and SR
  createTTubuleSystem();

  scene.add(muscleGroup);
}

// ============================================
// MYOFIBRIL - Chain of sarcomeres
// ============================================

function createMyofibril(x, y, z) {
  const myofibrilGroup = new THREE.Group();
  myofibrilGroup.position.set(x, y, z);

  // Each myofibril has multiple sarcomeres in series
  const sarcomereCount = 6;
  const sarcomereLength = 3.0; // ~3μm at rest

  for (let s = 0; s < sarcomereCount; s++) {
    const xOffset = (s - (sarcomereCount - 1) / 2) * sarcomereLength;
    createSarcomere(myofibrilGroup, xOffset, 0, 0, s);
  }

  muscleGroup.add(myofibrilGroup);
}

// ============================================
// SARCOMERE - The contractile unit
// ============================================

function createSarcomere(parent, x, y, z, index) {
  const sarcomereGroup = new THREE.Group();
  sarcomereGroup.position.set(x, y, z);
  sarcomereGroup.userData.index = index;
  sarcomereGroup.userData.originalX = x;

  // Sarcomere dimensions (scaled: 1 unit ≈ 1μm)
  const sarcomereLength = 3.0;
  const aBandLength = 1.6;
  const thickFilamentLength = 1.65;
  const thinFilamentLength = 1.0;

  // ---- Z-LINES (boundaries) ----
  const zLineMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0xb45309,
    emissiveIntensity: 0.3,
  });

  // Left Z-line
  const zLineGeometry = new THREE.BoxGeometry(0.08, 1.8, 1.8);
  const zLineLeft = new THREE.Mesh(zLineGeometry, zLineMaterial);
  zLineLeft.position.x = -sarcomereLength / 2;
  sarcomereGroup.add(zLineLeft);
  zLines.push(zLineLeft);

  // Right Z-line (shared with next sarcomere, only add for last)
  if (index === 5) {
    const zLineRight = new THREE.Mesh(zLineGeometry, zLineMaterial);
    zLineRight.position.x = sarcomereLength / 2;
    sarcomereGroup.add(zLineRight);
    zLines.push(zLineRight);
  }

  // ---- M-LINE (center) ----
  const mLineMaterial = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.6,
  });
  const mLineGeometry = new THREE.BoxGeometry(0.04, 1.6, 1.6);
  const mLine = new THREE.Mesh(mLineGeometry, mLineMaterial);
  mLine.position.x = 0;
  sarcomereGroup.add(mLine);

  // ---- THICK FILAMENTS (Myosin) - A-band ----
  createThickFilaments(sarcomereGroup, thickFilamentLength);

  // ---- THIN FILAMENTS (Actin) - extend from Z-lines ----
  createThinFilaments(sarcomereGroup, thinFilamentLength, sarcomereLength);

  // ---- A-BAND SHADING (visual guide) ----
  const aBandMaterial = new THREE.MeshBasicMaterial({
    color: 0xec4899,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
  });
  const aBandGeometry = new THREE.BoxGeometry(aBandLength, 1.7, 1.7);
  const aBand = new THREE.Mesh(aBandGeometry, aBandMaterial);
  aBand.position.x = 0;
  sarcomereGroup.add(aBand);

  sarcomeres.push(sarcomereGroup);
  parent.add(sarcomereGroup);
}

// ============================================
// THICK FILAMENTS (Myosin)
// ============================================

function createThickFilaments(parent, length) {
  const thickMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xec4899,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0x831843,
    emissiveIntensity: 0.2,
  });

  // Hexagonal arrangement of thick filaments
  const rows = 3;
  const cols = 5;
  const spacing = 0.25;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const geometry = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
      const filament = new THREE.Mesh(geometry, thickMaterial);

      // Hexagonal offset
      const yOffset = (row - (rows - 1) / 2) * spacing;
      const zOffset = (col - (cols - 1) / 2) * spacing + (row % 2) * (spacing / 2);

      filament.position.set(0, yOffset, zOffset);
      filament.rotation.z = Math.PI / 2;

      // Add myosin heads (cross-bridges)
      addMyosinHeads(filament, length);

      parent.add(filament);
    }
  }
}

// ============================================
// MYOSIN HEADS (Cross-bridges)
// ============================================

function addMyosinHeads(filament, length) {
  const headMaterial = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.8,
  });

  const headGeometry = new THREE.SphereGeometry(0.025, 6, 6);

  // Add heads along the filament (except bare zone in center)
  const headCount = 12;
  for (let i = 0; i < headCount; i++) {
    const xPos = (i - (headCount - 1) / 2) * (length / headCount);

    // Skip the H-zone (central bare zone)
    if (Math.abs(xPos) < 0.2) continue;

    const angle = (i * 137.5) * (Math.PI / 180); // Golden angle for spiral
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(
      xPos,
      Math.cos(angle) * 0.06,
      Math.sin(angle) * 0.06
    );
    filament.add(head);
  }
}

// ============================================
// THIN FILAMENTS (Actin)
// ============================================

function createThinFilaments(parent, length, sarcomereLength) {
  const thinMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    roughness: 0.3,
    metalness: 0.0,
    emissive: 0x0891b2,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.9,
  });

  // Each thin filament extends from Z-line toward center
  const rows = 4;
  const cols = 6;
  const spacing = 0.2;

  // Left side (from left Z-line toward M-line)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 6);
      const filament = new THREE.Mesh(geometry, thinMaterial.clone());

      const yOffset = (row - (rows - 1) / 2) * spacing + 0.1;
      const zOffset = (col - (cols - 1) / 2) * spacing + 0.1;

      // Position starting from Z-line
      filament.position.set(-sarcomereLength / 2 + length / 2, yOffset, zOffset);
      filament.rotation.z = Math.PI / 2;

      filament.userData.side = 'left';
      filament.userData.originalX = filament.position.x;
      thinFilaments.push(filament);
      parent.add(filament);
    }
  }

  // Right side (from right Z-line toward M-line)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 6);
      const filament = new THREE.Mesh(geometry, thinMaterial.clone());

      const yOffset = (row - (rows - 1) / 2) * spacing + 0.1;
      const zOffset = (col - (cols - 1) / 2) * spacing + 0.1;

      filament.position.set(sarcomereLength / 2 - length / 2, yOffset, zOffset);
      filament.rotation.z = Math.PI / 2;

      filament.userData.side = 'right';
      filament.userData.originalX = filament.position.x;
      thinFilaments.push(filament);
      parent.add(filament);
    }
  }
}

// ============================================
// SARCOLEMMA (Cell membrane)
// ============================================

function createSarcolemma() {
  const membraneMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfda4af,
    roughness: 0.3,
    metalness: 0.0,
    transmission: 0.7,
    thickness: 0.5,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });

  // Cylindrical membrane around the fiber
  const geometry = new THREE.CylinderGeometry(7, 7, 20, 32, 1, true);
  const membrane = new THREE.Mesh(geometry, membraneMaterial);
  membrane.rotation.z = Math.PI / 2;
  muscleGroup.add(membrane);

  // End caps
  const capGeometry = new THREE.CircleGeometry(7, 32);
  const capMaterial = membraneMaterial.clone();
  capMaterial.opacity = 0.1;

  const leftCap = new THREE.Mesh(capGeometry, capMaterial);
  leftCap.position.x = -10;
  leftCap.rotation.y = Math.PI / 2;
  muscleGroup.add(leftCap);

  const rightCap = new THREE.Mesh(capGeometry, capMaterial);
  rightCap.position.x = 10;
  rightCap.rotation.y = -Math.PI / 2;
  muscleGroup.add(rightCap);
}

// ============================================
// NUCLEI (Peripheral, multinucleated)
// ============================================

function createNuclei() {
  const nucleusMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6366f1,
    roughness: 0.3,
    metalness: 0.0,
    emissive: 0x312e81,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  const nucleusCount = 8;
  for (let i = 0; i < nucleusCount; i++) {
    const geometry = new THREE.SphereGeometry(0.6, 16, 16);
    geometry.scale(1.5, 0.8, 0.8); // Elongated

    const nucleus = new THREE.Mesh(geometry, nucleusMaterial);

    // Position at periphery (subsarcolemmal)
    const angle = (i / nucleusCount) * Math.PI * 2;
    const xPos = (i - (nucleusCount - 1) / 2) * 2.2;

    nucleus.position.set(
      xPos,
      Math.cos(angle) * 6,
      Math.sin(angle) * 6
    );
    nucleus.rotation.z = Math.PI / 2;

    muscleGroup.add(nucleus);

    // Nucleolus
    const nucleolusGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const nucleolusMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.5,
    });
    const nucleolus = new THREE.Mesh(nucleolusGeometry, nucleolusMaterial);
    nucleolus.position.copy(nucleus.position);
    muscleGroup.add(nucleolus);
  }
}

// ============================================
// MITOCHONDRIA (Between myofibrils)
// ============================================

function createMitochondria() {
  const mitoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa855f7,
    roughness: 0.4,
    metalness: 0.0,
    emissive: 0x581c87,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.85,
  });

  // Position mitochondria in the spaces between myofibrils
  const mitoPositions = [
    // Between myofibrils
    { x: -6, y: 1.25, z: 0 },
    { x: -3, y: 1.25, z: 0.5 },
    { x: 0, y: 1.25, z: -0.3 },
    { x: 3, y: 1.25, z: 0.2 },
    { x: 6, y: 1.25, z: -0.4 },
    { x: -6, y: -1.25, z: 0.3 },
    { x: -3, y: -1.25, z: -0.2 },
    { x: 0, y: -1.25, z: 0.4 },
    { x: 3, y: -1.25, z: -0.5 },
    { x: 6, y: -1.25, z: 0.1 },
    // Near Z-lines
    { x: -7.5, y: 0, z: 0.8 },
    { x: -4.5, y: 0, z: -0.6 },
    { x: -1.5, y: 0, z: 0.5 },
    { x: 1.5, y: 0, z: -0.4 },
    { x: 4.5, y: 0, z: 0.6 },
    { x: 7.5, y: 0, z: -0.3 },
  ];

  mitoPositions.forEach((pos, i) => {
    const geometry = new THREE.CapsuleGeometry(0.2, 0.6, 8, 12);
    const mito = new THREE.Mesh(geometry, mitoMaterial.clone());

    mito.position.set(pos.x, pos.y, pos.z);
    mito.rotation.set(
      Math.random() * 0.5,
      Math.random() * Math.PI,
      Math.PI / 2 + Math.random() * 0.3
    );

    // Add cristae (inner folds) visualization
    addCristae(mito);

    muscleGroup.add(mito);
  });
}

function addCristae(mito) {
  const cristaeMaterial = new THREE.MeshBasicMaterial({
    color: 0x7e22ce,
    transparent: true,
    opacity: 0.5,
  });

  for (let i = 0; i < 4; i++) {
    const geometry = new THREE.PlaneGeometry(0.15, 0.35);
    const cristae = new THREE.Mesh(geometry, cristaeMaterial);
    cristae.position.y = (i - 1.5) * 0.12;
    cristae.rotation.y = Math.PI / 2;
    mito.add(cristae);
  }
}

// ============================================
// T-TUBULE SYSTEM & SARCOPLASMIC RETICULUM
// ============================================

function createTTubuleSystem() {
  // T-tubules at A-I junctions
  const tTubuleMaterial = new THREE.MeshBasicMaterial({
    color: 0x0ea5e9,
    transparent: true,
    opacity: 0.4,
  });

  const srMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    roughness: 0.4,
    metalness: 0.0,
    transparent: true,
    opacity: 0.3,
  });

  // Create triads at each A-I junction
  const sarcomereLength = 3.0;
  const triadPositions = [];

  for (let s = 0; s < 6; s++) {
    const sarcomereX = (s - 2.5) * sarcomereLength;
    // Two triads per sarcomere (at each A-I junction)
    triadPositions.push(sarcomereX - sarcomereLength * 0.35);
    triadPositions.push(sarcomereX + sarcomereLength * 0.35);
  }

  triadPositions.forEach((xPos) => {
    // T-tubule (vertical cylinder penetrating the fiber)
    const tTubeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 12, 8);
    const tTube = new THREE.Mesh(tTubeGeometry, tTubuleMaterial);
    tTube.position.set(xPos, 0, 0);
    muscleGroup.add(tTube);

    // Terminal cisternae (SR on both sides)
    for (let side of [-1, 1]) {
      const srGeometry = new THREE.TorusGeometry(0.15, 0.06, 8, 16);
      const sr = new THREE.Mesh(srGeometry, srMaterial);
      sr.position.set(xPos + side * 0.12, 0, 0);
      sr.rotation.y = Math.PI / 2;
      muscleGroup.add(sr);
    }
  });

  // Longitudinal SR network (simplified)
  for (let y = -5; y <= 5; y += 2.5) {
    const srNetworkMaterial = new THREE.MeshBasicMaterial({
      color: 0x059669,
      transparent: true,
      opacity: 0.15,
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-9, y, 0.5),
      new THREE.Vector3(-4, y, 0.3),
      new THREE.Vector3(0, y, 0.5),
      new THREE.Vector3(4, y, 0.3),
      new THREE.Vector3(9, y, 0.5),
    ]);

    const geometry = new THREE.TubeGeometry(curve, 30, 0.04, 6, false);
    const srNetwork = new THREE.Mesh(geometry, srNetworkMaterial);
    muscleGroup.add(srNetwork);
  }
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Background particles (extracellular matrix)
  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x4a3048,
    size: 0.12,
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

  // Subtle breathing motion
  if (muscleGroup) {
    muscleGroup.position.y = Math.sin(time * 0.3) * 0.1;
  }

  // Contraction animation
  if (isContracting) {
    contractionPhase += 0.02;
    const contractAmount = Math.sin(contractionPhase) * 0.3;

    // Animate thin filaments sliding toward M-line
    thinFilaments.forEach((filament) => {
      const originalX = filament.userData.originalX;
      if (filament.userData.side === 'left') {
        filament.position.x = originalX + contractAmount;
      } else {
        filament.position.x = originalX - contractAmount;
      }
    });

    // Animate Z-lines coming closer
    zLines.forEach((zLine, i) => {
      const baseX = zLine.position.x;
      if (baseX < 0) {
        zLine.position.x = baseX + contractAmount * 0.5;
      } else if (baseX > 0) {
        zLine.position.x = baseX - contractAmount * 0.5;
      }
    });
  }

  // Subtle filament shimmer
  thinFilaments.forEach((filament, i) => {
    if (filament.material.emissiveIntensity !== undefined) {
      filament.material.emissiveIntensity = 0.2 + Math.sin(time * 2 + i * 0.1) * 0.1;
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
    gsapLikeAnimation(camera.position, { x: 0, y: 5, z: 15 }, 1500);
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

  const contractBtn = document.getElementById('contract-btn');
  contractBtn.addEventListener('click', () => {
    isContracting = !isContracting;
    contractBtn.classList.toggle('bg-pink-600/30', isContracting);

    if (!isContracting) {
      // Reset positions
      contractionPhase = 0;
      thinFilaments.forEach((filament) => {
        filament.position.x = filament.userData.originalX;
      });
    }
  });

  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 5, z: 15 }, 1000);
    controls.target.set(0, 0, 0);
    isContracting = false;
    contractionPhase = 0;

    // Reset filament positions
    thinFilaments.forEach((filament) => {
      filament.position.x = filament.userData.originalX;
    });
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
