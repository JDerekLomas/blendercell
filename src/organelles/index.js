// ============================================
// ORGANELLE LIBRARY - MAIN EXPORTS
// ============================================

// Materials
export {
  ORGANELLE_COLORS,
  createMembraneMaterial,
  createNuclearEnvelopeMaterial,
  createNucleolusMaterial,
  createChromatinMaterial,
  createMitochondriaMaterial,
  createCristaeMaterial,
  createGolgiMaterial,
  createRERMaterial,
  createRibosomeMaterial,
  createLysosomeMaterial,
  createCentrioleMaterial,
  createVesicleMaterial,
  createPhagosomeMaterial,
  createMuscleFiberMaterial
} from './materials.js';

// Utilities
export {
  randomPointInSphere,
  randomPointInEllipsoid,
  randomPointOnSphere,
  clampToEllipsoid,
  createCurvedPath,
  createTubeFromCurve,
  createPulseAnimation,
  oscillate,
  smoothStep,
  createInstancedMesh,
  generateDistributedPositions,
  tagGroupMeshes,
  getMeshesFromGroup,
  scaleGroupToBounds
} from './utils.js';

// Mitochondria
export {
  createMitochondrion,
  createMitochondriaField,
  createInstancedMitochondria,
  generateMuscleMitochondriaPositions,
  generateSphericalMitochondriaPositions
} from './mitochondria.js';

// Nucleus
export {
  createNucleus,
  createSimpleNucleus,
  createMuscleNucleus
} from './nucleus.js';

// Golgi
export {
  createGolgi,
  createSimpleGolgi,
  createDetailedGolgi
} from './golgi.js';

// Lysosomes
export {
  createLysosome,
  createLysosomes,
  createInstancedLysosomes,
  generateLysosomePositions
} from './lysosomes.js';

// Endoplasmic Reticulum
export {
  createRER,
  createSimpleER,
  createPlasmaRER,
  createDetailedER,
  createInstancedRibosomes
} from './er.js';

// ============================================
// CONVENIENCE FACTORY FUNCTIONS
// ============================================

import * as THREE from 'three';
import { createMitochondrion, createMitochondriaField, generateSphericalMitochondriaPositions } from './mitochondria.js';
import { createNucleus, createSimpleNucleus, createMuscleNucleus } from './nucleus.js';
import { createGolgi, createSimpleGolgi } from './golgi.js';
import { createLysosomes, createInstancedLysosomes, generateLysosomePositions } from './lysosomes.js';
import { createRER, createSimpleER, createPlasmaRER } from './er.js';

/**
 * Create a complete set of organelles for a generic cell
 *
 * @param {Object} options Configuration
 * @returns {Object} Object containing all organelle groups
 */
export function createCellOrganelles(options = {}) {
  const {
    cellRadius = 5,
    nucleusPosition = new THREE.Vector3(0, 0, 0),
    nucleusRadius = 1.5,
    mitochondriaCount = 30,
    lysosomeCount = 10,
    includeGolgi = true,
    includeER = true,
    includeDetailedNucleus = true
  } = options;

  const organelles = {};

  // Nucleus
  organelles.nucleus = includeDetailedNucleus
    ? createNucleus({ position: nucleusPosition, radius: nucleusRadius })
    : createSimpleNucleus({ position: nucleusPosition, radius: nucleusRadius });

  // Mitochondria
  const mitoPositions = generateSphericalMitochondriaPositions({
    count: mitochondriaCount,
    radiusX: cellRadius * 0.8,
    radiusY: cellRadius * 0.8,
    radiusZ: cellRadius * 0.8,
    minRadius: nucleusRadius * 1.5,
    excludeRegions: [{ center: nucleusPosition, radius: nucleusRadius * 1.2 }]
  });
  organelles.mitochondria = createMitochondriaField(mitoPositions, {
    includeCristae: true
  });

  // Golgi
  if (includeGolgi) {
    organelles.golgi = createGolgi({
      position: new THREE.Vector3(nucleusRadius + 1, 0, 0)
    });
  }

  // Lysosomes
  const lysoPositions = generateLysosomePositions({
    count: lysosomeCount,
    bounds: { type: 'sphere', radius: cellRadius * 0.7, minRadius: nucleusRadius * 1.3 },
    excludeRegions: [{ center: nucleusPosition, radius: nucleusRadius * 1.2 }]
  });
  organelles.lysosomes = createInstancedLysosomes(lysoPositions);

  // ER
  if (includeER) {
    organelles.er = createSimpleER({
      position: new THREE.Vector3(-nucleusRadius - 0.5, 0, 0),
      tubeCount: 15
    });
  }

  return organelles;
}

