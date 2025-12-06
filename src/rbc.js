import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// RED BLOOD CELL - Anatomically Accurate 3D Visualization
// ============================================
// Based on research:
// - Diameter: 7.8μm, Rim thickness: 2.5μm, Center: 1μm
// - 270 million hemoglobin molecules per cell
// - Spectrin-actin hexagonal mesh (40,000 nodes)
// - No nucleus, mitochondria, or other organelles
// ============================================

let scene, camera, renderer, controls;
let rbcGroup, rbcMesh, hemoglobinParticles, spectrinMesh;
let clock = new THREE.Clock();
let isExploring = false;

// Oxygenation state (0 = deoxygenated, 1 = oxygenated)
let oxygenationLevel = 1.0;
let targetOxygenation = 1.0;

// Blood vessel environment
let vesselWalls, bloodParticles;
let otherRBCs = [];

// Membrane proteins
let band3Proteins, glycophorinProteins;

// ============================================
// INITIALIZATION
// ============================================

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0505);
  scene.fog = new THREE.Fog(0x1a0505, 15, 50);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 8);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Lighting
  setupLighting();

  // Create the RBC with accurate anatomy
  createRBC();

  // Create blood vessel environment
  createBloodVessel();

  // Create other RBCs in background
  createBackgroundRBCs();

  // Create floating particles (plasma proteins, platelets)
  createPlasmaParticles();

  // Event listeners
  setupEventListeners();

  // Start animation
  animate();
}

// ============================================
// LIGHTING
// ============================================

function setupLighting() {
  // Ambient light - warm red tint for blood environment
  const ambient = new THREE.AmbientLight(0x331111, 0.6);
  scene.add(ambient);

  // Main light - simulating light through tissue
  const mainLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  mainLight.position.set(5, 10, 5);
  scene.add(mainLight);

  // Fill light - red tinted (blood scattering)
  const fillLight = new THREE.DirectionalLight(0xff6666, 0.3);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);

  // Rim light for edge definition (subsurface scattering effect)
  const rimLight = new THREE.DirectionalLight(0xffaaaa, 0.5);
  rimLight.position.set(0, -5, 5);
  scene.add(rimLight);

  // Subtle glow from hemoglobin
  const pointLight = new THREE.PointLight(0xff4444, 0.3, 15);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
}

// ============================================
// ACCURATE BICONCAVE GEOMETRY
// Based on actual RBC dimensions:
// - Diameter: 7.8μm (scaled to radius 2 in scene)
// - Rim thickness: 2.5μm
// - Center thickness: 1.0μm
// ============================================

