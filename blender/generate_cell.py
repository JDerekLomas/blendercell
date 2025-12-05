"""
Animal Cell Generator for Blender
Run this script in Blender to generate a complete animal cell model.

Usage:
1. Open Blender
2. Go to Scripting workspace
3. Open this file or paste contents
4. Click "Run Script"
5. Export via File > Export > glTF 2.0 (.glb)
"""

import bpy
import bmesh
import math
import random
from mathutils import Vector, Matrix

# ============================================
# CLEANUP & SETUP
# ============================================

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

clear_scene()

# ============================================
# HELPER FUNCTIONS
# ============================================

def create_material(name, color, alpha=1.0, roughness=0.5, emission=None, emission_strength=0.0):
    """Create a PBR material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear default nodes
    nodes.clear()

    # Create nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    principled = nodes.new('ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)
    principled.inputs['Base Color'].default_value = (*color, 1.0)
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Alpha'].default_value = alpha

    if emission and emission_strength > 0:
        principled.inputs['Emission Color'].default_value = (*emission, 1.0)
        principled.inputs['Emission Strength'].default_value = emission_strength

    links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    # Enable transparency if needed
    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        mat.shadow_method = 'HASHED'
        mat.use_backface_culling = False

    return mat

def random_point_in_sphere(radius):
    """Generate random point inside a sphere"""
    u = random.random()
    v = random.random()
    theta = 2 * math.pi * u
    phi = math.acos(2 * v - 1)
    r = radius * (random.random() ** (1/3))

    x = r * math.sin(phi) * math.cos(theta)
    y = r * math.sin(phi) * math.sin(theta)
    z = r * math.cos(phi)

    return Vector((x, y, z))

def random_point_on_sphere(radius):
    """Generate random point on sphere surface"""
    u = random.random()
    v = random.random()
    theta = 2 * math.pi * u
    phi = math.acos(2 * v - 1)

    x = radius * math.sin(phi) * math.cos(theta)
    y = radius * math.sin(phi) * math.sin(theta)
    z = radius * math.cos(phi)

    return Vector((x, y, z))

# ============================================
# MATERIALS
# ============================================

mat_membrane = create_material("Membrane", (0.5, 0.8, 0.6), alpha=0.15, roughness=0.1)
mat_nucleus_envelope = create_material("NuclearEnvelope", (0.4, 0.3, 0.7), alpha=0.5, roughness=0.2)
mat_nucleoplasm = create_material("Nucleoplasm", (0.5, 0.4, 0.8), alpha=0.7, roughness=0.4,
                                   emission=(0.2, 0.1, 0.3), emission_strength=0.3)
mat_nucleolus = create_material("Nucleolus", (0.3, 0.2, 0.5), alpha=1.0, roughness=0.6,
                                 emission=(0.1, 0.05, 0.15), emission_strength=0.5)
mat_chromatin = create_material("Chromatin", (0.6, 0.5, 0.9), alpha=0.9, roughness=0.5,
                                 emission=(0.2, 0.15, 0.3), emission_strength=0.2)
mat_rough_er = create_material("RoughER", (0.2, 0.6, 0.8), alpha=0.6, roughness=0.3)
mat_smooth_er = create_material("SmoothER", (0.3, 0.7, 0.85), alpha=0.5, roughness=0.25)
mat_ribosome = create_material("Ribosome", (0.15, 0.4, 0.6), alpha=1.0, roughness=0.6)
mat_mitochondria_outer = create_material("MitoOuter", (0.9, 0.4, 0.35), alpha=0.75, roughness=0.3)
mat_mitochondria_inner = create_material("MitoInner", (0.95, 0.5, 0.4), alpha=0.9, roughness=0.5,
                                          emission=(0.3, 0.1, 0.05), emission_strength=0.3)
mat_golgi = create_material("Golgi", (0.95, 0.8, 0.3), alpha=0.65, roughness=0.3)
mat_vesicle = create_material("Vesicle", (0.95, 0.85, 0.4), alpha=0.7, roughness=0.2)
mat_lysosome = create_material("Lysosome", (0.5, 0.85, 0.3), alpha=0.75, roughness=0.4,
                                emission=(0.15, 0.25, 0.1), emission_strength=0.2)
mat_centriole = create_material("Centriole", (0.85, 0.85, 0.95), alpha=1.0, roughness=0.3)
mat_cytoskeleton = create_material("Cytoskeleton", (0.5, 0.5, 0.6), alpha=0.2, roughness=0.5)

# ============================================
# CELL MEMBRANE
# ============================================

def create_membrane():
    """Create the outer cell membrane"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=3, segments=64, ring_count=32)
    membrane = bpy.context.active_object
    membrane.name = "CellMembrane"
    membrane.data.materials.append(mat_membrane)

    # Add slight organic deformation
    bpy.ops.object.modifier_add(type='DISPLACE')
    membrane.modifiers["Displace"].strength = 0.05

    # Create texture for displacement
    tex = bpy.data.textures.new("MembraneDisplace", type='CLOUDS')
    tex.noise_scale = 0.5
    membrane.modifiers["Displace"].texture = tex

    # Smooth shading
    bpy.ops.object.shade_smooth()

    return membrane

