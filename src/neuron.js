import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// NEURON VISUALIZATION
// Focus on soma and dendrites with short axon
// ============================================

let scene, camera, renderer, controls, clock;
let soma, axon, dendrites = [];
let actionPotentials = [];
let signalCount = 0;
let autoFire = true;
let lastFireTime = 0;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.target.set(0, 0, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(10, 20, 10);
  scene.add(mainLight);

  const blueLight = new THREE.PointLight(0x3b82f6, 2, 30);
  blueLight.position.set(-3, 3, 3);
  scene.add(blueLight);

  const purpleLight = new THREE.PointLight(0xa855f7, 1.5, 25);
  purpleLight.position.set(3, -2, -3);
  scene.add(purpleLight);

  // Create neuron components
  createSoma();
  createDendrites();
  createAxon();
  createEnvironment();

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  setupUI();

  animate();
}

// ============================================
// SOMA (Cell Body) - The main focus
// ============================================

function createSoma() {
  const somaGroup = new THREE.Group();

  // Main cell body - semi-transparent to see interior organelles
  const somaMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.25,
    emissive: 0x1e40af,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const somaGeom = new THREE.SphereGeometry(2.5, 48, 32);
  const somaMesh = new THREE.Mesh(somaGeom, somaMat);
  somaGroup.add(somaMesh);

  // Nucleus - prominent
  const nucleusMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a,
    roughness: 0.3,
    transmission: 0.1,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.4,
  });
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 32, 24),
    nucleusMat
  );
  nucleus.position.set(0, 0.2, 0);
  somaGroup.add(nucleus);

  // Nuclear envelope (double membrane look)
  const envelopeMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.2,
    wireframe: true,
  });
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 24, 16),
    envelopeMat
  );
  envelope.position.copy(nucleus.position);
  somaGroup.add(envelope);

  // Nucleolus - darker region
  const nucleolusMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.3,
  });
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    nucleolusMat
  );
  nucleolus.position.set(0.3, 0.4, 0.2);
  somaGroup.add(nucleolus);

  // Chromatin strands in nucleus
  const chromatinMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.4,
  });
  for (let i = 0; i < 8; i++) {
    const points = [];
    const startAngle = Math.random() * Math.PI * 2;
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const angle = startAngle + t * Math.PI * (0.5 + Math.random());
      const r = 0.3 + t * 0.5;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r * 0.8,
        0.2 + (Math.random() - 0.5) * 0.6,
        Math.sin(angle) * r * 0.8
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const chromatin = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 10, 0.03, 4, false),
      chromatinMat
    );
    somaGroup.add(chromatin);
  }

  // Nissl bodies (rough ER clusters) - characteristic of neurons
  const nisslMat = new THREE.MeshPhysicalMaterial({
    color: 0x818cf8,
    roughness: 0.4,
    emissive: 0x6366f1,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.7,
  });
  for (let i = 0; i < 15; i++) {
    const nissl = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 6, 5),
      nisslMat
    );
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.4 + Math.random() * 0.6;
    nissl.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    somaGroup.add(nissl);
  }

  // Mitochondria in soma - neurons have hundreds to thousands
  // Scale: soma ~20μm diameter, mitochondria ~1-2μm long, ~0.5μm wide
  // At our scale (soma radius 2.5 = 10μm), mito should be ~0.25-0.5 long, ~0.1-0.12 wide
  const mitoMat = new THREE.MeshPhysicalMaterial({
    color: 0xef4444,
    roughness: 0.4,
    emissive: 0xdc2626,
    emissiveIntensity: 0.25,
  });

  // Use instancing for performance with many mitochondria
  const mitoGeom = new THREE.CapsuleGeometry(0.06, 0.2, 3, 6);
  const mitoCount = 75; // Reduced for performance

  for (let i = 0; i < mitoCount; i++) {
    const mito = new THREE.Mesh(mitoGeom, mitoMat);

    // Distribute throughout cytoplasm (outside nucleus r=1.1, inside soma r=2.3)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1); // Uniform sphere distribution
    const r = 1.3 + Math.random() * 0.9; // Between nucleus and membrane

    mito.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    // Random orientation - mitochondria are often aligned along cytoskeleton
    mito.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI * 0.5
    );

    // Vary sizes slightly (some elongated, some more spherical)
    const lengthScale = 0.7 + Math.random() * 0.6;
    const widthScale = 0.8 + Math.random() * 0.4;
    mito.scale.set(widthScale, lengthScale, widthScale);

    somaGroup.add(mito);
  }

  // Golgi apparatus
  const golgiMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.7,
  });
  for (let i = 0; i < 4; i++) {
    const golgi = new THREE.Mesh(
      new THREE.TorusGeometry(0.2 + i * 0.08, 0.04, 8, 16, Math.PI * 1.5),
      golgiMat
    );
    golgi.position.set(-1.2, 0.8 - i * 0.12, 0.5);
    golgi.rotation.y = Math.PI / 4;
    somaGroup.add(golgi);
  }

  soma = somaGroup;
  scene.add(somaGroup);
}

