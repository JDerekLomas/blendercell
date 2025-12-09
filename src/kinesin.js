import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// KINESIN WALKING ON MICROTUBULE
// Molecular Motor Transport Visualization
// ============================================
// Shows:
// - Microtubule protofilament structure (α/β tubulin dimers)
// - Kinesin motor protein with two heads
// - Hand-over-hand walking mechanism
// - Cargo vesicle being transported
// - ATP hydrolysis cycle driving movement
// ============================================

let scene, camera, renderer, controls;
let microtubulesGroup, kinesinGroup, cargoGroup;
let clock = new THREE.Clock();
let isWalking = true;
let walkPhase = 0;

// Kinesin components for animation
let leadHead, trailHead, neckLinker, stalk;
let headPositions = { lead: 0, trail: 0 };
const STEP_SIZE = 0.8; // ~8nm per step (scaled)
const TUBULIN_SIZE = 0.4; // ~4nm per tubulin (scaled)

// ATP counter
let atpCount = 0;
let lastStepPhase = 0;
let flashIntensity = 0;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3, 8, 16); // Pulled back for to-scale vesicle (100nm)

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.autoRotate = false;
  controls.target.set(0, 1.5, 0);

  setupLighting();
  createMicrotubule();
  createKinesin();
  createCargo();
  createEnvironment();
  setupEventListeners();
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  const ambient = new THREE.AmbientLight(0x404060, 1.0);
  scene.add(ambient);

  // Main light
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(5, 10, 5);
  scene.add(keyLight);

  // Cyan accent for microtubule
  const cyanLight = new THREE.DirectionalLight(0x00ffff, 0.6);
  cyanLight.position.set(-5, 2, 3);
  scene.add(cyanLight);

  // Purple accent for kinesin
  const purpleLight = new THREE.DirectionalLight(0xff00ff, 0.4);
  purpleLight.position.set(5, -2, -3);
  scene.add(purpleLight);

  // Warm light for cargo
  const warmLight = new THREE.DirectionalLight(0xffaa00, 0.5);
  warmLight.position.set(0, 5, -5);
  scene.add(warmLight);
}

// ============================================
// MICROTUBULE STRUCTURE
// ============================================

function createMicrotubule() {
  microtubulesGroup = new THREE.Group();

  // Microtubule: 13 protofilaments arranged in a cylinder
  // Each protofilament is a chain of α/β tubulin dimers
  const protofilamentCount = 13;
  const mtRadius = 0.5; // ~25nm diameter scaled
  const mtLength = 12;
  const dimersPerProto = Math.floor(mtLength / (TUBULIN_SIZE * 2));

  // Materials for α and β tubulin
  const alphaTubulinMat = new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee, // Cyan
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x0891b2,
    emissiveIntensity: 0.2,
  });

  const betaTubulinMat = new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4, // Darker cyan
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x0e7490,
    emissiveIntensity: 0.15,
  });

  // Create each protofilament
  for (let p = 0; p < protofilamentCount; p++) {
    const angle = (p / protofilamentCount) * Math.PI * 2;
    const protoY = Math.cos(angle) * mtRadius;
    const protoZ = Math.sin(angle) * mtRadius;

    // Helical offset (3-start helix in real microtubules)
    const helicalOffset = (p / protofilamentCount) * TUBULIN_SIZE * 3;

    for (let d = 0; d < dimersPerProto; d++) {
      const dimerX = -mtLength / 2 + d * TUBULIN_SIZE * 2 + helicalOffset;

      // α-tubulin (minus end side)
      const alphaGeom = new THREE.SphereGeometry(TUBULIN_SIZE * 0.45, 12, 8);
      const alpha = new THREE.Mesh(alphaGeom, alphaTubulinMat);
      alpha.position.set(dimerX, protoY, protoZ);
      alpha.scale.x = 1.2; // Slightly elongated
      microtubulesGroup.add(alpha);

      // β-tubulin (plus end side)
      const betaGeom = new THREE.SphereGeometry(TUBULIN_SIZE * 0.45, 12, 8);
      const beta = new THREE.Mesh(betaGeom, betaTubulinMat);
      beta.position.set(dimerX + TUBULIN_SIZE, protoY, protoZ);
      beta.scale.x = 1.2;
      microtubulesGroup.add(beta);
    }
  }

  // Highlight the "track" - the protofilament that kinesin walks on (top)
  const trackMat = new THREE.MeshPhysicalMaterial({
    color: 0x67e8f9,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.4,
  });

  // Add binding site markers on top protofilament
  for (let i = 0; i < 8; i++) {
    const markerGeom = new THREE.RingGeometry(0.08, 0.12, 16);
    const marker = new THREE.Mesh(markerGeom, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    }));
    marker.position.set(-3 + i * STEP_SIZE, mtRadius + 0.01, 0);
    marker.rotation.x = -Math.PI / 2;
    microtubulesGroup.add(marker);
  }

  // Plus/minus end labels
  createEndLabel('+', mtLength / 2 + 0.3, 0x22c55e);
  createEndLabel('−', -mtLength / 2 - 0.3, 0xef4444);

  scene.add(microtubulesGroup);
}

