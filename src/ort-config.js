// src/ort-config.js
import { env } from 'onnxruntime-web';

// 🚨 CRITICAL FIX: Explicitly specify the name of the non-threaded WASM file to use.
// This overrides the internal logic that tries to load ort-wasm-simd-threaded.jsep.mjs.
env.wasm.proxy = false; // Disable the use of a proxy worker (another potential source of the issue)
env.wasm.wasmPaths = '/'; // Look in the public folder
env.wasm.wasmFileName = 'ort-wasm.wasm'; // FORCE the use of the simplest, non-threaded file.

// Ensure worker is disabled (redundant, but safe)
env.wasm.worker = false;
env.wasm.defaultBackend = 'wasm';

console.log("ONNX Runtime global environment configured.");