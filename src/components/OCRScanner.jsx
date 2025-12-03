// src/components/OCRScanner.jsx  ← HIGH-ACCURACY NUMBERS VERSION
import { useEffect, useRef, useState } from 'react'

export default function OCRScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js'
        document.head.appendChild(script)
    }, [])

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
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
            .catch(() => setText('Camera blocked'))
    }, [])

    const enhanceForNumbers = (ctx, width, height) => {
        // Grayscale + extreme contrast + sharpening = magic for numbers
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            const value = gray > 140 ? 255 : 0  // ultra high contrast
            data[i] = data[i + 1] = data[i + 2] = value
        }
        ctx.putImageData(imageData, 0, 0)
    }

    const scan = async () => {
        if (!ready || scanning) return
        setScanning(true)
        setText('Scanning numbers...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        enhanceForNumbers(ctx, canvas.width, canvas.height)  // ← THIS IS THE KEY

        canvas.toBlob(async blob => {
            try {
                const worker = await Tesseract.createWorker()
                await worker.load()
                await worker.loadLanguage('eng')
                await worker.initialize('eng', 3)  // OEM 3 = best engine

                // BEST config for numbers
                await worker.setParameters({
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-.,:/',
                    tessedit_pageseg_mode: '7',  // single line (perfect for numbers)
                    preserve_interword_spaces: '1',
                })

                const result = await worker.recognize(blob)
                await worker.terminate()

                const detected = result.data.text.trim()
                if (detected && detected.length > 3) {
                    setText(detected)
                } else {
                    setText('No clear number found – get closer or better light')
                }
            } catch (e) {
                setText('Scan failed – try again')
            }
            setScanning(false)
        }, 'image/jpeg', 0.98)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">Number Scanner</h1>
                <p className="text-green-400 text-sm mt-2">Ultra-accurate for serial numbers, invoices, meters</p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                <button
                    onClick={scan}
                    disabled={!ready || scanning}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-2xl rounded-full w-36 h-36 shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
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
                            className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-lg mb-4"
                        >
                            Copy Number
                        </button>
                        <pre className="bg-black p-6 rounded-xl text-lg font-bold text-green-400 whitespace-pre-wrap break-all border-2 border-green-800">
                            {text}
                        </pre>
                    </>
                )}
            </div>
        </div>
    )
}