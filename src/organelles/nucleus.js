import * as THREE from 'three';
import {
  createNuclearEnvelopeMaterial,
  createNucleolusMaterial,
  createChromatinMaterial,
  ORGANELLE_COLORS
} from './materials.js';

// ============================================
// NUCLEUS FACTORY
// ============================================

/**
 * Create a nucleus with configurable shape and internal structures
 *
 * @param {Object} options Configuration options
 * @param {THREE.Vector3} options.position Position in 3D space
 * @param {string} options.shape Shape type: 'spherical' | 'kidney' | 'elongated'
 * @param {number} options.radius Base radius (default: 1.5)
 * @param {boolean} options.includeNucleoli Include nucleoli (default: true)
 * @param {number} options.nucleoliCount Number of nucleoli (default: 2)
 * @param {boolean} options.includeChromatin Include chromatin strands (default: true)
 * @param {boolean} options.includeNuclearPores Include nuclear pores (default: true)
 * @param {number} options.poreCount Number of nuclear pores (default: 40)
 * @param {boolean} options.includeLamina Include nuclear lamina (default: true)
 * @param {string} options.organelleName Name for click detection (default: 'Nucleus')
 * @returns {THREE.Group} Group containing the nucleus
 */
export function createNucleus(options = {}) {
  const {
    position = new THREE.Vector3(),
    shape = 'spherical',
    radius = 1.5,
    includeNucleoli = true,
    nucleoliCount = 2,
    includeChromatin = true,
    includeNuclearPores = true,
    poreCount = 40,
    includeLamina = true,
    organelleName = 'Nucleus'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  // Create appropriate geometry based on shape
  let envelopeGeometry;
  let innerScale = { x: 1, y: 1, z: 1 };

  switch (shape) {
    case 'kidney':
      envelopeGeometry = createKidneyGeometry(radius);
      break;
    case 'elongated':
      envelopeGeometry = new THREE.SphereGeometry(radius, 48, 48);
      group.scale.set(2.5, 0.8, 0.8);
      innerScale = { x: 1 / 2.5, y: 1 / 0.8, z: 1 / 0.8 };
      break;
    case 'spherical':
    default:
      envelopeGeometry = new THREE.SphereGeometry(radius, 64, 64);
  }

  // Nuclear envelope (outer membrane)
  const envelopeMaterial = createNuclearEnvelopeMaterial();
  const nuclearEnvelope = new THREE.Mesh(envelopeGeometry, envelopeMaterial);
  nuclearEnvelope.userData = { organelle: organelleName };
  group.add(nuclearEnvelope);

  // Inner nuclear membrane
  const innerMembrane = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.97, 48, 48),
    new THREE.MeshPhysicalMaterial({
      color: ORGANELLE_COLORS.nucleusInner,
      roughness: 0.5,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide
    })
  );
  group.add(innerMembrane);

  // Nucleoplasm (inner fluid)
  const nucleoplasm = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.93, 32, 32),
    new THREE.MeshBasicMaterial({
      color: ORGANELLE_COLORS.nucleoplasm,
      transparent: true,
      opacity: 0.3
    })
  );
  group.add(nucleoplasm);

  // Nuclear lamina (mesh network under envelope)
  if (includeLamina) {
    const lamina = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * 0.96, 2),
      new THREE.MeshBasicMaterial({
        color: ORGANELLE_COLORS.lamina,
        transparent: true,
        opacity: 0.2,
        wireframe: true
      })
    );
    group.add(lamina);
  }

  // Nuclear pores
  if (includeNuclearPores && shape !== 'kidney') {
    const poreMat = new THREE.MeshStandardMaterial({
      color: ORGANELLE_COLORS.nuclearPore,
      roughness: 0.3,
      emissive: 0x221155,
      emissiveIntensity: 0.3
    });

    for (let i = 0; i < poreCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const pore = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.025, 8, 12),
        poreMat
      );
      pore.position.set(x, y, z);
      pore.lookAt(0, 0, 0);
      group.add(pore);
    }
  }

  // Nucleoli
  if (includeNucleoli) {
    const nucleolusMat = createNucleolusMaterial();

    for (let i = 0; i < nucleoliCount; i++) {
      const nucleolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 + Math.random() * 0.15, 24, 24),
        nucleolusMat
      );
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.3 + Math.random() * 0.5;
      nucleolus.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 0.8,
        Math.sin(angle) * dist
      );

      // Fibrillar center (darker spot inside)
      const fibrillarCenter = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0x220044,
          transparent: true,
          opacity: 0.8
        })
      );
      fibrillarCenter.position.copy(nucleolus.position);

      group.add(nucleolus);
      group.add(fibrillarCenter);
    }
  }

  // Chromatin
  if (includeChromatin) {
    // Heterochromatin - dense clumps near periphery
    const heterochromatinMat = createChromatinMaterial('hetero');

    for (let i = 0; i < 15; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.2);

      const clump = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 8),
        heterochromatinMat
      );
      clump.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      clump.scale.set(1 + Math.random() * 0.5, 1, 1 + Math.random() * 0.3);
      group.add(clump);
    }

    // Euchromatin - loose, stringy chromatin throughout
    const euchromatinMat = createChromatinMaterial('eu');

    for (let i = 0; i < 12; i++) {
      const points = [];
      const startAngle = Math.random() * Math.PI * 2;
      const startR = Math.random() * radius * 0.6;

      for (let j = 0; j < 6; j++) {
        const t = j / 5;
        const angle = startAngle + t * Math.PI * (0.5 + Math.random());
        const r = startR + (Math.random() - 0.5) * 0.5;
        const y = (Math.random() - 0.5) * radius * 1.5;

        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        ));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 24, 0.02, 6, false);
      const chromatin = new THREE.Mesh(tubeGeometry, euchromatinMat);
      group.add(chromatin);
    }
  }

  return group;
}

