// src/components/OCRScanner.jsx
import { useState, useRef, useEffect } from 'react'
import { createWorker } from 'tesseract.js'
import { Camera, Copy, AlertCircle, Loader2 } from 'lucide-react'

export default function OCRScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)
    const [cameraActive, setCameraActive] = useState(false)
    const [error, setError] = useState('')

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // rear camera on mobile
                audio: false
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setCameraActive(true)
                setError('')
            }
        } catch (err) {
            setError('Camera access denied or not available')
            console.error('Camera error:', err)
        }
    }

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop())
            setCameraActive(false)
        }
    }

    const doOCR = async (imageBlob) => {
        setScanning(true)
        setText('')

        const worker = await createWorker({
            logger: m => console.log('Tesseract progress:', m)
        })

        await worker.load()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')

        const { data: { text } } = await worker.recognize(imageBlob)
        setText(text.trim() || 'No text detected')
        await worker.terminate()
        setScanning(false)
    }

    const captureAndScan = () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        canvas.toBlob(blob => {
            if (blob) doOCR(blob)
        }, 'image/jpeg', 0.95)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
    }

    useEffect(() => {
        startCamera()
        return () => stopCamera() // cleanup on unmount
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="bg-black p-4 text-center border-b border-gray-800">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Camera className="w-8 h-8" />
                    OCR Scanner
                </h1>
            </header>

            {/* Camera View */}
            <div className="relative flex-1 bg-black">
                {cameraActive ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <p className="text-red-400 text-center px-4">
                            {error || 'Starting camera...'}
                        </p>
                    </div>
                )}

                {/* Scan Button */}
                <button
                    onClick={captureAndScan}
                    disabled={scanning || !cameraActive}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-black rounded-full p-6 shadow-2xl disabled:opacity-50 active:scale-95 transition-all z-10"
                >
                    {scanning ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : (
                        <Camera className="w-10 h-10" />
                    )}
                </button>

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Result Panel */}
            <div className="bg-gray-900 p-4 min-h-48">
                {error && !cameraActive ? (
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                ) : text ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Scanned Text:</h2>
                            <button
                                onClick={copyToClipboard}
                                className="bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                            >
                                <Copy className="w-4 h-4" />
                                Copy
                            </button>
                        </div>
                        <div className="bg-black rounded-lg p-4 font-mono text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                            {text}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center">Tap the camera button to scan text</p>
                )}
            </div>
        </div>
    )
}