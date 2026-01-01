import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// PHYSARUM POLYCEPHALUM - PLASMODIUM
// Anatomically Accurate 3D Visualization
// ============================================
// Research basis:
// - Plasmodium size: 3-4 cm diameter (can reach 30+ cm), 3-5 cm thick
// - Multinucleated syncytium: Thousands of nuclei (100-1000s)
// - Organelles: Mitochondria dense throughout for high metabolic demands
// - Protoplasmic streaming: Cytoplasm flows through dendritic network
// - Fibrils: Contractile ~55Å structures for movement and streaming
// - Actomyosin filaments: Drive cytoplasmic shuttle streaming
// ============================================

let scene, camera, renderer, controls;
let plasmodiumGroup, cellMembrane, nucleiGroup, mitochondriaGroup, plasmaGroup;
let protoplasticStreamParticles;
let clock = new THREE.Clock();
let isExploring = false;

// Toggle states
let showNuclei = true;
let showStreaming = true;

// Protoplasmic streaming state - shuttle streaming simulation
let globalStreamingPhase = 0;
let streamingPeriod = 3.0; // 3 seconds for visible demo (vs 60-120s in nature)
let currentFlowDirection = 1; // 1 = outward, -1 = inward
let veinMeshes = []; // Store vein meshes for pulsing animation
let veinPaths = []; // Store vein path data for mitochondrial positioning

// ============================================
// INITIALIZATION
// ============================================

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 50, 200);

  // Camera - adjusted for larger organism
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 20);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  // Lighting - optimized for transparent/translucent plasmodium
  setupLighting();

  // Create the plasmodium with accurate anatomy
  createPlasmodium();

  // Create protoplasmic streaming visualization
  createProtoplasticStream();

  // Event listeners
  setupEventListeners();

  // Update stats
  updateStats();

  // Start animation
  animate();
}

// ============================================
// LIGHTING - Designed for bioluminescent appearance
// ============================================

function setupLighting() {
  // Ambient light - subtle greenish-yellow (organism color)
  const ambient = new THREE.AmbientLight(0x2a3a1a, 0.5);
  scene.add(ambient);

  // Main light - cool blue (study light)
  const mainLight = new THREE.DirectionalLight(0x6699ff, 1.0);
  mainLight.position.set(15, 20, 15);
  scene.add(mainLight);

  // Fill light - warm yellow
  const fillLight = new THREE.DirectionalLight(0xffcc33, 0.4);
  fillLight.position.set(-15, 5, -15);
  scene.add(fillLight);

  // Rim light for edge definition
  const rimLight = new THREE.DirectionalLight(0x00ff88, 0.5);
  rimLight.position.set(0, -10, 20);
  scene.add(rimLight);

  // Point light - interior glow (protoplasmic streaming effect)
  const pointLight = new THREE.PointLight(0x00ff88, 0.4, 50);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
}

// ============================================
// CREATE MAIN PLASMODIUM
// ============================================

function createPlasmodium() {
  plasmodiumGroup = new THREE.Group();

  // Main cell body - irregular amorphous blob shape
  // Physarum grows in dendritic patterns, so we create an organic shape
  const cellGeometry = createPlasmodiumGeometry();

  // Material - semi-transparent yellowish with slight iridescence
  const cellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd4a837,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  cellMembrane = new THREE.Mesh(cellGeometry, cellMaterial);
  plasmodiumGroup.add(cellMembrane);

  // Add internal structures
  createNuclei();
  createMitochondria();
  createCytoplasmaticNetwork();

  scene.add(plasmodiumGroup);
}

// ============================================
// ORGANIC BLOB GEOMETRY
// Based on Voronoi patterns and dendritic growth
// ============================================

