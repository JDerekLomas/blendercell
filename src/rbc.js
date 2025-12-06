import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// RED BLOOD CELL - Interactive 3D Visualization
// ============================================

let scene, camera, renderer, controls;
let rbcGroup, rbcMesh, hemoglobinParticles;
let clock = new THREE.Clock();
let isExploring = false;

// Blood vessel environment
let vesselWalls, bloodParticles;
let otherRBCs = [];

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

  // Create the RBC
  createRBC();

  // Create blood vessel environment
  createBloodVessel();

  // Create other RBCs in background
  createBackgroundRBCs();

  // Create floating particles (plasma)
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
  // Ambient light - warm red tint
  const ambient = new THREE.AmbientLight(0x331111, 0.5);
  scene.add(ambient);

  // Main light - slightly warm
  const mainLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  mainLight.position.set(5, 10, 5);
  scene.add(mainLight);

  // Fill light - red tinted
  const fillLight = new THREE.DirectionalLight(0xff6666, 0.4);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);

  // Rim light for edge definition
  const rimLight = new THREE.DirectionalLight(0xffaaaa, 0.6);
  rimLight.position.set(0, -5, 5);
  scene.add(rimLight);

  // Point light inside the scene for glow effect
  const pointLight = new THREE.PointLight(0xff4444, 0.5, 20);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);
}

// ============================================
// RED BLOOD CELL GEOMETRY
// ============================================

function createBiconcaveGeometry(radius = 2, thickness = 0.6, segments = 64) {
  // Create a biconcave disc shape using parametric geometry
  const geometry = new THREE.BufferGeometry();

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const radialSegments = segments;
  const heightSegments = segments;

  // Generate vertices
  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments;
    const phi = v * Math.PI; // 0 to PI

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;

      // Parametric biconcave disc
      // r goes from 0 at center to radius at edge
      const r = Math.sin(phi) * radius;

      // Height profile: biconcave shape
      // Uses a function that creates the characteristic dimple
      const normalizedR = r / radius;
      const dimpleDepth = thickness * 0.8;
      const rimHeight = thickness * 0.3;

      // Biconcave profile function
      let h;
      if (phi <= Math.PI / 2) {
        // Top half
        h = rimHeight * Math.cos(phi) - dimpleDepth * Math.pow(1 - normalizedR, 2) * Math.cos(phi);
      } else {
        // Bottom half
        h = -rimHeight * Math.cos(Math.PI - phi) + dimpleDepth * Math.pow(1 - normalizedR, 2) * Math.cos(Math.PI - phi);
      }

      const x = r * Math.cos(theta);
      const y = h;
      const z = r * Math.sin(theta);

      positions.push(x, y, z);

      // Calculate normals (approximate)
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      normals.push(nx, ny, nz);

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
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function createRBC() {
  rbcGroup = new THREE.Group();

  // Main RBC mesh with proper biconcave shape
  const rbcGeometry = createBiconcaveGeometry(2, 0.7, 64);

  // Custom shader material for subsurface scattering effect
  const rbcMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcc2222,
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    transmission: 0.1,
    thickness: 0.5,
    attenuationColor: new THREE.Color(0x880000),
    attenuationDistance: 0.5,
    side: THREE.DoubleSide,
  });

  rbcMesh = new THREE.Mesh(rbcGeometry, rbcMaterial);
  rbcGroup.add(rbcMesh);

  // Add hemoglobin representation inside
  createHemoglobin();

  // Add membrane detail (spectrin network suggestion)
  createMembraneDetail();

  scene.add(rbcGroup);
}

