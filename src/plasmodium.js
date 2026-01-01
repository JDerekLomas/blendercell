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

// Shader-based rendering and flow simulation
let growthSegments = []; // Track all branch segments for growth animation
let segmentGrowthProgress = []; // Growth progress per segment (0-1)
let basePositions = []; // Store base positions for pulsive movement
let segmentFlows = []; // Flow rate through each segment (biologically plausible)
let sharedTubeGeometry = null; // Single tube geometry, reused for all segments

// ============================================
// PROCEDURAL FORM PARAMETERS
// ============================================

const physarumParams = {
  // L-SYSTEM CORE
  lsystem: {
    iterations: 8,
    baseAngle: 22,
    angleVariation: 3,
    rule: 'F[+A][-A]FA',
    branchProbability: 0.95,
    asymmetryFactor: 0.15,
    depthBias: 0.05,
  },

  // SPATIAL DISTRIBUTION
  spatial: {
    planarBias: 0.3,        // 0=3D, 1=2D
    spiralTwist: 0.05,
    gravitationalDrift: 0.0,
    curvatureFactor: 0.02,
    curvatureNoise: 0.015,
  },

  // ANASTOMOSIS (network loops)
  anastomosis: {
    enabled: true,
    distance: 3.5,
    threshold: 0.7,
    reinforcementFactor: 1.5,
  },

  // ATTRACTORS (nutrient sources)
  attractors: [
    { position: [6, 2, 6], strength: 2.0, radius: 8 },
    { position: [-6, 2, -6], strength: 2.0, radius: 8 },
  ],
  attractorInfluence: 0.3,

  // RADIUS & MURRAY'S LAW
  radius: {
    murrayExponent: 3,
    murrayRatio: Math.pow(2, -1/3),
    baseRadius: 0.02,
    radiusScale: 1.0,
    radiusNoise: 0.01,
    depthTaperFactor: 0.95,
  },

  // GROWTH DYNAMICS
  growth: {
    speed: 0.15,
    cascadeDelay: 0.08,
    sizeMultiplierMax: 6.0,
    sizeMultiplierTanh: 0.3,
    maxSegments: 1000,
  },

  // PULSING & FLOW
  pulse: {
    frequency: 2.5,
    amplitude: 0.2,
    propulsionAmount: 0.08,
    phaseStagger: 0.05,
  },

  // VISUAL
  visual: {
    baseColor: 0xffeb3b,
    flowHighColor: 0xffd700,
    baseOpacity: 0.95,
    cylinderSegments: 16,
  },
};

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

  // Create GUI for procedural parameter control
  setupGUI();

  // Update stats
  updateStats();

  // Start animation
  animate();
}

// ============================================
// GUI SETUP FOR PROCEDURAL FORM CONTROL
// ============================================