// ============================================
// DENDRITES - More elaborate branching
// ============================================

function createDendrites() {
  const dendriteMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
    emissive: 0x7c3aed,
    emissiveIntensity: 0.2,
    depthWrite: false,
  });

  // Create more elaborate branching dendrites
  const dendriteConfigs = [
    { angle: Math.PI * 0.65, elevation: 0.4, length: 5, branches: 3 },
    { angle: Math.PI * 0.8, elevation: 0.6, length: 4.5, branches: 2 },
    { angle: Math.PI * 0.95, elevation: -0.1, length: 5.5, branches: 3 },
    { angle: Math.PI * 1.05, elevation: 0.5, length: 4.8, branches: 2 },
    { angle: Math.PI * 1.2, elevation: -0.4, length: 5.2, branches: 3 },
    { angle: Math.PI * 1.35, elevation: 0.2, length: 4.2, branches: 2 },
    { angle: Math.PI * 0.5, elevation: 0.7, length: 4, branches: 2 },
    { angle: Math.PI * 1.5, elevation: -0.6, length: 4.5, branches: 2 },
  ];

  dendriteConfigs.forEach((config, idx) => {
    const dendriteGroup = new THREE.Group();

    // Main dendrite trunk
    const points = [];
    const segments = 25;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const baseX = Math.cos(config.angle) * 2.5;
      const baseZ = Math.sin(config.angle) * 2.5;
      const dirX = -Math.cos(config.angle - Math.PI);
      const dirZ = -Math.sin(config.angle - Math.PI);

      const x = baseX + t * config.length * dirX + Math.sin(t * 4) * 0.15;
      const y = config.elevation * 2.5 + t * config.elevation * 2 + Math.sin(t * 3) * 0.2;
      const z = baseZ + t * config.length * dirZ + Math.cos(t * 3.5) * 0.15;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, 25, 0.18 - idx * 0.01, 8, false);
    const tube = new THREE.Mesh(tubeGeom, dendriteMat);
    dendriteGroup.add(tube);

    // Mitochondria along dendrites (elongated, aligned with dendrite axis)
    const dendriteMitoMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      roughness: 0.4,
      emissive: 0xdc2626,
      emissiveIntensity: 0.2,
    });
    const dendriteMitoCount = 4 + Math.floor(Math.random() * 3);
    for (let m = 0; m < dendriteMitoCount; m++) {
      const t = 0.1 + Math.random() * 0.8;
      const pos = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const mito = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.04, 0.15, 3, 5),
        dendriteMitoMat
      );
      mito.position.copy(pos);
      // Align roughly with dendrite direction
      mito.lookAt(pos.clone().add(tangent));
      mito.rotateX(Math.PI / 2);
      // Small random offset from center
      mito.position.x += (Math.random() - 0.5) * 0.08;
      mito.position.y += (Math.random() - 0.5) * 0.08;
      mito.position.z += (Math.random() - 0.5) * 0.08;
      dendriteGroup.add(mito);
    }

    // Dendritic spines - many small protrusions
    const spineMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 25; i++) {
      const t = 0.15 + Math.random() * 0.75;
      const pos = curve.getPoint(t);

      // Spine head
      const spine = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 6, 4),
        spineMat
      );
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      spine.position.copy(pos).add(offset);
      dendriteGroup.add(spine);

      // Spine neck (thin connection)
      const neckPoints = [pos.clone(), spine.position.clone()];
      const neckCurve = new THREE.CatmullRomCurve3(neckPoints);
      const neck = new THREE.Mesh(
        new THREE.TubeGeometry(neckCurve, 2, 0.015, 4, false),
        spineMat
      );
      dendriteGroup.add(neck);
    }

    // Secondary and tertiary branches
    for (let b = 0; b < config.branches; b++) {
      const branchT = 0.3 + b * (0.5 / config.branches);
      const branchStart = curve.getPoint(branchT);
      const branchTangent = curve.getTangent(branchT);

      // Perpendicular direction for branch
      const perpAngle = Math.random() * Math.PI * 2;
      const branchPoints = [];
      const branchLen = 1.5 + Math.random() * 1.5;

      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const spread = Math.sin(perpAngle) * (b % 2 === 0 ? 1 : -1);
        branchPoints.push(new THREE.Vector3(
          branchStart.x + t * branchLen * (branchTangent.x * 0.5 + spread * 0.5),
          branchStart.y + t * branchLen * 0.8 * (b % 2 === 0 ? 1 : -0.5),
          branchStart.z + t * branchLen * (branchTangent.z * 0.5 + Math.cos(perpAngle) * 0.5)
        ));
      }

      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchTube = new THREE.Mesh(
        new THREE.TubeGeometry(branchCurve, 12, 0.1, 6, false),
        dendriteMat
      );
      dendriteGroup.add(branchTube);

      // Spines on secondary branches
      for (let s = 0; s < 8; s++) {
        const st = 0.2 + Math.random() * 0.7;
        const spos = branchCurve.getPoint(st);
        const sspine = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 4, 3),
          spineMat
        );
        sspine.position.copy(spos);
        sspine.position.x += (Math.random() - 0.5) * 0.25;
        sspine.position.y += (Math.random() - 0.5) * 0.25;
        sspine.position.z += (Math.random() - 0.5) * 0.25;
        dendriteGroup.add(sspine);
      }

      // Tertiary branches (smaller)
      if (b < 2) {
        const tertiaryT = 0.6;
        const tertiaryStart = branchCurve.getPoint(tertiaryT);
        const tertiaryPoints = [];

        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          tertiaryPoints.push(new THREE.Vector3(
            tertiaryStart.x + t * 0.8 * (Math.random() - 0.3),
            tertiaryStart.y + t * 0.6 * (b === 0 ? 1 : -1),
            tertiaryStart.z + t * 0.8 * (Math.random() - 0.3)
          ));
        }

        const tertiaryCurve = new THREE.CatmullRomCurve3(tertiaryPoints);
        const tertiaryTube = new THREE.Mesh(
          new THREE.TubeGeometry(tertiaryCurve, 8, 0.06, 4, false),
          dendriteMat
        );
        dendriteGroup.add(tertiaryTube);
      }
    }

    dendrites.push(dendriteGroup);
    scene.add(dendriteGroup);
  });
}

