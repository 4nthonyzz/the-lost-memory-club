"""Procedural asset generator for The Lost Memory Club (original work, MIT).

Run it headless with Blender:

    blender -b --python tools/blender/generate_assets.py -- --out public/models --seed 1996

Everything is built from bpy primitives (cube, cylinder, UV sphere, plane) with
low segment counts, applied bevel modifiers and flat Principled BSDF colours.
No external textures, meshes or third-party code are used.

Conventions (match src/world/layout/roomLayout.ts):
  * Origin is the centre of the object's floor footprint, so the lowest point is z = 0.
  * Real-world metres. Blender is Z-up; the glTF export converts to +Y up.
  * The "front" of every asset faces Blender -Y, which becomes glTF +Z.
    The room layout also faces its Stations toward +z, so no extra rotation is needed.
  * Each file is one triangulated mesh object.

Triangle budgets are enforced before anything is written. Over budget means a
non-zero exit code (2) and a message on stderr.

Reproducibility: all randomness comes from random.Random seeded with
"<seed>:<asset name>". With the same Blender version, identical inputs give
identical geometry. The exported glTF may differ between Blender versions
(exporter version string, material export details), so byte-identical output
is only expected on the same Blender version.
"""

import argparse
import json
import math
import os
import random
import sys

import bpy

# ---------------------------------------------------------------------------
# Budgets (design.md, Blender/GLB integration plan)
# ---------------------------------------------------------------------------
MAX_TRIANGLES_PER_ASSET = 5000
MAX_TRIANGLES_TOTAL = 20000
# Allowed excess of a bounding box over its target footprint, in metres.
FOOTPRINT_TOLERANCE = 0.02

# Flat colours matched to the primitive look in src/world/scene/sharedResources.ts.
WOOD = "#6b4a30"
WOOD_DARK = "#4a3322"
BODY_DARK = "#2a2438"
PLASTIC_GREY = "#3b3846"
BLACK = "#0e0d12"
CRT_SCREEN = "#4fe0d0"
ARCADE_SCREEN = "#d84fd0"
LED_RED = "#ff4040"
AMBER = "#e8c27a"


class BudgetError(Exception):
    """Raised when an asset or the whole set exceeds its triangle budget."""


# ---------------------------------------------------------------------------
# Small bpy helpers
# ---------------------------------------------------------------------------
def srgb_to_linear(channel):
    """Convert one sRGB channel (0..1) to linear, as Blender colour inputs expect."""
    if channel <= 0.04045:
        return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4


def hex_to_rgba(value):
    """Convert '#rrggbb' to a linear RGBA tuple."""
    value = value.lstrip("#")
    r, g, b = (int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), 1.0)


