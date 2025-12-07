import * as THREE from 'three';
import { createRERMaterial, createRibosomeMaterial, ORGANELLE_COLORS } from './materials.js';

// ============================================
// ENDOPLASMIC RETICULUM FACTORY
// ============================================

/**
 * Create Rough Endoplasmic Reticulum (RER) with attached ribosomes
 *
 * @param {Object} options Configuration options
 * @param {THREE.Vector3} options.position Position in 3D space
 * @param {number} options.sheetCount Number of ER sheets/cisternae (default: 20)
 * @param {boolean} options.includeRibosomes Attach ribosomes to surface (default: true)
 * @param {number} options.ribosomeDensity Ribosomes per sheet (default: 30)
 * @param {number} options.scale Overall scale factor (default: 1)
 * @param {string} options.organelleName Name for click detection (default: 'RER')
 * @returns {THREE.Group} Group containing the RER
 */
export function createRER(options = {}) {
  const {
    position = new THREE.Vector3(),
    sheetCount = 20,
    includeRibosomes = true,
    ribosomeDensity = 30,
    scale = 1,
    organelleName = 'RER'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);
  group.scale.setScalar(scale);

  const rerMaterial = createRERMaterial();
  const ribosomeMaterial = includeRibosomes ? createRibosomeMaterial() : null;

  // Create curved ER sheets arranged in stacks
  const stackCount = Math.ceil(sheetCount / 5);

  for (let stack = 0; stack < stackCount; stack++) {
    const stackAngle = (stack / stackCount) * Math.PI * 2;
    const stackRadius = 1.5 + Math.random() * 0.5;
    const stackX = Math.cos(stackAngle) * stackRadius;
    const stackZ = Math.sin(stackAngle) * stackRadius;

    const sheetsInStack = Math.min(5, sheetCount - stack * 5);

    for (let i = 0; i < sheetsInStack; i++) {
      const sheet = createERSheet({
        width: 1.5 + Math.random() * 0.5,
        height: 0.8 + Math.random() * 0.3,
        curvature: 0.3 + Math.random() * 0.2,
        material: rerMaterial
      });

      sheet.position.set(
        stackX + (Math.random() - 0.5) * 0.3,
        (i - sheetsInStack / 2) * 0.25,
        stackZ + (Math.random() - 0.5) * 0.3
      );

      sheet.rotation.y = stackAngle + (Math.random() - 0.5) * 0.5;
      sheet.rotation.x = (Math.random() - 0.5) * 0.2;
      sheet.userData = { organelle: organelleName };
      group.add(sheet);

      // Add ribosomes to this sheet
      if (includeRibosomes) {
        const ribosomes = createRibosomesOnSurface(sheet, ribosomeDensity, ribosomeMaterial);
        group.add(ribosomes);
      }
    }
  }

  return group;
}

/**
 * Create a single curved ER sheet
 */
function createERSheet(options = {}) {
  const {
    width = 1.5,
    height = 0.8,
    curvature = 0.3,
    segments = 16,
    material = null
  } = options;

  // Create a curved surface using parametric approach
  const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);

    // Apply curvature
    const z = Math.sin((x / width) * Math.PI) * curvature +
              Math.sin((y / height) * Math.PI * 0.5) * curvature * 0.5;

    positions.setZ(i, z);
  }

  geometry.computeVertexNormals();

  const mat = material || createRERMaterial();
  return new THREE.Mesh(geometry, mat);
}

/**
 * Create ribosomes scattered on a surface
 */
function createRibosomesOnSurface(surfaceMesh, count, material) {
  const group = new THREE.Group();
  const geometry = surfaceMesh.geometry;
  const positions = geometry.attributes.position;
  const vertexCount = positions.count;

  for (let i = 0; i < count; i++) {
    // Pick a random vertex
    const idx = Math.floor(Math.random() * vertexCount);
    const x = positions.getX(idx) + (Math.random() - 0.5) * 0.1;
    const y = positions.getY(idx) + (Math.random() - 0.5) * 0.1;
    const z = positions.getZ(idx);

    const ribosome = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      material
    );
    ribosome.position.set(x, y, z + 0.03);
    ribosome.userData = { organelle: 'Ribosomes' };
    group.add(ribosome);
  }

  return group;
}

/**
 * Create instanced ribosomes for better performance
 */