function setupGUI() {
  // Only setup if dat.GUI is available
  if (typeof dat === 'undefined') return;

  const gui = new dat.GUI({ width: 350, name: 'Physarum Parameters' });

  // L-System folder
  const lsysFolder = gui.addFolder('L-System');
  lsysFolder.add(physarumParams.lsystem, 'iterations', 5, 12, 1).onChange(() => regenerate());
  lsysFolder.add(physarumParams.lsystem, 'baseAngle', 10, 45, 1).onChange(() => regenerate());
  lsysFolder.add(physarumParams.lsystem, 'angleVariation', 0, 10, 0.5).onChange(() => regenerate());
  lsysFolder.add(physarumParams.lsystem, 'branchProbability', 0.5, 1.0, 0.05).onChange(() => regenerate());
  lsysFolder.add(physarumParams.lsystem, 'asymmetryFactor', 0, 0.5, 0.05).onChange(() => regenerate());
  lsysFolder.open();

  // Spatial folder
  const spatialFolder = gui.addFolder('Spatial');
  spatialFolder.add(physarumParams.spatial, 'planarBias', 0, 1, 0.1).onChange(() => regenerate());
  spatialFolder.add(physarumParams.spatial, 'spiralTwist', 0, 0.2, 0.01).onChange(() => regenerate());
  spatialFolder.add(physarumParams.spatial, 'gravitationalDrift', -0.5, 0.5, 0.05).onChange(() => regenerate());
  spatialFolder.add(physarumParams.spatial, 'curvatureFactor', 0, 0.1, 0.01).onChange(() => regenerate());

  // Anastomosis folder
  const anaFolder = gui.addFolder('Anastomosis');
  anaFolder.add(physarumParams.anastomosis, 'enabled').onChange(() => regenerate());
  anaFolder.add(physarumParams.anastomosis, 'distance', 1, 8, 0.5).onChange(() => regenerate());
  anaFolder.add(physarumParams.anastomosis, 'threshold', 0, 1, 0.1).onChange(() => regenerate());
  anaFolder.add(physarumParams.anastomosis, 'reinforcementFactor', 1, 3, 0.1).onChange(() => regenerate());

  // Attractors folder
  const attrFolder = gui.addFolder('Attractors');
  attrFolder.add(physarumParams, 'attractorInfluence', 0, 1, 0.1).onChange(() => regenerate());

  // Add attractor controls
  physarumParams.attractors.forEach((attr, idx) => {
    const subFolder = attrFolder.addFolder(`Attractor ${idx + 1}`);
    subFolder.add(attr, 'strength', 0, 5, 0.5).onChange(() => regenerate());
    subFolder.add(attr, 'radius', 1, 15, 1).onChange(() => regenerate());
  });

  // Radius folder
  const radiusFolder = gui.addFolder('Radius & Growth');
  radiusFolder.add(physarumParams.radius, 'baseRadius', 0.01, 0.1, 0.01).onChange(() => regenerate());
  radiusFolder.add(physarumParams.radius, 'radiusScale', 0.5, 2, 0.1).onChange(() => regenerate());
  radiusFolder.add(physarumParams.radius, 'depthTaperFactor', 0.8, 1.0, 0.02).onChange(() => regenerate());
  radiusFolder.add(physarumParams.growth, 'sizeMultiplierMax', 2, 10, 0.5);
  radiusFolder.add(physarumParams.growth, 'sizeMultiplierTanh', 0.1, 1.0, 0.1);

  // Pulse folder
  const pulseFolder = gui.addFolder('Pulsing');
  pulseFolder.add(physarumParams.pulse, 'frequency', 0.5, 10, 0.5);
  pulseFolder.add(physarumParams.pulse, 'amplitude', 0, 0.5, 0.05);
  pulseFolder.add(physarumParams.pulse, 'propulsionAmount', 0, 0.2, 0.01);

  // Presets
  const presets = {
    'Dense Mycelium': () => {
      physarumParams.lsystem.iterations = 10;
      physarumParams.lsystem.baseAngle = 15;
      physarumParams.spatial.planarBias = 0.5;
      physarumParams.anastomosis.distance = 2.5;
      regenerate();
    },
    'Sparse Explorer': () => {
      physarumParams.lsystem.iterations = 6;
      physarumParams.lsystem.baseAngle = 35;
      physarumParams.spatial.planarBias = 0.2;
      physarumParams.spatial.spiralTwist = 0.1;
      regenerate();
    },
    'Balanced Growth': () => {
      physarumParams.lsystem.iterations = 8;
      physarumParams.lsystem.baseAngle = 22;
      physarumParams.spatial.planarBias = 0.3;
      physarumParams.anastomosis.distance = 3.5;
      regenerate();
    },
  };

  const presetsFolder = gui.addFolder('Presets');
  Object.keys(presets).forEach(name => {
    presetsFolder.add(presets, name);
  });

  gui.close();
}

