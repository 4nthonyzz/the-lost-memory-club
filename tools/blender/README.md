# Blender asset tools

Original Python (`bpy`) scripts that generate the optional 3D props for the world module as `.glb` files. The game runs without them: with an empty `src/world/assets/assetManifest.ts`, every prop renders from primitives.

## Status

- **No `.glb` file has been generated, committed or measured by this task.** Blender was not installed on the machine where the scripts were written.
- The scripts were only syntax-checked with `python -m py_compile`. They have **not been run in Blender**, so they are untested. Treat the first real run as a debugging pass.
- Assumed Blender versions: 3.6 LTS and 4.x. Neither has been tested.

## Files

| File | Purpose |
|------|---------|
| `generate_assets.py` | Builds `crt_vhs`, `arcade_cabinet`, `shelf`, `armchair`, `couch`, `crate` and exports one `.glb` each, plus `asset-report.json`. |
| `count_triangles.py` | Prints per-object and total triangle counts for a `.blend` or an imported `.glb`. |

## Requirements

- Blender 3.6 or newer (3.6 LTS or 4.x), on your `PATH` or called by full path.
- No add-ons beyond the bundled glTF exporter, no external textures, no network.

## Regenerate the assets

From the repository root:

```
blender -b --python tools/blender/generate_assets.py -- --out public/models --seed 1996
```

Arguments after `--` belong to the script:

- `--out <dir>`: output directory. Default `public/models`.
- `--seed <int>`: random seed (shelf tape colours and spacing). Default `1996`.
- `--dry-run`: build and count triangles, write nothing.

The script prints a JSON summary (`name`, `triangles`, `bytes`) to stdout and writes the same list to `<out>/asset-report.json`. Blender prints its own log lines to stdout as well, so look for the JSON array at the end.

### Budgets

Constants at the top of `generate_assets.py`: at most 5,000 triangles per asset and 20,000 in total. All assets are built and counted before any file is written. If a budget is exceeded, the script writes `ERROR: triangle budget exceeded: ...` to stderr, writes no files and exits with code 2.

The footprint check only prints warnings. Models are built to fit the room layout (width x depth x height, metres): `crt_vhs` 1.0 x 0.6 x 1.2, `arcade_cabinet` 1.0 x 0.8 x 1.8, `shelf` 2.0 x 0.4 x 2.2, `armchair` 0.6 x 0.6 x 0.9, `couch` 1.8 x 0.8 x 0.9, `crate` 0.6 x 0.6 x 0.6.

### Conventions

- Origin: centre of the floor footprint, lowest point at y = 0, +Y up (`export_yup=True`).
- The front of each model faces +Z in glTF (the room faces its Stations toward +z). `shelf` is modelled along X; rotate it by 90 degrees about Y in the scene for the west-wall shelves (`shelf-a`, `shelf-b`, footprint 0.4 x 2.2 in `roomLayout.ts`). `shelf-c` (2.0 x 0.6) is along X already.
- One triangulated mesh and flat Principled BSDF colours per file. No textures.

## Check triangle counts

```
blender -b path/to/file.blend --python tools/blender/count_triangles.py
blender -b --python tools/blender/count_triangles.py -- public/models/crate.glb
```

## Add a measured asset to the manifest

Only after the `.glb` exists and has been measured:

1. Run the generator, then read `triangles` and `bytes` from `public/models/asset-report.json`.
2. Confirm the total of all files you load at startup is at most 5 MB, and the triangle limits above hold.
3. Add an entry to `src/world/assets/assetManifest.ts` mapping the layout object id (for example `crate-a`) to `/models/crate.glb` and the measured triangle count, following the existing entry shape in that file.
4. Record the asset in the asset log (original work, MIT) as required by design.md. Collision still comes from `roomLayout.ts`, never from the GLB.
5. Commit the `.glb` files only deliberately, after checking their size.

The manifest stays empty until the `.glb` files exist and were measured.

## Licence

Original work by the project team, released under the MIT licence of this repository. No third-party code, meshes, textures or sounds are used or copied.

## Reproducibility

All randomness comes from `random.Random("<seed>:<asset name>")`, so geometry is the same for the same seed and the same Blender version. The exported glTF may still differ between Blender versions (exporter version string, material export details, bevel or triangulation internals), so byte-identical files are only expected on the same Blender version.

## Known limits

- `bpy.ops.export_scene.gltf` options differ between Blender versions. The script drops options that the installed exporter does not know and prints a `note:` line on stderr.
- The scripts use `bpy.ops` and need a working background Blender context.
