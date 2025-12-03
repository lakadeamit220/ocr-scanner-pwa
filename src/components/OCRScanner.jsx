// src/components/OCRScanner.jsx
import { useEffect, useRef, useState } from 'react'

export default function OCRScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)
    const [tesseractReady, setTesseractReady] = useState(false)

    // Load Tesseract from CDN and wait until it's fully ready
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js'
        script.onload = () => {
            console.log('Tesseract.js loaded')
            setTesseractReady(true)
        }
        document.head.appendChild(script)
    }, [])

    // Start camera
    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
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
            .catch(() => setText('Camera blocked – allow permission'))
    }, [])

    const scan = async () => {
        if (!ready || scanning || !tesseractReady) {
            setText('Tesseract not ready yet...')
            return
        }

        setScanning(true)
        setText('Processing image...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // High contrast B&W (boosts accuracy)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            const value = gray > 128 ? 255 : 0
            data[i] = data[i + 1] = data[i + 2] = value
        }
        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob(async (blob) => {
            try {
                const worker = await Tesseract.createWorker()
                await worker.load()
                await worker.loadLanguage('eng')
                await worker.initialize('eng')

                // BEST SETTINGS FOR NUMBERS & TEXT
                await worker.setParameters({
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -.,/:@()',
                    tessedit_pageseg_mode: '6',
                    preserve_interword_spaces: '1',
                })

                const { data: { text } } = await worker.recognize(blob)
                await worker.terminate()

                const result = text
                    .replace(/[^\w\s.,\/:@()-]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()

                setText(result || 'No text found – try closer or better lighting')
            } catch (err) {
                console.error(err)
                setText('OCR failed – try again')
            }
            setScanning(false)
        }, 'image/jpeg', 0.98)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">OCR Scanner</h1>
                <p className="text-green-400 text-sm mt-2">High Accuracy • Numbers & Text</p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                {/* Guide box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 border-dashed rounded-3xl w-11/12 max-w-lg h-52 opacity-70" />
                </div>

                <button
                    onClick={scan}
                    disabled={!ready || scanning || !tesseractReady}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-green-500 text-black font-bold text-2xl rounded-full w-32 h-32 shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                    {scanning ? '...' : 'SCAN'}
                </button>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="p-6 bg-gray-900">
                {text && !scanning && (
                    <>
                        <button
                            onClick={() => navigator.clipboard.writeText(text)}
                            className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-lg mb-4"
                        >
                            Copy Text
                        </button>
                        <pre className="bg-black p-5 rounded-xl text-sm whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono border-2 border-green-800">
                            {text}
                        </pre>
                    </>
                )}
                {scanning && (
                    <p className="text-center text-yellow-400 text-lg font-medium">Processing... (2–4 seconds)</p>
                )}
            </div>
        </div>
    )
}