function createEndLabel(text, x, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, 0, 0);
  sprite.scale.set(0.5, 0.5, 1);
  microtubulesGroup.add(sprite);
}

// ============================================
// KINESIN MOTOR PROTEIN
// ============================================

function createKinesin() {
  kinesinGroup = new THREE.Group();

  const headMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa855f7, // Purple
    roughness: 0.3,
    metalness: 0.1,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.3,
  });

  const neckMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc084fc,
    roughness: 0.4,
    metalness: 0.0,
    emissive: 0xa855f7,
    emissiveIntensity: 0.2,
  });

  const stalkMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8b5cf6,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.15,
  });

  // Motor domain heads (catalytic cores)
  const headGeom = new THREE.SphereGeometry(0.18, 16, 12);
  headGeom.scale(1.3, 1, 1.1); // Elongated shape

  // Leading head
  leadHead = new THREE.Group();
  const leadCore = new THREE.Mesh(headGeom, headMaterial);
  leadHead.add(leadCore);

  // ATP binding pocket indicator
  const atpPocket = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
  );
  atpPocket.position.set(0.1, 0.1, 0);
  atpPocket.userData.isATP = true;
  leadHead.add(atpPocket);

  leadHead.position.set(-2.2, 0.5 + 0.2, 0); // On microtubule
  kinesinGroup.add(leadHead);

  // Trailing head
  trailHead = new THREE.Group();
  const trailCore = new THREE.Mesh(headGeom.clone(), headMaterial.clone());
  trailHead.add(trailCore);

  const trailAtp = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
  );
  trailAtp.position.set(0.1, 0.1, 0);
  trailAtp.userData.isATP = true;
  trailHead.add(trailAtp);

  trailHead.position.set(-2.2 - STEP_SIZE, 0.5 + 0.2, 0);
  kinesinGroup.add(trailHead);

  // Neck linkers (flexible connectors)
  neckLinker = new THREE.Group();

  // We'll update these dynamically
  const neckGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
  const neck1 = new THREE.Mesh(neckGeom, neckMaterial);
  neck1.name = 'neck1';
  const neck2 = new THREE.Mesh(neckGeom, neckMaterial);
  neck2.name = 'neck2';
  neckLinker.add(neck1, neck2);
  kinesinGroup.add(neckLinker);

  // Coiled-coil stalk
  stalk = new THREE.Group();

  // Create double helix stalk
  const stalkPoints1 = [];
  const stalkPoints2 = [];
  const stalkLength = 1.5;
  const stalkSegments = 30;

  for (let i = 0; i <= stalkSegments; i++) {
    const t = i / stalkSegments;
    const y = 0.5 + t * stalkLength;
    const angle = t * Math.PI * 4; // Two full turns
    const radius = 0.04;

    stalkPoints1.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    stalkPoints2.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
  }

  const stalkCurve1 = new THREE.CatmullRomCurve3(stalkPoints1);
  const stalkCurve2 = new THREE.CatmullRomCurve3(stalkPoints2);

  const stalkTube1 = new THREE.Mesh(
    new THREE.TubeGeometry(stalkCurve1, 20, 0.025, 6, false),
    stalkMaterial
  );
  const stalkTube2 = new THREE.Mesh(
    new THREE.TubeGeometry(stalkCurve2, 20, 0.025, 6, false),
    stalkMaterial
  );

  stalk.add(stalkTube1, stalkTube2);
  stalk.position.x = -2.2 - STEP_SIZE / 2;
  kinesinGroup.add(stalk);

  // Light chain / cargo binding domain at top of stalk
  const cargoDomain = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8b4fe,
      roughness: 0.3,
      emissive: 0xc084fc,
      emissiveIntensity: 0.2,
    })
  );
  cargoDomain.position.set(0, stalkLength + 0.6, 0);
  stalk.add(cargoDomain);

  // Store initial positions
  headPositions.lead = leadHead.position.x;
  headPositions.trail = trailHead.position.x;

  scene.add(kinesinGroup);
}

// ============================================
// CARGO VESICLE (To scale: ~100nm diameter = 5.0 radius at 0.1 units/nm)
// ============================================

