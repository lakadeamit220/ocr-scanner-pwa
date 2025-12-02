// src/components/OCRScanner.jsx
import { useEffect, useRef, useState } from 'react'

export default function OCRScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)

    // Load Tesseract once from CDN
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js'
        document.head.appendChild(script)
    }, [])

    // Start camera
    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play()
                        setReady(true)
                    }
                }
            })
            .catch(() => setText('Camera blocked – please allow camera permission'))
    }, [])

    const scan = async () => {
        if (!ready || scanning) return
        setScanning(true)
        setText('Scanning...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        canvas.toBlob(async blob => {
            try {
                const worker = await Tesseract.createWorker('eng')
                const ret = await worker.recognize(blob)
                await worker.terminate()
                setText(ret.data.text.trim() || 'No text detected')
            } catch (e) {
                setText('OCR error – try again')
            }
            setScanning(false)
        }, 'image/jpeg')
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">OCR Scanner</h1>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                <button
                    onClick={scan}
                    disabled={!ready || scanning}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-2xl rounded-full w-32 h-32 shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                    {scanning ? '⋯' : 'SCAN'}
                </button>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="p-6 bg-gray-900">
                {text && (
                    <>
                        <button
                            onClick={() => navigator.clipboard.writeText(text)}
                            className="w-full bg-blue-600 py-3 rounded-lg font-bold mb-4"
                        >
                            Copy Text
                        </button>
                        <pre className="bg-black p-5 rounded-xl text-sm whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono border border-gray-700">
                            {text}
                        </pre>
                    </>
                )}
            </div>
        </div>
    )
}