function createPlasmodiumGeometry(radius = 8, segments = 64) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const indices = [];

  // Create an organic, irregular shape using noise-based perturbation
  const radialSegments = segments;
  const heightSegments = Math.floor(segments * 0.7);

  // Generate vertices using spherical coordinates with perturbations
  for (let j = 0; j <= heightSegments; j++) {
    const phi = (j / heightSegments) * Math.PI;

    for (let i = 0; i <= radialSegments; i++) {
      const theta = (i / radialSegments) * Math.PI * 2;

      // Base sphere position
      let r = radius;

      // Add organic irregularity using multiple sine waves
      const noise1 = Math.sin(theta * 3 + j * 0.5) * 0.3;
      const noise2 = Math.sin(phi * 2.5 + i * 0.3) * 0.25;
      const noise3 = Math.sin(theta * 1.5 + phi) * 0.2;

      r *= (1 + noise1 + noise2 + noise3);

      // More pronounced at poles (growth tips)
      const poleFactor = Math.sin(phi);
      r *= (1 + poleFactor * 0.15);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions.push(x, y, z);
    }
  }

  // Generate indices
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = a + 1;
      const c = a + radialSegments + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// ============================================
// NUCLEI - Thousands throughout the plasmodium
// Actual: Hundreds to thousands of nuclei
// ============================================

function createNuclei() {
  nucleiGroup = new THREE.Group();
  const nucleusCount = 400; // Representative number

  const nucleusGeometry = new THREE.IcosahedronGeometry(0.2, 3);
  const nucleusMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf39c12, // Golden yellow
    emissive: 0xf39c12,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  });

  // Distribute nuclei throughout the plasmodium interior
  for (let i = 0; i < nucleusCount; i++) {
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial.clone());

    // Random position within plasmodium
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const radius = Math.random() * 7; // Distributed throughout

    const x = radius * Math.cos(angle1) * Math.sin(angle2);
    const y = radius * Math.sin(angle1) * Math.sin(angle2);
    const z = radius * Math.cos(angle2);

    nucleus.position.set(x, y, z);

    // Slight random rotation
    nucleus.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Store animation parameters
    nucleus.userData.oscillationSpeed = 0.5 + Math.random() * 1.5;
    nucleus.userData.oscillationPhase = Math.random() * Math.PI * 2;
    nucleus.userData.basePosition = { x, y, z };

    nucleiGroup.add(nucleus);
  }

  plasmodiumGroup.add(nucleiGroup);

  // Update UI
  document.getElementById('nuclei-count').textContent = nucleusCount;
}

// ============================================
// MITOCHONDRIA - Dense throughout the plasmodium
// Actual: Thousands/millions, supporting high metabolic demands
// ============================================

function createMitochondria() {
  mitochondriaGroup = new THREE.Group();
  const mitochondriaCount = 1200; // Increased for branch coverage

  const mitoGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  const mitoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff6b35, // Bright orange-red (more visible)
    emissive: 0xff6b35,
    emissiveIntensity: 0.3,
    roughness: 0.5,
    metalness: 0.0,
    transparent: true,
    opacity: 0.7,
  });

  // Distribute mitochondria ALONG vein paths (branch-like)
  let mitoIndex = 0;

  veinPaths.forEach((veinPath, pathIndex) => {
    // Calculate mitochondria per path based on path length
    const mitosPerPath = Math.ceil(mitochondriaCount / veinPaths.length);

    for (let i = 0; i < mitosPerPath && mitoIndex < mitochondriaCount; i++) {
      const mito = new THREE.Mesh(mitoGeometry, mitoMaterial.clone());

      // Position along the vein path
      const pathProgress = i / mitosPerPath; // 0 to 1 along path

      // Get position from vein curve
      const pathIndex2 = Math.min(
        Math.floor(pathProgress * (veinPath.length - 1)),
        veinPath.length - 1
      );
      const basePoint = veinPath[pathIndex2];

      // Add small offset perpendicular to vein
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = 0.15 + Math.random() * 0.1;
      const offset = new THREE.Vector3(
        Math.cos(offsetAngle) * offsetDist,
        Math.sin(offsetAngle) * offsetDist * 0.5,
        (Math.random() - 0.5) * 0.2
      );

      const position = basePoint.clone().add(offset);
      mito.position.copy(position);

      // Slight rotation
      mito.rotation.set(
        Math.random() * Math.PI * 0.5,
        Math.random() * Math.PI * 0.5,
        Math.random() * Math.PI * 0.5
      );

      // Store animation parameters
      mito.userData.pathProgress = pathProgress; // 0-1 position on vein
      mito.userData.pathIndex = pathIndex; // which vein
      mito.userData.basePosition = position.clone();
      mito.userData.pulsePhase = Math.random() * Math.PI * 2;
      mito.userData.pulseAmplitude = 0.08 + Math.random() * 0.06;

      mitochondriaGroup.add(mito);
      mitoIndex++;
    }
  });

  plasmodiumGroup.add(mitochondriaGroup);

  // Update UI
  document.getElementById('mito-count').textContent = mitoIndex;
}