// ============================================
// AXON - Short, just showing origin
// ============================================

function createAxon() {
  const axonGroup = new THREE.Group();

  // Axon hillock (transition from soma)
  const hillockMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
    emissive: 0x0891b2,
    emissiveIntensity: 0.2,
    depthWrite: false,
  });

  // Hillock - cone shape
  const hillock = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.2, 16),
    hillockMat
  );
  hillock.rotation.z = Math.PI / 2;
  hillock.position.set(2.8, 0, 0);
  axonGroup.add(hillock);

  // Short axon initial segment
  const axonMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
    emissive: 0x0891b2,
    emissiveIntensity: 0.2,
    depthWrite: false,
  });

  const axonPoints = [];
  const axonLength = 6;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    axonPoints.push(new THREE.Vector3(
      3.5 + t * axonLength,
      Math.sin(t * 2) * 0.2,
      Math.cos(t * 2) * 0.15
    ));
  }

  const axonCurve = new THREE.CatmullRomCurve3(axonPoints);
  const axonTube = new THREE.Mesh(
    new THREE.TubeGeometry(axonCurve, 30, 0.2, 10, false),
    axonMat
  );
  axonGroup.add(axonTube);

  // Just one myelin sheath segment to show the concept
  const myelinMat = new THREE.MeshPhysicalMaterial({
    color: 0xfef3c7,
    roughness: 0.2,
    emissive: 0xfcd34d,
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 0.8,
  });

  const sheathPoints = [];
  for (let i = 0; i <= 15; i++) {
    const t = 0.3 + (i / 15) * 0.5;
    sheathPoints.push(axonCurve.getPoint(t));
  }
  const sheathCurve = new THREE.CatmullRomCurve3(sheathPoints);
  const sheath = new THREE.Mesh(
    new THREE.TubeGeometry(sheathCurve, 15, 0.4, 12, false),
    myelinMat
  );
  axonGroup.add(sheath);

  // Fade-out end (indicates continuation)
  const fadeGeom = new THREE.ConeGeometry(0.25, 1.5, 12);
  const fadeMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.4,
  });
  const fadeEnd = new THREE.Mesh(fadeGeom, fadeMat);
  fadeEnd.rotation.z = -Math.PI / 2;
  fadeEnd.position.copy(axonCurve.getPoint(1));
  fadeEnd.position.x += 0.8;
  axonGroup.add(fadeEnd);

  // Store curve for action potential animation
  axonGroup.userData.curve = axonCurve;

  axon = axonGroup;
  scene.add(axonGroup);
}

// ============================================
// ENVIRONMENT
// ============================================

