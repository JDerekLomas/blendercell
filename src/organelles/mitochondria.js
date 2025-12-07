import * as THREE from 'three';
import { createMitochondriaMaterial, createCristaeMaterial, ORGANELLE_COLORS } from './materials.js';

// ============================================
// MITOCHONDRIA FACTORY
// ============================================

/**
 * Create a single mitochondrion with optional detailed internal structure
 *
 * @param {Object} options Configuration options
 * @param {THREE.Vector3} options.position Position in 3D space
 * @param {number} options.length Length of the mitochondrion (default: 0.8)
 * @param {number} options.radius Radius of the mitochondrion (default: 0.2)
 * @param {boolean} options.includeCristae Include internal cristae folds (default: true)
 * @param {boolean} options.includeGlow Add emissive glow effect (default: false)
 * @param {boolean} options.includeInteriorLight Add point light inside for energy glow (default: false)
 * @param {number} options.cristaeCount Number of cristae folds (default: 4)
 * @param {THREE.Material} options.material Custom material (optional)
 * @param {string} options.organelleName Name for click detection (default: 'Mitochondria')
 * @returns {THREE.Group} Group containing the mitochondrion
 */
export function createMitochondrion(options = {}) {
  const {
    position = new THREE.Vector3(),
    length = 0.8,
    radius = 0.2,
    includeCristae = true,
    includeGlow = false,
    includeInteriorLight = false,
    cristaeCount = 4,
    material = null,
    organelleName = 'Mitochondria'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  // Random rotation for natural appearance
  group.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );

  // Outer membrane (capsule shape)
  const outerMaterial = material || createMitochondriaMaterial({ glow: includeGlow });
  const outerGeometry = new THREE.CapsuleGeometry(radius, length, 8, 16);
  const outerMembrane = new THREE.Mesh(outerGeometry, outerMaterial);
  outerMembrane.userData = { organelle: organelleName };
  group.add(outerMembrane);

  if (includeCristae) {
    // Inner membrane (slightly smaller)
    const innerRadius = radius * 0.85;
    const innerLength = length * 0.9;

    const innerMaterial = new THREE.MeshPhysicalMaterial({
      color: ORGANELLE_COLORS.mitochondriaInner,
      roughness: 0.5,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const innerGeometry = new THREE.CapsuleGeometry(innerRadius, innerLength, 6, 12);
    const innerMembrane = new THREE.Mesh(innerGeometry, innerMaterial);
    group.add(innerMembrane);

    // Cristae folds (internal membranes)
    const cristaeMaterial = createCristaeMaterial();

    for (let i = 0; i < cristaeCount; i++) {
      const t = (i + 0.5) / cristaeCount;
      const yPos = (t - 0.5) * length * 0.7;

      // Create wavy cristae using a curved plane
      const cristaGeometry = createCristaGeometry(innerRadius * 0.9, length * 0.15);
      const crista = new THREE.Mesh(cristaGeometry, cristaeMaterial);
      crista.position.y = yPos;
      crista.rotation.x = Math.PI / 2;
      crista.rotation.z = (Math.random() - 0.5) * 0.3;
      group.add(crista);
    }

    // Matrix glow (inner space) - enhanced for energy visualization
    const matrixMaterial = new THREE.MeshBasicMaterial({
      color: includeInteriorLight ? 0xff6644 : ORGANELLE_COLORS.mitochondriaMatrix,
      transparent: true,
      opacity: includeInteriorLight ? 0.4 : 0.2
    });

    const matrixGeometry = new THREE.CapsuleGeometry(innerRadius * 0.6, innerLength * 0.6, 4, 8);
    const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial);
    group.add(matrix);
  }

  // Add interior point light for energy glow effect
  if (includeInteriorLight) {
    const interiorLight = new THREE.PointLight(0xff6b6b, 0.2, radius * 8);
    interiorLight.position.set(0, 0, 0);
    group.add(interiorLight);
  }

  return group;
}

/**
 * Create cristae fold geometry
 */
function createCristaGeometry(width, depth) {
  const shape = new THREE.Shape();
  const segments = 8;

  // Create wavy shape
  shape.moveTo(-width, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = (t * 2 - 1) * width;
    const y = Math.sin(t * Math.PI * 2) * depth * 0.3;
    shape.lineTo(x, y);
  }

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.1,
    bevelSize: depth * 0.1,
    bevelSegments: 2
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

/**
 * Create a field of mitochondria
 *
 * @param {Array<THREE.Vector3>} positions Array of positions
 * @param {Object} options Shared options for all mitochondria
 * @returns {THREE.Group} Group containing all mitochondria
 */
export function createMitochondriaField(positions, options = {}) {
  const {
    lengthRange = [0.6, 1.0],
    radiusRange = [0.15, 0.25],
    includeCristae = true,
    includeGlow = false,
    includeInteriorLight = false,
    interiorLightFrequency = 1, // 1 = all, 0.5 = half, etc.
    organelleName = 'Mitochondria'
  } = options;

  const group = new THREE.Group();

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    const length = lengthRange[0] + Math.random() * (lengthRange[1] - lengthRange[0]);
    const radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);

    // Determine if this mitochondrion gets interior light
    const hasInteriorLight = includeInteriorLight && (Math.random() < interiorLightFrequency);

    const mito = createMitochondrion({
      position,
      length,
      radius,
      includeCristae,
      includeGlow,
      includeInteriorLight: hasInteriorLight,
      cristaeCount: Math.floor(2 + Math.random() * 3),
      organelleName
    });

    group.add(mito);
  }

  return group;
}