export function createInstancedRibosomes(positions, options = {}) {
  const {
    radius = 0.025,
    organelleName = 'Ribosomes'
  } = options;

  const geometry = new THREE.SphereGeometry(radius, 6, 6);
  const material = createRibosomeMaterial();

  const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
  instancedMesh.userData = { organelle: organelleName };

  const dummy = new THREE.Object3D();

  for (let i = 0; i < positions.length; i++) {
    dummy.position.copy(positions[i]);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}

/**
 * Create a simple ER tubular network (for simpler cells like macrophage)
 *
 * @param {Object} options Configuration options
 * @returns {THREE.Group} Group containing the ER network
 */
export function createSimpleER(options = {}) {
  const {
    position = new THREE.Vector3(),
    tubeCount = 20,
    spreadRadius = 3,
    tubeRadius = 0.06,
    organelleName = 'ER'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  const material = createRERMaterial({ opacity: 0.5 });

  for (let i = 0; i < tubeCount; i++) {
    const points = [];
    const startAngle = Math.random() * Math.PI * 2;
    const startR = Math.random() * spreadRadius * 0.5;

    for (let j = 0; j < 4; j++) {
      const t = j / 3;
      const angle = startAngle + t * Math.PI * (0.3 + Math.random() * 0.4);
      const r = startR + t * spreadRadius * 0.5 + (Math.random() - 0.5) * 0.5;
      const y = (Math.random() - 0.5) * 2;

      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 12, tubeRadius, 6, false);
    const tube = new THREE.Mesh(tubeGeometry, material);
    tube.userData = { organelle: organelleName };
    group.add(tube);
  }

  return group;
}

/**
 * Create plasma cell style massive RER with folded sheets
 * This is the highly specialized version for antibody-producing cells
 *
 * @param {Object} options Configuration options
 * @returns {THREE.Group} Group containing the elaborate RER
 */
export function createPlasmaRER(options = {}) {
  const {
    position = new THREE.Vector3(),
    stackCount = 6,
    sheetsPerStack = 5,
    includeRibosomes = true,
    organelleName = 'RER'
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);

  const rerMaterial = createRERMaterial();

  // Create multiple stacks of folded cisternae
  for (let stack = 0; stack < stackCount; stack++) {
    const stackAngle = (stack / stackCount) * Math.PI * 2;
    const stackRadius = 2.5 + Math.random() * 0.8;
    const stackY = (Math.random() - 0.5) * 3;

    for (let i = 0; i < sheetsPerStack; i++) {
      // Create curved cisterna sheet
      const width = 2.0 + Math.random() * 0.5;
      const height = 1.2 + Math.random() * 0.3;

      const shapePoints = [];
      const segments = 20;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = (t - 0.5) * width;
        const curve = Math.sin(t * Math.PI * 2) * 0.15 + Math.sin(t * Math.PI) * 0.2;
        shapePoints.push(new THREE.Vector2(x, curve));
      }

      const shape = new THREE.Shape();
      shape.moveTo(shapePoints[0].x, shapePoints[0].y + height / 2);

      for (let j = 1; j < shapePoints.length; j++) {
        shape.lineTo(shapePoints[j].x, shapePoints[j].y + height / 2);
      }

      for (let j = shapePoints.length - 1; j >= 0; j--) {
        shape.lineTo(shapePoints[j].x, shapePoints[j].y - height / 2);
      }

      shape.closePath();

      const extrudeSettings = {
        depth: 0.08,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const cisterna = new THREE.Mesh(geometry, rerMaterial);

      cisterna.position.set(
        Math.cos(stackAngle) * stackRadius,
        stackY + i * 0.2,
        Math.sin(stackAngle) * stackRadius
      );

      cisterna.rotation.y = stackAngle + Math.PI / 2;
      cisterna.rotation.x = (Math.random() - 0.5) * 0.1;
      cisterna.userData = { organelle: organelleName };
      group.add(cisterna);
    }
  }

  // Add scattered ribosomes using instancing
  if (includeRibosomes) {
    const ribosomePositions = [];
    const ribosomeMat = createRibosomeMaterial();

    // Generate ~800 ribosome positions
    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2.5;
      const y = (Math.random() - 0.5) * 4;

      ribosomePositions.push(new THREE.Vector3(
        Math.cos(angle) * r + (Math.random() - 0.5) * 0.3,
        y,
        Math.sin(angle) * r + (Math.random() - 0.5) * 0.3
      ));
    }

    const ribosomes = createInstancedRibosomes(ribosomePositions);
    group.add(ribosomes);
  }

  return group;
}
