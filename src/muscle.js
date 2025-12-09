import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// SARCOMERE - Molecular View
// "The Sliding Filament Mechanism"
// ============================================
// Zoomed-in view of a single sarcomere showing:
// - Thick filaments (myosin) with visible heads
// - Thin filaments (actin) with helical structure
// - Z-discs at boundaries
// - M-line at center
// - Animated contraction cycle
// ============================================

let scene, camera, renderer, controls;
let sarcomereGroup;
let clock = new THREE.Clock();
let isContracting = false;
let contractionPhase = 0;

// Animation components
let myosinHeads = [];
let actinFilaments = [];
let zDiscs = [];
let sarcomereLength = 2.5; // Current length (changes during contraction)
const restingLength = 2.5;
const contractedLength = 1.8;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;

  setupLighting();
  createSarcomere();
  createEnvironment();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x404060, 1.5);
  scene.add(ambient);

  // Main key light
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(5, 8, 5);
  scene.add(keyLight);

  // Pink accent for myosin
  const pinkLight = new THREE.DirectionalLight(0xff6699, 0.8);
  pinkLight.position.set(-5, 2, 3);
  scene.add(pinkLight);

  // Cyan accent for actin
  const cyanLight = new THREE.DirectionalLight(0x00ccff, 0.6);
  cyanLight.position.set(5, -2, -3);
  scene.add(cyanLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(0, -5, -5);
  scene.add(rimLight);
}

// ============================================
// SARCOMERE STRUCTURE
// ============================================

function createSarcomere() {
  sarcomereGroup = new THREE.Group();

  // Create Z-discs (boundaries)
  createZDiscs();

  // Create M-line (center)
  createMLine();

  // Create thick filaments (myosin) with heads
  createThickFilaments();

  // Create thin filaments (actin)
  createThinFilaments();

  // Create titin (elastic connector)
  createTitin();

  scene.add(sarcomereGroup);
}

// ============================================
// Z-DISCS (Sarcomere boundaries)
// ============================================

function createZDiscs() {
  const zDiscMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0xcc9900,
    emissiveIntensity: 0.3,
  });

  const zDiscGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 32);

  // Left Z-disc
  const leftZDisc = new THREE.Mesh(zDiscGeometry, zDiscMaterial);
  leftZDisc.position.x = -restingLength / 2;
  leftZDisc.rotation.z = Math.PI / 2;
  leftZDisc.userData.side = 'left';
  leftZDisc.userData.baseX = leftZDisc.position.x;
  sarcomereGroup.add(leftZDisc);
  zDiscs.push(leftZDisc);

  // Right Z-disc
  const rightZDisc = new THREE.Mesh(zDiscGeometry, zDiscMaterial);
  rightZDisc.position.x = restingLength / 2;
  rightZDisc.rotation.z = Math.PI / 2;
  rightZDisc.userData.side = 'right';
  rightZDisc.userData.baseX = rightZDisc.position.x;
  sarcomereGroup.add(rightZDisc);
  zDiscs.push(rightZDisc);

  // Add zig-zag pattern on Z-discs
  const zigzagMaterial = new THREE.LineBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.6 });
  for (const zDisc of [leftZDisc, rightZDisc]) {
    const points = [];
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const r = 0.8 + (i % 2) * 0.2;
      points.push(new THREE.Vector3(0, Math.cos(angle) * r, Math.sin(angle) * r));
    }
    const zigzagGeom = new THREE.BufferGeometry().setFromPoints(points);
    const zigzag = new THREE.Line(zigzagGeom, zigzagMaterial);
    zigzag.rotation.z = Math.PI / 2;
    zDisc.add(zigzag);
  }
}

// ============================================
// M-LINE (Center of sarcomere)
// ============================================

