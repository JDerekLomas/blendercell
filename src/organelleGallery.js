import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createNucleus,
  createMitochondrion,
  createGolgi,
  createLysosome,
  createPlasmaRER,
  createSimpleER,
  ORGANELLE_COLORS
} from './organelles/index.js';

// ============================================
// ORGANELLE GALLERY
// Interactive 3D showcase of cell components
// ============================================

let scene, camera, renderer, controls;
let currentOrganelle = null;
let clock = new THREE.Clock();

// Organelle definitions with info
const organelleData = {
  nucleus: {
    name: 'Nucleus',
    subtitle: 'Control Center',
    color: '#a855f7',
    description: 'The nucleus houses the cell\'s genetic material (DNA) and controls gene expression. It\'s surrounded by a double membrane with nuclear pores that regulate transport. Contains one or more nucleoli where ribosomes are assembled.',
    facts: [
      'Contains 6 feet of DNA packed into 46 chromosomes',
      'Nuclear pores can transport 1000 molecules per second',
      'The nucleolus is the largest structure inside the nucleus'
    ],
    create: () => createNucleus({
      position: new THREE.Vector3(0, 0, 0),
      radius: 2,
      includeNucleoli: true,
      nucleoliCount: 2,
      includeChromatin: true,
      poreCount: 40
    }),
    cameraDistance: 6
  },
  mitochondria: {
    name: 'Mitochondria',
    subtitle: 'Powerhouse',
    color: '#ef4444',
    description: 'Mitochondria generate ATP through cellular respiration, providing energy for all cell activities. They have their own DNA and can divide independently. The inner membrane folds (cristae) increase surface area for energy production.',
    facts: [
      'Can produce up to 36 ATP molecules per glucose',
      'Have their own circular DNA (inherited from mother)',
      'A liver cell contains about 2000 mitochondria'
    ],
    create: () => createMitochondrion({
      position: new THREE.Vector3(0, 0, 0),
      length: 2.5,
      radius: 0.8,
      includeCristae: true,
      includeGlow: true,
      includeInteriorLight: true,
      cristaeCount: 6
    }),
    cameraDistance: 5
  },
  golgi: {
    name: 'Golgi Apparatus',
    subtitle: 'Packaging Center',
    color: '#fbbf24',
    description: 'The Golgi apparatus modifies, sorts, and packages proteins and lipids for transport. It receives vesicles from the ER, processes their contents, and sends them to their final destinations inside or outside the cell.',
    facts: [
      'Named after Camillo Golgi who discovered it in 1898',
      'Consists of 4-8 flattened membrane sacs (cisternae)',
      'Processes about 1/3 of all proteins made by the cell'
    ],
    create: () => createGolgi({
      position: new THREE.Vector3(0, 0, 0),
      cisternaCount: 8,
      scale: 1.5
    }),
    cameraDistance: 6
  },
  lysosome: {
    name: 'Lysosome',
    subtitle: 'Recycling Center',
    color: '#22c55e',
    description: 'Lysosomes contain over 50 digestive enzymes that break down waste materials, cellular debris, and foreign substances. They maintain an acidic pH (4.5-5) to activate their enzymes and protect the rest of the cell.',
    facts: [
      'pH inside is about 4.5-5.0 (very acidic)',
      'Can digest worn-out organelles (autophagy)',
      'Malfunction causes 50+ storage diseases'
    ],
    create: () => {
      const group = new THREE.Group();
      // Create a larger detailed lysosome
      const geometry = new THREE.SphereGeometry(1.2, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: ORGANELLE_COLORS.lysosome,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0x0a3d1a,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.85,
        clearcoat: 0.3
      });
      const outer = new THREE.Mesh(geometry, material);
      group.add(outer);

      // Inner contents (enzymes visualization)
      for (let i = 0; i < 15; i++) {
        const size = 0.08 + Math.random() * 0.15;
        const contentGeom = new THREE.SphereGeometry(size, 8, 8);
        const contentMat = new THREE.MeshBasicMaterial({
          color: 0x15803d,
          transparent: true,
          opacity: 0.6
        });
        const content = new THREE.Mesh(contentGeom, contentMat);
        const r = Math.random() * 0.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        content.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
        group.add(content);
      }
      return group;
    },
    cameraDistance: 4
  },
  rer: {
    name: 'Rough ER',
    subtitle: 'Protein Factory',
    color: '#40E0D0',
    description: 'The Rough Endoplasmic Reticulum is studded with ribosomes that synthesize proteins. These proteins are folded and modified within the ER lumen before being sent to the Golgi. Essential for making secreted and membrane proteins.',
    facts: [
      'Ribosomes give it a "rough" appearance',
      'Connected directly to the nuclear envelope',
      'Can make millions of proteins per minute'
    ],
    create: () => createPlasmaRER({
      position: new THREE.Vector3(0, 0, 0),
      stackCount: 4,
      sheetsPerStack: 4,
      includeRibosomes: true
    }),
    cameraDistance: 8
  },
  centrioles: {
    name: 'Centrioles',
    subtitle: 'Division Organizers',
    color: '#8b5cf6',
    description: 'Centrioles are cylindrical structures made of microtubule triplets arranged in a 9+0 pattern. They organize the mitotic spindle during cell division and serve as basal bodies for cilia and flagella.',
    facts: [
      'Made of 9 triplets of microtubules',
      'Come in perpendicular pairs (centrosome)',
      'Essential for proper chromosome separation'
    ],
    create: () => {
      const group = new THREE.Group();

      // Create two perpendicular centrioles
      for (let c = 0; c < 2; c++) {
        const centrioleGroup = new THREE.Group();

        // 9 triplet microtubules
        for (let i = 0; i < 9; i++) {
          const angle = (i / 9) * Math.PI * 2;
          const radius = 0.4;

          for (let t = 0; t < 3; t++) {
            const tubeGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
            const tubeMat = new THREE.MeshPhysicalMaterial({
              color: 0x8b5cf6,
              roughness: 0.3,
              metalness: 0.2,
              emissive: 0x4c1d95,
              emissiveIntensity: 0.2
            });
            const tube = new THREE.Mesh(tubeGeom, tubeMat);

            const tAngle = angle + (t - 1) * 0.15;
            const tRadius = radius + t * 0.08;
            tube.position.set(
              Math.cos(tAngle) * tRadius,
              0,
              Math.sin(tAngle) * tRadius
            );
            centrioleGroup.add(tube);
          }
        }

        // Position second centriole perpendicular
        if (c === 1) {
          centrioleGroup.rotation.x = Math.PI / 2;
          centrioleGroup.position.set(0.8, 0, 0);
        }

        group.add(centrioleGroup);
      }

      // PCM cloud
      const pcmGeom = new THREE.SphereGeometry(1.2, 16, 16);
      const pcmMat = new THREE.MeshBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.15
      });
      const pcm = new THREE.Mesh(pcmGeom, pcmMat);
      pcm.position.set(0.4, 0, 0);
      group.add(pcm);

      return group;
    },
    cameraDistance: 5
  },
  vesicle: {
    name: 'Vesicles',
    subtitle: 'Transport Bubbles',
    color: '#f97316',
    description: 'Vesicles are membrane-bound sacs that transport materials within cells. They bud off from one compartment and fuse with another, carrying proteins, lipids, and other cargo. Essential for secretion and intracellular communication.',
    facts: [
      'Range from 30-300 nm in diameter',
      'Coated vesicles use clathrin or COPI/COPII',
      'Neurons release neurotransmitters via vesicles'
    ],
    create: () => {
      const group = new THREE.Group();

      // Create multiple vesicles of varying sizes
      const vesicleCount = 12;
      for (let i = 0; i < vesicleCount; i++) {
        const size = 0.2 + Math.random() * 0.4;
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xf97316,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.7,
          clearcoat: 0.5
        });
        const vesicle = new THREE.Mesh(geometry, material);

        // Distribute in a loose cluster
        const r = 0.5 + Math.random() * 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        vesicle.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );

        // Add cargo inside larger vesicles
        if (size > 0.35) {
          const cargoGeom = new THREE.SphereGeometry(size * 0.4, 8, 8);
          const cargoMat = new THREE.MeshBasicMaterial({
            color: 0xfed7aa,
            transparent: true,
            opacity: 0.5
          });
          const cargo = new THREE.Mesh(cargoGeom, cargoMat);
          vesicle.add(cargo);
        }

        vesicle.userData.phase = Math.random() * Math.PI * 2;
        group.add(vesicle);
      }

      return group;
    },
    cameraDistance: 5
  },
  ribosome: {
    name: 'Ribosomes',
    subtitle: 'Protein Builders',
    color: '#06b6d4',
    description: 'Ribosomes read mRNA and assemble amino acids into proteins. They consist of two subunits (large and small) made of rRNA and proteins. Found free in cytoplasm or attached to ER.',
    facts: [
      'Can add 15-20 amino acids per second',
      'Made of ~65% RNA and 35% protein',
      'A cell can have millions of ribosomes'
    ],
    create: () => {
      const group = new THREE.Group();

      // Create a cluster showing ribosomes on mRNA (polysome)
      const mRNACurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(-1, 0.3, 0.2),
        new THREE.Vector3(0, -0.2, -0.1),
        new THREE.Vector3(1, 0.2, 0.3),
        new THREE.Vector3(2, 0, 0)
      ]);

      // mRNA strand
      const mRNAGeom = new THREE.TubeGeometry(mRNACurve, 30, 0.03, 8, false);
      const mRNAMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const mRNA = new THREE.Mesh(mRNAGeom, mRNAMat);
      group.add(mRNA);

      // Ribosomes along the mRNA
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6;
        const pos = mRNACurve.getPoint(t);

        const riboGroup = new THREE.Group();

        // Large subunit
        const largeGeom = new THREE.SphereGeometry(0.25, 12, 12);
        const largeMat = new THREE.MeshPhysicalMaterial({
          color: 0x06b6d4,
          roughness: 0.4,
          metalness: 0.1
        });
        const large = new THREE.Mesh(largeGeom, largeMat);
        large.position.y = 0.15;
        large.scale.set(1.2, 1, 1);
        riboGroup.add(large);

        // Small subunit
        const smallGeom = new THREE.SphereGeometry(0.18, 12, 12);
        const smallMat = new THREE.MeshPhysicalMaterial({
          color: 0x22d3ee,
          roughness: 0.4,
          metalness: 0.1
        });
        const small = new THREE.Mesh(smallGeom, smallMat);
        small.position.y = -0.12;
        small.scale.set(1, 0.8, 1);
        riboGroup.add(small);

        riboGroup.position.copy(pos);
        riboGroup.position.y += 0.2;
        group.add(riboGroup);
      }

      return group;
    },
    cameraDistance: 5
  }
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1a);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 6);

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
  controls.autoRotateSpeed = 1;

  setupLighting();
  createEnvironment();
  createOrganelleButtons();
  setupEventListeners();

  // Load first organelle
  showOrganelle('nucleus');

  animate();
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x8899aa, 0.6);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(5, 10, 7);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6688cc, 0.5);
  fillLight.position.set(-10, 3, 0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffaa66, 0.4);
  rimLight.position.set(0, -5, -10);
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xaaddff, 0x445566, 0.4);
  scene.add(hemiLight);
}