def clear_scene():
    """Remove every object and orphaned datablock so each asset starts empty."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for block in list(collection):
            collection.remove(block)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def select_only(obj):
    """Make `obj` the only selected and the active object."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj, modifier):
    """Apply one modifier on `obj` (the object must be active)."""
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def evaluated_triangle_count(obj):
    """Count triangles of the evaluated mesh (modifiers included)."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        evaluated.to_mesh_clear()


# ---------------------------------------------------------------------------
# Asset builder: collects primitive parts, then joins them into one mesh
# ---------------------------------------------------------------------------
class AssetBuilder:
    """Creates coloured primitive parts and joins them into a single mesh object."""

    def __init__(self, name, seed):
        self.name = name
        self.rng = random.Random("%s:%s" % (seed, name))
        self.parts = []
        self._materials = {}

    def material(self, colour, rough=0.8, metal=0.0, emit=0.0):
        """Return a cached flat-colour Principled BSDF material."""
        key = (colour, rough, metal, emit)
        if key in self._materials:
            return self._materials[key]
        mat = bpy.data.materials.new("%s_%s" % (self.name, colour.lstrip("#")))
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        rgba = hex_to_rgba(colour)
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
        if emit > 0.0:
            # The emission socket is named "Emission" in 3.x and "Emission Color" in 4.x.
            socket = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if socket is not None:
                socket.default_value = rgba
            strength = bsdf.inputs.get("Emission Strength")
            if strength is not None:
                strength.default_value = emit
        self._materials[key] = mat
        return mat

    def _finish_part(self, obj, size, colour, bevel, rough, metal, emit):
        """Apply transforms, optional bevel and the material, then record the part."""
        obj.scale = size
        select_only(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        obj.data.materials.append(self.material(colour, rough, metal, emit))
        width = min(bevel, 0.45 * min(size))
        if width > 0.0005:
            mod = obj.modifiers.new("Bevel", "BEVEL")
            mod.width = width
            mod.segments = 1
            mod.limit_method = "ANGLE"
            apply_modifier(obj, mod)
        self.parts.append(obj)
        return obj

    def box(self, size, centre, colour, bevel=0.0, rot=(0.0, 0.0, 0.0),
            rough=0.8, metal=0.0, emit=0.0):
        """Add a box. `size` is (x, y, z) in the part's local axes, `centre` in metres."""
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=centre, rotation=rot)
        return self._finish_part(bpy.context.active_object, size, colour, bevel, rough, metal, emit)

    def cylinder(self, radius, depth, centre, colour, rot=(0.0, 0.0, 0.0), segments=10,
                 rough=0.8, metal=0.0, emit=0.0):
        """Add a low-segment cylinder whose axis is local Z (rotate to reorient)."""
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=segments, radius=radius, depth=depth, location=centre, rotation=rot)
        return self._finish_part(bpy.context.active_object, (1.0, 1.0, 1.0), colour, 0.0,
                                 rough, metal, emit)

    def sphere(self, radius, centre, colour, segments=10, rings=6, rough=0.5, metal=0.0):
        """Add a low-poly UV sphere."""
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=segments, ring_count=rings, radius=radius, location=centre)
        return self._finish_part(bpy.context.active_object, (1.0, 1.0, 1.0), colour, 0.0,
                                 rough, metal, 0.0)

    def front_quad(self, width, height, centre, colour, emit=0.0):
        """Add a single quad that faces the asset front (Blender -Y), such as a label."""
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=centre, rotation=(math.pi / 2, 0.0, 0.0))
        return self._finish_part(bpy.context.active_object, (width, height, 1.0), colour, 0.0,
                                 0.9, 0.0, emit)

    def finish(self):
        """Join all parts, triangulate and name the result."""
        select_only(self.parts[0])
        for part in self.parts:
            part.select_set(True)
        bpy.ops.object.join()
        obj = bpy.context.active_object
        obj.name = self.name
        obj.data.name = self.name
        tri = obj.modifiers.new("Triangulate", "TRIANGULATE")
        apply_modifier(obj, tri)
        return obj


# ---------------------------------------------------------------------------
# Asset recipes. Dimensions are width (x) x depth (y) x height (z), in metres.
# ---------------------------------------------------------------------------
def build_crt_vhs(b):
    """CRT television on a stand with a VCR deck. Footprint 1.0 x 0.6, height 1.2."""
    b.box((0.96, 0.56, 0.45), (0, 0, 0.225), WOOD, bevel=0.01)  # stand
    b.box((0.84, 0.50, 0.12), (0, 0, 0.51), PLASTIC_GREY, bevel=0.008, rough=0.5)  # VCR deck
    b.box((0.40, 0.012, 0.03), (-0.1, -0.253, 0.52), BLACK)  # cassette slot
    b.box((0.34, 0.08, 0.02), (-0.1, -0.27, 0.525), BODY_DARK)  # cassette sticking out
    b.box((0.20, 0.004, 0.012), (-0.1, -0.311, 0.527), "#e8e2c8")  # cassette label
    b.box((0.10, 0.012, 0.03), (0.28, -0.253, 0.51), BLACK)  # VCR display
    for i in range(3):  # VCR buttons
        b.box((0.035, 0.014, 0.02), (0.14 + 0.05 * i, -0.254, 0.48), "#8c8c94", rough=0.4)
    b.box((0.90, 0.42, 0.60), (0, -0.06, 0.87), PLASTIC_GREY, bevel=0.04, rough=0.45)  # CRT casing
    b.box((0.60, 0.15, 0.42), (0, 0.225, 0.85), PLASTIC_GREY, bevel=0.03, rough=0.5)  # rear tube
    # Recessed screen bezel: frame stands proud at y = -0.30, glass sits behind it.
    cx, cz = -0.10, 0.87
    b.box((0.04, 0.03, 0.44), (cx - 0.27, -0.285, cz), BLACK)
    b.box((0.04, 0.03, 0.44), (cx + 0.27, -0.285, cz), BLACK)
    b.box((0.50, 0.03, 0.04), (cx, -0.285, cz + 0.20), BLACK)
    b.box((0.50, 0.03, 0.04), (cx, -0.285, cz - 0.20), BLACK)
    b.box((0.50, 0.02, 0.36), (cx, -0.265, cz), CRT_SCREEN, emit=1.0, rough=0.2)
    half_pi = math.pi / 2
    for z in (0.98, 0.88):  # knobs, axis along Y
        b.cylinder(0.03, 0.03, (0.32, -0.285, z), "#8c8c94", rot=(half_pi, 0, 0), rough=0.4)
    b.box((0.016, 0.01, 0.016), (0.32, -0.275, 0.76), LED_RED, emit=3.0)  # power LED
    for i in range(3):  # speaker slits
        b.box((0.12, 0.006, 0.01), (0.32, -0.274, 0.68 + 0.02 * i), BLACK)
    return b.finish()