function createBiconcaveGeometry(radius = 2, segments = 128) {
  // Actual proportions: diameter 7.8μm, rim 2.5μm, center 1.0μm
  // Scale factor: radius 2 = 3.9μm, so multiply by 2/3.9 = 0.513
  const rimThickness = 2.5 * (radius / 3.9);  // ~1.28 at radius 2
  const centerThickness = 1.0 * (radius / 3.9); // ~0.51 at radius 2

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const radialSegments = segments;
  const heightSegments = segments;

  // Generate vertices using proper biconcave disc equation
  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments;
    const phi = v * Math.PI;

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      // Radial distance from center
      const r = Math.sin(phi) * radius;
      const normalizedR = Math.abs(r) / radius;

      // Biconcave profile using proper mathematical model
      // h(r) = h0 * sqrt(1 - (r/R)^2) * (c0 + c1*(r/R)^2 + c2*(r/R)^4)
      // Where h0 is half the rim thickness
      const h0 = rimThickness / 2;
      const c0 = 0.207; // Creates the central dimple
      const c1 = 2.003;
      const c2 = -1.123;

      const r2 = normalizedR * normalizedR;
      const r4 = r2 * r2;

      // Height at this radius
      const sqrtTerm = Math.sqrt(Math.max(0, 1 - r2));
      const polyTerm = c0 + c1 * r2 + c2 * r4;
      const profileHeight = h0 * sqrtTerm * polyTerm;

      // Apply to top or bottom based on phi
      let h;
      if (phi <= Math.PI / 2) {
        h = profileHeight * Math.cos(phi) * 2;
      } else {
        h = -profileHeight * Math.cos(Math.PI - phi) * 2;
      }

      const x = r * Math.cos(theta);
      const y = h;
      const z = r * Math.sin(theta);

      positions.push(x, y, z);
      uvs.push(u, v);
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
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Get height at a given radius for placing internal structures
function getBiconcaveHeight(normalizedR, rimThickness = 1.28) {
  const h0 = rimThickness / 2;
  const c0 = 0.207;
  const c1 = 2.003;
  const c2 = -1.123;

  const r2 = normalizedR * normalizedR;
  const r4 = r2 * r2;

  const sqrtTerm = Math.sqrt(Math.max(0, 1 - r2));
  const polyTerm = c0 + c1 * r2 + c2 * r4;

  return h0 * sqrtTerm * polyTerm;
}

// ============================================
// CREATE MAIN RBC
// ============================================

function createRBC() {
  rbcGroup = new THREE.Group();

  // Main RBC membrane with accurate biconcave shape
  const rbcGeometry = createBiconcaveGeometry(2, 128);

  // Material simulating the translucent lipid bilayer membrane
  const rbcMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626, // Oxygenated bright red
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.4,
    transmission: 0.15, // Slight translucency
    thickness: 0.8,
    attenuationColor: new THREE.Color(0x7f1d1d),
    attenuationDistance: 0.3,
    side: THREE.DoubleSide,
  });

  rbcMesh = new THREE.Mesh(rbcGeometry, rbcMaterial);
  rbcGroup.add(rbcMesh);

  // Add spectrin-actin cytoskeleton mesh
  createSpectrinNetwork();

  // Add hemoglobin molecules (270 million represented symbolically)
  createHemoglobin();

  // Add membrane proteins
  createMembraneProteins();

  scene.add(rbcGroup);
}

// ============================================
// SPECTRIN-ACTIN CYTOSKELETON
// Hexagonal lattice of ~40,000 actin nodes connected by spectrin
// ============================================

function createSpectrinNetwork() {
  const spectrinGroup = new THREE.Group();

  // Create hexagonal mesh pattern on membrane surface
  // Real network has ~40,000 nodes, we'll show a representative pattern
  const nodeCount = 200; // Representative nodes
  const nodes = [];

  // Distribute nodes across the disc surface
  for (let i = 0; i < nodeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 1.95; // sqrt for uniform distribution
    const normalizedR = r / 2;

    // Get height at this position
    const h = getBiconcaveHeight(normalizedR);
    const side = Math.random() > 0.5 ? 1 : -1;

    nodes.push({
      x: r * Math.cos(angle),
      y: h * side * 0.95, // Slightly inside membrane
      z: r * Math.sin(angle)
    });
  }

  // Connect nearby nodes with spectrin filaments
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff6b6b,
    transparent: true,
    opacity: 0.15,
  });

  // Create connections (simplified - connect to nearest neighbors)
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Find 3-6 nearest neighbors (hexagonal-ish pattern)
    const distances = nodes.map((other, idx) => ({
      idx,
      dist: Math.sqrt(
        Math.pow(other.x - node.x, 2) +
        Math.pow(other.y - node.y, 2) +
        Math.pow(other.z - node.z, 2)
      )
    }));

    distances.sort((a, b) => a.dist - b.dist);

    // Connect to 2-4 nearest (avoiding too many overlapping lines)
    const connectionCount = 2 + Math.floor(Math.random() * 2);
    for (let j = 1; j <= connectionCount && j < distances.length; j++) {
      if (distances[j].dist < 0.8) { // Only connect nearby nodes
        const other = nodes[distances[j].idx];
        const points = [
          new THREE.Vector3(node.x, node.y, node.z),
          new THREE.Vector3(other.x, other.y, other.z)
        ];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeom, lineMaterial);
        spectrinGroup.add(line);
      }
    }
  }

  // Add actin junction nodes (small spheres)
  const nodeGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xfca5a5,
    transparent: true,
    opacity: 0.4,
  });

  nodes.forEach(node => {
    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
    nodeMesh.position.set(node.x, node.y, node.z);
    spectrinGroup.add(nodeMesh);
  });

  spectrinMesh = spectrinGroup;
  rbcGroup.add(spectrinGroup);
}