membrane = create_membrane()

# ============================================
# NUCLEUS
# ============================================

def create_nucleus():
    """Create nucleus with envelope, nucleoplasm, nucleolus, and chromatin"""
    nucleus_collection = bpy.data.collections.new("Nucleus")
    bpy.context.scene.collection.children.link(nucleus_collection)

    # Nuclear envelope (outer)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.1, segments=48, ring_count=24, location=(0, 0, 0.2))
    envelope = bpy.context.active_object
    envelope.name = "NuclearEnvelope"
    envelope.data.materials.append(mat_nucleus_envelope)
    bpy.ops.object.shade_smooth()
    nucleus_collection.objects.link(envelope)
    bpy.context.scene.collection.objects.unlink(envelope)

    # Nucleoplasm (inner)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, segments=48, ring_count=24, location=(0, 0, 0.2))
    nucleoplasm = bpy.context.active_object
    nucleoplasm.name = "Nucleoplasm"
    nucleoplasm.data.materials.append(mat_nucleoplasm)
    bpy.ops.object.shade_smooth()
    nucleus_collection.objects.link(nucleoplasm)
    bpy.context.scene.collection.objects.unlink(nucleoplasm)

    # Nucleolus
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, segments=24, ring_count=12, location=(0.25, 0.15, 0.35))
    nucleolus = bpy.context.active_object
    nucleolus.name = "Nucleolus"
    nucleolus.data.materials.append(mat_nucleolus)
    bpy.ops.object.shade_smooth()
    nucleus_collection.objects.link(nucleolus)
    bpy.context.scene.collection.objects.unlink(nucleolus)

    # Chromatin strands
    for i in range(10):
        # Create curve for chromatin
        curve_data = bpy.data.curves.new(f'ChromatinCurve{i}', type='CURVE')
        curve_data.dimensions = '3D'
        curve_data.bevel_depth = 0.025
        curve_data.bevel_resolution = 4

        spline = curve_data.splines.new('BEZIER')
        spline.bezier_points.add(3)  # 4 points total

        # Random points inside nucleus
        points = [random_point_in_sphere(0.7) + Vector((0, 0, 0.2)) for _ in range(4)]

        for j, point in enumerate(points):
            bp = spline.bezier_points[j]
            bp.co = point
            bp.handle_left_type = 'AUTO'
            bp.handle_right_type = 'AUTO'

        curve_obj = bpy.data.objects.new(f'Chromatin{i}', curve_data)
        curve_obj.data.materials.append(mat_chromatin)
        nucleus_collection.objects.link(curve_obj)

    return nucleus_collection

nucleus = create_nucleus()

# ============================================
# ROUGH ENDOPLASMIC RETICULUM
# ============================================

