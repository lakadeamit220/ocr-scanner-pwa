import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";

export default function PaddleOCRScanner() {
    const [imageURL, setImageURL] = useState(null);
    const [scannedText, setScannedText] = useState("");
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    const [detSession, setDetSession] = useState(null);
    const [recSession, setRecSession] = useState(null);
    const [keys, setKeys] = useState([]);

    // -------------------------------------------------------------
    // 1. Initialize ONNX Runtime WASM paths (MUST be set before createSession)
    // -------------------------------------------------------------
    const initOnnxRuntime = async () => {
        ort.env.wasm.wasmPaths = {
            "ort-wasm.wasm": "/onnx/ort-wasm.wasm",
            "ort-wasm-simd.wasm": "/onnx/ort-wasm-simd.wasm",
            "ort-wasm-threaded.wasm": "/onnx/ort-wasm-threaded.wasm",
        };

        ort.env.wasm.numThreads = 1;
        ort.env.wasm.simd = true;
    };

    // -------------------------------------------------------------
    // 2. Load models + keys.json
    // -------------------------------------------------------------
    const loadModels = async () => {
        try {
            await initOnnxRuntime();

            console.log("Loading OCR models...");

            const det = await ort.InferenceSession.create("/onnx/models/det.onnx");
            const rec = await ort.InferenceSession.create("/onnx/models/rec.onnx");

            const keysJson = await fetch("/onnx/models/keys.json").then((res) =>
                res.json()
            );

            setDetSession(det);
            setRecSession(rec);
            setKeys(keysJson);

            console.log("OCR models loaded!");
            setReady(true);
        } catch (err) {
            console.error("Model load error:", err);
        }
    };

    useEffect(() => {
        loadModels();
    }, []);

    // -------------------------------------------------------------
    // 3. File selection
    // -------------------------------------------------------------
    const onSelectImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageURL(URL.createObjectURL(file));
    };

    // -------------------------------------------------------------
    // 4. RUN OCR PIPELINE — simplified (det + rec)
    // -------------------------------------------------------------
    const scanText = async () => {
        if (!detSession || !recSession || !keys.length) {
            alert("Models not loaded yet!");
            return;
        }
        if (!imageURL) {
            alert("Please choose an image first.");
            return;
        }

        setLoading(true);

        try {
            // Load image as HTMLImageElement
            const img = await loadImage(imageURL);

            // Convert to tensor (this is a minimal example)
            const inputTensor = preprocessImage(img);

            // --- Run detection ---
            const detOutput = await detSession.run({ "input": inputTensor });
            console.log("DET OUT:", detOutput);

            // Fake recognition for template (you will replace)
            const recognizedText = "[Demo] PaddleOCR pipeline connected ✔️";

            setScannedText(recognizedText);
        } catch (err) {
            console.error("Scan error:", err);
            setScannedText("Scan failed. Check console.");
        }

        setLoading(false);
    };

    // -------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------
    const loadImage = (src) =>
        new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.src = src;
        });

    const preprocessImage = (img) => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 640, 640);

        const imgData = ctx.getImageData(0, 0, 640, 640);
        const data = imgData.data;

        const arr = new Float32Array(640 * 640 * 3);

        let idx = 0;
        for (let i = 0; i < data.length; i += 4) {
            arr[idx++] = data[i] / 255;     // R
            arr[idx++] = data[i + 1] / 255; // G
            arr[idx++] = data[i + 2] / 255; // B
        }

        return new ort.Tensor("float32", arr, [1, 3, 640, 640]);
    };

    // -------------------------------------------------------------
    // UI
    // -------------------------------------------------------------
    return (
        <div className="p-6 max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">PaddleOCR Scanner</h2>

            {!ready && (
                <p className="text-red-500 font-semibold mb-4">Loading models...</p>
            )}

            <input
                type="file"
                accept="image/*"
                onChange={onSelectImage}
                className="mb-4"
            />

            {imageURL && (
                <img
                    src={imageURL}
                    alt="preview"
                    className="border rounded w-full mb-4"
                />
            )}

            <button
                onClick={scanText}
                disabled={!ready || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Scanning..." : "Scan Text"}
            </button>

            <div className="mt-4 p-3 border rounded bg-gray-100 text-left">
                <h3 className="font-semibold mb-2">Scanned Text:</h3>
                <pre className="whitespace-pre-wrap">{scannedText}</pre>
            </div>
        </div>
    );
}
