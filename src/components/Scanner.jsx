import React, { useState } from "react";
import { Camera } from "lucide-react";
import Tesseract from "tesseract.js";

export default function Scanner() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imgURL = URL.createObjectURL(file);
            setImage(imgURL);
        }
    };

    const scanText = async () => {
        if (!image) return;
        setLoading(true);
        setText("");

        try {
            const result = await Tesseract.recognize(image, "eng", {
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

            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 p-3 bg-gray-200 rounded-xl cursor-pointer hover:bg-gray-300">
                <Camera />
                <span>Select Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* Preview */}
            {image && (
                <img
                    src={image}
                    alt="Preview"
                    className="w-full rounded-xl shadow-md"
                />
            )}

            {/* Scan Button */}
            {image && (
                <button
                    onClick={scanText}
                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                >
                    {loading ? "Scanning..." : "Scan Text"}
                </button>
            )}

            {/* Output */}
            <div className="p-3 min-h-[120px] bg-gray-100 rounded-xl whitespace-pre-wrap">
                {loading ? "Processing..." : text || "Scanned text will appear here"}
            </div>
        </div>
    );
}
