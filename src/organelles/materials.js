import * as THREE from 'three';

// ============================================
// ORGANELLE COLOR PALETTE
// ============================================
export const ORGANELLE_COLORS = {
  // Membrane colors
  membrane: 0xa2c2e8,
  membraneGlow: 0x88ccff,

  // Nucleus colors
  nucleus: 0x2E1A47,
  nucleusInner: 0x3a1850,
  nucleoplasm: 0x2a1040,
  nucleolus: 0x553388,
  chromatin: 0x150a26,
  heterochromatin: 0x1a0a2e,
  euchromatin: 0x9977dd,
  nuclearPore: 0x4422aa,
  lamina: 0x6644aa,

  // Mitochondria colors
  mitochondriaOuter: 0xFF6347,
  mitochondriaInner: 0xCC4030,
  mitochondriaCristae: 0xFF8866,
  mitochondriaMatrix: 0x881100,

  // Golgi colors
  golgiCis: 0xE6B800,
  golgiMedial: 0xFFD700,
  golgiTrans: 0xDAA520,
  golgiVesicle: 0xFFD700,
  golgiTubule: 0xCCAA00,

  // ER colors
  rer: 0x40E0D0,
  rerRibosome: 0xcbd5e1,
  ser: 0x30c0b0,

  // Other organelles
  lysosome: 0x4ade80,
  lysosomeAcidic: 0x22c55e,
  centriole: 0xf472b6,
  centriolePCM: 0xe879f9,
  microtubule: 0x475569,
  vesicle: 0xfbbf24,
  antibody: 0xfbbf24,
  freeRibosome: 0xcbd5e1,

  // Macrophage-specific
  phagosome: 0x8b5cf6,
  bacterium: 0x22c55e,

  // Muscle-specific
  myosin: 0xec4899,
  actin: 0x22d3ee,
  zLine: 0xfbbf24,
  mLine: 0x94a3b8,
  sarcolemma: 0xf472b6
};

// ============================================
// MATERIAL FACTORIES
// ============================================

/**
 * Create a standard membrane material
 */
export function createMembraneMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.membrane,
    opacity = 0.1,
    transmission = 0.6,
    roughness = 0.2,
    metalness = 0.1,
    clearcoat = 0.8
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness,
    metalness,
    transmission,
    thickness: 2.0,
    clearcoat,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

/**
 * Create nucleus outer envelope material
 */
export function createNuclearEnvelopeMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.nucleus,
    opacity = 0.5,
    roughness = 0.4,
    metalness = 0.1
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    clearcoat: 0.3
  });
}

/**
 * Create nucleolus material with emissive glow
 */
export function createNucleolusMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.nucleolus,
    emissiveIntensity = 0.5
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    emissive: 0x331166,
    emissiveIntensity
  });
}

/**
 * Create chromatin material
 */
export function createChromatinMaterial(type = 'hetero', options = {}) {
  if (type === 'hetero') {
    return new THREE.MeshStandardMaterial({
      color: options.color || ORGANELLE_COLORS.heterochromatin,
      roughness: 0.7,
      emissive: 0x0a0515,
      emissiveIntensity: 0.1
    });
  } else {
    return new THREE.MeshStandardMaterial({
      color: options.color || ORGANELLE_COLORS.euchromatin,
      roughness: 0.5,
      emissive: 0x332255,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7
    });
  }
}

/**
 * Create mitochondria outer membrane material
 */
export function createMitochondriaMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.mitochondriaOuter,
    opacity = 0.9,
    emissive = 0x330000,
    emissiveIntensity = 0.3,
    glow = false
  } = options;

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity,
    emissive: glow ? color : emissive,
    emissiveIntensity: glow ? 0.5 : emissiveIntensity
  });

  return mat;
}

/**
 * Create mitochondria inner membrane/cristae material
 */
export function createCristaeMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.mitochondriaCristae,
    opacity = 0.7
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    emissive: 0x220000,
    emissiveIntensity: 0.2
  });
}

/**
 * Create Golgi cisterna material with gradient based on position
 */
export function createGolgiMaterial(position = 'medial', options = {}) {
  const colorMap = {
    cis: ORGANELLE_COLORS.golgiCis,
    medial: ORGANELLE_COLORS.golgiMedial,
    trans: ORGANELLE_COLORS.golgiTrans
  };

  const emissiveMap = {
    cis: 0x442200,
    medial: 0x553300,
    trans: 0x664400
  };

  const intensityMap = {
    cis: 0.15,
    medial: 0.2,
    trans: 0.25
  };

  const opacityMap = {
    cis: 0.85,
    medial: 0.9,
    trans: 0.85
  };

  return new THREE.MeshPhysicalMaterial({
    color: options.color || colorMap[position],
    roughness: position === 'trans' ? 0.3 : position === 'cis' ? 0.4 : 0.35,
    metalness: position === 'trans' ? 0.2 : position === 'cis' ? 0.1 : 0.15,
    emissive: emissiveMap[position],
    emissiveIntensity: intensityMap[position],
    transparent: true,
    opacity: options.opacity || opacityMap[position]
  });
}

/**
 * Create RER material
 */
export function createRERMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.rer,
    opacity = 0.6,
    emissiveIntensity = 0.2
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.05,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    emissive: 0x003333,
    emissiveIntensity
  });
}

/**
 * Create ribosome material
 */
export function createRibosomeMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.rerRibosome,
    emissiveIntensity = 0.1
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    emissive: 0x334455,
    emissiveIntensity
  });
}

/**
 * Create lysosome material
 */
export function createLysosomeMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.lysosome,
    opacity = 0.85,
    emissiveIntensity = 0.4
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity
  });
}

/**
 * Create centriole material
 */
export function createCentrioleMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.centriole,
    emissiveIntensity = 0.3
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.2,
    emissive: color,
    emissiveIntensity
  });
}

/**
 * Create vesicle/antibody material
 */
export function createVesicleMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.vesicle,
    opacity = 0.9,
    emissiveIntensity = 0.4
  } = options;

  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    transparent: true,
    opacity
  });
}

/**
 * Create phagosome material (macrophage specific)
 */
export function createPhagosomeMaterial(options = {}) {
  const {
    color = ORGANELLE_COLORS.phagosome,
    opacity = 0.7
  } = options;

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.4,
    transparent: true,
    opacity,
    emissive: color,
    emissiveIntensity: 0.3
  });
}

/**
 * Create muscle fiber material (myosin/actin)
 */
export function createMuscleFiberMaterial(type = 'myosin', options = {}) {
  const colors = {
    myosin: ORGANELLE_COLORS.myosin,
    actin: ORGANELLE_COLORS.actin,
    zLine: ORGANELLE_COLORS.zLine,
    mLine: ORGANELLE_COLORS.mLine
  };

  return new THREE.MeshPhysicalMaterial({
    color: options.color || colors[type],
    roughness: 0.4,
    metalness: 0.1,
    emissive: options.color || colors[type],
    emissiveIntensity: options.emissiveIntensity || 0.2
  });
}