function createMLine() {
  const mLineMaterial = new THREE.MeshBasicMaterial({
    color: 0x8888aa,
    transparent: true,
    opacity: 0.5,
  });

  const mLineGeometry = new THREE.CylinderGeometry(0.9, 0.9, 0.03, 24);
  const mLine = new THREE.Mesh(mLineGeometry, mLineMaterial);
  mLine.rotation.z = Math.PI / 2;
  sarcomereGroup.add(mLine);

  // M-line cross-links
  const crossLinkMaterial = new THREE.MeshBasicMaterial({ color: 0x9999bb });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const crossLink = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
      crossLinkMaterial
    );
    crossLink.position.set(0, Math.cos(angle) * 0.4, Math.sin(angle) * 0.4);
    crossLink.rotation.x = angle + Math.PI / 2;
    sarcomereGroup.add(crossLink);
  }
}

// ============================================
// THICK FILAMENTS (Myosin) with heads
// ============================================

function createThickFilaments() {
  const myosinMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xec4899,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0x9d174d,
    emissiveIntensity: 0.2,
  });

  const headMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf9a8d4,
    roughness: 0.3,
    metalness: 0.0,
    emissive: 0xec4899,
    emissiveIntensity: 0.3,
  });

  // Thick filament length (constant - A-band)
  const thickLength = 1.6;

  // Hexagonal arrangement
  const positions = [
    { y: 0, z: 0 },           // Center
    { y: 0.35, z: 0 },        // Top
    { y: -0.35, z: 0 },       // Bottom
    { y: 0.175, z: 0.3 },     // Top-right
    { y: -0.175, z: 0.3 },    // Bottom-right
    { y: 0.175, z: -0.3 },    // Top-left
    { y: -0.175, z: -0.3 },   // Bottom-left
  ];

  positions.forEach((pos, filamentIndex) => {
    // Main thick filament body
    const geometry = new THREE.CylinderGeometry(0.04, 0.04, thickLength, 12);
    const filament = new THREE.Mesh(geometry, myosinMaterial);
    filament.position.set(0, pos.y, pos.z);
    filament.rotation.z = Math.PI / 2;
    sarcomereGroup.add(filament);

    // Add myosin heads along the filament (except bare zone)
    const headsPerSide = 8;
    for (let side = -1; side <= 1; side += 2) { // Left and right sides
      for (let i = 0; i < headsPerSide; i++) {
        const xPos = side * (0.15 + i * 0.08); // Start from bare zone edge

        // Skip if in bare zone (H-zone)
        if (Math.abs(xPos) < 0.12) continue;

        // Spiral arrangement (golden angle)
        const spiralAngle = (i * 137.5 + filamentIndex * 60) * (Math.PI / 180);

        // Create myosin head (two-domain structure)
        const headGroup = new THREE.Group();

        // Neck/lever arm
        const neckGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6);
        const neck = new THREE.Mesh(neckGeom, headMaterial);
        neck.position.y = 0.06;
        neck.rotation.z = 0.3 * side; // Angled outward
        headGroup.add(neck);

        // Head/motor domain (pear-shaped)
        const motorGeom = new THREE.SphereGeometry(0.035, 8, 6);
        motorGeom.scale(1, 1.3, 1);
        const motor = new THREE.Mesh(motorGeom, headMaterial);
        motor.position.y = 0.13;
        headGroup.add(motor);

        // Position the head
        headGroup.position.set(xPos, pos.y, pos.z);
        headGroup.rotation.x = spiralAngle;

        // Store for animation
        headGroup.userData = {
          baseX: xPos,
          baseRotation: spiralAngle,
          filamentY: pos.y,
          filamentZ: pos.z,
          side: side,
          phase: Math.random() * Math.PI * 2, // Random phase for asynchronous movement
        };

        myosinHeads.push(headGroup);
        sarcomereGroup.add(headGroup);
      }
    }
  });
}

// ============================================
// THIN FILAMENTS (Actin)
// ============================================