function createEnvironment() {
  // Subtle grid
  const gridHelper = new THREE.GridHelper(30, 30, 0x1a1a2e, 0x0f0f1a);
  gridHelper.position.y = -4;
  scene.add(gridHelper);

  // Floating particles
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 25;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

    colors[i * 3] = 0.2 + Math.random() * 0.2;
    colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
    colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
  }

  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
  });

  const particles = new THREE.Points(particleGeom, particleMat);
  scene.add(particles);
}

// ============================================
// ACTION POTENTIAL
// ============================================

function fireActionPotential() {
  if (!axon || !axon.userData.curve) return;

  const apGroup = new THREE.Group();

  // Glowing sphere
  const apMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.9,
  });

  const apCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 8),
    apMat
  );
  apGroup.add(apCore);

  // Outer glow
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.4,
  });
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 8),
    glowMat
  );
  apGroup.add(glow);

  // Light
  const apLight = new THREE.PointLight(0xfbbf24, 2, 4);
  apGroup.add(apLight);

  apGroup.userData = {
    progress: 0,
    speed: 0.015,
    active: true,
  };

  const startPos = axon.userData.curve.getPoint(0);
  apGroup.position.copy(startPos);

  actionPotentials.push(apGroup);
  scene.add(apGroup);

  signalCount++;
  updateSignalCounter();

  // Flash soma when firing
  if (soma) {
    soma.children[0].material.emissiveIntensity = 0.8;
    setTimeout(() => {
      soma.children[0].material.emissiveIntensity = 0.25;
    }, 200);
  }
}

function updateActionPotentials() {
  if (!axon || !axon.userData.curve) return;

  const axonCurve = axon.userData.curve;

  actionPotentials.forEach((ap, index) => {
    if (!ap.userData.active) return;

    ap.userData.progress += ap.userData.speed;

    if (ap.userData.progress >= 1) {
      ap.userData.active = false;
      setTimeout(() => {
        scene.remove(ap);
        actionPotentials.splice(index, 1);
      }, 100);
      return;
    }

    const pos = axonCurve.getPoint(ap.userData.progress);
    ap.position.copy(pos);

    // Pulse effect
    const pulse = 1 + Math.sin(ap.userData.progress * 30) * 0.15;
    ap.children[0].scale.setScalar(pulse);
    ap.children[1].scale.setScalar(pulse * 1.2);
  });
}

// ============================================
// UI
// ============================================

function updateSignalCounter() {
  const counter = document.getElementById('signal-counter');
  if (counter) counter.textContent = signalCount;
}

function setupUI() {
  const introModal = document.getElementById('intro-modal');
  const uiOverlay = document.getElementById('ui-overlay');
  const startBtn = document.getElementById('start-btn');

  startBtn?.addEventListener('click', () => {
    introModal.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    gsapLikeAnimation(camera.position, { x: 0, y: 4, z: 12 }, 1500);
  });

  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoBtn = document.getElementById('close-info-btn');

  infoBtn?.addEventListener('click', () => infoModal.classList.remove('hidden'));
  closeInfoBtn?.addEventListener('click', () => infoModal.classList.add('hidden'));
  infoModal?.addEventListener('click', (e) => {
    if (e.target === infoModal) infoModal.classList.add('hidden');
  });

  // Fire button
  const fireBtn = document.getElementById('fire-btn');
  fireBtn?.addEventListener('click', () => {
    fireActionPotential();
  });

  // Zoom buttons
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');

  zoomInBtn?.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, 2);
  });

  zoomOutBtn?.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, -2);
  });

  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  resetBtn?.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 4, z: 12 }, 1000);
    controls.target.set(0, 0, 0);
    signalCount = 0;
    updateSignalCounter();
  });
}

function gsapLikeAnimation(obj, target, duration) {
  const start = { x: obj.x, y: obj.y, z: obj.z };
  const startTime = performance.now();

  function update() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    obj.x = start.x + (target.x - start.x) * ease;
    obj.y = start.y + (target.y - start.y) * ease;
    obj.z = start.z + (target.z - start.z) * ease;

    if (progress < 1) requestAnimationFrame(update);
  }
  update();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Auto-fire action potentials periodically
  if (autoFire && time - lastFireTime > 4) {
    fireActionPotential();
    lastFireTime = time;
  }

  // Update action potentials
  updateActionPotentials();

  // Subtle soma pulsing (like membrane potential fluctuations)
  if (soma) {
    const pulse = 1 + Math.sin(time * 1.5) * 0.015;
    soma.scale.setScalar(pulse);
  }

  // Gentle dendrite movement
  dendrites.forEach((dendrite, i) => {
    dendrite.rotation.z = Math.sin(time * 0.3 + i * 0.5) * 0.015;
    dendrite.rotation.x = Math.cos(time * 0.2 + i * 0.3) * 0.01;
  });

  controls.update();
  renderer.render(scene, camera);
}

// Start
init();