def build_arcade_cabinet(b):
    """Upright arcade cabinet. Footprint 1.0 x 0.8, height 1.8."""
    for sx in (-1, 1):
        b.box((0.04, 0.80, 1.80), (sx * 0.48, 0, 0.90), BODY_DARK, bevel=0.01)  # side panels
        b.box((0.006, 0.55, 0.55), (sx * 0.503, -0.02, 0.45), ARCADE_SCREEN, rough=0.6)  # side art
        b.box((0.006, 0.40, 0.30), (sx * 0.503, 0.0, 1.20), CRT_SCREEN, rough=0.6)  # side art
    b.box((0.92, 0.04, 1.80), (0, 0.38, 0.90), BODY_DARK)  # back panel
    b.box((0.92, 0.70, 0.90), (0, 0.03, 0.45), BODY_DARK, bevel=0.01)  # lower body
    b.box((0.30, 0.012, 0.22), (0, -0.326, 0.30), "#8c8c94", rough=0.4, metal=0.5)  # coin door
    for x in (-0.06, 0.06):  # coin slots
        b.box((0.03, 0.006, 0.06), (x, -0.335, 0.34), BLACK)
    b.box((0.10, 0.006, 0.04), (0, -0.335, 0.23), BLACK)  # coin return
    b.box((0.92, 0.48, 0.60), (0, 0.14, 1.20), BODY_DARK, bevel=0.01)  # upper body
    # Control deck, slanted so the front edge is lower.
    b.box((0.92, 0.30, 0.06), (0, -0.25, 0.93), PLASTIC_GREY, bevel=0.01, rot=(0.21, 0, 0))
    b.cylinder(0.035, 0.03, (-0.18, -0.28, 0.97), BLACK, segments=10)  # joystick base
    b.cylinder(0.008, 0.10, (-0.18, -0.28, 1.02), "#8c8c94", segments=6, metal=0.6)  # shaft
    b.sphere(0.03, (-0.18, -0.28, 1.09), "#c02030")  # ball top
    button_colours = ["#e84040", "#e8c27a", "#4fe0d0", "#3a6ae0", "#58c060", "#d84fd0"]
    for i, colour in enumerate(button_colours):  # 2 rows of 3
        row, col = divmod(i, 3)
        b.cylinder(0.025, 0.025, (0.04 + 0.08 * col, -0.31 + 0.08 * row, 0.965), colour,
                   segments=10, rough=0.4)
    # Recessed screen: frame proud of the upper body, glass behind its front face.
    cz = 1.20
    b.box((0.05, 0.04, 0.58), (-0.375, -0.12, cz), BLACK)
    b.box((0.05, 0.04, 0.58), (0.375, -0.12, cz), BLACK)
    b.box((0.70, 0.04, 0.05), (0, -0.12, cz + 0.265), BLACK)
    b.box((0.70, 0.04, 0.05), (0, -0.12, cz - 0.265), BLACK)
    b.box((0.70, 0.02, 0.48), (0, -0.105, cz), ARCADE_SCREEN, emit=1.0, rough=0.2)
    # Angled marquee on a backing box with a top cap.
    b.box((0.92, 0.50, 0.30), (0, 0.13, 1.65), BODY_DARK, bevel=0.01)
    b.box((0.88, 0.02, 0.26), (0, -0.125, 1.66), AMBER, emit=0.8, rot=(-0.35, 0, 0), rough=0.4)
    b.box((0.92, 0.50, 0.04), (0, 0.13, 1.78), BODY_DARK, bevel=0.01)
    return b.finish()


