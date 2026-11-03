// Copies the hand-detection engine (MediaPipe WebAssembly files) into public/
// so the photo sizing tool can load it from our own site.
import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const src = path.resolve("node_modules/@mediapipe/tasks-vision/wasm");
const dest = path.resolve("public/mediapipe/wasm");
if (!existsSync(src)) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  copyFileSync(path.join(src, f), path.join(dest, f));
}
console.log("Copied MediaPipe files to public/mediapipe/wasm");
