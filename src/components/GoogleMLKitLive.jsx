// src/components/GoogleMLKitLive.jsx
import { useEffect, useRef, useState } from 'react'

export default function GoogleMLKitLive() {
    const video = useRef(null)
    const [text, setText] = useState('')

    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
        script.onload = async () => {
            const { TextDetector, FilesetResolver } = window.vision
            const files = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            )
            const detector = await TextDetector.createFromOptions(files, {
                baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/text_detector/blaze_text_detector_f16/1/blaze_text_detector_f16.tflite' },
                runningMode: 'VIDEO'
            })

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            video.current.srcObject = stream

            const process = async () => {
                const result = await detector.detectForVideo(video.current, performance.now())
                setText(result.detections.map(d => d.categories[0].categoryName).join(' ') || 'No text')
                requestAnimationFrame(process)
            }
            process()
        }
        document.body.appendChild(script)
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-4 text-center text-xl font-bold text-yellow-400">Google ML Kit Live</header>
            <video ref={video} autoPlay playsInline className="flex-1 w-full object-cover" />
            <div className="p-4 bg-gray-900 text-center text-lg font-mono">{text}</div>
        </div>
    )
}