function createHemoglobin() {
  // Create small particles to represent hemoglobin molecules
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color(0xff3333); // Oxygenated
  const color2 = new THREE.Color(0x882222); // Deoxygenated

  for (let i = 0; i < particleCount; i++) {
    // Distribute within the biconcave disc shape
    const theta = Math.random() * Math.PI * 2;
    const r = Math.random() * 1.8;

    // Calculate max height at this radius (biconcave profile)
    const normalizedR = r / 2;
    const maxH = 0.3 * (1 - Math.pow(normalizedR, 2)) * 0.5;
    const h = (Math.random() - 0.5) * 2 * maxH;

    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = h;
    positions[i * 3 + 2] = r * Math.sin(theta);

    // Random color between oxygenated and deoxygenated
    const t = Math.random();
    const color = color1.clone().lerp(color2, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  hemoglobinParticles = new THREE.Points(geometry, material);
  rbcGroup.add(hemoglobinParticles);
}

function createMembraneDetail() {
  // Create subtle lines suggesting the spectrin network
  const lineCount = 30;
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xaa4444,
    transparent: true,
    opacity: 0.2,
  });

  for (let i = 0; i < lineCount; i++) {
    const points = [];
    const startAngle = Math.random() * Math.PI * 2;
    const arcLength = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
    const r = 1.5 + Math.random() * 0.4;
    const segments = 20;

    for (let j = 0; j <= segments; j++) {
      const angle = startAngle + (j / segments) * arcLength;
      const normalizedR = r / 2;
      const h = 0.25 * (1 - Math.pow(normalizedR, 2)) * (Math.random() > 0.5 ? 1 : -1);

      points.push(new THREE.Vector3(
        r * Math.cos(angle),
        h + (Math.random() - 0.5) * 0.05,
        r * Math.sin(angle)
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    rbcGroup.add(line);
  }
}

// ============================================
// BLOOD VESSEL ENVIRONMENT
// ============================================

function createBloodVessel() {
  // Create a tube-like blood vessel around the scene
  const vesselGeometry = new THREE.CylinderGeometry(12, 12, 60, 32, 1, true);
  const vesselMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x661111,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3,
  });

  vesselWalls = new THREE.Mesh(vesselGeometry, vesselMaterial);
  vesselWalls.rotation.x = Math.PI / 2;
  scene.add(vesselWalls);

  // Add vessel texture/ridges
  const ridgeCount = 20;
  for (let i = 0; i < ridgeCount; i++) {
    const ridgeGeometry = new THREE.TorusGeometry(11.5, 0.2, 8, 32);
    const ridgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x441111,
      transparent: true,
      opacity: 0.2,
    });
    const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    ridge.position.z = (i - ridgeCount / 2) * 3;
    ridge.rotation.x = Math.PI / 2;
    scene.add(ridge);
  }
}

function createBackgroundRBCs() {
  // Create other RBCs flowing in the background
  const count = 15;

  for (let i = 0; i < count; i++) {
    const geometry = createBiconcaveGeometry(1.5 + Math.random() * 0.5, 0.5, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xaa1111,
      roughness: 0.5,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });

    const rbc = new THREE.Mesh(geometry, material);

    // Random position in vessel
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 6;
    rbc.position.x = r * Math.cos(angle);
    rbc.position.y = r * Math.sin(angle);
    rbc.position.z = (Math.random() - 0.5) * 40;

    // Random rotation
    rbc.rotation.x = Math.random() * Math.PI;
    rbc.rotation.y = Math.random() * Math.PI;
    rbc.rotation.z = Math.random() * Math.PI;

    // Store velocity for animation
    rbc.userData.velocity = 0.5 + Math.random() * 1;
    rbc.userData.wobble = Math.random() * Math.PI * 2;

    scene.add(rbc);
    otherRBCs.push(rbc);
  }
}

function createPlasmaParticles() {
  // Create floating particles representing plasma
  const particleCount = 300;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 10;
    positions[i * 3] = r * Math.cos(angle);
    positions[i * 3 + 1] = r * Math.sin(angle);
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffccaa,
    size: 0.1,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });

  bloodParticles = new THREE.Points(geometry, material);
  scene.add(bloodParticles);
}

// ============================================
// ANIMATION
// ============================================

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const delta = clock.getDelta();

  // Rotate main RBC slowly
  if (rbcGroup) {
    rbcGroup.rotation.y = time * 0.2;
    rbcGroup.rotation.x = Math.sin(time * 0.3) * 0.1;

    // Subtle floating motion
    rbcGroup.position.y = Math.sin(time * 0.5) * 0.2;
  }

  // Animate hemoglobin particles
  if (hemoglobinParticles) {
    const positions = hemoglobinParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time * 2 + i) * 0.001;
    }
    hemoglobinParticles.geometry.attributes.position.needsUpdate = true;
  }

  // Animate background RBCs
  otherRBCs.forEach((rbc, index) => {
    rbc.position.z += rbc.userData.velocity * 0.1;

    // Reset position when too far
    if (rbc.position.z > 25) {
      rbc.position.z = -25;
    }

    // Wobble motion
    rbc.rotation.x += 0.002;
    rbc.rotation.z += 0.001;
    rbc.position.x += Math.sin(time + rbc.userData.wobble) * 0.01;
    rbc.position.y += Math.cos(time * 1.3 + rbc.userData.wobble) * 0.01;
  });

  // Animate plasma particles
  if (bloodParticles) {
    const positions = bloodParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += 0.05; // Move along vessel
      if (positions[i + 2] > 20) {
        positions[i + 2] = -20;
      }
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
  // Window resize
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

    // Animate camera to better position
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

// Simple animation helper (no external library needed)
function gsapLikeAnimation(obj, target, duration) {
  const start = {
    x: obj.x,
    y: obj.y,
    z: obj.z
  };
  const startTime = performance.now();

  function update() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out cubic
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
