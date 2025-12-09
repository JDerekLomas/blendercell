import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createNucleus,
  createMitochondrion,
  createGolgi,
  createDetailedGolgi,
  createLysosome,
  createPlasmaRER,
  createDetailedER,
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
    description: 'The Golgi apparatus modifies, sorts, and packages proteins and lipids for transport. It receives vesicles from the ER (cis face), processes their contents through stacked cisternae, and releases vesicles from the trans face to their destinations.',
    facts: [
      'Named after Camillo Golgi who discovered it in 1898',
      'Consists of 4-8 curved, flattened membrane discs (cisternae)',
      'Processes about 1/3 of all proteins made by the cell'
    ],
    create: () => createDetailedGolgi({
      position: new THREE.Vector3(0, 0, 0),
      cisternaCount: 6,
      scale: 1.8,
      includeVesicles: true
    }),
    cameraDistance: 5
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
    description: 'The Rough Endoplasmic Reticulum consists of stacked, undulating membrane sheets studded with ribosomes. Proteins destined for secretion, membranes, or organelles are synthesized here. The "rough" appearance comes from the thousands of attached ribosomes.',
    facts: [
      'Ribosomes give it a "rough" appearance under electron microscope',
      'Connected directly to the nuclear envelope',
      'Makes ~1/3 of all cellular proteins'
    ],
    create: () => createDetailedER({
      position: new THREE.Vector3(0, 0, 0),
      sheetCount: 10,
      spreadRadius: 2.5,
      includeRibosomes: true,
      ribosomeCount: 350
    }),
    cameraDistance: 7
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
  microtubules: {
    name: 'Microtubules',
    subtitle: 'Transport Highways',
    color: '#64748b',
    description: 'Microtubules are hollow protein tubes (25nm diameter) that form the cell\'s internal transport network. Motor proteins (kinesin, dynein) walk along them carrying cargo. They also form the mitotic spindle during cell division and provide structural support.',
    facts: [
      'Made of tubulin protein dimers in a hollow cylinder',
      'Motor proteins can travel at 1-2 μm per second',
      'Dynamic - constantly growing and shrinking from ends'
    ],
    create: () => {
      const group = new THREE.Group();

      // Create a network of microtubules radiating from center (MTOC)
      const mtMaterial = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.7
      });

      // Central MTOC (microtubule organizing center)
      const mtocGeom = new THREE.SphereGeometry(0.3, 16, 16);
      const mtocMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: 0x475569,
        emissiveIntensity: 0.3
      });
      const mtoc = new THREE.Mesh(mtocGeom, mtocMat);
      group.add(mtoc);

      // Radiating microtubules
      for (let i = 0; i < 12; i++) {
        const theta = (i / 12) * Math.PI * 2;
        const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const length = 2.0 + Math.random() * 1.5;

        const direction = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        );

        // Create curved path for each microtubule
        const points = [new THREE.Vector3(0, 0, 0)];
        for (let p = 1; p <= 4; p++) {
          const t = p / 4;
          const pos = direction.clone().multiplyScalar(length * t);
          pos.x += (Math.random() - 0.5) * 0.3 * t;
          pos.y += (Math.random() - 0.5) * 0.3 * t;
          pos.z += (Math.random() - 0.5) * 0.3 * t;
          points.push(pos);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
        const tube = new THREE.Mesh(tubeGeom, mtMaterial);
        group.add(tube);

        // Add cargo vesicle on some microtubules - riding on the OUTSIDE surface
        if (i % 3 === 0) {
          const cargo = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshStandardMaterial({
              color: 0xfbbf24,
              emissive: 0xfbbf24,
              emissiveIntensity: 0.3
            })
          );
          const cargoT = 0.3 + Math.random() * 0.4;
          const cargoPos = curve.getPoint(cargoT);

          // Get the tangent and create a perpendicular offset (cargo rides on edge)
          const tangent = curve.getTangent(cargoT);
          // Create a perpendicular vector (up direction cross tangent)
          const up = new THREE.Vector3(0, 1, 0);
          const perpendicular = new THREE.Vector3().crossVectors(up, tangent).normalize();
          // If perpendicular is zero (tangent is vertical), use different axis
          if (perpendicular.length() < 0.1) {
            perpendicular.crossVectors(new THREE.Vector3(1, 0, 0), tangent).normalize();
          }

          // Offset cargo to the side of the microtubule (0.04 tube radius + 0.08 cargo radius + small gap)
          const offset = 0.13;
          cargo.position.copy(cargoPos).add(perpendicular.multiplyScalar(offset));

          cargo.userData.curve = curve;
          cargo.userData.t = cargoT;
          cargo.userData.speed = 0.08 + Math.random() * 0.06;
          cargo.userData.isCargo = true;
          cargo.userData.offset = offset; // Store offset for animation
          group.add(cargo);
        }
      }

      group.userData.hasCargo = true;
      return group;
    },
    cameraDistance: 5
  },
  membrane: {
    name: 'Cell Membrane',
    subtitle: 'Selective Barrier',
    color: '#a2c2e8',
    description: 'The plasma membrane is a phospholipid bilayer (~7nm thick) that surrounds and protects the cell. It controls what enters and exits through channels, pumps, and receptors. The fluid mosaic model describes proteins floating in the lipid sea.',
    facts: [
      'Composed of phospholipids, cholesterol, and proteins',
      'Membrane proteins make up 50% of membrane mass',
      'Completely replaces itself every month'
    ],
    create: () => {
      const group = new THREE.Group();

      // Outer membrane sphere (semi-transparent)
      const membraneGeom = new THREE.SphereGeometry(2, 64, 64);
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: 0xa2c2e8,
        transparent: true,
        opacity: 0.25,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.5,
        thickness: 0.5,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide
      });
      const membrane = new THREE.Mesh(membraneGeom, membraneMat);
      group.add(membrane);

      // Inner glow
      const innerGlowGeom = new THREE.SphereGeometry(1.95, 32, 32);
      const innerGlowMat = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
      });
      group.add(new THREE.Mesh(innerGlowGeom, innerGlowMat));

      // Membrane proteins (transmembrane)
      const proteinMat = new THREE.MeshPhysicalMaterial({
        color: 0x6366f1,
        roughness: 0.4,
        metalness: 0.1
      });

      for (let i = 0; i < 20; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;

        const x = 2 * Math.sin(phi) * Math.cos(theta);
        const y = 2 * Math.sin(phi) * Math.sin(theta);
        const z = 2 * Math.cos(phi);

        // Transmembrane protein (spans the membrane)
        const proteinGeom = new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
        const protein = new THREE.Mesh(proteinGeom, proteinMat);
        protein.position.set(x, y, z);
        protein.lookAt(0, 0, 0);
        protein.rotateX(Math.PI / 2);
        group.add(protein);
      }

      // Receptor proteins (on surface)
      const receptorMat = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        roughness: 0.3
      });

      for (let i = 0; i < 15; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;

        const x = 2.1 * Math.sin(phi) * Math.cos(theta);
        const y = 2.1 * Math.sin(phi) * Math.sin(theta);
        const z = 2.1 * Math.cos(phi);

        const receptor = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 8),
          receptorMat
        );
        receptor.position.set(x, y, z);
        group.add(receptor);
      }

      // Phospholipid bilayer representation (small dots showing structure)
      const lipidPositions = [];
      for (let i = 0; i < 500; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 2 + (Math.random() - 0.5) * 0.05;
        lipidPositions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }

      const lipidGeom = new THREE.BufferGeometry();
      lipidGeom.setAttribute('position', new THREE.Float32BufferAttribute(lipidPositions, 3));
      const lipidMat = new THREE.PointsMaterial({
        size: 0.03,
        color: 0xfcd34d,
        transparent: true,
        opacity: 0.5
      });
      group.add(new THREE.Points(lipidGeom, lipidMat));

      return group;
    },
    cameraDistance: 5
  },
  antibody: {
    name: 'Antibodies',
    subtitle: 'Immune Proteins',
    color: '#fbbf24',
    description: 'Antibodies (immunoglobulins) are Y-shaped proteins produced exclusively by plasma cells (differentiated B cells). Each antibody recognizes one specific antigen. The arms (Fab regions) bind antigens while the stem (Fc region) signals other immune cells. Not an organelle, but the main product of plasma cells!',
    facts: [
      'Made only by plasma cells (a specialized B cell)',
      'The human body can make 10 billion different antibodies',
      'IgG antibodies are ~150 kDa (~10 nm tall)'
    ],
    create: () => {
      const group = new THREE.Group();

      // Create Y-shaped antibody geometry
      function createAntibody(scale = 1) {
        const antibodyGroup = new THREE.Group();

        const antibodyMat = new THREE.MeshPhysicalMaterial({
          color: 0xfbbf24,
          roughness: 0.3,
          metalness: 0.2,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.2,
          clearcoat: 0.3
        });

        // Stem (Fc region)
        const stemGeom = new THREE.CapsuleGeometry(0.08 * scale, 0.4 * scale, 4, 8);
        const stem = new THREE.Mesh(stemGeom, antibodyMat);
        stem.position.y = -0.15 * scale;
        antibodyGroup.add(stem);

        // Hinge region
        const hingeGeom = new THREE.SphereGeometry(0.1 * scale, 8, 8);
        const hinge = new THREE.Mesh(hingeGeom, antibodyMat);
        hinge.position.y = 0.1 * scale;
        antibodyGroup.add(hinge);

        // Left arm (Fab region)
        const leftArmGeom = new THREE.CapsuleGeometry(0.07 * scale, 0.35 * scale, 4, 8);
        const leftArm = new THREE.Mesh(leftArmGeom, antibodyMat);
        leftArm.position.set(-0.2 * scale, 0.25 * scale, 0);
        leftArm.rotation.z = Math.PI / 4;
        antibodyGroup.add(leftArm);

        // Right arm (Fab region)
        const rightArm = leftArm.clone();
        rightArm.position.set(0.2 * scale, 0.25 * scale, 0);
        rightArm.rotation.z = -Math.PI / 4;
        antibodyGroup.add(rightArm);

        // Binding sites (tips of arms) - different color
        const bindingSiteMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.3
        });

        const leftTip = new THREE.Mesh(
          new THREE.SphereGeometry(0.06 * scale, 8, 8),
          bindingSiteMat
        );
        leftTip.position.set(-0.35 * scale, 0.4 * scale, 0);
        antibodyGroup.add(leftTip);

        const rightTip = leftTip.clone();
        rightTip.position.set(0.35 * scale, 0.4 * scale, 0);
        antibodyGroup.add(rightTip);

        return antibodyGroup;
      }

      // Create a swarm of antibodies
      for (let i = 0; i < 15; i++) {
        const antibody = createAntibody(1.5);

        // Distribute in a loose cloud
        const r = 0.5 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        antibody.position.set(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );

        antibody.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        antibody.userData.phase = Math.random() * Math.PI * 2;
        antibody.userData.isAntibody = true;
        group.add(antibody);
      }

      group.userData.hasAntibodies = true;
      return group;
    },
    cameraDistance: 5
  },
  ribosome: {
    name: 'Ribosomes',
    subtitle: 'Protein Builders',
    color: '#06b6d4',
    description: 'Ribosomes read mRNA and assemble amino acids into proteins. The mRNA strand threads between the large (60S) and small (40S) subunits, where translation occurs. Watch the mRNA move through the ribosome!',
    facts: [
      'Can add 15-20 amino acids per second',
      'Made of ~65% RNA and 35% protein',
      'A cell can have millions of ribosomes'
    ],
    create: () => {
      const group = new THREE.Group();
      group.userData.isAnimatedRibosome = true;
      group.userData.ribosomeData = [];

      // Create a polysome (multiple ribosomes on one mRNA)
      const mRNACurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.5, 0, 0),
        new THREE.Vector3(-1.5, 0.2, 0.15),
        new THREE.Vector3(-0.5, -0.15, -0.1),
        new THREE.Vector3(0.5, 0.15, 0.2),
        new THREE.Vector3(1.5, -0.1, -0.05),
        new THREE.Vector3(2.5, 0, 0)
      ]);

      // Main mRNA strand (static background)
      const mRNAGeom = new THREE.TubeGeometry(mRNACurve, 60, 0.025, 8, false);
      const mRNAMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.5
      });
      const mRNA = new THREE.Mesh(mRNAGeom, mRNAMat);
      group.add(mRNA);

      // Animated mRNA segment (the part that moves through ribosomes)
      const animatedMRNAGeom = new THREE.TubeGeometry(mRNACurve, 60, 0.035, 8, false);
      const animatedMRNAMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24, // Gold/yellow for active mRNA
        transparent: true,
        opacity: 0.9
      });
      const animatedMRNA = new THREE.Mesh(animatedMRNAGeom, animatedMRNAMat);
      animatedMRNA.userData.isAnimatedMRNA = true;
      group.add(animatedMRNA);

      // Store curve for animation
      group.userData.mRNACurve = mRNACurve;
      group.userData.animatedMRNA = animatedMRNA;

      // Create 5 ribosomes along the mRNA with animated internals
      // mRNA threads BETWEEN the two subunits (at the interface)
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5;
        const pos = mRNACurve.getPoint(t);
        const tangent = mRNACurve.getTangent(t);

        const riboGroup = new THREE.Group();
        riboGroup.userData.curveT = t;
        riboGroup.userData.riboIndex = i;

        // The mRNA passes at y=0 (the curve position)
        // We position subunits above and below the mRNA interface

        // Large subunit (60S) - ABOVE the mRNA interface
        const largeGeom = new THREE.SphereGeometry(0.3, 16, 16);
        const largeMat = new THREE.MeshPhysicalMaterial({
          color: 0x06b6d4,
          roughness: 0.35,
          metalness: 0.1,
          clearcoat: 0.2
        });
        const large = new THREE.Mesh(largeGeom, largeMat);
        large.position.y = 0.2; // Above the mRNA
        large.scale.set(1.3, 0.9, 1.1);
        riboGroup.add(large);

        // Small subunit (40S) - BELOW the mRNA interface
        const smallGeom = new THREE.SphereGeometry(0.22, 16, 16);
        const smallMat = new THREE.MeshPhysicalMaterial({
          color: 0x22d3ee,
          roughness: 0.35,
          metalness: 0.1,
          clearcoat: 0.2
        });
        const small = new THREE.Mesh(smallGeom, smallMat);
        small.position.y = -0.18; // Below the mRNA
        small.scale.set(1.1, 0.7, 1);
        riboGroup.add(small);

        // Channel/interface where mRNA threads through (at y=0)
        const channelGeom = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
        const channelMat = new THREE.MeshBasicMaterial({
          color: 0x0e7490,
          transparent: true,
          opacity: 0.5
        });
        const channel = new THREE.Mesh(channelGeom, channelMat);
        channel.rotation.x = Math.PI / 2;
        channel.position.y = 0; // At the mRNA level
        riboGroup.add(channel);

        // Nascent protein chain (coming out of large subunit - top)
        if (i > 0) {
          const proteinPoints = [];
          for (let p = 0; p < 6 + i * 2; p++) { // Longer chains for ribosomes further along
            proteinPoints.push(new THREE.Vector3(
              (Math.random() - 0.5) * 0.1,
              0.35 + p * 0.06,
              (Math.random() - 0.5) * 0.1
            ));
          }
          const proteinCurve = new THREE.CatmullRomCurve3(proteinPoints);
          const proteinGeom = new THREE.TubeGeometry(proteinCurve, 16, 0.02, 6, false);
          const proteinMat = new THREE.MeshBasicMaterial({
            color: 0xf472b6,
            transparent: true,
            opacity: 0.8
          });
          const protein = new THREE.Mesh(proteinGeom, proteinMat);
          protein.userData.isProteinChain = true;
          riboGroup.add(protein);
        }

        // Position ribosome so the interface (y=0 in local) is at the mRNA position
        riboGroup.position.copy(pos);

        // Align to mRNA direction
        riboGroup.lookAt(pos.clone().add(tangent));
        riboGroup.rotation.x = 0;
        riboGroup.rotation.z = 0;

        group.userData.ribosomeData.push({
          group: riboGroup,
          baseT: t,
          large: large,
          small: small
        });
        group.add(riboGroup);
      }

      // Codon markers on mRNA (the reading positions)
      for (let c = 0; c < 20; c++) {
        const t = c / 20;
        const pos = mRNACurve.getPoint(t);
        const codon = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 6, 6),
          new THREE.MeshBasicMaterial({
            color: c % 3 === 0 ? 0xef4444 : c % 3 === 1 ? 0x22c55e : 0x3b82f6,
            transparent: true,
            opacity: 0.7
          })
        );
        codon.position.copy(pos);
        codon.userData.codonT = t;
        group.add(codon);
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

    // Animate vesicles if showing (Golgi)
    currentOrganelle.traverse((child) => {
      if (child.userData && child.userData.isVesicle) {
        const phase = child.userData.phase;
        if (child.userData.type === 'departing') {
          // Vesicles budding off float upward and outward
          child.position.y = child.userData.baseY + Math.sin(time * 1.5 + phase) * 0.1;
          child.position.x += Math.sin(time * 2 + phase) * 0.0003;
        } else {
          // Arriving vesicles wobble slightly
          child.position.y += Math.sin(time * 2 + phase) * 0.0005;
        }
      }

      // Animate cargo on microtubules - riding on the edge, not through center
      if (child.userData && child.userData.isCargo && child.userData.curve) {
        child.userData.t += child.userData.speed * 0.01;
        if (child.userData.t > 0.95) child.userData.t = 0.1;

        const curve = child.userData.curve;
        const t = child.userData.t;
        const offset = child.userData.offset || 0.13;

        // Get position and tangent on curve
        const curvePos = curve.getPoint(t);
        const tangent = curve.getTangent(t);

        // Create perpendicular offset (cargo rides on outside of microtubule)
        const up = new THREE.Vector3(0, 1, 0);
        const perpendicular = new THREE.Vector3().crossVectors(up, tangent).normalize();
        if (perpendicular.length() < 0.1) {
          perpendicular.crossVectors(new THREE.Vector3(1, 0, 0), tangent).normalize();
        }

        // Position cargo offset from the microtubule center
        child.position.copy(curvePos).add(perpendicular.multiplyScalar(offset));
      }

      // Animate antibodies (gentle floating/tumbling)
      if (child.userData && child.userData.isAntibody) {
        const phase = child.userData.phase;
        child.rotation.x += 0.002;
        child.rotation.y += 0.003;
        child.position.y += Math.sin(time * 0.5 + phase) * 0.001;
      }
    });

    // Animate ribosome with mRNA movement
    if (currentOrganelle.userData && currentOrganelle.userData.isAnimatedRibosome) {
      const ribosomeData = currentOrganelle.userData.ribosomeData;

      // Animate each ribosome's subunits (slight pulsing as if working)
      ribosomeData.forEach((ribo, idx) => {
        const pulse = 1 + Math.sin(time * 3 + idx * 0.5) * 0.05;
        ribo.large.scale.y = 0.9 * pulse;
        ribo.small.scale.y = 0.7 * pulse;

        // Subtle gap change between subunits (breathing) - mRNA passes at y=0
        const gap = Math.sin(time * 2 + idx * 0.3) * 0.015;
        ribo.large.position.y = 0.2 + gap;   // Above mRNA
        ribo.small.position.y = -0.18 - gap; // Below mRNA
      });

      // Animate mRNA flowing through (color wave effect)
      const animatedMRNA = currentOrganelle.userData.animatedMRNA;
      if (animatedMRNA && animatedMRNA.material) {
        // Shift the hue slightly to show movement
        const hue = (time * 0.1) % 1;
        animatedMRNA.material.color.setHSL(0.12 + Math.sin(time) * 0.02, 0.8, 0.5);
      }

      // Animate codon markers (move along mRNA to show translation)
      currentOrganelle.traverse((child) => {
        if (child.userData && child.userData.codonT !== undefined) {
          const curve = currentOrganelle.userData.mRNACurve;
          if (curve) {
            // Codons shift position slightly to show mRNA movement
            const shiftedT = (child.userData.codonT + time * 0.02) % 1;
            const newPos = curve.getPoint(shiftedT);
            child.position.copy(newPos);
          }
        }

        // Animate protein chains (wiggling)
        if (child.userData && child.userData.isProteinChain) {
          child.rotation.x = Math.sin(time * 2) * 0.1;
          child.rotation.z = Math.cos(time * 1.5) * 0.1;
        }
      });
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// START
// ============================================

init();
