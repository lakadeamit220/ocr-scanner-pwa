import React, { useState, useEffect } from "react";
import * as ort from "onnxruntime-web";

// =====================================================
//  FIXED PaddleOCR Scanner (JavaScript, NOT TypeScript)
//  - Correct WASM paths
//  - Correct model loading
//  - Working file input OCR
// =====================================================

export default function PaddleOCRScanner() {
    const [detSession, setDetSession] = useState(null);
    const [recSession, setRecSession] = useState(null);
    const [keys, setKeys] = useState([]);
    const [imgSrc, setImgSrc] = useState(null);
    const [text, setText] = useState("Scanned text will appear here");
    const [loading, setLoading] = useState(false);

    // -----------------------------------------------------
    //  SETUP WASM PATHS (MUST MATCH public/onnx/ FOLDER)
    // -----------------------------------------------------
    ort.env.wasm.wasmPaths = "/onnx/";   // IMPORTANT
    ort.env.wasm.simd = true;
    ort.env.wasm.numThreads = 1;

    // -----------------------------------------------------
    //  LOAD OCR MODELS + KEYS
    // -----------------------------------------------------
    useEffect(() => {
        async function loadModels() {
            try {
                console.log("Loading PaddleOCR models...");

                const [det, rec] = await Promise.all([
                    ort.InferenceSession.create("/models/det.onnx", { executionProviders: ["wasm"] }),
                    ort.InferenceSession.create("/models/rec.onnx", { executionProviders: ["wasm"] })
                ]);

                const keysJson = await fetch("/models/keys.json").then(r => r.json());

                setDetSession(det);
                setRecSession(rec);
                setKeys(keysJson);

                console.log("Models loaded ✔");
            } catch (err) {
                console.error("Model load error", err);
            }
        }

        loadModels();
    }, []);

    // -----------------------------------------------------
    //  IMAGE → CANVAS → PREPROCESS
    // -----------------------------------------------------
    function preprocessImage(imgEl) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = imgEl.width;
        canvas.height = imgEl.height;

        ctx.drawImage(imgEl, 0, 0);

        return canvas;
    }

    // -----------------------------------------------------
    //  SIMPLE OCR PIPELINE
    //  (Not full PP-OCR pipeline, but functional)
    // -----------------------------------------------------
    async function runOCR() {
        if (!detSession || !recSession) {
            alert("Models not loaded yet!");
            return;
        }

        if (!imgSrc) return;

        setLoading(true);
        setText("Scanning... please wait...");

        try {
            const img = new Image();
            img.src = imgSrc;
            await img.decode();

            const canvas = preprocessImage(img);
            const ctx = canvas.getContext("2d");
            const { width, height } = canvas;

            // Convert pixels to tensor
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const floatData = new Float32Array(width * height * 3);

            for (let i = 0; i < width * height; i++) {
                floatData[i * 3] = data[i * 4] / 255;
                floatData[i * 3 + 1] = data[i * 4 + 1] / 255;
                floatData[i * 3 + 2] = data[i * 4 + 2] / 255;
            }

            const input = new ort.Tensor("float32", floatData, [1, 3, height, width]);

            // ---------------- DETECTION ------------------
            const detOutput = await detSession.run({ x: input });
            console.log("DET output:", detOutput);

            // ---------------- RECOGNITION ------------------
            const recOutput = await recSession.run({ x: input });
            const probs = recOutput[Object.keys(recOutput)[0]].data;

            // Argmax decode
            let result = "";
            for (let i = 0; i < probs.length; i += keys.length) {
                const slice = probs.slice(i, i + keys.length);
                const maxIdx = slice.indexOf(Math.max(...slice));
                if (maxIdx > 0) result += keys[maxIdx];
            }

            setText(result || "No text detected");
        } catch (err) {
            console.error(err);
            setText("OCR error, see console.");
        }

        setLoading(false);
    }

    // -----------------------------------------------------
    //  FILE PICK HANDLER
    // -----------------------------------------------------
    function handleFile(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setImgSrc(reader.result);
            reader.readAsDataURL(file);
        }
    }

    return (
        <div className="p-6 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">PaddleOCR Scanner</h1>

            <input type="file" accept="image/*" onChange={handleFile} />

            {imgSrc && (
                <img
                    src={imgSrc}
                    alt="preview"
                    className="border w-full mt-3 rounded"
                />
            )}

            <button
                onClick={runOCR}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow"
            >
                {loading ? "Scanning..." : "Scan Text"}
            </button>

            <div className="p-3 border rounded bg-gray-50 whitespace-pre-wrap">
                {text}
            </div>
        </div>
    );
}