def build_shelf(b):
    """Wooden shelf with seeded VHS spines. Footprint 2.0 x 0.4, height 2.2."""
    width, depth, height = 2.0, 0.4, 2.2
    for sx in (-1, 1):
        b.box((0.04, depth, height), (sx * (width / 2 - 0.02), 0, height / 2), WOOD, bevel=0.005)
    b.box((width - 0.08, 0.02, height), (0, depth / 2 - 0.01, height / 2), WOOD_DARK)
    levels = [0.03 + i * 0.4225 for i in range(5)] + [height - 0.015]
    for z in levels:
        b.box((width - 0.08, depth - 0.02, 0.03), (0, -0.01, z), WOOD)
    spine_palette = ["#2b2b30", "#7a1f2b", "#1f3a5f", "#3b5d3a", "#a8742a", "#4a2d5c",
                     "#8c8c94", "#c9c2a8"]
    label_palette = ["#e8e2c8", "#d9d0a8", "#cfd8e0"]
    for z in levels[:5]:
        x = -(width - 0.08) / 2 + 0.01
        while True:
            tape_w = b.rng.uniform(0.024, 0.032)
            if x + tape_w > (width - 0.08) / 2 - 0.01:
                break
            if b.rng.random() > 0.22:  # roughly one slot in five stays empty
                tape_h = b.rng.uniform(0.17, 0.188)
                front = -0.17 + b.rng.uniform(0.0, 0.02)
                cx, cz = x + tape_w / 2, z + 0.015 + tape_h / 2
                b.box((tape_w, 0.104, tape_h), (cx, front + 0.052, cz), b.rng.choice(spine_palette))
                b.front_quad(tape_w * 0.8, tape_h * 0.5, (cx, front - 0.001, cz),
                             b.rng.choice(label_palette))
            x += tape_w + b.rng.uniform(0.0, 0.006)
    return b.finish()


def build_armchair(b):
    """Padded armchair. Footprint 0.6 x 0.6, height 0.9."""
    colour, dark = "#4d6a52", "#37503c"
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((0.04, 0.04, 0.10), (sx * 0.26, sy * 0.26, 0.05), WOOD_DARK)  # legs
    b.box((0.60, 0.60, 0.20), (0, 0, 0.20), dark, bevel=0.03)  # base
    b.box((0.40, 0.44, 0.10), (0, -0.04, 0.35), colour, bevel=0.03)  # seat cushion
    b.box((0.60, 0.14, 0.65), (0, 0.23, 0.575), colour, bevel=0.04)  # backrest
    for sx in (-1, 1):
        b.box((0.10, 0.44, 0.25), (sx * 0.25, -0.02, 0.425), colour, bevel=0.03)  # armrests
    return b.finish()


def build_couch(b):
    """Three-seat style couch with two cushions. Footprint 1.8 x 0.8, height 0.9."""
    colour, dark = "#7a3b4a", "#5a2a36"
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box((0.05, 0.05, 0.10), (sx * 0.84, sy * 0.34, 0.05), WOOD_DARK)  # legs
    b.box((1.80, 0.80, 0.22), (0, 0, 0.21), dark, bevel=0.03)  # base
    for sx in (-1, 1):
        b.box((0.70, 0.60, 0.14), (sx * 0.35, -0.10, 0.39), colour, bevel=0.03)  # seat cushions
        b.box((0.66, 0.12, 0.38), (sx * 0.35, 0.16, 0.55), colour, bevel=0.03)  # back cushions
        b.box((0.20, 0.76, 0.42), (sx * 0.80, 0, 0.31), dark, bevel=0.03)  # arms
    b.box((1.80, 0.20, 0.60), (0, 0.30, 0.60), dark, bevel=0.04)  # backrest frame
    return b.finish()


def build_crate(b):
    """Ribbed wooden crate. Footprint 0.6 x 0.6, height 0.6."""
    b.box((0.56, 0.56, 0.55), (0, 0, 0.295), WOOD_DARK)  # body
    for z in (0.12, 0.30, 0.48):  # horizontal ribs on all four sides
        for sy in (-1, 1):
            b.box((0.60, 0.03, 0.07), (0, sy * 0.285, z), WOOD, bevel=0.005)
        for sx in (-1, 1):
            b.box((0.03, 0.60, 0.07), (sx * 0.285, 0, z), WOOD, bevel=0.005)
    for sx in (-1, 1):  # corner posts
        for sy in (-1, 1):
            b.box((0.06, 0.06, 0.58), (sx * 0.27, sy * 0.27, 0.30), WOOD, bevel=0.005)
    for i in (-1, 0, 1):  # lid planks
        b.box((0.18, 0.56, 0.03), (i * 0.19, 0, 0.585), WOOD, bevel=0.004)
    return b.finish()


