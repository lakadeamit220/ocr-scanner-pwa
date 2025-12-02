// src/components/OCRScanner.jsx
import { useState, useRef, useEffect } from 'react'
import { Camera, Copy, Sparkles } from 'lucide-react'

export default function OCRScanner() {
    const videoRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)

    useEffect(() => {
        // Load Google ML Kit Text Recognizer from CDN
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.0'
        document.body.appendChild(script)

        script.onload = async () => {
            const { TextDetector, FilesetResolver } = window

            const filesetResolver = await FilesetResolver.forTextTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.0/wasm'
            )

            const textDetector = await TextDetector.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_detector/blaze_text_detector_f16/1/blaze_text_detector_f16.tflite'
                },
                runningMode: 'VIDEO'
            })

            const startCamera = async () => {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                    detectText(textDetector, stream)
                }
            }

            const detectText = (detector, stream) => {
                const processFrame = async () => {
                    if (videoRef.current && videoRef.current.readyState === 4) {
                        const results = await detector.detectForVideo(videoRef.current, performance.now())
                        if (results.detections.length > 0) {
                            const detectedText = results.detections.map(d => d.categories[0].categoryName).join(' ')
                            setText(detectedText)
                            setScanning(true)
                        } else {
                            setScanning(false)
                        }
                    }
                    requestAnimationFrame(processFrame)
                }
                processFrame()
            }

            startCamera()
        }
    }, [])

    const copyToClipboard = () => {
        navigator.clipboard.writeText(text)
        alert('Copied!')
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-4 text-center border-b border-gray-800">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Sparkles className="w-8 h-8 text-yellow-400" />
                    Live OCR Scanner
                </h1>
                <p className="text-sm text-gray-400 mt-1">Just point at text — no tap needed!</p>
            </header>

            <div className="relative flex-1">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {scanning && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                        <div className="bg-green-600 px-6 py-3 rounded-full animate-pulse">
                            Detecting text...
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-900 p-4 space-y-3">
                {text ? (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Detected Text:</span>
                            <button onClick={copyToClipboard} className="bg-blue-600 px-4 py-2 rounded flex items-center gap-2">
                                <Copy className="w-4 h-4" /> Copy
                            </button>
                        </div>
                        <pre className="bg-black p-4 rounded text-sm whitespace-pre-wrap break-all max-h-48 overflow-y-auto font-medium">
                            {text}
                        </pre>
                    </>
                ) : (
                    <p className="text-center text-gray-400">Point your camera at any text...</p>
                )}
            </div>
        </div>
    )
}