// ============================================
// HEMOGLOBIN MOLECULES
// 270 million per cell - shown as dense particle field
// Each molecule ~5-6nm diameter
// ============================================

function createHemoglobin() {
  // Represent the dense hemoglobin solution
  // Real: 270 million molecules, we show ~2000 particles
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Colors for oxygenated vs deoxygenated hemoglobin
  const oxyColor = new THREE.Color(0xef4444); // Bright scarlet
  const deoxyColor = new THREE.Color(0x7f1d1d); // Dark maroon

  for (let i = 0; i < particleCount; i++) {
    // Distribute throughout the cell interior
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 1.85; // Inside membrane
    const normalizedR = r / 2;

    // Calculate available height at this radius
    const maxH = getBiconcaveHeight(normalizedR) * 0.85;
    const h = (Math.random() - 0.5) * 2 * maxH;

    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = h;
    positions[i * 3 + 2] = r * Math.sin(angle);

    // Initially oxygenated (will animate)
    colors[i * 3] = oxyColor.r;
    colors[i * 3 + 1] = oxyColor.g;
    colors[i * 3 + 2] = oxyColor.b;

    // Vary sizes slightly (representing different distances/perspectives)
    sizes[i] = 0.03 + Math.random() * 0.02;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  // Custom shader for better hemoglobin visualization
  const material = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });

  hemoglobinParticles = new THREE.Points(geometry, material);
  hemoglobinParticles.userData.oxyColor = oxyColor;
  hemoglobinParticles.userData.deoxyColor = deoxyColor;
  rbcGroup.add(hemoglobinParticles);
}

// ============================================
// MEMBRANE PROTEINS
// Band 3 (~1 million copies) - anion exchanger
// Glycophorin (~1 million copies) - surface glycoproteins
// ============================================

function createMembraneProteins() {
  // Band 3 proteins (larger, transmembrane)
  const band3Group = new THREE.Group();
  const band3Count = 150; // Representative
  const band3Geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8);
  const band3Material = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6, // Blue to distinguish
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });

  for (let i = 0; i < band3Count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.3 + Math.sqrt(Math.random()) * 1.65;
    const normalizedR = r / 2;
    const h = getBiconcaveHeight(normalizedR);
    const side = Math.random() > 0.5 ? 1 : -1;

    const protein = new THREE.Mesh(band3Geometry, band3Material);
    protein.position.set(
      r * Math.cos(angle),
      h * side,
      r * Math.sin(angle)
    );

    // Orient perpendicular to membrane surface (approximate)
    protein.lookAt(0, 0, 0);
    protein.rotateX(Math.PI / 2);

    band3Group.add(protein);
  }

  band3Proteins = band3Group;
  rbcGroup.add(band3Group);

  // Glycophorin proteins (smaller, surface)
  const glycoGroup = new THREE.Group();
  const glycoCount = 100;
  const glycoGeometry = new THREE.SphereGeometry(0.025, 6, 6);
  const glycoMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x22c55e, // Green to distinguish
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
  });

  for (let i = 0; i < glycoCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 1.9;
    const normalizedR = r / 2;
    const h = getBiconcaveHeight(normalizedR);
    const side = Math.random() > 0.5 ? 1 : -1;

    const protein = new THREE.Mesh(glycoGeometry, glycoMaterial);
    protein.position.set(
      r * Math.cos(angle),
      h * side * 1.02, // Slightly outside membrane
      r * Math.sin(angle)
    );

    glycoGroup.add(protein);
  }

  glycophorinProteins = glycoGroup;
  rbcGroup.add(glycoGroup);
}