/**
 * Create organelle set for a plasma cell (antibody factory)
 */
export function createPlasmaCellOrganelles(options = {}) {
  const {
    cellRadius = 7,
    nucleusOffset = new THREE.Vector3(3, 0, 0),
    nucleusRadius = 2.4
  } = options;

  const organelles = {};

  // Eccentric nucleus with full detail
  organelles.nucleus = createNucleus({
    position: nucleusOffset,
    radius: nucleusRadius,
    includeNucleoli: true,
    nucleoliCount: 2,
    includeChromatin: true,
    poreCount: 40
  });

  // Massive RER (signature of plasma cells)
  organelles.rer = createPlasmaRER({
    position: new THREE.Vector3(-1, 0, 0),
    stackCount: 6,
    sheetsPerStack: 5,
    includeRibosomes: true
  });

  // Golgi near nucleus (in the "Hof" zone)
  organelles.golgi = createGolgi({
    position: new THREE.Vector3(1.8, 0, 0),
    cisternaCount: 8
  });

  // Mitochondria
  const mitoPositions = generateSphericalMitochondriaPositions({
    count: 60,
    radiusX: cellRadius * 1.3,
    radiusY: cellRadius * 0.8,
    radiusZ: cellRadius * 0.8,
    minRadius: 2,
    excludeRegions: [
      { center: nucleusOffset, radius: nucleusRadius * 1.2 },
      { center: new THREE.Vector3(1.8, 0, 0), radius: 1.5 }
    ]
  });
  organelles.mitochondria = createMitochondriaField(mitoPositions);

  // Lysosomes
  const lysoPositions = generateLysosomePositions({
    count: 15,
    bounds: { type: 'ellipsoid', radiusX: cellRadius * 1.2, radiusY: cellRadius * 0.7, radiusZ: cellRadius * 0.7 },
    excludeRegions: [{ center: nucleusOffset, radius: nucleusRadius * 1.2 }]
  });
  organelles.lysosomes = createInstancedLysosomes(lysoPositions);

  return organelles;
}

/**
 * Create organelle set for a macrophage
 */
export function createMacrophageOrganelles(options = {}) {
  const {
    cellRadius = 5,
    nucleusPosition = new THREE.Vector3(-1, 0, 0)
  } = options;

  const organelles = {};

  // Kidney-shaped nucleus
  organelles.nucleus = createNucleus({
    position: nucleusPosition,
    shape: 'kidney',
    radius: 1.2,
    nucleoliCount: 1,
    poreCount: 25
  });

  // Smaller Golgi
  organelles.golgi = createSimpleGolgi({
    position: new THREE.Vector3(1, 0.5, 0),
    cisternaCount: 5
  });

  // Mitochondria with glow
  const mitoPositions = generateSphericalMitochondriaPositions({
    count: 15,
    radiusX: cellRadius * 0.7,
    radiusY: cellRadius * 0.7,
    radiusZ: cellRadius * 0.7,
    excludeRegions: [{ center: nucleusPosition, radius: 1.5 }]
  });
  organelles.mitochondria = createMitochondriaField(mitoPositions, {
    includeGlow: true,
    includeCristae: false
  });

  // Many lysosomes (macrophages have lots for digestion)
  const lysoPositions = generateLysosomePositions({
    count: 40,
    bounds: { type: 'sphere', radius: cellRadius * 0.8 },
    excludeRegions: [{ center: nucleusPosition, radius: 1.5 }],
    minDistance: 0.3
  });
  organelles.lysosomes = createLysosomes(lysoPositions);

  // Simple ER network
  organelles.er = createSimpleER({
    tubeCount: 20,
    spreadRadius: cellRadius * 0.6
  });

  return organelles;
}