/**
 * Create instanced mitochondria for better performance (simplified, no cristae)
 *
 * @param {Array<THREE.Vector3>} positions Array of positions
 * @param {Object} options Configuration options
 * @returns {THREE.InstancedMesh} Instanced mesh of mitochondria
 */
export function createInstancedMitochondria(positions, options = {}) {
  const {
    length = 0.8,
    radius = 0.2,
    includeGlow = false,
    organelleName = 'Mitochondria'
  } = options;

  const geometry = new THREE.CapsuleGeometry(radius, length, 6, 12);
  const material = createMitochondriaMaterial({ glow: includeGlow });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
  instancedMesh.userData = { organelle: organelleName };

  const dummy = new THREE.Object3D();

  for (let i = 0; i < positions.length; i++) {
    dummy.position.copy(positions[i]);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Slight size variation
    const scale = 0.8 + Math.random() * 0.4;
    dummy.scale.set(scale, scale, scale);

    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}

/**
 * Generate mitochondria positions for muscle cells
 * Three distribution patterns: intermyofibrillar, subsarcolemmal, and near Z-lines
 *
 * @param {Object} options Configuration
 * @returns {Array<THREE.Vector3>} Array of positions
 */
export function generateMuscleMitochondriaPositions(options = {}) {
  const {
    count = 150,
    fiberLength = 15,
    fiberRadius = 2.5,
    intermyofibrillarRatio = 0.6,
    subsarcolemmalRatio = 0.15,
    zLineRatio = 0.25,
    sarcomereLength = 2.5
  } = options;

  const positions = [];

  // Intermyofibrillar (between myofibrils) - 60%
  const intermyoCount = Math.floor(count * intermyofibrillarRatio);
  for (let i = 0; i < intermyoCount; i++) {
    const x = (Math.random() - 0.5) * fiberLength * 0.9;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * fiberRadius * 0.7;
    const y = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    positions.push(new THREE.Vector3(x, y, z));
  }

  // Subsarcolemmal (near membrane) - 15%
  const subsarcoCount = Math.floor(count * subsarcolemmalRatio);
  for (let i = 0; i < subsarcoCount; i++) {
    const x = (Math.random() - 0.5) * fiberLength * 0.9;
    const angle = Math.random() * Math.PI * 2;
    const r = fiberRadius * (0.85 + Math.random() * 0.1);
    const y = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    positions.push(new THREE.Vector3(x, y, z));
  }

  // Near Z-lines - 25%
  const zLineCount = Math.floor(count * zLineRatio);
  const numZLines = Math.floor(fiberLength / sarcomereLength);
  for (let i = 0; i < zLineCount; i++) {
    const zLineIndex = Math.floor(Math.random() * numZLines);
    const x = (zLineIndex - numZLines / 2) * sarcomereLength + (Math.random() - 0.5) * 0.3;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * fiberRadius * 0.8;
    const y = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    positions.push(new THREE.Vector3(x, y, z));
  }

  return positions;
}

/**
 * Generate mitochondria positions distributed inside a sphere/ellipsoid
 *
 * @param {Object} options Configuration
 * @returns {Array<THREE.Vector3>} Array of positions
 */
export function generateSphericalMitochondriaPositions(options = {}) {
  const {
    count = 60,
    radiusX = 5,
    radiusY = 5,
    radiusZ = 5,
    minRadius = 1,
    excludeRegions = []
  } = options;

  const positions = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let valid = false;
    let position;

    while (!valid && attempts < 50) {
      const r = minRadius + Math.random() * (1 - minRadius / Math.max(radiusX, radiusY, radiusZ));
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      position = new THREE.Vector3(
        r * radiusX * Math.sin(phi) * Math.cos(theta),
        r * radiusY * Math.sin(phi) * Math.sin(theta),
        r * radiusZ * Math.cos(phi)
      );

      valid = true;
      for (const region of excludeRegions) {
        if (position.distanceTo(region.center) < region.radius) {
          valid = false;
          break;
        }
      }

      attempts++;
    }

    if (position) {
      positions.push(position);
    }
  }

  return positions;
}