function createCargo() {
  cargoGroup = new THREE.Group();

  const vesicleRadius = 5.0; // To scale: 100nm diameter vesicle

  // Vesicle membrane
  const vesicleMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24, // Amber
    roughness: 0.2,
    metalness: 0.0,
    transmission: 0.4,
    thickness: 1.0,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.75,
  });

  const vesicle = new THREE.Mesh(
    new THREE.SphereGeometry(vesicleRadius, 48, 32),
    vesicleMat
  );
  cargoGroup.add(vesicle);

  // Lipid bilayer texture (small bumps)
  const lipidMat = new THREE.MeshBasicMaterial({
    color: 0xfcd34d,
    transparent: true,
    opacity: 0.3,
  });

  for (let i = 0; i < 300; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = vesicleRadius + 0.02;

    const lipid = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 4),
      lipidMat
    );
    lipid.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    cargoGroup.add(lipid);
  }

  // Cargo contents (proteins inside)
  const contentMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.5,
  });

  for (let i = 0; i < 30; i++) {
    const content = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.2, 0),
      contentMat
    );
    content.position.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );
    cargoGroup.add(content);
  }

  // Position: stalk top is at y≈2.1, vesicle bottom should be just above that
  // Vesicle center = stalk top + small gap + vesicle radius = 2.1 + 0.4 + 5.0 = 7.5
  cargoGroup.position.set(-2.2 - STEP_SIZE / 2, 7.5, 0);

  // Short linker from vesicle bottom to stalk top (just 0.4 gap)
  const linkerMat = new THREE.MeshBasicMaterial({
    color: 0xd8b4fe,
    transparent: true,
    opacity: 0.7,
  });
  const linker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
    linkerMat
  );
  linker.position.y = -vesicleRadius - 0.25; // Just below vesicle
  cargoGroup.add(linker);

  scene.add(cargoGroup);
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Subtle grid
  const gridHelper = new THREE.GridHelper(20, 40, 0x1a1a2e, 0x0f0f1a);
  gridHelper.position.y = -1;
  scene.add(gridHelper);

  // Cytoplasm particles
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

    // Pale blue/purple tones
    colors[i * 3] = 0.3 + Math.random() * 0.2;
    colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
    colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.04,
    transparent: true,
    opacity: 0.5,
    vertexColors: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

// Update ATP counter in DOM
function updateATPCounter() {
  const counterEl = document.getElementById('atp-counter');
  if (counterEl) {
    counterEl.textContent = atpCount;
  }
}

