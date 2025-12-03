// src/components/GoogleMLKitLive.jsx
import { useEffect, useRef, useState } from 'react'

export default function GoogleMLKitLive() {
    const videoRef = useRef(null)
    const [text, setText] = useState('Starting camera...')

    useEffect(() => {
        let detector = null
        let animationId = null

        const start = async () => {
            // 1. Start camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }

            // 2. Load MediaPipe Vision + Text Detector
            const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14')
            const { FilesetResolver, TextDetector } = vision

            const fileset = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            )

            detector = await TextDetector.createFromOptions(fileset, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_detector/blaze_text_detector_f16/1/blaze_text_detector_f16.tflite'
                },
                runningMode: 'VIDEO'
            })

            const detect = async () => {
                if (!detector || !videoRef.current) return
                try {
                    const result = await detector.detectForVideo(videoRef.current, performance.now())
                    const detected = result.detections
                        .map(d => d.categories[0]?.categoryName || '')
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                    setText(detected || 'No text detected')
                } catch (e) { }
                animationId = requestAnimationFrame(detect)
            }

            detect()
        }

        start()

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
            detector?.close()
            videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
        }
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold text-green-400">Google ML Kit Live</h1>
                <p className="text-sm mt-2">Real-time • No tap needed</p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-green-600 px-6 py-3 rounded-full font-bold animate-pulse">
                    LIVE
                </div>
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