function regenerate() {
  // Clear scene
  plasmodiumGroup.clear();
  growthSegments = [];
  segmentGrowthProgress = [];
  basePositions = [];
  veinMeshes = [];

  // Regenerate network
  createGrowingSlimeNetwork();
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
// SHADER SYSTEM FOR EFFICIENT VEIN RENDERING
// Handles growth, pulsing, and flow visualization on GPU
// ============================================

function createVeinShaderMaterial() {
  const vertexShader = `
    uniform float uGrowthProgress;
    uniform float uSizeMultiplier;
    uniform float uPulsePhase;
    uniform float uBaseRadius;

    varying float vFlowIntensity;
    varying float vGrowthProgress;

    void main() {
      // Scale geometry based on growth and size multiplier
      vec3 scaled = position;

      // Radius grows with size multiplier and pulsing
      float pulseAmount = abs(sin(uPulsePhase)) * 0.2;
      float radiusScale = uBaseRadius * uSizeMultiplier * (1.0 + pulseAmount);

      // Apply radius to x,z (circular cross-section)
      scaled.x *= radiusScale * uGrowthProgress;
      scaled.z *= radiusScale * uGrowthProgress;

      // Length grows to 1.0 then stays
      float lengthGrowthCap = min(uGrowthProgress, 1.0);
      scaled.y *= lengthGrowthCap;

      vFlowIntensity = radiusScale;
      vGrowthProgress = uGrowthProgress;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(scaled, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uPulsePhase;

    varying float vFlowIntensity;
    varying float vGrowthProgress;

    void main() {
      // Base slime color (yellow)
      vec3 baseColor = vec3(1.0, 0.92, 0.23); // #ffeb3b

      // Pulse creates brightness variation
      float pulse = abs(sin(uPulsePhase));
      float brightness = 0.65 + pulse * 0.3;

      // Flow-based coloring (brighter = more flow)
      vec3 flowColor = mix(
        vec3(1.0, 0.92, 0.23),
        vec3(1.0, 0.96, 0.3),
        vFlowIntensity * 0.5
      );

      // Opacity varies with pulse and growth
      float opacity = 0.95 * brightness * min(vGrowthProgress, 1.0);

      gl_FragColor = vec4(flowColor, opacity);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uGrowthProgress: { value: 0 },
      uSizeMultiplier: { value: 1 },
      uPulsePhase: { value: 0 },
      uBaseRadius: { value: 0.02 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: false,
  });
}

// ============================================
// FLOW CALCULATION - BIOLOGICALLY PLAUSIBLE ADAPTATION
// Based on Hagen-Poiseuille flow through elastic tubes
// ============================================

function calculateSegmentFlows() {
  // Simple model: flow is inversely proportional to resistance
  // Resistance ∝ 1/r⁴ (from Hagen-Poiseuille equation)

  const viscosity = 1.0; // Arbitrary units
  let totalFlow = 0;

  growthSegments.forEach((seg, idx) => {
    // Resistance to flow (inverse of r⁴)
    const resistance = 1.0 / (Math.pow(seg.radius, 4) + 0.001);

    // Flow = pressure difference / resistance
    // Pressure from "growing tip" pulling (simplified model)
    const pressureDifference = 1.0;
    const flow = pressureDifference / (resistance * viscosity);

    segmentFlows[idx] = flow;
    totalFlow += flow;
  });

  // Normalize flows (0 to 1)
  if (totalFlow > 0) {
    segmentFlows = segmentFlows.map(f => f / totalFlow);
  }

  return segmentFlows;
}

function adaptNetworkToFlow() {
  // Optional: Thicken high-flow veins, thin out low-flow veins
  // This creates self-optimizing network

  const flowThreshold = 0.01;

  growthSegments.forEach((seg, idx) => {
    const flow = segmentFlows[idx] || 0;

    // Murray's Law adaptation: radius grows with flow demand
    if (flow > flowThreshold) {
      // Gradually thicken active veins
      seg.radius += 0.00001 * flow;
    }
  });
}

// ============================================
// GROWING SLIME TREE NETWORK
// Pure L-system branching - no body, just growing branches with pulsing propulsion
// ============================================

function createGrowingSlimeNetwork() {
  // Create shared cylinder geometry (unit cylinder, will be scaled by shaders)
  sharedTubeGeometry = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 16, 1);

  // Generate L-system branching tree using procedural parameters
  // Uses physarumParams for all configuration
  const branchNetwork = generateBranchingNetwork();

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

      // Create shader material for this segment (unique uniforms)
      const shaderMaterial = createVeinShaderMaterial();

      // Store segment data for growth animation
      growthSegments.push({
        segment: segment,
        radius: tubeRadius,
        material: shaderMaterial,
        mesh: null,
        branchOrder: branchOrder,
      });

      segmentGrowthProgress.push(0); // All segments start at 0% grown
      segmentFlows.push(0); // All flows start at 0
    });
  });

  // Create tube meshes using shared geometry and shader materials
  growthSegments.forEach((segData, idx) => {
    const segment = segData.segment;
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const dz = segment.z2 - segment.z1;
    const length = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Create mesh using shared geometry and shader material
    const tube = new THREE.Mesh(sharedTubeGeometry, segData.material);

    // Position tube at segment center
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

    // Store original length in userData for shader scaling
    tube.userData.segmentLength = length;

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

  // Initialize flows
  calculateSegmentFlows();
}

// ============================================
// PROCEDURAL FORM UTILITIES
// ============================================

// Seeded random number for reproducible generation
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Get attractor influence on angle
function getAttractorInfluence(x, y, attractors, influenceStrength) {
  let angleAdjustment = 0;
  let totalInfluence = 0;

  attractors.forEach(attractor => {
    const dx = attractor.position[0] - x;
    const dy = attractor.position[1] - y;
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (distance < attractor.radius) {
      const influence = (1 - distance / attractor.radius) * attractor.strength;
      const targetAngle = Math.atan2(dy, dx);
      angleAdjustment += targetAngle * influence;
      totalInfluence += influence;
    }
  });

  return totalInfluence > 0 ? angleAdjustment / totalInfluence * influenceStrength : 0;
}

// Find nearby segments for anastomosis
function findNearbySegments(x, y, z, allSegments, maxDistance) {
  const nearby = [];

  allSegments.forEach(segment => {
    // Distance to segment midpoint
    const mx = (segment.x1 + segment.x2) / 2;
    const my = (segment.y1 + segment.y2) / 2;
    const mz = (segment.z1 + segment.z2) / 2;

    const dx = mx - x;
    const dy = my - y;
    const dz = mz - z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    if (distance < maxDistance && distance > 0.1) {
      nearby.push({ segment, distance });
    }
  });

  return nearby.sort((a, b) => a.distance - b.distance);
}

// Create connection between two veins (anastomosis)
function createAnastomosis(seg1, seg2, reinforcementFactor) {
  // Thicken both segments due to connection
  if (seg1.radius) seg1.radius *= reinforcementFactor;
  if (seg2.radius) seg2.radius *= reinforcementFactor;

  // Mark as connected for flow calculation
  seg1.connected = true;
  seg2.connected = true;
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
// Procedural form with randomization, attractors, and anastomosis
// ============================================
function generateBranchingNetwork(iterations = physarumParams.lsystem.iterations, angle = physarumParams.lsystem.baseAngle) {
  // Use parameters from physarumParams for full procedural control
  const params = physarumParams;
  const angleVariation = params.lsystem.angleVariation;
  const branchProb = params.lsystem.branchProbability;
  const asymmetry = params.lsystem.asymmetryFactor;
  const attractors = params.attractors;
  const attractorInfluence = params.attractorInfluence;
  const planarBias = params.spatial.planarBias;
  const spiralTwist = params.spatial.spiralTwist;
  const gravitationalDrift = params.spatial.gravitationalDrift;

  const branches = [];
  let turtle = {
    x: 0,
    y: 0,
    z: 0,
    angle: 90,
    depth: 0,
    stack: []
  };

  let allSegments = []; // Track for anastomosis
  let segmentCounter = 0;

  function processLSystem(axiom, iterations) {
    let string = axiom;
    const rules = {
      'A': params.lsystem.rule
    };

    // Expand L-system with stochastic branching
    for (let iter = 0; iter < iterations; iter++) {
      let newString = '';
      for (let char of string) {
        if (char === 'A' && Math.random() > branchProb) {
          newString += 'F'; // Skip branch probabilistically
        } else {
          newString += rules[char] || char;
        }
      }
      string = newString;
    }

    return string;
  }

  function executeString(str) {
    const branchSegments = [];
    let baseAngleRad = angle * Math.PI / 180;
    let currentBranch = [];

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === 'F') {
        const segmentLength = 0.5 / Math.pow(2, 0.5);

        // Add randomization
        const angleVariationAmount = (Math.random() - 0.5) * (angleVariation * Math.PI / 180);
        const currentAngle = turtle.angle + angleVariationAmount;

        // Attractor influence
        const attractorAngle = getAttractorInfluence(turtle.x, turtle.y, attractors, attractorInfluence);
        const finalAngle = currentAngle + attractorAngle;

        // Next position
        let nextX = turtle.x + segmentLength * Math.cos(finalAngle);
        let nextY = turtle.y + segmentLength * Math.sin(finalAngle);
        let nextZ = turtle.z;

        // Planar bias
        nextZ *= (1 - planarBias);

        // Spiral twist
        if (turtle.depth > 0) {
          const twistAngle = turtle.depth * spiralTwist;
          const rotX = nextX * Math.cos(twistAngle) - nextZ * Math.sin(twistAngle);
          const rotZ = nextX * Math.sin(twistAngle) + nextZ * Math.cos(twistAngle);
          nextX = rotX;
          nextZ = rotZ;
        }

        // Gravitational drift
        nextZ += gravitationalDrift * segmentLength;

        const segment = {
          x1: turtle.x, y1: turtle.y, z1: turtle.z,
          x2: nextX, y2: nextY, z2: nextZ,
          order: 0,
          depth: turtle.depth,
          id: segmentCounter++
        };

        currentBranch.push(segment);
        allSegments.push(segment);
        turtle.x = nextX;
        turtle.y = nextY;
        turtle.z = nextZ;

      } else if (char === '+') {
        const asymmetryAmount = (Math.random() - 0.5) * asymmetry;
        turtle.angle -= baseAngleRad * (1 + asymmetryAmount);

      } else if (char === '-') {
        const asymmetryAmount = (Math.random() - 0.5) * asymmetry;
        turtle.angle += baseAngleRad * (1 + asymmetryAmount);

      } else if (char === '[') {
        turtle.stack.push({
          x: turtle.x, y: turtle.y, z: turtle.z,
          angle: turtle.angle, depth: turtle.depth
        });
        turtle.depth++;

      } else if (char === ']') {
        if (currentBranch.length > 0) {
          branchSegments.push(currentBranch);
          currentBranch = [];
        }
        turtle.depth--;
        const saved = turtle.stack.pop();
        if (saved) {
          turtle.x = saved.x;
          turtle.y = saved.y;
          turtle.z = saved.z;
          turtle.angle = saved.angle;
          turtle.depth = saved.depth;
        }
      }
    }

    if (currentBranch.length > 0) {
      branchSegments.push(currentBranch);
    }

    return branchSegments;
  }

  const lSystemString = processLSystem('A', iterations);
  const branchNetwork = executeString(lSystemString);

  // POST-PROCESSING: Anastomosis
  if (params.anastomosis.enabled) {
    allSegments.forEach(segment => {
      const nearby = findNearbySegments(segment.x2, segment.y2, segment.z2, allSegments, params.anastomosis.distance);
      nearby.slice(0, 2).forEach(({ segment: nearSegment }) => {
        if (segment.id !== nearSegment.id && Math.random() < params.anastomosis.threshold) {
          createAnastomosis(segment, nearSegment, params.anastomosis.reinforcementFactor);
        }
      });
    });
  }

  return branchNetwork;
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

    // Recalculate flows periodically (every 10 frames)
    if (Math.floor(time * 60) % 10 === 0) {
      calculateSegmentFlows();
      adaptNetworkToFlow();
    }

    // BRANCHES ANIMATION: Grow and pulse with propulsive motion
    // SHADER-BASED: All geometry deformation happens on GPU
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

      if (segData.mesh && segData.material.uniforms) {
        // UPDATE SHADER UNIFORMS (super cheap - just CPU values, no geometry work)
        // These uniforms drive all the animation on the GPU

        // Growth and size
        segData.material.uniforms.uGrowthProgress.value = growthProgress;
        segData.material.uniforms.uSizeMultiplier.value = sizeMultiplier;
        segData.material.uniforms.uBaseRadius.value = segData.radius;

        // Pulsing (peristaltic wave)
        const pulsePhase = (time + idx * 0.05) * pulseSpeed;
        segData.material.uniforms.uPulsePhase.value = pulsePhase;

        // PROPULSIVE POSITION: Pulse creates wave of motion through branches
        // Makes it look like the pulse is pushing the slime along
        const pulseWave = Math.sin(pulsePhase); // -1 to 1
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
