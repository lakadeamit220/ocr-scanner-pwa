import { useState } from "react";
import { Camera } from "lucide-react";
import Tesseract from "tesseract.js";

export default function Scanner() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const preprocessImage = (imgURL) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imgURL;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // --- BASIC PREPROCESSING FOR BETTER OCR ---
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

                    // Increase contrast + convert to grayscale
                    const v = avg > 128 ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = v;
                }

                ctx.putImageData(imageData, 0, 0);

                resolve(canvas.toDataURL());
            };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const imgURL = URL.createObjectURL(file);
            const preprocessed = await preprocessImage(imgURL);
            setImage(preprocessed);
        }
    };

    const scanText = async () => {
        if (!image) return;
        setLoading(true);
        setText("");

        try {
            const result = await Tesseract.recognize(image, "eng", {
                tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
                logger: (m) => console.log(m),
            });
            setText(result.data.text);
        } catch (error) {
            console.error(error);
            setText("Error scanning text");
        }

        setLoading(false);
    };

    return (
        <div className="w-full max-w-xl mx-auto p-4 flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center mb-2">OCR Scanner</h1>

            <label className="flex items-center justify-center gap-2 p-3 bg-gray-200 rounded-xl cursor-pointer hover:bg-gray-300">
                <Camera />
                <span>Select Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {image && (
                <img
                    src={image}
                    alt="Preview"
                    className="w-full rounded-xl shadow-md"
                />
            )}

            {image && (
                <button
                    onClick={scanText}
                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                >
                    {loading ? "Scanning..." : "Scan Text"}
                </button>
            )}

            <div className="p-3 min-h-[120px] bg-gray-100 rounded-xl whitespace-pre-wrap">
                {loading ? "Processing..." : text || "Scanned text will appear here"}
            </div>
        </div>
    );
}
