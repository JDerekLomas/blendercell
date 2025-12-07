import * as THREE from 'three';
import { createGolgiMaterial, createVesicleMaterial, ORGANELLE_COLORS } from './materials.js';

// ============================================
// GOLGI APPARATUS FACTORY
// ============================================

/**
 * Create a Golgi apparatus with stacked cisternae
 *
 * @param {Object} options Configuration options
 * @param {THREE.Vector3} options.position Position in 3D space
 * @param {number} options.cisternaCount Number of stacked cisternae (default: 8)
 * @param {number} options.width Base width of cisternae (default: 2.2)
 * @param {number} options.depth Base depth of cisternae (default: 0.8)
 * @param {boolean} options.includeVesicles Include budding vesicles (default: true)
 * @param {boolean} options.includeTubules Include connecting tubules (default: true)
 * @param {number} options.rotation Y-axis rotation (default: 0)
 * @param {string} options.organelleName Name for click detection (default: 'Golgi')
 * @returns {THREE.Group} Group containing the Golgi apparatus
 */
export function createGolgi(options = {}) {
  const {
    position = new THREE.Vector3(),
    cisternaCount = 8,
    width = 2.2,
    depth = 0.8,
    includeVesicles = true,
    includeTubules = true,
    rotation = 0,
    organelleName = 'Golgi'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.z = 0.2;
  group.rotation.y = rotation;

  const stackSpacing = 0.18;

  // Create stacked cisternae
  for (let i = 0; i < cisternaCount; i++) {
    const t = i / (cisternaCount - 1);
    const cisternaWidth = width * (1 - t * 0.3);
    const cisternaDepth = depth * (1 - t * 0.2);
    const curvature = 0.3 + t * 0.4;
    const thickness = 0.06 + Math.random() * 0.02;

    // Determine position in stack (cis, medial, trans)
    let matType;
    if (i < cisternaCount * 0.25) matType = 'cis';
    else if (i < cisternaCount * 0.75) matType = 'medial';
    else matType = 'trans';

    const geometry = createCisternaGeometry(cisternaWidth, cisternaDepth, curvature, thickness);
    const material = createGolgiMaterial(matType);
    const cisterna = new THREE.Mesh(geometry, material);

    cisterna.position.y = (i - cisternaCount / 2) * stackSpacing;
    cisterna.position.x = t * 0.15;
    cisterna.rotation.x = Math.PI / 2;
    cisterna.rotation.z = Math.PI / 2;

    cisterna.userData = { organelle: organelleName };
    group.add(cisterna);
  }

  // Add fenestrations (small holes)
  const fenestrationMat = new THREE.MeshBasicMaterial({
    color: 0x1a1a00,
    transparent: true,
    opacity: 0.4
  });

  for (let i = 0; i < 30; i++) {
    const fenestration = new THREE.Mesh(
      new THREE.CircleGeometry(0.03 + Math.random() * 0.03, 8),
      fenestrationMat
    );
    fenestration.position.set(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.5
    );
    fenestration.rotation.y = Math.PI / 2;
    group.add(fenestration);
  }

  // Tubular network connecting cisternae
  if (includeTubules) {
    const tubuleMaterial = new THREE.MeshStandardMaterial({
      color: ORGANELLE_COLORS.golgiTubule,
      roughness: 0.5,
      transparent: true,
      opacity: 0.6
    });

    for (let i = 0; i < 15; i++) {
      const startY = (Math.random() - 0.5) * 1.2;
      const endY = startY + (Math.random() - 0.5) * 0.4;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3((Math.random() - 0.5) * 0.2, startY, (Math.random() - 0.5) * 1.0),
        new THREE.Vector3((Math.random() - 0.5) * 0.15, (startY + endY) / 2, (Math.random() - 0.5) * 0.8),
        new THREE.Vector3((Math.random() - 0.5) * 0.2, endY, (Math.random() - 0.5) * 1.0)
      ]);

      const tubeGeom = new THREE.TubeGeometry(curve, 8, 0.015, 6, false);
      const tube = new THREE.Mesh(tubeGeom, tubuleMaterial);
      group.add(tube);
    }
  }

  // Budding vesicles
  if (includeVesicles) {
    // Cis-side vesicles (arriving from ER) - greenish
    for (let i = 0; i < 8; i++) {
      const vesicle = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xAADD88,
          emissive: 0xAADD88,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.85
        })
      );
      vesicle.position.set(
        -0.3 + Math.random() * 0.2,
        -0.8 + Math.random() * 0.3,
        (Math.random() - 0.5) * 1.5
      );
      group.add(vesicle);
    }

    // Trans-side vesicles (departing) - golden
    for (let i = 0; i < 12; i++) {
      const vesicle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 12, 12),
        createVesicleMaterial()
      );
      vesicle.position.set(
        0.3 + Math.random() * 0.3,
        0.6 + Math.random() * 0.4,
        (Math.random() - 0.5) * 1.8
      );
      group.add(vesicle);
    }
  }

  return group;
}

/**
 * Create curved cisterna geometry
 */
function createCisternaGeometry(width, depth, curvature, thickness) {
  const shape = new THREE.Shape();
  const segments = 32;

  // Create curved elongated shape
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const curve = Math.sin(t * Math.PI) * curvature;
    if (i === 0) {
      shape.moveTo(x, curve + depth / 2);
    } else {
      shape.lineTo(x, curve + depth / 2);
    }
  }
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const curve = Math.sin(t * Math.PI) * curvature;
    shape.lineTo(x, curve - depth / 2);
  }
  shape.closePath();

  const extrudeSettings = {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.3,
    bevelSize: thickness * 0.2,
    bevelSegments: 3,
    curveSegments: 24
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create a simplified Golgi for performance
 */
export function createSimpleGolgi(options = {}) {
  const {
    position = new THREE.Vector3(),
    cisternaCount = 5,
    scale = 1,
    organelleName = 'Golgi'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);
  group.scale.setScalar(scale);

  // Simplified cisternae using flattened cylinders
  for (let i = 0; i < cisternaCount; i++) {
    const t = i / (cisternaCount - 1);
    const width = 1.5 * (1 - t * 0.2);

    let matType;
    if (i < cisternaCount * 0.3) matType = 'cis';
    else if (i < cisternaCount * 0.7) matType = 'medial';
    else matType = 'trans';

    const cisterna = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.5, width * 0.5, 0.08, 24),
      createGolgiMaterial(matType)
    );

    cisterna.position.y = (i - cisternaCount / 2) * 0.15;
    cisterna.rotation.x = Math.PI / 2 + t * 0.3; // Slight curve effect
    cisterna.userData = { organelle: organelleName };
    group.add(cisterna);
  }

  return group;
}
