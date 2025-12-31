// src/components/GoogleMLKitLive.jsx
import { useEffect, useRef, useState } from 'react'

export default function GoogleMLKitLive() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('Starting camera...')
    const [isLiveWorking, setIsLiveWorking] = useState(false)
    const [scanning, setScanning] = useState(false)

    // Load MediaPipe + Text Detector properly
    useEffect(() => {
        let detector = null
        let animationId = null

        const init = async () => {
            try {
                // 1. Start camera
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                }

                // 2. Load MediaPipe Vision (dynamic import = no CORS issues)
                const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14')
                const { FilesetResolver, TextDetector } = vision

                const fileset = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
                )

                detector = await TextDetector.createFromOptions(fileset, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_detector/blaze_text_detector_f16/1/blaze_text_detector_f16.tflite'
                    },
                    runningMode: 'VIDEO',
                    maxResults: 20
                })

                setIsLiveWorking(true)
                setText('Live detection active — point at text')

                // Live detection loop
                const detect = async () => {
                    if (!detector || !videoRef.current) return
                    try {
                        const result = await detector.detectForVideo(videoRef.current, performance.now())
                        if (result.detections.length > 0) {
                            const detected = result.detections
                                .map(d => d.categories[0]?.categoryName || '')
                                .join(' ')
                                .replace(/\s+/g, ' ')
                                .trim()
                            setText(detected)
                        }
                    } catch (e) { }
                    animationId = requestAnimationFrame(detect)
                }
                detect()
            } catch (err) {
                console.log('Live ML Kit failed, falling back to manual scan')
                setText('Live detection unavailable — use SCAN button')
            }
        }

        init()

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
            detector?.close?.()
            videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // Manual scan fallback
    const manualScan = async () => {
        if (!videoRef.current || scanning) return
        setScanning(true)
        setText('Scanning...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        canvas.toBlob(async (blob) => {
            try {
                const worker = await Tesseract.createWorker()
                await worker.load()
                await worker.loadLanguage('eng')
                await worker.initialize('eng')
                const { data } = await worker.recognize(blob)
                await worker.terminate()
                setText(data.text.trim() || 'No text found')
            } catch (e) {
                setText('Manual scan failed')
            }
            setScanning(false)
        }, 'image/jpeg')
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold text-green-400">Google ML Kit OCR</h1>
                <p className="text-sm mt-2">
                    {isLiveWorking ? 'Live mode active' : 'Live failed — using manual scan'}
                </p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                {/* Live indicator */}
                {isLiveWorking && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                        LIVE
                    </div>
                )}

                {/* Manual SCAN button (always visible as fallback) */}
                <button
                    onClick={manualScan}
                    disabled={scanning}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-2xl rounded-full w-32 h-32 shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                    {scanning ? '...' : 'SCAN'}
                </button>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="p-6 bg-gray-900">
                <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="w-full bg-green-600 py-4 rounded-xl font-bold text-lg mb-4"
                >
                    Copy Text
                </button>
                <pre className="bg-black p-5 rounded-xl text-sm whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono border border-green-800">
                    {text}
                </pre>
            </div>
        </div>
    )
}