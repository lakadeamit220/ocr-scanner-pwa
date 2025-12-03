import React, { useState, useRef, useEffect } from "react";
import * as ort from "onnxruntime-web";

export default function PaddleOCRScanner() {
    const [detSession, setDetSession] = useState(null);
    const [recSession, setRecSession] = useState(null);
    const [keys, setKeys] = useState([]);
    const [imageURL, setImageURL] = useState(null);
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef(null);

    // Load models on mount
    useEffect(() => {
        async function load() {
            const det = await ort.InferenceSession.create("/models/det.onnx", {
                executionProviders: ["wasm"],
            });
            const rec = await ort.InferenceSession.create("/models/rec.onnx", {
                executionProviders: ["wasm"],
            });

            const dict = await fetch("/models/keys.json").then((r) => r.json());

            setDetSession(det);
            setRecSession(rec);
            setKeys(dict);

            console.log("OCR models loaded!");
        }

        load();
    }, []);

    // Handle image upload
    function onFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImageURL(url);
        setResult("");
    }

    // Resize image → 960px max side (recommended PaddleOCR scaling)
    function resizeImage(image) {
        const max = 960;
        let { width, height } = image;

        if (Math.max(width, height) > max) {
            const scale = max / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    }

    // Convert image → Float32 tensor (CHW)
    function toTensorFromCanvas(canvas) {
        const h = canvas.height;
        const w = canvas.width;
        const ctx = canvas.getContext("2d");
        const { data } = ctx.getImageData(0, 0, w, h);

        const input = new Float32Array(h * w * 3);
        let j = 0;
        for (let i = 0; i < data.length; i += 4) {
            input[j++] = data[i] / 255;
            input[j++] = data[i + 1] / 255;
            input[j++] = data[i + 2] / 255;
        }

        return new ort.Tensor("float32", input, [1, 3, h, w]);
    }

    // Decode model output text
    function decode(indices) {
        let out = "";
        for (let id of indices) {
            const c = keys[id];
            if (c && c !== "PAD" && c !== "SOS" && c !== "EOS") {
                out += c;
            }
        }
        return out;
    }

    // Main OCR pipeline
    async function scan() {
        if (!detSession || !recSession || !keys.length || !imageURL) {
            alert("Models not loaded yet!");
            return;
        }

        setLoading(true);

        const img = new Image();
        img.src = imageURL;
        await img.decode();

        // Step 1: Resize
        const resizedCanvas = resizeImage(img);

        // Step 2: Convert to tensor
        const detTensor = toTensorFromCanvas(resizedCanvas);

        // Step 3: Run detection
        const detOut = await detSession.run({ input: detTensor });

        const boxes = detOut.boxes ?? detOut.output ?? detOut[Object.keys(detOut)[0]];

        if (!boxes || boxes.data.length === 0) {
            setResult("No text detected");
            setLoading(false);
            return;
        }

        const ctx = resizedCanvas.getContext("2d");
        let finalText = "";

        // Loop over all detected text boxes (polygon format: 8 numbers)
        for (let i = 0; i < boxes.data.length; i += 8) {
            const poly = boxes.data.slice(i, i + 8);

            // Compute bounding box
            const xs = [poly[0], poly[2], poly[4], poly[6]];
            const ys = [poly[1], poly[3], poly[5], poly[7]];

            const x = Math.min(...xs);
            const y = Math.min(...ys);
            const w = Math.max(...xs) - x;
            const h = Math.max(...ys) - y;

            if (w < 5 || h < 5) continue;

            // Crop region
            const crop = ctx.getImageData(x, y, w, h);

            // Create canvas for recognition preprocessing
            const recCanvas = document.createElement("canvas");
            recCanvas.height = 32;
            recCanvas.width = Math.round((32 / h) * w); // keep aspect ratio

            recCanvas.getContext("2d").drawImage(
                resizedCanvas,
                x,
                y,
                w,
                h,
                0,
                0,
                recCanvas.width,
                recCanvas.height
            );

            // Convert to tensor
            const recTensor = toTensorFromCanvas(recCanvas);

            // Run recognition
            const recOut = await recSession.run({ input: recTensor });

            const probs = recOut[Object.keys(recOut)[0]].data;
            const indices = [];
            for (let j = 0; j < probs.length; j += keys.length) {
                let maxIdx = 0;
                let maxVal = -999;
                for (let k = 0; k < keys.length; k++) {
                    if (probs[j + k] > maxVal) {
                        maxVal = probs[j + k];
                        maxIdx = k;
                    }
                }
                indices.push(maxIdx);
            }

            const text = decode(indices);
            if (text.trim()) finalText += text + "\n";
        }

        setResult(finalText || "No readable text found");
        setLoading(false);
    }

    return (
        <div className="p-4 max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-3">PaddleOCR Scanner</h2>

            <input type="file" accept="image/*" onChange={onFileChange} />

            {imageURL && (
                <img
                    src={imageURL}
                    alt="preview"
                    className="mt-4 max-w-full rounded border"
                />
            )}

            <button
                onClick={scan}
                disabled={loading || !imageURL}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
                {loading ? "Scanning..." : "Scan Text"}
            </button>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            <pre className="mt-4 p-2 bg-gray-100 rounded whitespace-pre-wrap">
                {result || "Scanned text will appear here"}
            </pre>
        </div>
    );
}
