import React, { useState } from "react";

export default function PaddleOCRScanner() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    // Load ONNXRuntime Web from CDN
    async function loadOrtFromCDN() {
        // Import the ES module from CDN
        const ort = await import(
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs"
        );

        console.log("ORT loaded from CDN, version:", ort.version);

        return ort;
    }

    // Convert image → tensor
    async function imageToTensor(img, ort) {
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

    // Dummy decoder (replace with your OCR decoding)
    function decodeOutput(output) {
        return "Recognized text ...";
    }

    // Run OCR on selected file
    async function runOCR(file) {
        setLoading(true);
        setText("");

        try {
            const ort = await loadOrtFromCDN();

            // Load ONNX model from CDN
            const session = await ort.InferenceSession.create(
                "https://cdn.jsdelivr.net/npm/paddleocr-js@latest/models/ocr_rec.onnx",
                {
                    executionProviders: ["wasm"], // use WASM backend
                    // Specify CDN path for WASM files
                    wasmPaths:
                        "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/wasm/",
                }
            );

            const img = await createImageBitmap(file);
            const tensor = await imageToTensor(img, ort);

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

    return (
        <div className="ocr-box">
            <h2>PaddleOCR Scanner (CDN WASM)</h2>

            <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
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
