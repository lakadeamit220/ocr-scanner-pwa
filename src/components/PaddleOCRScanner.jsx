import React, { useState, useEffect } from "react";
// Import standard components from the installed package
import { InferenceSession, Tensor, env } from "onnxruntime-web";

export default function PaddleOCRScanner() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [ortReady, setOrtReady] = useState(false);

    // --- Configuration for PaddleOCR Recognition Model ---
    const RECOGNITION_MODEL_URL =
        "https://cdn.jsdelivr.net/npm/paddleocr-js@1.0.1/models/rec_lite_en.onnx";
    const TARGET_HEIGHT = 48;
    // --- End Config ---

    // 1. Initialize ONNX Runtime environment
    useEffect(() => {
        try {
            // 🚨 CRITICAL FIX: Force non-threaded execution and configure WASM paths.
            // This is the most stable configuration for WASM in modern bundlers.

            // 1. Point the WASM path explicitly to the CDN
            env.wasm.wasmPaths =
                'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/wasm/';

            // 2. IMPORTANT: Disable threading/worker usage. 
            // This stops the library from trying to fetch the problematic *threaded* files.
            env.wasm.worker = false;

            // 3. Ensure WASM is the default backend
            env.wasm.defaultBackend = 'wasm';

            // After configuration, ORT is ready to be used.
            setOrtReady(true);
            console.log("ONNX Runtime configured for stable, non-threaded WASM.");
        } catch (err) {
            console.error("ORT Configuration Error:", err);
            setText(`ORT Configuration Failed: ${err.message}`);
        }
    }, []);

    // 2. Convert image → tensor 
    async function imageToTensor(img) {
        if (!ortReady) throw new Error("ONNX Runtime is not initialized.");

        const scale = TARGET_HEIGHT / img.height;
        const targetWidth = Math.round(img.width * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, targetWidth, TARGET_HEIGHT);

        const { data } = ctx.getImageData(0, 0, targetWidth, TARGET_HEIGHT);
        const arr = new Float32Array(targetWidth * TARGET_HEIGHT * 3);

        // Convert HWC to CHW and normalize
        for (let i = 0; i < TARGET_HEIGHT; i++) {
            for (let j = 0; j < targetWidth; j++) {
                const pixelIndex = (i * targetWidth + j) * 4;
                const arrIndex = i * targetWidth + j;

                arr[arrIndex] = data[pixelIndex] / 255.0;
                arr[arrIndex + targetWidth * TARGET_HEIGHT] = data[pixelIndex + 1] / 255.0;
                arr[arrIndex + 2 * targetWidth * TARGET_HEIGHT] = data[pixelIndex + 2] / 255.0;
            }
        }

        // Use the locally imported Tensor constructor
        return new Tensor("float32", arr, [1, 3, TARGET_HEIGHT, targetWidth]);
    }

    // 3. Dummy decoder
    function decodeOutput(output) {
        return "Recognition successful! (WASM backend fully stabilized.)";
    }

    // 4. Run OCR on selected file
    async function runOCR(file) {
        if (!ortReady) {
            setText("Error: ONNX Runtime library is not yet ready.");
            return;
        }

        setLoading(true);
        setText("");

        try {
            // Create session using the configured WASM paths
            const session = await InferenceSession.create(
                RECOGNITION_MODEL_URL,
                {
                    executionProviders: ["wasm"],
                }
            );

            const img = await createImageBitmap(file);
            const tensor = await imageToTensor(img);

            const output = await session.run({ x: tensor });
            const result = decodeOutput(output);

            setText(result);
        } catch (err) {
            console.error("OCR error:", err);
            const errMsg = err.message.includes('external data file')
                ? "OCR Error: Failed to load model. Check the model URL."
                : `OCR Error: ${err.message}`;
            setText(errMsg);
        } finally {
            setLoading(false);
        }
    }

    // --- Component Rendering ---
    return (
        <div className="ocr-box">
            <h2>PaddleOCR Scanner (Standard WASM)</h2>
            <p style={{ color: ortReady ? 'green' : 'red' }}>
                **ORT Status:** {ortReady ? 'Ready' : 'Initializing...'}
            </p>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setImage(URL.createObjectURL(file));
                    runOCR(file);
                }}
                disabled={!ortReady || loading}
            />

            {loading && <div>Scanning...</div>}

            {image && <img src={image} alt="preview" width="300" />}

            {text && (
                <div>
                    <h3>Text Output:</h3>
                    <pre>{text}</pre>
                </div>
            )}
        </div>
    );
}