# name -> (builder, expected footprint width x depth x height in metres)
ASSETS = [
    ("crt_vhs", build_crt_vhs, (1.0, 0.6, 1.2)),
    ("arcade_cabinet", build_arcade_cabinet, (1.0, 0.8, 1.8)),
    ("shelf", build_shelf, (2.0, 0.4, 2.2)),
    ("armchair", build_armchair, (0.6, 0.6, 0.9)),
    ("couch", build_couch, (1.8, 0.8, 0.9)),
    ("crate", build_crate, (0.6, 0.6, 0.6)),
]


# ---------------------------------------------------------------------------
# Validation, export and reporting
# ---------------------------------------------------------------------------
def check_footprint(obj, expected):
    """Warn (stderr) when the bounds exceed the layout footprint or float above the floor."""
    xs = [v[0] for v in obj.bound_box]
    ys = [v[1] for v in obj.bound_box]
    zs = [v[2] for v in obj.bound_box]
    size = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    for axis, actual, target in zip("xyz", size, expected):
        if actual > target + FOOTPRINT_TOLERANCE:
            sys.stderr.write("WARNING: %s %s-size %.3f m exceeds target %.3f m\n"
                             % (obj.name, axis, actual, target))
    if abs(min(zs)) > FOOTPRINT_TOLERANCE:
        sys.stderr.write("WARNING: %s lowest point is %.3f m, expected 0\n" % (obj.name, min(zs)))


def export_glb(obj, path):
    """Export only `obj` as a binary glTF, skipping options this Blender version lacks."""
    select_only(obj)
    wanted = dict(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_texcoords=False,
        export_normals=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )
    known = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    options = {k: v for k, v in wanted.items() if k in known}
    for skipped in sorted(set(wanted) - set(options)):
        sys.stderr.write("note: glTF exporter has no option '%s', skipped\n" % skipped)
    bpy.ops.export_scene.gltf(**options)


def build_asset(name, builder, seed, expected):
    """Clear the scene, build one asset and return (object, triangle count)."""
    clear_scene()
    obj = builder(AssetBuilder(name, seed))
    check_footprint(obj, expected)
    return obj, evaluated_triangle_count(obj)


def enforce_budgets(counts):
    """Raise BudgetError when any per-asset or total triangle budget is exceeded."""
    for name, tris in counts.items():
        if tris > MAX_TRIANGLES_PER_ASSET:
            raise BudgetError("%s has %d triangles, budget is %d"
                              % (name, tris, MAX_TRIANGLES_PER_ASSET))
    total = sum(counts.values())
    if total > MAX_TRIANGLES_TOTAL:
        raise BudgetError("total is %d triangles, budget is %d" % (total, MAX_TRIANGLES_TOTAL))


def generate(out_dir, seed, dry_run):
    """Count every asset first, enforce budgets, then export. Returns the report list."""
    counts = {}
    for name, builder, expected in ASSETS:
        _, counts[name] = build_asset(name, builder, seed, expected)
    enforce_budgets(counts)

    report = []
    if not dry_run:
        os.makedirs(out_dir, exist_ok=True)
    for name, builder, expected in ASSETS:
        entry = {"name": name, "triangles": counts[name], "bytes": 0}
        if not dry_run:
            obj, _ = build_asset(name, builder, seed, expected)
            path = os.path.join(out_dir, name + ".glb")
            export_glb(obj, path)
            entry["bytes"] = os.path.getsize(path)
        report.append(entry)
    if not dry_run:
        with open(os.path.join(out_dir, "asset-report.json"), "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)
            handle.write("\n")
    return report


def parse_args(argv):
    """Parse only the arguments after Blender's `--` separator."""
    extra = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser(description="Generate Lost Memory Club GLB assets.")
    parser.add_argument("--out", default="public/models", help="output directory")
    parser.add_argument("--seed", type=int, default=1996, help="random seed")
    parser.add_argument("--dry-run", action="store_true",
                        help="build and count triangles but write no files")
    return parser.parse_args(extra)


def main():
    """Entry point. Exit code 2 on a budget violation."""
    args = parse_args(sys.argv)
    try:
        report = generate(os.path.abspath(args.out), args.seed, args.dry_run)
    except BudgetError as error:
        sys.stderr.write("ERROR: triangle budget exceeded: %s\n" % error)
        sys.exit(2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