// ============================================
// CYTOPLASMATIC NETWORK
// Dendritic veins for protoplasmic streaming
// ============================================

function createCytoplasmaticNetwork() {
  const networkGroup = new THREE.Group();
  const tubeCount = 15;

  // Create dendritic vein structure
  for (let i = 0; i < tubeCount; i++) {
    const startAngle = (i / tubeCount) * Math.PI * 2;

    // Main vein branches radially outward
    const mainBranchLength = 6 + Math.random() * 3;
    const mainPoints = [];

    // Starting from center
    mainPoints.push(new THREE.Vector3(0, 0, 0));

    // Branch outward
    let currentPos = new THREE.Vector3(
      Math.cos(startAngle) * 0.5,
      Math.sin(startAngle) * 0.5,
      0
    );

    for (let j = 0; j < 8; j++) {
      const progress = j / 8;
      const distance = mainBranchLength * progress;

      // Add slight waviness
      const wave = Math.sin(j * 0.5) * 0.3;
      const angle = startAngle + wave;

      currentPos = new THREE.Vector3(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        Math.sin(j * 0.3) * 1.5
      );

      mainPoints.push(currentPos.clone());
    }

    // Store vein path for mitochondrial positioning
    veinPaths.push(mainPoints);

    // Create tube geometry
    const curve = new THREE.CatmullRomCurve3(mainPoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 8, 0.15, 6, false);
    const tubeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3498db,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    });

    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    networkGroup.add(tube);
    veinMeshes.push(tube); // Store for pulsing animation

    // Add secondary branches
    for (let b = 0; b < 2; b++) {
      const branchStart = mainPoints[Math.floor(Math.random() * mainPoints.length)];
      const branchAngle = startAngle + (Math.random() - 0.5) * 1.5;
      const branchLength = 2 + Math.random() * 2;

      const branchPoints = [branchStart.clone()];
      for (let j = 0; j < 5; j++) {
        const progress = j / 5;
        const distance = branchLength * progress;

        branchPoints.push(
          new THREE.Vector3(
            branchStart.x + Math.cos(branchAngle) * distance,
            branchStart.y + Math.sin(branchAngle) * distance,
            branchStart.z + (Math.random() - 0.5) * 0.5
          )
        );
      }

      // Store secondary branch path
      veinPaths.push(branchPoints);

      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(branchCurve, 6, 0.08, 5, false);
      const branchMaterial = tubeMaterial.clone();
      branchMaterial.opacity = 0.35;

      const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
      networkGroup.add(branchMesh);
      veinMeshes.push(branchMesh); // Store for pulsing animation
    }
  }

  plasmodiumGroup.add(networkGroup);
}

// ============================================
// PROTOPLASMIC STREAMING
// Animated flow through the network
// ============================================

