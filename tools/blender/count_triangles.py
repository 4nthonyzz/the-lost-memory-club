"""Print per-object and total triangle counts (original work, MIT).

Usage inside Blender, for the open .blend file:

    blender -b file.blend --python tools/blender/count_triangles.py

Or import a .glb / .gltf first (path goes after `--`):

    blender -b --python tools/blender/count_triangles.py -- public/models/crate.glb

Counts use the evaluated mesh, so modifiers are included. Each polygon with n
vertices counts as n - 2 triangles.
"""

import sys

import bpy


def triangles_of(obj):
    """Return the evaluated triangle count of one mesh object."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return sum(len(poly.vertices) - 2 for poly in mesh.polygons)
    finally:
        evaluated.to_mesh_clear()


def import_model(path):
    """Import a glTF/GLB file into the current scene."""
    bpy.ops.import_scene.gltf(filepath=path)


def main():
    """Print a table of mesh objects and the total."""
    extra = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if extra:
        import_model(extra[0])
    total = 0
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if obj.type != "MESH":
            continue
        count = triangles_of(obj)
        total += count
        print("%-32s %8d" % (obj.name, count))
    print("%-32s %8d" % ("TOTAL", total))


if __name__ == "__main__":
    main()
