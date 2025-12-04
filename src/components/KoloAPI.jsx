import { useState } from "react";
import { extractTextFromImage } from "../utils/api";

export default function KoloAPI() {
    const [imgFile, setImgFile] = useState();
    const [extractedText, setExtractedText] = useState("");

    const handleExtractText = async () => {
        if (imgFile) {
            const text = await extractTextFromImage(imgFile);
            setExtractedText(text.result_string);
            alert("Extracted Text: " + text.result_string);
        }
        else {
            alert("Please select an image file first.");
        }
    }

    return (
        <div>
            <input type="file" onChange={(e) => setImgFile(e.target.files[0])} />
            <button onClick={handleExtractText}>Submit</button>
        </div>
    )
}