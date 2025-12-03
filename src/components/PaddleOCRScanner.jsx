import React, { useState, useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";

export default function PaddleOCRScanner() {
    const [detSession, setDetSession] = useState(null);
    const [recSession, setRecSession] = useState(null);
    const [keys, setKeys] = useState([]);
    const [text, setText] = useState("Scanned text will appear here");
    const fileInputRef = useRef();

    // Load ONNX models + keys
    useEffect(() => {
        async function loadModels() {
            try {
                const det = await ort.InferenceSession.create("/models/det.onnx", {
                    executionProviders: ["wasm"],
                });
                const rec = await ort.InferenceSession.create("/models/rec.onnx", {
                    executionProviders: ["wasm"],
                });
                const keysJson = await fetch("/models/keys.json").then((res) => res.json());

                setDetSession(det);
                setRecSession(rec);
                setKeys(keysJson);
            } catch (e) {
                console.error("Model load error", e);
            }
        }
        loadModels();
    }, []);

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = async () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (!detSession || !recSession) {
                setText("Models not loaded yet!");
                return;
            }

            const detTensor = new ort.Tensor("float32", imageData.data, [1, img.height, img.width, 4]);
            const detOut = await detSession.run({ input: detTensor });

            let finalText = "";

            for (const box of detOut.boxes || []) {
                const crop = cropBox(imageData, box);
                if (!crop) continue;

                const recTensor = new ort.Tensor("float32", crop, [1, crop.height, crop.width, 4]);
                const recOut = await recSession.run({ input: recTensor });

                const textIndex = argmax(recOut.logits.data);
                finalText += keys[textIndex] || "";
            }

            setText(finalText || "No text detected");
        };
    }

    function cropBox(imageData, box) {
        try {
            const [x1, y1, x2, y2] = box.map((v) => Math.max(0, Math.floor(v)));
            const w = x2 - x1;
            const h = y2 - y1;
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = w;
            cropCanvas.height = h;
            const ctx = cropCanvas.getContext("2d");
            ctx.putImageData(imageData, -x1, -y1);
            return ctx.getImageData(0, 0, w, h).data;
        } catch (e) {
            console.error("Crop error", e);
            return null;
        }
    }

    function argmax(arr) {
        return arr.indexOf(Math.max(...arr));
    }

    return (
        <div className="p-4 space-y-4 max-w-xl mx-auto">
            <h2 className="text-xl font-bold">PaddleOCR Scanner</h2>

            <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                ref={fileInputRef}
                className="border p-2 rounded"
            />

            <button
                onClick={() => fileInputRef.current.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded"
            >
                Choose File
            </button>

            <div className="border p-3 rounded text-sm whitespace-pre-wrap min-h-[80px]">
                {text}
            </div>
        </div>
    );
}