def create_er_cisterna(width, height, location, rotation):
    """Create a single curved ER cisterna sheet"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=location)
    cisterna = bpy.context.active_object
    cisterna.scale = (width, height, 1)
    cisterna.rotation_euler = rotation

    # Enter edit mode to deform
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=12)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Deform vertices for organic shape
    mesh = cisterna.data
    for vert in mesh.vertices:
        # Get local coordinates
        x, y, z = vert.co

        # Add curvature
        curve = 0.15 * (1 - (x * 2) ** 2)

        # Add waviness
        wave = math.sin(x * 8) * 0.03 + math.sin(y * 6) * 0.02

        # Roll edges
        edge_dist = max(abs(x * 2), abs(y * 2))
        if edge_dist > 0.7:
            roll = ((edge_dist - 0.7) / 0.3) ** 2 * 0.06
        else:
            roll = 0

        vert.co.z = curve + wave + roll

    # Add solidify for thickness
    bpy.ops.object.modifier_add(type='SOLIDIFY')
    cisterna.modifiers["Solidify"].thickness = 0.02
    cisterna.modifiers["Solidify"].offset = 0

    cisterna.data.materials.append(mat_rough_er)
    bpy.ops.object.shade_smooth()

    return cisterna

def create_rough_er():
    """Create stacked rough ER cisternae with ribosomes"""
    er_collection = bpy.data.collections.new("RoughER")
    bpy.context.scene.collection.children.link(er_collection)

    # Stack 1 - near nucleus
    stack1_base = Vector((1.4, 0.1, 0.3))
    for i in range(5):
        loc = stack1_base + Vector((0.06 * i, i * 0.1 - 0.2, 0))
        rot = (0.1, -0.3, (random.random() - 0.5) * 0.1)
        cisterna = create_er_cisterna(0.5, 0.3, loc, rot)
        cisterna.name = f"RER_Stack1_Cisterna{i}"
        er_collection.objects.link(cisterna)
        bpy.context.scene.collection.objects.unlink(cisterna)

        # Add ribosomes
        for r in range(20):
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=0.018,
                segments=8,
                ring_count=4,
                location=(
                    loc.x + random.uniform(-0.4, 0.4),
                    loc.y + random.uniform(-0.25, 0.25),
                    loc.z + 0.025 * random.choice([-1, 1])
                )
            )
            ribo = bpy.context.active_object
            ribo.name = f"Ribosome_S1C{i}_{r}"
            ribo.data.materials.append(mat_ribosome)
            er_collection.objects.link(ribo)
            bpy.context.scene.collection.objects.unlink(ribo)

    # Stack 2 - other side
    stack2_base = Vector((-0.8, -0.2, 1.3))
    for i in range(4):
        loc = stack2_base + Vector((0.05 * i, i * 0.1 - 0.15, 0))
        rot = (0.1, 1.9, (random.random() - 0.5) * 0.1)
        cisterna = create_er_cisterna(0.45, 0.28, loc, rot)
        cisterna.name = f"RER_Stack2_Cisterna{i}"
        er_collection.objects.link(cisterna)
        bpy.context.scene.collection.objects.unlink(cisterna)

        # Ribosomes
        for r in range(15):
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=0.018,
                segments=8,
                ring_count=4,
                location=(
                    loc.x + random.uniform(-0.35, 0.35),
                    loc.y + random.uniform(-0.22, 0.22),
                    loc.z + 0.025 * random.choice([-1, 1])
                )
            )
            ribo = bpy.context.active_object
            ribo.name = f"Ribosome_S2C{i}_{r}"
            ribo.data.materials.append(mat_ribosome)
            er_collection.objects.link(ribo)
            bpy.context.scene.collection.objects.unlink(ribo)

    # Stack 3
    stack3_base = Vector((0.5, 0.4, -1.4))
    for i in range(3):
        loc = stack3_base + Vector((0.05 * i, i * 0.09 - 0.1, 0))
        rot = (0.1, 3.8, (random.random() - 0.5) * 0.1)
        cisterna = create_er_cisterna(0.4, 0.25, loc, rot)
        cisterna.name = f"RER_Stack3_Cisterna{i}"
        er_collection.objects.link(cisterna)
        bpy.context.scene.collection.objects.unlink(cisterna)

        # Ribosomes
        for r in range(12):
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=0.018,
                segments=8,
                ring_count=4,
                location=(
                    loc.x + random.uniform(-0.3, 0.3),
                    loc.y + random.uniform(-0.2, 0.2),
                    loc.z + 0.025 * random.choice([-1, 1])
                )
            )
            ribo = bpy.context.active_object
            ribo.name = f"Ribosome_S3C{i}_{r}"
            ribo.data.materials.append(mat_ribosome)
            er_collection.objects.link(ribo)
            bpy.context.scene.collection.objects.unlink(ribo)

    return er_collection

rough_er = create_rough_er()

# ============================================
# SMOOTH ENDOPLASMIC RETICULUM
# ============================================

def create_smooth_er():
    """Create tubular network of smooth ER"""
    ser_collection = bpy.data.collections.new("SmoothER")
    bpy.context.scene.collection.children.link(ser_collection)

    # Generate network nodes
    nodes = []
    for i in range(25):
        theta = random.random() * 2 * math.pi
        phi = random.random() * math.pi
        r = 1.9 + random.random() * 0.5

        pos = Vector((
            r * math.sin(phi) * math.cos(theta),
            (random.random() - 0.5) * 1.4,
            r * math.sin(phi) * math.sin(theta)
        ))
        nodes.append(pos)

    # Connect nodes with tubes
    connected = set()

    for i, node in enumerate(nodes):
        # Find 2-3 nearest neighbors
        distances = [(j, (node - nodes[j]).length) for j in range(len(nodes)) if j != i]
        distances.sort(key=lambda x: x[1])

        for j, dist in distances[:3]:
            if dist < 1.2:
                key = (min(i, j), max(i, j))
                if key not in connected:
                    connected.add(key)

                    # Create tube between nodes
                    start = nodes[i]
                    end = nodes[j]
                    mid = (start + end) / 2
                    mid += Vector((
                        random.uniform(-0.15, 0.15),
                        random.uniform(-0.1, 0.1),
                        random.uniform(-0.15, 0.15)
                    ))

                    # Create curve
                    curve_data = bpy.data.curves.new(f'SERTube_{i}_{j}', type='CURVE')
                    curve_data.dimensions = '3D'
                    curve_data.bevel_depth = 0.03
                    curve_data.bevel_resolution = 6

                    spline = curve_data.splines.new('BEZIER')
                    spline.bezier_points.add(1)  # 2 points + midpoint

                    spline.bezier_points[0].co = start
                    spline.bezier_points[0].handle_left_type = 'AUTO'
                    spline.bezier_points[0].handle_right_type = 'AUTO'

                    spline.bezier_points[1].co = end
                    spline.bezier_points[1].handle_left_type = 'AUTO'
                    spline.bezier_points[1].handle_right_type = 'AUTO'

                    curve_obj = bpy.data.objects.new(f'SERTube_{i}_{j}', curve_data)
                    curve_obj.data.materials.append(mat_smooth_er)
                    ser_collection.objects.link(curve_obj)

    # Add junction spheres
    for i, node in enumerate(nodes):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=12, ring_count=6, location=node)
        junction = bpy.context.active_object
        junction.name = f"SERJunction_{i}"
        junction.data.materials.append(mat_smooth_er)
        bpy.ops.object.shade_smooth()
        ser_collection.objects.link(junction)
        bpy.context.scene.collection.objects.unlink(junction)

    return ser_collection

smooth_er = create_smooth_er()

# ============================================
# MITOCHONDRIA
# ============================================

def create_mitochondrion(location, rotation):
    """Create a single mitochondrion with cristae"""
    mito_collection = bpy.data.collections.new("Mitochondrion")

    length = random.uniform(0.35, 0.55)
    radius = random.uniform(0.1, 0.15)

    # Outer membrane - capsule shape
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=location)
    outer = bpy.context.active_object
    outer.rotation_euler = rotation

    # Add hemisphere caps
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=2)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Round the ends with proportional editing
    bpy.ops.object.modifier_add(type='SUBSURF')
    outer.modifiers["Subdivision"].levels = 2

    outer.name = "MitoOuter"
    outer.data.materials.append(mat_mitochondria_outer)
    bpy.ops.object.shade_smooth()

    # Cristae (inner membrane folds)
    for i in range(4):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=radius * 0.6,
            minor_radius=0.015,
            major_segments=16,
            minor_segments=8,
            location=location
        )
        crista = bpy.context.active_object
        crista.rotation_euler = rotation
        crista.rotation_euler.x += math.pi / 2

        # Position along length
        offset = (i - 1.5) * (length / 4.5)
        crista.location += Vector((0, 0, offset)).rotate(outer.rotation_euler.to_matrix())

        crista.name = f"Crista_{i}"
        crista.data.materials.append(mat_mitochondria_inner)
        bpy.ops.object.shade_smooth()

    return outer

def create_mitochondria():
    """Create multiple mitochondria distributed in the cell"""
    mito_collection = bpy.data.collections.new("Mitochondria")
    bpy.context.scene.collection.children.link(mito_collection)

    for i in range(12):
        pos = random_point_in_sphere(2.2)
        if pos.length < 1.4:
            pos = pos.normalized() * 1.7

        rot = (random.random() * math.pi, random.random() * math.pi, random.random() * math.pi)
        mito = create_mitochondrion(pos, rot)
        mito.name = f"Mitochondrion_{i}"
        mito_collection.objects.link(mito)
        bpy.context.scene.collection.objects.unlink(mito)

    return mito_collection

mitochondria = create_mitochondria()

# ============================================
# GOLGI APPARATUS
# ============================================

def create_golgi():
    """Create Golgi apparatus with stacked cisternae and vesicles"""
    golgi_collection = bpy.data.collections.new("GolgiApparatus")
    bpy.context.scene.collection.children.link(golgi_collection)

    base_pos = Vector((-1.8, 0.3, 1.0))

    # Stacked cisternae
    for i in range(5):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.28,
            minor_radius=0.05,
            major_segments=24,
            minor_segments=8,
            location=base_pos + Vector((i * 0.04, i * 0.1, 0))
        )
        cisterna = bpy.context.active_object
        cisterna.scale.z = 0.35
        cisterna.rotation_euler = (0, 0, math.pi / 4)
        cisterna.name = f"GolgiCisterna_{i}"
        cisterna.data.materials.append(mat_golgi)
        bpy.ops.object.shade_smooth()
        golgi_collection.objects.link(cisterna)
        bpy.context.scene.collection.objects.unlink(cisterna)

    # Vesicles budding off
    for i in range(8):
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=0.04 + random.random() * 0.025,
            segments=12,
            ring_count=6,
            location=base_pos + Vector((
                0.3 + random.uniform(0, 0.2),
                random.uniform(-0.15, 0.35),
                random.uniform(-0.2, 0.2)
            ))
        )
        vesicle = bpy.context.active_object
        vesicle.name = f"GolgiVesicle_{i}"
        vesicle.data.materials.append(mat_vesicle)
        bpy.ops.object.shade_smooth()
        golgi_collection.objects.link(vesicle)
        bpy.context.scene.collection.objects.unlink(vesicle)

    return golgi_collection

golgi = create_golgi()

# ============================================
# LYSOSOMES
# ============================================

def create_lysosomes():
    """Create scattered lysosomes"""
    lyso_collection = bpy.data.collections.new("Lysosomes")
    bpy.context.scene.collection.children.link(lyso_collection)

    for i in range(10):
        pos = random_point_in_sphere(2.3)
        if pos.length < 1.4:
            pos = pos.normalized() * 1.7

        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=random.uniform(0.07, 0.12),
            segments=16,
            ring_count=8,
            location=pos
        )
        lysosome = bpy.context.active_object
        lysosome.name = f"Lysosome_{i}"
        lysosome.data.materials.append(mat_lysosome)
        bpy.ops.object.shade_smooth()
        lyso_collection.objects.link(lysosome)
        bpy.context.scene.collection.objects.unlink(lysosome)

    return lyso_collection

lysosomes = create_lysosomes()

# ============================================
# CENTROSOME (CENTRIOLES)
# ============================================

def create_centrosome():
    """Create pair of centrioles"""
    centro_collection = bpy.data.collections.new("Centrosome")
    bpy.context.scene.collection.children.link(centro_collection)

    base_pos = Vector((1.5, -0.5, -1.2))

    for c in range(2):
        centriole_pos = base_pos + Vector((0, c * 0.18, 0))

        # 9 triplet microtubules
        for i in range(9):
            angle = (i / 9) * 2 * math.pi
            for t in range(3):
                r = 0.07 + t * 0.015
                offset_angle = angle + t * 0.08

                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.012,
                    depth=0.2,
                    location=centriole_pos + Vector((
                        math.cos(offset_angle) * r,
                        0 if c == 0 else 0,
                        math.sin(offset_angle) * r
                    ))
                )
                tube = bpy.context.active_object
                if c == 1:
                    tube.rotation_euler.x = math.pi / 2
                tube.name = f"Centriole{c}_Triplet{i}_{t}"
                tube.data.materials.append(mat_centriole)
                centro_collection.objects.link(tube)
                bpy.context.scene.collection.objects.unlink(tube)

    return centro_collection

centrosome = create_centrosome()

# ============================================
# FREE RIBOSOMES
# ============================================

def create_free_ribosomes():
    """Create scattered ribosomes in cytoplasm"""
    ribo_collection = bpy.data.collections.new("FreeRibosomes")
    bpy.context.scene.collection.children.link(ribo_collection)

    for i in range(60):
        pos = random_point_in_sphere(2.5)
        if pos.length < 1.3:
            pos = pos.normalized() * 1.5

        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=0.022,
            segments=6,
            ring_count=4,
            location=pos
        )
        ribo = bpy.context.active_object
        ribo.name = f"FreeRibosome_{i}"
        ribo.data.materials.append(mat_ribosome)
        ribo_collection.objects.link(ribo)
        bpy.context.scene.collection.objects.unlink(ribo)

    return ribo_collection

free_ribosomes = create_free_ribosomes()

# ============================================
# CYTOSKELETON (MICROTUBULES)
# ============================================

def create_cytoskeleton():
    """Create microtubule network radiating from centrosome"""
    cyto_collection = bpy.data.collections.new("Cytoskeleton")
    bpy.context.scene.collection.children.link(cyto_collection)

    centro_pos = Vector((1.5, -0.5, -1.2))

    for i in range(18):
        end_pos = random_point_on_sphere(2.7)
        end_pos.y = random.uniform(-2, 2)

        mid = (centro_pos + end_pos) / 2
        mid += Vector((
            random.uniform(-0.25, 0.25),
            random.uniform(-0.25, 0.25),
            random.uniform(-0.25, 0.25)
        ))

        curve_data = bpy.data.curves.new(f'Microtubule_{i}', type='CURVE')
        curve_data.dimensions = '3D'
        curve_data.bevel_depth = 0.006
        curve_data.bevel_resolution = 4

        spline = curve_data.splines.new('BEZIER')
        spline.bezier_points.add(1)

        spline.bezier_points[0].co = centro_pos
        spline.bezier_points[0].handle_left_type = 'AUTO'
        spline.bezier_points[0].handle_right_type = 'AUTO'

        spline.bezier_points[1].co = end_pos
        spline.bezier_points[1].handle_left_type = 'AUTO'
        spline.bezier_points[1].handle_right_type = 'AUTO'

        curve_obj = bpy.data.objects.new(f'Microtubule_{i}', curve_data)
        curve_obj.data.materials.append(mat_cytoskeleton)
        cyto_collection.objects.link(curve_obj)

    return cyto_collection

cytoskeleton = create_cytoskeleton()

# ============================================
# FINAL SETUP
# ============================================

# Set up camera
bpy.ops.object.camera_add(location=(8, -8, 6))
camera = bpy.context.active_object
camera.rotation_euler = (math.radians(60), 0, math.radians(45))
bpy.context.scene.camera = camera

# Set up lighting
bpy.ops.object.light_add(type='SUN', location=(5, -5, 10))
sun = bpy.context.active_object
sun.data.energy = 2

bpy.ops.object.light_add(type='AREA', location=(-5, 5, 5))
fill = bpy.context.active_object
fill.data.energy = 100
fill.data.color = (0.8, 0.9, 1.0)

# Set render settings for export
bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'

print("=" * 50)
print("CELL MODEL GENERATED SUCCESSFULLY!")
print("=" * 50)
print("\nTo export for web:")
print("1. File > Export > glTF 2.0 (.glb/.gltf)")
print("2. Format: glTF Binary (.glb)")
print("3. Save to: blendercell/models/cell.glb")
print("\nOrganelles created:")
print("- Cell Membrane")
print("- Nucleus (envelope, nucleoplasm, nucleolus, chromatin)")
print("- Rough ER (3 stacks with ribosomes)")
print("- Smooth ER (tubular network)")
print("- Mitochondria (12)")
print("- Golgi Apparatus")
print("- Lysosomes (10)")
print("- Centrosome (2 centrioles)")
print("- Free Ribosomes (60)")
print("- Cytoskeleton (microtubules)")