function createEnvironment() {
  // Subtle particle field
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x667788,
    transparent: true,
    opacity: 0.5
  });

  scene.add(new THREE.Points(geometry, material));

  // Add fog
  scene.fog = new THREE.FogExp2(0x0a0f1a, 0.02);
}

function createOrganelleButtons() {
  const container = document.getElementById('organelle-list');

  Object.entries(organelleData).forEach(([key, data]) => {
    const button = document.createElement('button');
    button.className = 'organelle-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-600 hover:border-slate-400 text-left transition-all';
    button.dataset.organelle = key;
    button.style.color = data.color;

    button.innerHTML = `
      <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background: ${data.color}33">
        <div class="w-4 h-4 rounded-full" style="background: ${data.color}"></div>
      </div>
      <div>
        <div class="text-sm font-semibold text-white">${data.name}</div>
        <div class="text-xs text-slate-400">${data.subtitle}</div>
      </div>
    `;

    button.addEventListener('click', () => showOrganelle(key));
    container.appendChild(button);
  });
}

function showOrganelle(key) {
  const data = organelleData[key];
  if (!data) return;

  // Remove current organelle
  if (currentOrganelle) {
    scene.remove(currentOrganelle);
  }

  // Create new organelle
  currentOrganelle = data.create();
  scene.add(currentOrganelle);

  // Update camera distance
  camera.position.setLength(data.cameraDistance);
  controls.update();

  // Update info panel
  document.getElementById('info-title').textContent = data.name;
  document.getElementById('info-subtitle').textContent = data.subtitle;
  document.getElementById('info-description').textContent = data.description;

  const iconContainer = document.getElementById('info-icon');
  iconContainer.style.backgroundColor = data.color + '33';
  iconContainer.querySelector('div').style.backgroundColor = data.color;

  // Update facts
  const factsContainer = document.getElementById('info-facts');
  factsContainer.innerHTML = data.facts.map(fact => `
    <div class="flex items-start gap-2">
      <span style="color: ${data.color}">*</span>
      <span>${fact}</span>
    </div>
  `).join('');

  // Update active button
  document.querySelectorAll('.organelle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.organelle === key);
  });
}

function setupEventListeners() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('rotate-btn').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
  });

  document.getElementById('zoom-in-btn').addEventListener('click', () => {
    camera.position.multiplyScalar(0.8);
  });

  document.getElementById('zoom-out-btn').addEventListener('click', () => {
    camera.position.multiplyScalar(1.2);
  });
}

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

  // Animate current organelle
  if (currentOrganelle) {
    // Gentle floating
    currentOrganelle.position.y = Math.sin(time * 0.5) * 0.1;

    // Animate vesicles if showing
    currentOrganelle.traverse((child) => {
      if (child.userData && child.userData.phase !== undefined) {
        const phase = child.userData.phase;
        child.position.y += Math.sin(time * 2 + phase) * 0.001;
      }
    });
  }

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// START
// ============================================

init();
