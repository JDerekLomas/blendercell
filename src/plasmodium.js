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
let plasmodiumGroup;
let clock = new THREE.Clock();
let isExploring = false;

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
  // Scene - black background for tree-like branching visualization
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 200, 500);

  // Camera - positioned for tree-like view
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 40);

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

  // Event listeners
  setupEventListeners();

  // Update stats
  updateStats();

  // Start animation
  animate();
}

// ============================================
// LIGHTING - Yellow/Gold on black background
// ============================================

function setupLighting() {
  // Minimal ambient - keep background black
  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);

  // Main key light - bright yellow/gold
  const mainLight = new THREE.DirectionalLight(0xffeb3b, 1.3);
  mainLight.position.set(20, 25, 15);
  mainLight.castShadow = true;
  scene.add(mainLight);

  // Fill light - softer yellow
  const fillLight = new THREE.DirectionalLight(0xffc107, 0.7);
  fillLight.position.set(-20, 5, -15);
  scene.add(fillLight);

  // Rim light - edge definition in yellow
  const rimLight = new THREE.DirectionalLight(0xffeb3b, 0.9);
  rimLight.position.set(0, -15, 25);
  scene.add(rimLight);

  // Point light - interior glow for veins
  const pointLight = new THREE.PointLight(0xffeb3b, 0.8, 100);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
}

// ============================================
// CREATE MAIN PLASMODIUM
// ============================================

function createPlasmodium() {
  plasmodiumGroup = new THREE.Group();

  // Create only the growing, pulsing yellow slime network
  // No nuclei dots, no mitochondria dots, no other structures
  createGrowingSlimeNetwork();

  scene.add(plasmodiumGroup);
}

// ============================================
// GROWING SLIME TREE NETWORK
// Pure L-system branching - no body, just growing branches with pulsing propulsion
// ============================================

let growthSegments = []; // Track all branch segments for growth animation
let segmentGrowthProgress = []; // Growth progress per segment (0-1)
let basePositions = []; // Store base positions for pulsing movement

function createGrowingSlimeNetwork() {
  // Yellow/gold material for slime branches
  const slimeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeb3b,
    emissive: 0xffeb3b,
    emissiveIntensity: 0.8,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.95,
    flatShading: false,
  });

  // Generate L-system branching tree (starting small, growing large)
  // 8 iterations for 4x more branches (400% increase), 22° for finer filament-like structure
  const branchNetwork = generateBranchingNetwork(8, 22);

  // Convert all branch segments into growth-animated tentacle tubes
  branchNetwork.forEach((branchSegments, branchIndex) => {
    branchSegments.forEach((segment, segmentIndex) => {
      const branchOrder = Math.floor(Math.log2(branchIndex + 1));
      const murrayRatio = Math.pow(2, -1/3); // ≈ 0.794 (Murray's Law)
      const diameterRatio = Math.pow(murrayRatio, branchOrder);

      // Base radius follows Murray's Law - thinner branches as they extend
      // Start extremely thin (filament-like) and grow thicker over time
      const baseRadius = 0.02; // Start ultra-thin, like fine filaments
      const tubeRadius = baseRadius * diameterRatio;

      // Store segment data for growth animation
      growthSegments.push({
        segment: segment,
        radius: tubeRadius,
        material: slimeMaterial.clone(),
        mesh: null,
        branchOrder: branchOrder,
      });

      segmentGrowthProgress.push(0); // All segments start at 0% grown
    });
  });

  // Create initial tube meshes for tentacles (they'll grow via animation)
  growthSegments.forEach((segData, idx) => {
    const segment = segData.segment;
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const dz = segment.z2 - segment.z1;
    const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Create cylinder tube for tentacle
    const tubeGeometry = new THREE.CylinderGeometry(segData.radius, segData.radius, length, 8, 1);
    const tube = new THREE.Mesh(tubeGeometry, segData.material);

    // Position tube starting from body (at segment.x1, y1, z1)
    tube.position.set(
      (segment.x1 + segment.x2) / 2,
      (segment.y1 + segment.y2) / 2,
      (segment.z1 + segment.z2) / 2
    );

    // Rotate to align with segment direction
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(upVector, direction).normalize();
    const angle = Math.acos(upVector.dot(direction));

    if (axis.length() > 0.001) {
      tube.quaternion.setFromAxisAngle(axis, angle);
    }

    // Store reference
    segData.mesh = tube;
    growthSegments[idx] = segData;

    // Store base position for propulsive movement
    basePositions[idx] = {
      x: tube.position.x,
      y: tube.position.y,
      z: tube.position.z
    };

    plasmodiumGroup.add(tube);
    veinMeshes.push(tube);
  });
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

  const nucleusGeometry = new THREE.IcosahedronGeometry(0.15, 3);
  const nucleusMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeb3b, // Bright yellow
    emissive: 0xffa500,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.4,
    transparent: true,
    opacity: 0.85,
  });

  // Generate branching network for nucleus positioning
  const branchNetwork = generateBranchingNetwork(5, 30);
  let nucleusCount = 0;

  // Distribute nuclei along the branching network (syncytium property)
  branchNetwork.forEach((branchSegments, branchIndex) => {
    branchSegments.forEach((segment, segmentIndex) => {
      const nucleiPerSegment = 4; // Multiple nuclei per vein segment

      for (let i = 0; i < nucleiPerSegment; i++) {
        const t = (i + Math.random()) / nucleiPerSegment;

        // Interpolate position along segment
        const x = segment.x1 + (segment.x2 - segment.x1) * t;
        const y = segment.y1 + (segment.y2 - segment.y1) * t;
        const z = segment.z1 + (segment.z2 - segment.z1) * t;

        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial.clone());
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
        nucleusCount++;
      }
    });
  });

  plasmodiumGroup.add(nucleiGroup);

  // Update UI
  document.getElementById('nuclei-count').textContent = nucleusCount;
}

