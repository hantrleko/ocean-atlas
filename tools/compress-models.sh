#!/usr/bin/env bash
# Re-compress all species GLBs: Draco geometry + 1024px WebP textures + mild meshopt simplify.
# Skinned meshes/animations are preserved (verified with `gltf-transform inspect`).
# Usage: tools/compress-models.sh <src_dir_with_uncompressed_or_blender_glbs> [out_dir=public/models]
set -euo pipefail
SRC=${1:?src dir}; OUT=${2:-public/models}
for f in "$SRC"/*.glb; do
  npx -y @gltf-transform/cli@4 optimize "$f" "$OUT/$(basename "$f")" \
    --compress draco --texture-compress webp --texture-size 1024 \
    --simplify true --simplify-error 0.0008 --simplify-ratio 0.5 \
    --join false --flatten false --instance false --palette false
done
ls -l "$OUT"/*.glb
