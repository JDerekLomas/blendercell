import * as THREE from 'three';
import { createLysosomeMaterial, ORGANELLE_COLORS } from './materials.js';

// ============================================
// LYSOSOMES FACTORY
// ============================================

/**
 * Create a single lysosome
 *
 * @param {Object} options Configuration options
 * @param {THREE.Vector3} options.position Position in 3D space
 * @param {number} options.radius Radius of the lysosome (default: 0.15)
 * @param {boolean} options.includeEnzymes Show internal enzyme particles (default: true)
 * @param {string} options.organelleName Name for click detection (default: 'Lysosomes')
 * @returns {THREE.Mesh|THREE.Group} Lysosome mesh or group
 */
export function createLysosome(options = {}) {
  const {
    position = new THREE.Vector3(),
    radius = 0.15,
    includeEnzymes = true,
    organelleName = 'Lysosomes'
  } = options;

  if (!includeEnzymes) {
    // Simple sphere
    const material = createLysosomeMaterial();
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const lysosome = new THREE.Mesh(geometry, material);
    lysosome.position.copy(position);
    lysosome.userData = { organelle: organelleName };
    return lysosome;
  }

  // Detailed lysosome with internal particles
  const group = new THREE.Group();
  group.position.copy(position);

  // Outer membrane
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    createLysosomeMaterial({ opacity: 0.7 })
  );
  membrane.userData = { organelle: organelleName };
  group.add(membrane);

  // Internal enzyme particles
  const enzymeMat = new THREE.MeshBasicMaterial({
    color: 0x15803d,
    transparent: true,
    opacity: 0.8
  });

  for (let i = 0; i < 5; i++) {
    const enzyme = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.15, 8, 8),
      enzymeMat
    );
    const angle = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * 0.5 * Math.random();
    enzyme.position.set(
      r * Math.sin(phi) * Math.cos(angle),
      r * Math.sin(phi) * Math.sin(angle),
      r * Math.cos(phi)
    );
    group.add(enzyme);
  }

  return group;
}

/**
 * Create multiple lysosomes at specified positions
 *
 * @param {Array<THREE.Vector3>} positions Array of positions
 * @param {Object} options Configuration options
 * @returns {THREE.Group} Group containing all lysosomes
 */
export function createLysosomes(positions, options = {}) {
  const {
    radiusRange = [0.12, 0.2],
    includeEnzymes = false,
    organelleName = 'Lysosomes'
  } = options;

  const group = new THREE.Group();

  for (const position of positions) {
    const radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    const lysosome = createLysosome({
      position,
      radius,
      includeEnzymes,
      organelleName
    });
    group.add(lysosome);
  }

  return group;
}

/**
 * Create instanced lysosomes for better performance
 *
 * @param {Array<THREE.Vector3>} positions Array of positions
 * @param {Object} options Configuration options
 * @returns {THREE.InstancedMesh} Instanced mesh of lysosomes
 */
export function createInstancedLysosomes(positions, options = {}) {
  const {
    radius = 0.15,
    organelleName = 'Lysosomes'
  } = options;

  const geometry = new THREE.SphereGeometry(radius, 12, 12);
  const material = createLysosomeMaterial();

  const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
  instancedMesh.userData = { organelle: organelleName };

  const dummy = new THREE.Object3D();

  for (let i = 0; i < positions.length; i++) {
    dummy.position.copy(positions[i]);
    const scale = 0.8 + Math.random() * 0.4;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}

/**
 * Generate lysosome positions distributed in a volume
 *
 * @param {Object} options Configuration
 * @returns {Array<THREE.Vector3>} Array of positions
 */
export function generateLysosomePositions(options = {}) {
  const {
    count = 15,
    bounds = { type: 'sphere', radius: 5 },
    minDistance = 0.4,
    excludeRegions = []
  } = options;

  const positions = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let valid = false;
    let position;

    while (!valid && attempts < 50) {
      if (bounds.type === 'sphere') {
        const r = bounds.minRadius || 0 + Math.random() * (bounds.radius - (bounds.minRadius || 0));
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        position = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      } else if (bounds.type === 'ellipsoid') {
        const r = Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        position = new THREE.Vector3(
          r * bounds.radiusX * Math.sin(phi) * Math.cos(theta),
          r * bounds.radiusY * Math.sin(phi) * Math.sin(theta),
          r * bounds.radiusZ * Math.cos(phi)
        );
      }

      valid = true;

      // Check minimum distance from other positions
      for (const existing of positions) {
        if (position.distanceTo(existing) < minDistance) {
          valid = false;
          break;
        }
      }

      // Check excluded regions
      for (const region of excludeRegions) {
        if (position.distanceTo(region.center) < region.radius) {
          valid = false;
          break;
        }
      }

      attempts++;
    }

    if (position && valid) {
      positions.push(position);
    }
  }

  return positions;
}