// ============================================
// MITOCHONDRIA - Dense throughout the plasmodium
// Actual: Thousands/millions, supporting high metabolic demands
// ============================================

// ============================================
// BRANCHING NETWORK GENERATION (L-System based)
// ============================================
function generateBranchingNetwork(iterations = 4, angle = 25) {
  // L-System: A → F[+A][-A]F A
  // Generates self-similar fractal branching with optimal diameter ratios

  const branches = [];
  let turtle = {
    x: 0,
    y: 0,
    z: 0,
    angle: 90,
    stack: []
  };

  function processLSystem(axiom, iterations) {
    let string = 'A';
    const rules = {
      'A': 'F[+A][-A]FA'
    };

    // Expand L-system string
    for (let iter = 0; iter < iterations; iter++) {
      let newString = '';
      for (let char of string) {
        newString += rules[char] || char;
      }
      string = newString;
    }

    return string;
  }

  function executeString(str) {
    const branchSegments = [];
    const angleRad = angle * Math.PI / 180;
    let currentBranch = [];

    for (let char of str) {
      if (char === 'F') {
        const segmentLength = 0.5 / Math.pow(2, 0.5); // Scaling for iterations
        const nextX = turtle.x + segmentLength * Math.cos(turtle.angle);
        const nextY = turtle.y + segmentLength * Math.sin(turtle.angle);

        currentBranch.push({
          x1: turtle.x, y1: turtle.y, z1: turtle.z,
          x2: nextX, y2: nextY, z2: turtle.z,
          order: 0 // Will be set based on depth
        });

        turtle.x = nextX;
        turtle.y = nextY;

      } else if (char === '+') {
        turtle.angle -= angleRad;
      } else if (char === '-') {
        turtle.angle += angleRad;
      } else if (char === '[') {
        turtle.stack.push({x: turtle.x, y: turtle.y, z: turtle.z, angle: turtle.angle});
      } else if (char === ']') {
        if (currentBranch.length > 0) {
          branchSegments.push(currentBranch);
          currentBranch = [];
        }
        const saved = turtle.stack.pop();
        if (saved) {
          turtle.x = saved.x;
          turtle.y = saved.y;
          turtle.z = saved.z;
          turtle.angle = saved.angle;
        }
      }
    }

    if (currentBranch.length > 0) {
      branchSegments.push(currentBranch);
    }

    return branchSegments;
  }

  const lSystemString = processLSystem('A', iterations);
  return executeString(lSystemString);
}

