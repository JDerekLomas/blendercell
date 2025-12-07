import * as THREE from 'three';

// ============================================
// GEOMETRY UTILITIES
// ============================================

/**
 * Generate random position inside a sphere
 */
export function randomPointInSphere(radius, options = {}) {
  const { minRadius = 0, excludeCenter = false, centerExclusionRadius = 0 } = options;

  let r, theta, phi;
  do {
    r = minRadius + Math.random() * (radius - minRadius);
    theta = Math.random() * Math.PI * 2;
    phi = Math.acos(2 * Math.random() - 1);
  } while (excludeCenter && r < centerExclusionRadius);

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

/**
 * Generate random position inside an ellipsoid
 */
export function randomPointInEllipsoid(radiusX, radiusY, radiusZ, options = {}) {
  const { minRadius = 0, excludeRegions = [] } = options;

  let point;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const r = minRadius + Math.random() * (1 - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    point = new THREE.Vector3(
      r * radiusX * Math.sin(phi) * Math.cos(theta),
      r * radiusY * Math.sin(phi) * Math.sin(theta),
      r * radiusZ * Math.cos(phi)
    );

    // Check if point is in excluded regions
    let valid = true;
    for (const region of excludeRegions) {
      if (point.distanceTo(region.center) < region.radius) {
        valid = false;
        break;
      }
    }

    if (valid) return point;
    attempts++;
  } while (attempts < maxAttempts);

  return point; // Return last attempt if we couldn't find valid position
}

/**
 * Generate random position on sphere surface
 */
export function randomPointOnSphere(radius) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

/**
 * Clamp a point to stay inside an ellipsoid
 */
export function clampToEllipsoid(point, radiusX, radiusY, radiusZ, margin = 0) {
  const rx = radiusX - margin;
  const ry = radiusY - margin;
  const rz = radiusZ - margin;

  const normalized = (point.x * point.x) / (rx * rx) +
                     (point.y * point.y) / (ry * ry) +
                     (point.z * point.z) / (rz * rz);

  if (normalized > 1) {
    const scale = 1 / Math.sqrt(normalized);
    return new THREE.Vector3(
      point.x * scale,
      point.y * scale,
      point.z * scale
    );
  }
  return point.clone();
}

/**
 * Create a curved path between two points with optional waypoints
 */
export function createCurvedPath(start, end, options = {}) {
  const { numPoints = 5, curvature = 0.5, randomness = 0.2 } = options;
  const points = [start.clone()];

  for (let i = 1; i < numPoints - 1; i++) {
    const t = i / (numPoints - 1);
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    // Add curvature
    const perpendicular = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(end, start).normalize(),
        new THREE.Vector3(0, 1, 0)
      )
      .normalize();

    const curveAmount = Math.sin(t * Math.PI) * curvature;
    point.add(perpendicular.multiplyScalar(curveAmount));

    // Add randomness
    point.x += (Math.random() - 0.5) * randomness;
    point.y += (Math.random() - 0.5) * randomness;
    point.z += (Math.random() - 0.5) * randomness;

    points.push(point);
  }

  points.push(end.clone());
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Create tube geometry from a curve
 */
export function createTubeFromCurve(curve, options = {}) {
  const {
    radius = 0.05,
    tubularSegments = 20,
    radialSegments = 8,
    closed = false
  } = options;

  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
}

// ============================================
// ANIMATION UTILITIES
// ============================================

/**
 * Create pulsing animation parameters
 */
export function createPulseAnimation(baseValue, amplitude, speed) {
  return {
    base: baseValue,
    amplitude,
    speed,
    getValue: function(time) {
      return this.base + Math.sin(time * this.speed) * this.amplitude;
    }
  };
}

/**
 * Oscillate a value between min and max
 */
export function oscillate(time, min, max, speed = 1) {
  const range = (max - min) / 2;
  const center = min + range;
  return center + Math.sin(time * speed) * range;
}

/**
 * Smooth step function
 */
export function smoothStep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ============================================
// INSTANCING UTILITIES
// ============================================

/**
 * Create an instanced mesh with random positions
 */
export function createInstancedMesh(geometry, material, positions, options = {}) {
  const { rotations = null, scales = null } = options;
  const count = positions.length;

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    dummy.position.copy(positions[i]);

    if (rotations && rotations[i]) {
      dummy.rotation.set(rotations[i].x, rotations[i].y, rotations[i].z);
    } else {
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
    }

    if (scales && scales[i]) {
      dummy.scale.copy(scales[i]);
    } else {
      const s = 0.8 + Math.random() * 0.4;
      dummy.scale.set(s, s, s);
    }

    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}

/**
 * Generate distributed positions avoiding collisions
 */
export function generateDistributedPositions(count, bounds, options = {}) {
  const {
    minDistance = 0.5,
    maxAttempts = 100,
    existingPositions = []
  } = options;

  const positions = [...existingPositions];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let position;
    let valid;

    do {
      valid = true;

      if (bounds.type === 'sphere') {
        position = randomPointInSphere(bounds.radius, {
          minRadius: bounds.minRadius || 0
        });
      } else if (bounds.type === 'ellipsoid') {
        position = randomPointInEllipsoid(
          bounds.radiusX,
          bounds.radiusY,
          bounds.radiusZ
        );
      } else {
        // Box bounds
        position = new THREE.Vector3(
          (Math.random() - 0.5) * bounds.width,
          (Math.random() - 0.5) * bounds.height,
          (Math.random() - 0.5) * bounds.depth
        );
      }

      // Check minimum distance from existing positions
      for (const existing of positions) {
        if (position.distanceTo(existing) < minDistance) {
          valid = false;
          break;
        }
      }

      attempts++;
    } while (!valid && attempts < maxAttempts);

    positions.push(position);
  }

  return positions.slice(existingPositions.length);
}

// ============================================
// GROUP UTILITIES
// ============================================

/**
 * Add userData to all meshes in a group for click detection
 */
export function tagGroupMeshes(group, organelleName) {
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.organelle = organelleName;
    }
  });
}

/**
 * Get all meshes from a group
 */
export function getMeshesFromGroup(group) {
  const meshes = [];
  group.traverse((child) => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

/**
 * Scale a group to fit within bounds
 */
export function scaleGroupToBounds(group, maxSize) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (maxDimension > maxSize) {
    const scale = maxSize / maxDimension;
    group.scale.multiplyScalar(scale);
  }
}