// ============================================
// BLOOD VESSEL ENVIRONMENT
// ============================================

function createBloodVessel() {
  // Create a tube-like blood vessel (capillary)
  // Real capillaries: 3-10μm diameter
  const vesselGeometry = new THREE.CylinderGeometry(12, 12, 60, 32, 1, true);
  const vesselMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x991b1b,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.25,
  });

  vesselWalls = new THREE.Mesh(vesselGeometry, vesselMaterial);
  vesselWalls.rotation.x = Math.PI / 2;
  scene.add(vesselWalls);

  // Endothelial cell pattern on vessel wall
  const ridgeCount = 25;
  for (let i = 0; i < ridgeCount; i++) {
    const ridgeGeometry = new THREE.TorusGeometry(11.8, 0.15, 6, 48);
    const ridgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x7f1d1d,
      transparent: true,
      opacity: 0.15,
    });
    const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    ridge.position.z = (i - ridgeCount / 2) * 2.4;
    ridge.rotation.x = Math.PI / 2;
    scene.add(ridge);
  }
}

// ============================================
// BACKGROUND RBCs
// ============================================

function createBackgroundRBCs() {
  const count = 20;

  for (let i = 0; i < count; i++) {
    const scale = 0.6 + Math.random() * 0.4;
    const geometry = createBiconcaveGeometry(2 * scale, 48);

    // Vary color based on oxygenation
    const isOxygenated = Math.random() > 0.3;
    const material = new THREE.MeshPhysicalMaterial({
      color: isOxygenated ? 0xdc2626 : 0x991b1b,
      roughness: 0.4,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
    });

    const rbc = new THREE.Mesh(geometry, material);

    // Position in vessel
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 7;
    rbc.position.x = r * Math.cos(angle);
    rbc.position.y = r * Math.sin(angle);
    rbc.position.z = (Math.random() - 0.5) * 50;

    // Random tumbling orientation
    rbc.rotation.x = Math.random() * Math.PI;
    rbc.rotation.y = Math.random() * Math.PI;
    rbc.rotation.z = Math.random() * Math.PI;

    // Flow velocity
    rbc.userData.velocity = 0.3 + Math.random() * 0.8;
    rbc.userData.wobblePhase = Math.random() * Math.PI * 2;
    rbc.userData.wobbleSpeed = 0.5 + Math.random() * 1;

    scene.add(rbc);
    otherRBCs.push(rbc);
  }
}

// ============================================
// PLASMA PARTICLES
// Representing albumin, globulins, platelets, etc.
// ============================================

function createPlasmaParticles() {
  const particleCount = 400;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 10;
    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = r * Math.sin(angle);
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

    // Vary colors (plasma proteins, small platelets)
    const type = Math.random();
    if (type < 0.7) {
      // Albumin/proteins - yellowish
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.7;
      sizes[i] = 0.05 + Math.random() * 0.05;
    } else {
      // Platelets - slightly larger, pinkish
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.7;
      colors[i * 3 + 2] = 0.8;
      sizes[i] = 0.1 + Math.random() * 0.1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });

  bloodParticles = new THREE.Points(geometry, material);
  scene.add(bloodParticles);
}

// ============================================
// OXYGENATION ANIMATION
// Simulate oxygen binding/release
// ============================================