function createMitochondria() {
  mitochondriaGroup = new THREE.Group();

  // Generate branching network using L-systems (self-similar fractal)
  const branchNetwork = generateBranchingNetwork(4, 25);

  // Murray's Law: Diameter scales as r_n = r_0 * (2^(-1/3))^n ≈ 0.794^n
  const murrayDiameterRatio = Math.pow(2, -1/3); // ≈ 0.7937

  const mitoGeometry = new THREE.SphereGeometry(0.06, 5, 5);
  const mitoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffa500,   // Orange (energy nodes)
    emissive: 0xff8c00, // Dark orange glow
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 0.8,
  });

  // Gray-Scott reaction-diffusion pattern: Creates organic clustering
  // u (ATP/fuel) and v (mitochondrial catalyst) oscillate to form spots/stripes
  const gridSize = 32;
  const spacing = 1.5;

  // Initialize Gray-Scott state
  const u = Array(gridSize * gridSize).fill(1.0);
  const v = Array(gridSize * gridSize).fill(0.0);

  // Create initial perturbation (nucleation sites)
  for (let i = 0; i < gridSize * gridSize; i++) {
    if (Math.random() < 0.005) {
      u[i] = 0.5;
      v[i] = 0.25;
    }
  }

  // Simulate Gray-Scott for a few iterations to create patterns
  const F = 0.055;
  const k = 0.062;
  const D_u = 0.16;
  const D_v = 0.08;
  const dt = 1.0;

  for (let iter = 0; iter < 100; iter++) {
    const u_new = [...u];
    const v_new = [...v];

    for (let y = 1; y < gridSize - 1; y++) {
      for (let x = 1; x < gridSize - 1; x++) {
        const idx = y * gridSize + x;
        const laplacian_u = (
          u[(y-1)*gridSize + x] + u[(y+1)*gridSize + x] +
          u[y*gridSize + x-1] + u[y*gridSize + x+1] - 4*u[idx]
        ) / (spacing * spacing);
        const laplacian_v = (
          v[(y-1)*gridSize + x] + v[(y+1)*gridSize + x] +
          v[y*gridSize + x-1] + v[y*gridSize + x+1] - 4*v[idx]
        ) / (spacing * spacing);

        const uv2 = u[idx] * v[idx] * v[idx];
        u_new[idx] = u[idx] + dt * (D_u * laplacian_u - uv2 + F * (1 - u[idx]));
        v_new[idx] = v[idx] + dt * (D_v * laplacian_v + uv2 - (F + k) * v[idx]);

        u_new[idx] = Math.max(0, Math.min(1, u_new[idx]));
        v_new[idx] = Math.max(0, Math.min(1, v_new[idx]));
      }
    }

    Object.assign(u, u_new);
    Object.assign(v, v_new);
  }

  // Place mitochondria at high-v regions (where pattern concentrated) and along branches
  const mitoPositions = new Set();

  // Extract positions from reaction-diffusion pattern
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      const concentration = v[idx];

      // High concentration threshold
      if (concentration > 0.15) {
        const worldX = (x - gridSize/2) * (spacing / 5);
        const worldY = (y - gridSize/2) * (spacing / 5);
        const key = `${Math.round(worldX*10)},${Math.round(worldY*10)}`;

        if (!mitoPositions.has(key)) {
          mitoPositions.add(key);

          const mito = new THREE.Mesh(mitoGeometry, mitoMaterial.clone());
          const z = (Math.random() - 0.5) * 0.3;

          mito.position.set(worldX, worldY, z);
          mito.rotation.set(
            Math.random() * 0.3,
            Math.random() * 0.3,
            Math.random() * 0.3
          );

          // Store parameters for pulsing animation
          mito.userData.concentration = concentration;
          mito.userData.baseScale = 0.8 + concentration * 0.3;
          mito.userData.branchDepth = Math.round(concentration * 5);
          mito.userData.gridX = x;
          mito.userData.gridY = y;

          mitochondriaGroup.add(mito);
        }
      }
    }
  }

  // Add additional mitochondria along L-system branches with Murray's Law scaling
  let totalBranchMitos = 0;
  branchNetwork.forEach((branchSegments, branchIndex) => {
    branchSegments.forEach((segment, segmentIndex) => {
      const branchOrder = Math.floor(Math.log2(branchIndex + 1));
      const diameterRatio = Math.pow(murrayDiameterRatio, branchOrder);

      // Density inversely proportional to diameter (more mitochondria in thinner branches)
      const mitoCount = Math.ceil(8 * (1 / diameterRatio));

      for (let i = 0; i < mitoCount; i++) {
        const t = i / mitoCount;
        const x = segment.x1 + (segment.x2 - segment.x1) * t;
        const y = segment.y1 + (segment.y2 - segment.y1) * t;
        const z = segment.z1 + (Math.random() - 0.5) * 0.1;

        const mito = new THREE.Mesh(mitoGeometry, mitoMaterial.clone());
        mito.position.set(x, y, z);
        mito.rotation.set(Math.random() * 0.2, Math.random() * 0.2, Math.random() * 0.2);

        mito.userData.branchOrder = branchOrder;
        mito.userData.diameterRatio = diameterRatio;
        mito.userData.baseScale = diameterRatio;
        mito.userData.segmentProgress = t;
        mito.userData.onBranch = true;

        mitochondriaGroup.add(mito);
        totalBranchMitos++;
      }
    });
  });

  plasmodiumGroup.add(mitochondriaGroup);

  // Update UI
  document.getElementById('mito-count').textContent = mitochondriaGroup.children.length;
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

  // Animate growing tree: branches grow and pulse with propulsive motion
  if (growthSegments && growthSegments.length > 0) {
    const branchGrowthSpeed = 0.15; // Faster growth for continuous expansion
    const pulseSpeed = 2.5; // Pulsing frequency (propulsion rhythm)
    const cascadeDelay = 0.08; // Rapid cascade for denser growth

    // BRANCHES ANIMATION: Grow and pulse with propulsive motion
    growthSegments.forEach((segData, idx) => {
      // Each branch starts growing with a cascade delay
      const cascadeTime = (idx / growthSegments.length) * cascadeDelay;
      const timeSinceStart = time - cascadeTime;

      // Growth progress - keeps growing indefinitely (no cap at 1)
      let growthProgress = Math.max(0, timeSinceStart * branchGrowthSpeed);

      // Size multiplier: grows from 1x to 6x (500% increase) over time
      // Tapers off as it gets larger (logarithmic growth for realism)
      const sizeMultiplier = 1.0 + (5.0 * Math.tanh(growthProgress * 0.3));

      segmentGrowthProgress[idx] = Math.min(growthProgress, 1.0); // Cap display at 100%

      if (segData.mesh) {
        // PULSING: Create propulsive motion through branches
        const pulsePhase = (time + idx * 0.05) * pulseSpeed;
        const pulseWave = Math.sin(pulsePhase); // -1 to 1
        const pulseAmount = Math.abs(pulseWave) * 0.2; // ±20% pulsing

        // Branch tapers as it extends (Murray's Law already in base radius)
        // Radius grows with size multiplier for thickening branches
        const scaledRadius = segData.radius * sizeMultiplier * (1.0 + pulseAmount);

        if (growthProgress > 0) {
          // Recreate branch geometry with pulsing radius
          const segment = segData.segment;
          const dx = segment.x2 - segment.x1;
          const dy = segment.y2 - segment.y1;
          const dz = segment.z2 - segment.z1;
          const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

          // Scale the length based on growth progress (caps at 1x length after grown)
          const lengthGrowthCap = Math.min(growthProgress, 1.0);
          const growthLength = length * lengthGrowthCap;

          // Create new geometry with current size
          const newGeometry = new THREE.CylinderGeometry(
            scaledRadius * lengthGrowthCap,
            scaledRadius * lengthGrowthCap,
            growthLength,
            8,
            1
          );

          // Update the mesh geometry
          segData.mesh.geometry.dispose();
          segData.mesh.geometry = newGeometry;

          // Update scale based on growth - stops at 1 once fully extended
          segData.mesh.scale.z = lengthGrowthCap;
        }

        // PROPULSIVE PULSING: Brightness and intensity pulse together
        // Peak brightness when pulse is strongest (propelling the slime forward)
        const brightnessPulse = 0.65 + Math.abs(pulseWave) * 0.3; // 65-95% opacity
        segData.material.opacity = 0.95 * brightnessPulse;
        segData.material.emissiveIntensity = 0.4 + (Math.abs(pulseWave) * 0.6); // 40-100% glow

        // PROPULSIVE POSITION: Pulse creates wave of motion through branches
        // Makes it look like the pulse is pushing the slime along
        const propulsionAmount = pulseWave * 0.08; // -0.08 to 0.08 units
        const segment = segData.segment;
        const direction = new THREE.Vector3(
          segment.x2 - segment.x1,
          segment.y2 - segment.y1,
          segment.z2 - segment.z1
        ).normalize();

        // Move along segment direction with pulse
        segData.mesh.position.x = basePositions[idx].x + (direction.x * propulsionAmount);
        segData.mesh.position.y = basePositions[idx].y + (direction.y * propulsionAmount);
        segData.mesh.position.z = basePositions[idx].z + (direction.z * propulsionAmount);
      }
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

}

// ============================================
// UI STATS UPDATE
// ============================================

function updateStats() {
  const distance = camera.position.length().toFixed(1);
  document.getElementById('cam-distance').textContent = distance;

  // Update tree growth information
  if (growthSegments && growthSegments.length > 0) {
    // Calculate average growth progress
    let totalProgress = 0;
    let growingCount = 0;

    segmentGrowthProgress.forEach((progress) => {
      totalProgress += progress;
      if (progress > 0 && progress < 1) {
        growingCount++;
      }
    });

    const avgProgress = Math.round((totalProgress / growthSegments.length) * 100);
    document.getElementById('body-growth').textContent = avgProgress + '%';
    document.getElementById('tentacles-growing').textContent = growingCount + ' branches';

    // Update pulse intensity
    const pulseIntensity = Math.round(50 + (avgProgress / 100) * 50);
    document.getElementById('pulse-intensity').textContent = pulseIntensity + '%';
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