function createThinFilaments() {
  const actinMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee,
    roughness: 0.3,
    metalness: 0.0,
    emissive: 0x0891b2,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.9,
  });

  // Actin filaments extend from Z-disc toward center
  const actinLength = 1.0;

  // Positions (between myosin filaments)
  const positions = [
    { y: 0.2, z: 0.15 },
    { y: -0.2, z: 0.15 },
    { y: 0.2, z: -0.15 },
    { y: -0.2, z: -0.15 },
    { y: 0, z: 0.25 },
    { y: 0, z: -0.25 },
  ];

  positions.forEach((pos) => {
    // Left side (from left Z-disc)
    const leftActin = createActinFilament(actinMaterial, actinLength);
    leftActin.position.set(-restingLength / 2 + actinLength / 2 + 0.05, pos.y, pos.z);
    leftActin.userData = { side: 'left', baseX: leftActin.position.x, y: pos.y, z: pos.z };
    actinFilaments.push(leftActin);
    sarcomereGroup.add(leftActin);

    // Right side (from right Z-disc)
    const rightActin = createActinFilament(actinMaterial, actinLength);
    rightActin.position.set(restingLength / 2 - actinLength / 2 - 0.05, pos.y, pos.z);
    rightActin.rotation.y = Math.PI; // Flip for opposite polarity
    rightActin.userData = { side: 'right', baseX: rightActin.position.x, y: pos.y, z: pos.z };
    actinFilaments.push(rightActin);
    sarcomereGroup.add(rightActin);
  });
}

function createActinFilament(material, length) {
  const group = new THREE.Group();

  // Main filament (double helix structure)
  const helixPoints1 = [];
  const helixPoints2 = [];
  const segments = 40;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t - 0.5) * length;
    const angle = t * Math.PI * 6; // 3 full turns
    const radius = 0.025;

    helixPoints1.push(new THREE.Vector3(x, Math.cos(angle) * radius, Math.sin(angle) * radius));
    helixPoints2.push(new THREE.Vector3(x, Math.cos(angle + Math.PI) * radius, Math.sin(angle + Math.PI) * radius));
  }

  const curve1 = new THREE.CatmullRomCurve3(helixPoints1);
  const curve2 = new THREE.CatmullRomCurve3(helixPoints2);

  const tubeGeom1 = new THREE.TubeGeometry(curve1, 30, 0.015, 6, false);
  const tubeGeom2 = new THREE.TubeGeometry(curve2, 30, 0.015, 6, false);

  group.add(new THREE.Mesh(tubeGeom1, material));
  group.add(new THREE.Mesh(tubeGeom2, material));

  // Add troponin-tropomyosin complex (regulatory proteins)
  const tropMaterial = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < 3; i++) {
    const t = (i + 0.5) / 3;
    const x = (t - 0.5) * length;
    const troponin = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      tropMaterial
    );
    troponin.position.x = x;
    group.add(troponin);
  }

  return group;
}

// ============================================
// TITIN (Elastic filament)
// ============================================

function createTitin() {
  const titinMaterial = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.3,
  });

  // Titin connects Z-disc to M-line
  const titinPositions = [
    { y: 0.5, z: 0 },
    { y: -0.5, z: 0 },
    { y: 0, z: 0.45 },
    { y: 0, z: -0.45 },
  ];

  titinPositions.forEach((pos) => {
    // Create spring-like structure
    const points = [];
    const coils = 8;
    for (let i = 0; i <= coils * 10; i++) {
      const t = i / (coils * 10);
      const x = (t - 0.5) * restingLength * 0.9;
      const angle = t * coils * Math.PI * 2;
      const r = 0.03;
      points.push(new THREE.Vector3(x, pos.y + Math.cos(angle) * r, pos.z + Math.sin(angle) * r));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 60, 0.008, 4, false);
    const titin = new THREE.Mesh(geometry, titinMaterial);
    sarcomereGroup.add(titin);
  });
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Subtle grid for scale reference
  const gridHelper = new THREE.GridHelper(10, 20, 0x222244, 0x111133);
  gridHelper.position.y = -1.5;
  scene.add(gridHelper);

  // Background particles (cytoplasm)
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

    // Subtle blue-purple tones
    colors[i * 3] = 0.3 + Math.random() * 0.2;
    colors[i * 3 + 1] = 0.3 + Math.random() * 0.2;
    colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.03,
    transparent: true,
    opacity: 0.4,
    vertexColors: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