function createProtoplasticStream() {
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Flow color - cyan/green (active protoplasm)
  const flowColor = new THREE.Color(0x1abc9c);

  for (let i = 0; i < particleCount; i++) {
    // Distribute along flowing paths
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 8;
    const height = (Math.random() - 0.5) * 4;

    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = Math.sin(angle) * distance;
    positions[i * 3 + 2] = height;

    colors[i * 3] = flowColor.r;
    colors[i * 3 + 1] = flowColor.g;
    colors[i * 3 + 2] = flowColor.b;

    sizes[i] = 0.05 + Math.random() * 0.08;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  protoplasticStreamParticles = new THREE.Points(geometry, material);
  plasmodiumGroup.add(protoplasticStreamParticles);
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Animate nuclei - oscillate slightly
  if (nucleiGroup && showNuclei) {
    nucleiGroup.children.forEach((nucleus) => {
      const basePos = nucleus.userData.basePosition;
      const oscillation = Math.sin(
        time * nucleus.userData.oscillationSpeed + nucleus.userData.oscillationPhase
      ) * 0.15;

      nucleus.position.x = basePos.x + oscillation * Math.cos(time);
      nucleus.position.y = basePos.y + oscillation * Math.sin(time);
      nucleus.position.z = basePos.z + oscillation * Math.cos(time * 0.7);

      // Pulse emissive intensity
      nucleus.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.2;
    });
  }

  // Animate mitochondria - pulsing with protoplasmic streaming (like real Physarum)
  if (mitochondriaGroup) {
    mitochondriaGroup.children.forEach((mito) => {
      const basePos = mito.userData.basePosition;

      // Pulsing scale synchronized with streaming phase (mimics ectoplasm wall thickening/thinning)
      const pulseScale = 1.0 + Math.sin(globalStreamingPhase * Math.PI + mito.userData.pulsePhase) * 0.25;
      mito.scale.set(pulseScale, pulseScale, pulseScale);

      // Opacity changes with flow direction (brighter during forward flow, dimmer during backward)
      const baseOpacity = 0.6;
      const flowIntensity = Math.abs(globalStreamingPhase);
      const directionBias = currentFlowDirection > 0 ? 0.1 : -0.1;
      mito.material.opacity = baseOpacity + (flowIntensity * 0.3) + directionBias;

      // Emissive intensity increases with flow intensity (brightens during active streaming)
      mito.material.emissiveIntensity = 0.2 + flowIntensity * 0.4;

      // Subtle oscillating position within the local flow field (following stream)
      const streamOffset = Math.sin(globalStreamingPhase * Math.PI * 2) * 0.12;
      const angle = mito.userData.pathIndex * (Math.PI * 2 / veinPaths.length);
      const offsetX = Math.cos(angle) * streamOffset;
      const offsetY = Math.sin(angle) * streamOffset * 0.5;

      mito.position.x = basePos.x + offsetX;
      mito.position.y = basePos.y + offsetY;
      mito.position.z = basePos.z + Math.sin(time * 0.5 + mito.userData.pulsePhase) * 0.08;

      // Gentle continuous rotation
      mito.rotation.x += 0.001 * (1 + flowIntensity);
      mito.rotation.y += 0.002 * (1 + flowIntensity);
      mito.rotation.z += 0.0015 * (1 + flowIntensity);
    });
  }

  // Animate protoplasmic streaming - shuttle streaming simulation
  if (protoplasticStreamParticles && showStreaming) {
    // Update global streaming phase
    globalStreamingPhase = Math.sin((time * Math.PI * 2) / streamingPeriod);
    currentFlowDirection = Math.sign(globalStreamingPhase);

    const positions = protoplasticStreamParticles.geometry.attributes.position.array;
    const colors = protoplasticStreamParticles.geometry.attributes.color.array;

    // Update particle flow direction colors
    const outwardColor = new THREE.Color(0x1abc9c); // Cyan
    const inwardColor = new THREE.Color(0xf39c12); // Orange

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Calculate position along vein (0 = center, 1 = edge)
      const angle = Math.atan2(y, x);
      const distance = Math.sqrt(x * x + y * y);

      // Shuttle flow: move outward when positive, inward when negative
      const flowSpeed = 0.015 * currentFlowDirection;
      const newDistance = distance + flowSpeed;

      // Clamp distance and reverse at boundaries
      let clampedDistance = newDistance;
      if (clampedDistance > 7.5) {
        clampedDistance = 7.5;
        positions[i + 2] = (Math.random() - 0.5) * 2; // Randomize height at edge
      } else if (clampedDistance < 0.5) {
        clampedDistance = 0.5;
        positions[i + 2] = (Math.random() - 0.5) * 2; // Randomize height at center
      } else {
        positions[i + 2] += (Math.random() - 0.5) * 0.02; // Brownian motion
      }

      positions[i] = Math.cos(angle) * clampedDistance;
      positions[i + 1] = Math.sin(angle) * clampedDistance;

      // Update color based on flow direction
      const flowColor = currentFlowDirection > 0 ? outwardColor : inwardColor;
      colors[i] = flowColor.r;
      colors[i + 1] = flowColor.g;
      colors[i + 2] = flowColor.b;
    }

    protoplasticStreamParticles.geometry.attributes.position.needsUpdate = true;
    protoplasticStreamParticles.geometry.attributes.color.needsUpdate = true;
  }

  // Animate vein pulsing with protoplasmic streaming
  if (veinMeshes.length > 0) {
    veinMeshes.forEach((vein, idx) => {
      const pulsePhase = globalStreamingPhase + (idx * 0.1); // Stagger veins
      const pulseScale = 1.0 + Math.sin(pulsePhase) * 0.15; // ±15% thickness variation
      vein.scale.x = pulseScale;
      vein.scale.y = pulseScale;

      // Increase brightness during flow
      const flowIntensity = Math.abs(globalStreamingPhase);
      vein.material.opacity = 0.35 + (flowIntensity * 0.2);
    });
  }

  // Rotate main plasmodium group
  if (plasmodiumGroup) {
    plasmodiumGroup.rotation.z += 0.0005;
  }

  // Update UI stats
  updateStats();

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

  // Start button
  const startBtn = document.getElementById('start-btn');
  const introModal = document.getElementById('intro-modal');
  const uiOverlay = document.getElementById('ui-overlay');

  startBtn.addEventListener('click', () => {
    introModal.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    isExploring = true;
    gsapLikeAnimation(camera.position, { x: 0, y: 5, z: 18 }, 1500);
  });

  // Info modal
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const closeInfoBtn = document.getElementById('close-info-btn');

  infoBtn.addEventListener('click', () => {
    infoModal.classList.toggle('hidden');
  });

  closeInfoBtn.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  // Zoom controls
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

  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 8, z: 20 }, 1000);
    controls.target.set(0, 0, 0);
  });

  // Toggle nuclei
  const toggleNucleiBtn = document.getElementById('toggle-nuclei');
  toggleNucleiBtn.addEventListener('click', () => {
    showNuclei = !showNuclei;
    if (nucleiGroup) {
      nucleiGroup.visible = showNuclei;
    }
    toggleNucleiBtn.style.opacity = showNuclei ? '1' : '0.5';
  });

  // Toggle streaming
  const toggleStreamBtn = document.getElementById('toggle-stream');
  toggleStreamBtn.addEventListener('click', () => {
    showStreaming = !showStreaming;
    if (protoplasticStreamParticles) {
      protoplasticStreamParticles.visible = showStreaming;
    }
    toggleStreamBtn.style.opacity = showStreaming ? '1' : '0.5';
  });
}

// ============================================
// UI STATS UPDATE
// ============================================

function updateStats() {
  const distance = camera.position.length().toFixed(1);
  document.getElementById('cam-distance').textContent = distance;

  // Update flow direction based on current streaming phase
  if (showStreaming) {
    const flowText = currentFlowDirection > 0 ? 'Outward ➜' : 'Inward ➜';
    const flowElement = document.getElementById('flow-direction');
    const phaseElement = document.getElementById('stream-phase');

    if (flowElement) {
      flowElement.textContent = flowText;
    }
    if (phaseElement) {
      phaseElement.textContent = Math.round(Math.abs(globalStreamingPhase) * 100) + '%';
    }
  }
}

// Simple animation helper
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