function updateOxygenation(time) {
  // Slowly oscillate oxygenation to show color change
  targetOxygenation = 0.5 + 0.5 * Math.sin(time * 0.2);
  oxygenationLevel += (targetOxygenation - oxygenationLevel) * 0.02;

  // Update hemoglobin colors
  if (hemoglobinParticles) {
    const colors = hemoglobinParticles.geometry.attributes.color.array;
    const oxyColor = hemoglobinParticles.userData.oxyColor;
    const deoxyColor = hemoglobinParticles.userData.deoxyColor;

    for (let i = 0; i < colors.length; i += 3) {
      // Add some variation per particle
      const localOxy = oxygenationLevel + (Math.random() - 0.5) * 0.1;
      const clampedOxy = Math.max(0, Math.min(1, localOxy));

      colors[i] = deoxyColor.r + (oxyColor.r - deoxyColor.r) * clampedOxy;
      colors[i + 1] = deoxyColor.g + (oxyColor.g - deoxyColor.g) * clampedOxy;
      colors[i + 2] = deoxyColor.b + (oxyColor.b - deoxyColor.b) * clampedOxy;
    }
    hemoglobinParticles.geometry.attributes.color.needsUpdate = true;
  }

  // Update membrane color
  if (rbcMesh) {
    const oxyMembraneColor = new THREE.Color(0xdc2626);
    const deoxyMembraneColor = new THREE.Color(0x991b1b);
    rbcMesh.material.color.lerpColors(deoxyMembraneColor, oxyMembraneColor, oxygenationLevel);
  }
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Rotate main RBC slowly (tumbling motion)
  if (rbcGroup) {
    rbcGroup.rotation.y = time * 0.15;
    rbcGroup.rotation.x = Math.sin(time * 0.2) * 0.15;
    rbcGroup.rotation.z = Math.cos(time * 0.25) * 0.05;

    // Subtle floating motion (blood flow)
    rbcGroup.position.y = Math.sin(time * 0.4) * 0.15;
    rbcGroup.position.x = Math.sin(time * 0.3) * 0.1;
  }

  // Update oxygenation state
  updateOxygenation(time);

  // Animate hemoglobin Brownian motion
  if (hemoglobinParticles) {
    const positions = hemoglobinParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Tiny random motion (molecular vibration)
      positions[i] += (Math.random() - 0.5) * 0.002;
      positions[i + 1] += (Math.random() - 0.5) * 0.002;
      positions[i + 2] += (Math.random() - 0.5) * 0.002;
    }
    hemoglobinParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Animate background RBCs flowing
  otherRBCs.forEach((rbc) => {
    // Flow along vessel
    rbc.position.z += rbc.userData.velocity * 0.08;

    // Reset when past camera
    if (rbc.position.z > 30) {
      rbc.position.z = -30;
      const angle = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 7;
      rbc.position.x = r * Math.cos(angle);
      rbc.position.y = r * Math.sin(angle);
    }

    // Tumbling motion
    rbc.rotation.x += 0.003 * rbc.userData.wobbleSpeed;
    rbc.rotation.z += 0.002 * rbc.userData.wobbleSpeed;

    // Slight lateral drift
    rbc.position.x += Math.sin(time * rbc.userData.wobbleSpeed + rbc.userData.wobblePhase) * 0.005;
    rbc.position.y += Math.cos(time * rbc.userData.wobbleSpeed * 0.7 + rbc.userData.wobblePhase) * 0.005;
  });

  // Animate plasma particles
  if (bloodParticles) {
    const positions = bloodParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += 0.04; // Flow
      if (positions[i + 2] > 25) {
        positions[i + 2] = -25;
      }
      // Brownian motion
      positions[i] += (Math.random() - 0.5) * 0.01;
      positions[i + 1] += (Math.random() - 0.5) * 0.01;
    }
    bloodParticles.geometry.attributes.position.needsUpdate = true;
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

  // Start button
  const startBtn = document.getElementById('start-btn');
  const introModal = document.getElementById('intro-modal');
  const uiOverlay = document.getElementById('ui-overlay');

  startBtn.addEventListener('click', () => {
    introModal.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    isExploring = true;
    gsapLikeAnimation(camera.position, { x: 0, y: 2, z: 6 }, 1500);
  });

  // Info modal
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

  // Zoom controls
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');

  zoomInBtn.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, 1);
  });

  zoomOutBtn.addEventListener('click', () => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, -1);
  });

  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    gsapLikeAnimation(camera.position, { x: 0, y: 2, z: 6 }, 1000);
    controls.target.set(0, 0, 0);
  });
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