// ============================================
// ANIMATION - The Power Stroke
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  if (isContracting) {
    contractionPhase += 0.015;

    // Calculate current sarcomere length (oscillates between resting and contracted)
    const contractionAmount = (Math.sin(contractionPhase) + 1) / 2; // 0 to 1
    sarcomereLength = restingLength - (restingLength - contractedLength) * contractionAmount;

    // Move Z-discs
    zDiscs.forEach((zDisc) => {
      if (zDisc.userData.side === 'left') {
        zDisc.position.x = -sarcomereLength / 2;
      } else {
        zDisc.position.x = sarcomereLength / 2;
      }
    });

    // Slide actin filaments (the key visual!)
    actinFilaments.forEach((actin) => {
      const slideAmount = (restingLength - sarcomereLength) / 2;
      if (actin.userData.side === 'left') {
        actin.position.x = actin.userData.baseX + slideAmount;
      } else {
        actin.position.x = actin.userData.baseX - slideAmount;
      }
    });

    // Animate myosin heads (power stroke)
    myosinHeads.forEach((head) => {
      const { phase, side } = head.userData;

      // Power stroke cycle
      const cyclePhase = (contractionPhase * 2 + phase) % (Math.PI * 2);
      const attached = cyclePhase < Math.PI; // First half: attached and pulling

      if (attached) {
        // Attached state - rotate to pull
        const pullAmount = Math.sin(cyclePhase) * 0.5;
        head.rotation.z = pullAmount * side;
        head.children.forEach(child => {
          child.material.emissiveIntensity = 0.5; // Glowing when active
        });
      } else {
        // Detached state - reset
        const resetProgress = (cyclePhase - Math.PI) / Math.PI;
        head.rotation.z = (1 - resetProgress) * 0.5 * side * -1;
        head.children.forEach(child => {
          child.material.emissiveIntensity = 0.2;
        });
      }
    });
  } else {
    // Subtle idle animation
    myosinHeads.forEach((head, i) => {
      head.rotation.z = Math.sin(time * 0.5 + i * 0.1) * 0.05;
    });
  }

  // Gentle rotation of whole structure
  if (sarcomereGroup) {
    sarcomereGroup.rotation.y = Math.sin(time * 0.1) * 0.1;
  }

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

  startBtn?.addEventListener('click', () => {
    introModal.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    gsapLikeAnimation(camera.position, { x: 0, y: 1.5, z: 4 }, 1500);
  });

  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoBtn = document.getElementById('close-info-btn');

  infoBtn?.addEventListener('click', () => {
    infoModal.classList.remove('hidden');
  });

  closeInfoBtn?.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  infoModal?.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      infoModal.classList.add('hidden');
    }
  });

  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');

  zoomInBtn?.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, 1);
  });

  zoomOutBtn?.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, -1);
  });

  const contractBtn = document.getElementById('contract-btn');
  contractBtn?.addEventListener('click', () => {
    isContracting = !isContracting;
    contractBtn.classList.toggle('bg-pink-600/30', isContracting);
    contractBtn.textContent = isContracting ? 'Stop Contraction' : 'Contract';

    if (!isContracting) {
      // Reset to resting state
      resetSarcomere();
    }
  });

  const resetBtn = document.getElementById('reset-btn');
  resetBtn?.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 1.5, z: 4 }, 1000);
    controls.target.set(0, 0, 0);
    isContracting = false;
    resetSarcomere();
  });
}

function resetSarcomere() {
  contractionPhase = 0;
  sarcomereLength = restingLength;

  // Reset Z-discs
  zDiscs.forEach((zDisc) => {
    zDisc.position.x = zDisc.userData.baseX;
  });

  // Reset actin
  actinFilaments.forEach((actin) => {
    actin.position.x = actin.userData.baseX;
  });

  // Reset myosin heads
  myosinHeads.forEach((head) => {
    head.rotation.z = 0;
    head.children.forEach(child => {
      if (child.material) child.material.emissiveIntensity = 0.2;
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