// ============================================
// ANIMATION - Hand-over-hand walking
// Based on research: ATP binds to leading head → neck linker docks →
// trailing head detaches and swings forward via diffusion → binds →
// ATP hydrolyzes on rear head → ADP releases from front head
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Decay flash intensity
  flashIntensity *= 0.92;

  if (isWalking) {
    // Walk speed: ~100 steps/sec in reality, we slow down for visibility
    // Each full cycle (2π) = one complete step (8nm)
    walkPhase += 0.025; // Faster walking

    const HEAD_Y = 0.7; // Base Y position for heads on microtubule

    // Total distance walked (in step units)
    const totalSteps = walkPhase / Math.PI; // Each π = one half-step
    const currentHalfStep = Math.floor(totalSteps);
    const halfStepProgress = totalSteps - currentHalfStep; // 0 to 1

    // Which head is currently swinging? Alternates each half-step
    const isLeadSwinging = currentHalfStep % 2 === 1;
    const swingingHead = isLeadSwinging ? leadHead : trailHead;
    const plantedHead = isLeadSwinging ? trailHead : leadHead;

    // Base position advances every 2 half-steps (= 1 full step)
    const fullSteps = Math.floor(currentHalfStep / 2);
    const startX = -2.2;

    // Track ATP: one per half-step (each head swing uses ATP)
    if (currentHalfStep > lastStepPhase) {
      atpCount++;
      lastStepPhase = currentHalfStep;
      flashIntensity = 1.0;
      updateATPCounter();
    }

    // Calculate head positions
    // At any time, heads are spaced by STEP_SIZE (8nm)
    // The planted head is at a fixed position, swinging head moves forward

    // Planted head position (the one that stays bound)
    const plantedX = startX + (fullSteps + (isLeadSwinging ? 0.5 : 0)) * STEP_SIZE * 2;

    // Swinging head goes from behind planted to ahead of planted
    const swingStartX = plantedX - STEP_SIZE;
    const swingEndX = plantedX + STEP_SIZE;

    // Smooth swing animation with easing
    const t = halfStepProgress;
    const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Position swinging head along arc
    swingingHead.position.x = swingStartX + easeInOut * (swingEndX - swingStartX);
    swingingHead.position.y = HEAD_Y + Math.sin(t * Math.PI) * 0.4; // Arc height
    swingingHead.rotation.z = -Math.sin(t * Math.PI) * 0.25;

    // Planted head stays fixed
    plantedHead.position.x = plantedX;
    plantedHead.position.y = HEAD_Y;
    plantedHead.rotation.z = 0;

    // ATP state colors
    if (t < 0.15) {
      updateATPState(plantedHead, 'binding');
      updateATPState(swingingHead, 'adp');
    } else if (t < 0.85) {
      updateATPState(plantedHead, 'bound');
      updateATPState(swingingHead, 'searching');
    } else {
      updateATPState(plantedHead, 'hydrolyzing');
      updateATPState(swingingHead, 'releasing_adp');
    }

    // Flash effect
    if (flashIntensity > 0.1) {
      plantedHead.children.forEach(child => {
        if (child.material && child.material.emissive && !child.userData.isATP) {
          child.material.emissiveIntensity = 0.3 + flashIntensity * 0.7;
        }
      });
    }

    // Update neck linkers
    updateNeckLinkers();

    // Move stalk and cargo with kinesin (follow midpoint)
    const midX = (leadHead.position.x + trailHead.position.x) / 2;
    stalk.position.x = midX;
    cargoGroup.position.x = midX;

    // Gentle cargo bobbing
    cargoGroup.position.y = 7.5 + Math.sin(time * 2) * 0.05;
    cargoGroup.rotation.z = Math.sin(time) * 0.01;

    // Loop back smoothly when reaching end
    if (plantedX > 4) {
      walkPhase = 0;
      lastStepPhase = 0;
      // Reset head positions
      leadHead.position.set(-2.2, HEAD_Y, 0);
      trailHead.position.set(-2.2 - STEP_SIZE, HEAD_Y, 0);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function updateATPState(head, state) {
  head.traverse((child) => {
    if (child.userData.isATP) {
      switch (state) {
        case 'binding':
          // ATP arriving - bright flash
          child.material.color.setHex(0xfef08a); // Bright yellow-white
          child.material.opacity = 1;
          child.scale.setScalar(1.4);
          break;
        case 'bound':
          // ATP bound, neck linker docked - stable yellow
          child.material.color.setHex(0xfbbf24); // Yellow
          child.material.opacity = 1;
          child.scale.setScalar(1.2);
          break;
        case 'hydrolyzing':
          // ATP → ADP + Pi - orange transition
          child.material.color.setHex(0xf97316); // Orange
          child.material.opacity = 0.9;
          child.scale.setScalar(1.0);
          break;
        case 'adp':
          // ADP bound (trailing head before detachment)
          child.material.color.setHex(0xef4444); // Red
          child.material.opacity = 0.7;
          child.scale.setScalar(0.8);
          break;
        case 'searching':
          // Diffusing, searching for binding site - dim
          child.material.color.setHex(0x9ca3af); // Gray
          child.material.opacity = 0.4;
          child.scale.setScalar(0.6);
          break;
        case 'releasing_adp':
          // ADP releasing, about to accept new ATP - pulsing
          child.material.color.setHex(0x22c55e); // Green (ready state)
          child.material.opacity = 0.8;
          child.scale.setScalar(0.9);
          break;
        default:
          child.material.color.setHex(0x666666);
          child.material.opacity = 0.3;
          child.scale.setScalar(0.6);
      }
    }
  });
}

function updateNeckLinkers() {
  const neck1 = neckLinker.getObjectByName('neck1');
  const neck2 = neckLinker.getObjectByName('neck2');

  if (neck1 && neck2) {
    // Neck 1 connects stalk to lead head
    const stalkTop = new THREE.Vector3(stalk.position.x, 1.1, 0);
    const leadPos = leadHead.position.clone();

    neck1.position.copy(stalkTop.clone().add(leadPos).multiplyScalar(0.5));
    neck1.lookAt(leadPos);
    neck1.rotateX(Math.PI / 2);
    neck1.scale.y = stalkTop.distanceTo(leadPos) / 0.4;

    // Neck 2 connects stalk to trail head
    const trailPos = trailHead.position.clone();

    neck2.position.copy(stalkTop.clone().add(trailPos).multiplyScalar(0.5));
    neck2.lookAt(trailPos);
    neck2.rotateX(Math.PI / 2);
    neck2.scale.y = stalkTop.distanceTo(trailPos) / 0.4;
  }
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
    gsapLikeAnimation(camera.position, { x: 3, y: 8, z: 16 }, 1500);
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

  const walkBtn = document.getElementById('walk-btn');
  walkBtn?.addEventListener('click', () => {
    isWalking = !isWalking;
    walkBtn.classList.toggle('bg-purple-600/30', isWalking);
    walkBtn.textContent = isWalking ? 'Pause' : 'Walk';
  });

  const resetBtn = document.getElementById('reset-btn');
  resetBtn?.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 3, y: 8, z: 16 }, 1000);
    controls.target.set(0, 1, 0);
    walkPhase = 0;
    lastStepPhase = 0;
    atpCount = 0;
    updateATPCounter();
    isWalking = true;
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
