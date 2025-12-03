// src/components/PaddleOCRScanner.jsx
import React, { useState, useRef } from 'react';
import * as ort from 'onnxruntime-web';

export default function PaddleOCRScanner() {
    const [imageURL, setImageURL] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resultText, setResultText] = useState('');
    const canvasRef = useRef();

    const [models, setModels] = useState({ det: null, rec: null, keys: null });

    // Load models & dictionary when component mounts
    React.useEffect(() => {
        async function load() {
            try {
                const det = await ort.InferenceSession.create('/models/det.onnx', { executionProviders: ['wasm'] });
                const rec = await ort.InferenceSession.create('/models/rec.onnx', { executionProviders: ['wasm'] });
                const keys = await fetch('/models/keys.json').then(r => r.json());
                setModels({ det, rec, keys });
            } catch (e) {
                console.error('Failed to load OCR models:', e);
            }
        }
        load();
    }, []);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImageURL(url);
        setResultText('');
    };

    const runOCR = async () => {
        if (!imageURL || !models.det || !models.rec || !models.keys) return;
        setLoading(true);
        setResultText('');

        const img = new Image();
        img.src = imageURL;
        await new Promise((r) => (img.onload = r));

        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;

        // Preprocess to float32 tensor (normalize to [0,1]), shape may need adapting depending on model
        const input = new Float32Array(width * height * 3);
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
            input[j] = data[i] / 255.0;
            input[j + 1] = data[i + 1] / 255.0;
            input[j + 2] = data[i + 2] / 255.0;
        }
        const tensor = new ort.Tensor('float32', input, [1, 3, height, width]);

        // Run detection model
        let detOut;
        try {
            detOut = await models.det.run({ image: tensor });
        } catch (e) {
            console.error('Detection error:', e);
            setLoading(false);
            return;
        }

        const boxes = detOut['boxes']?.data; // you may need to inspect model output names

        if (!boxes || boxes.length === 0) {
            setResultText('No text detected');
            setLoading(false);
            return;
        }

        let text = '';
        for (let i = 0; i < boxes.length; i += 4) {
            const x1 = boxes[i];
            const y1 = boxes[i + 1];
            const x2 = boxes[i + 2];
            const y2 = boxes[i + 3];
            const w = x2 - x1;
            const h = y2 - y1;

            // Crop region
            const crop = ctx.getImageData(x1, y1, w, h);
            const cd = crop.data;
            const recInput = new Float32Array(w * h * 3);
            for (let k = 0, j = 0; k < cd.length; k += 4, j += 3) {
                recInput[j] = cd[k] / 255.0;
                recInput[j + 1] = cd[k + 1] / 255.0;
                recInput[j + 2] = cd[k + 2] / 255.0;
            }
            const recTensor = new ort.Tensor('float32', recInput, [1, 3, h, w]);

            let recOut;
            try {
                recOut = await models.rec.run({ image: recTensor });
            } catch (e) {
                console.error('Recognition error:', e);
                continue;
            }

            const indexes = recOut['save_infer_model/scale_0.tmp_1']?.data; // output name might differ
            if (!indexes) continue;

            for (const idx of indexes) {
                const ch = models.keys[idx];
                if (ch && ch !== 'PAD' && ch !== 'SOS' && ch !== 'EOS') {
                    text += ch;
                }
            }
            text += ' ';
        }

        setResultText(text.trim() || 'No text found');
        setLoading(false);
    };

    return (
        <div className="p-4 flex flex-col gap-4 items-center">
            <h2 className="text-xl font-bold">PaddleOCR Scanner</h2>
            <input type="file" accept="image/*" onChange={handleFile} />
            {imageURL && <img src={imageURL} alt="to scan" style={{ maxWidth: '100%', marginTop: 16 }} />}
            <button onClick={runOCR} disabled={loading || !imageURL} style={{ marginTop: 12 }}>
                {loading ? 'Scanning...' : 'Scan Text'}
            </button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
                {resultText || 'Scanned text will appear here'}
            </div>
        </div>
    );
}