/**
 * Create kidney-shaped geometry for macrophage nuclei
 */
function createKidneyGeometry(radius) {
  // Create a modified sphere with an indentation
  const geometry = new THREE.SphereGeometry(radius, 48, 48);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // Create indentation on one side
    const indent = Math.exp(-(x - radius * 0.5) * (x - radius * 0.5) / (radius * 0.3)) * radius * 0.4;
    const newX = x - indent;

    positions.setX(i, newX);
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Create a simple nucleus (less detailed, for performance)
 */
export function createSimpleNucleus(options = {}) {
  const {
    position = new THREE.Vector3(),
    radius = 1.5,
    color = ORGANELLE_COLORS.nucleus,
    opacity = 0.6,
    organelleName = 'Nucleus'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.1
  });

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    material
  );
  mesh.userData = { organelle: organelleName };
  group.add(mesh);

  // Single nucleolus
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.25, 16, 16),
    createNucleolusMaterial()
  );
  nucleolus.position.set(0, radius * 0.2, 0);
  group.add(nucleolus);

  return group;
}

/**
 * Create elongated muscle cell nucleus (peripheral position)
 */
export function createMuscleNucleus(options = {}) {
  const {
    position = new THREE.Vector3(),
    length = 3,
    radius = 0.4,
    organelleName = 'Nucleus'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  // Elongated nucleus using capsule geometry
  const material = createNuclearEnvelopeMaterial({ opacity: 0.7 });
  const geometry = new THREE.CapsuleGeometry(radius, length, 16, 24);
  const nucleus = new THREE.Mesh(geometry, material);
  nucleus.userData = { organelle: organelleName };
  nucleus.rotation.z = Math.PI / 2; // Align with fiber
  group.add(nucleus);

  // Nucleolus
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.4, 12, 12),
    createNucleolusMaterial()
  );
  group.add(nucleolus);

  return group;
}
