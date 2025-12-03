// src/components/GoogleMLKitLive.jsx
import { useEffect, useRef, useState } from 'react'

export default function GoogleMLKitLive() {
    const videoRef = useRef(null)
    const [text, setText] = useState('Point at text...')
    const [detecting, setDetecting] = useState(false)

    useEffect(() => {
        let detector

        const startCamera = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            videoRef.current.srcObject = stream
        }

        const loadMLKit = async () => {
            const { TextDetector, FilesetResolver } = window.vision || {}

            if (!TextDetector) {
                const script = document.createElement('script')
                script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
                script.onload = loadMLKit
                document.head.appendChild(script)
                return
            }

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            )

            detector = await TextDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/text_detector/blaze_text_detector_f16/1/blaze_text_detector_f16.tflite`
                },
                runningMode: 'VIDEO'
            })

            setDetecting(true)
            detectFrame()
        }

        const detectFrame = async () => {
            if (!detector || !videoRef.current) return
            try {
                const result = await detector.detectForVideo(videoRef.current, performance.now())
                const detected = result.detections
                    .map(d => d.categories[0]?.categoryName || '')
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                setText(detected || 'No text detected')
            } catch (e) { /* ignore */ }
            requestAnimationFrame(detectFrame)
        }

        startCamera()
        loadMLKit()
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">Google ML Kit Live</h1>
                <p className="text-green-400">Real-time • No tap needed</p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {detecting && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-green-600 px-6 py-3 rounded-full text-lg font-bold animate-pulse">
                        Detecting...
                    </div>
                )}
            </div>

            <div className="p-6 bg-gray-900">
                <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="w-full bg-green-600 py-4 rounded-xl font-bold mb-4"
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