import React, { useState, useEffect } from "react";

export default function PaddleOCRScanner() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    // Load ONNXRuntime Web from CDN (WASM backend)
    async function loadOrtFromCDN() {
        // Already loaded? Return existing
        if (window.ort) return window.ort;

        const ortModule = await import(
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs"
        );

        const ort = ortModule; // Correct import
        // Configure WASM paths
        ort.env.wasm.wasmPaths =
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/wasm/";

        console.log("ORT Loaded from CDN:", ort.version);

        return ort;
    }


    // Load PaddleOCR model
    async function runOCR(file) {
        try {
            setLoading(true);
            const ort = await loadOrtFromCDN();

            const session = await ort.InferenceSession.create(
                "https://cdn.jsdelivr.net/npm/paddleocr-js@latest/models/ocr_rec.onnx",
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
            setText("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    // Convert image → tensor
    async function imageToTensor(img) {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, img.width, img.height);
        const arr = new Float32Array(img.width * img.height * 3);

        for (let i = 0; i < arr.length; i += 3) {
            arr[i] = data[i] / 255;
            arr[i + 1] = data[i + 1] / 255;
            arr[i + 2] = data[i + 2] / 255;
        }

        return new ort.Tensor("float32", arr, [1, 3, img.height, img.width]);
    }

    // Dummy decoder (replace with your logic)
    function decodeOutput(output) {
        return "Recognized text ...";
    }

    return (
        <div className="ocr-box">
            <h2>PaddleOCR Scanner (CDN WASM)</h2>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0];
                    setImage(URL.createObjectURL(file));
                    runOCR(file);
                }}
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
