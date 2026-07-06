// features/explode.js
// Rigid per-feature explode shader + slider wiring.

import { state } from "../core/state.js";
import { $ } from "../core/utils.js";

// Build & attach the explode CustomShader to the current tileset.
export function setupExplodeShader() {
  // RIGID per-feature explode. Each feature (BIM element) shares one feature ID,
  // so every vertex of that element is translated by the SAME vector — the part
  // moves as a rigid body, with no geometry distortion. Magnitude is in metres.
  //
  // For a curated layout, bake a per-feature `centroid` (vec3) into the tileset's
  // EXT_structural_metadata and use: vsOutput.positionMC += normalize(centroid) * u_explode;
  state.explodeShader = new Cesium.CustomShader({
    uniforms: {
      u_explode: { type: Cesium.UniformType.FLOAT, value: 0.0 },
    },
    vertexShaderText: `
      // Pseudo-random unit vector from a feature id (stable per feature).
      vec3 dirFromId(float id) {
        float a = fract(sin(id * 12.9898) * 43758.5453);
        float b = fract(sin(id * 78.2330) * 24634.6345);
        float theta = a * 6.2831853;      // azimuth 0..2PI
        float z = b * 2.0 - 1.0;          // cos(polar) -1..1
        float r = sqrt(max(0.0, 1.0 - z * z));
        return vec3(r * cos(theta), r * sin(theta), z);
      }
      void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
        if (u_explode <= 0.0) { return; }
        float id = float(vsInput.featureIds.featureId_0);
        // One constant direction per feature -> every vertex of the element
        // moves by the SAME vector: a pure rigid translation away from the
        // centre, preserving the object's orientation and angles exactly.
        vec3 dir = dirFromId(id);
        vsOutput.positionMC += dir * u_explode;   // rigid translation (metres)
      }
    `,
  });
  if (state.tileset) state.tileset.customShader = state.explodeShader;
}

export function initExplode() {
  $("explodeSlider").addEventListener("input", (e) => {
    const pct = parseInt(e.target.value, 10);
    $("explodeVal").textContent = pct + "%";
    // 0 .. ~0.16x model radius of rigid displacement (10x gentler than before).
    if (state.explodeShader) {
      state.explodeShader.setUniform("u_explode", (pct / 100) * state.modelRadius * 0.16);
    }
  });
}
