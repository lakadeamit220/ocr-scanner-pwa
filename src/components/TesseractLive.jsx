// src/components/TesseractLive.jsx
import { useEffect, useRef, useState } from 'react'

export default function TesseractLive() {
    const videoRef = useRef(null)
    const [text, setText] = useState('Starting...')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let worker
        let running = true

        const init = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            videoRef.current.srcObject = stream

            worker = await Tesseract.createWorker()
            await worker.load()
            await worker.loadLanguage('eng')
            await worker.initialize('eng')
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -.,/:@()',
            })

            setReady(true)
            scanLoop()
        }

        const scanLoop = async () => {
            if (!running || !videoRef.current) return
            const canvas = document.createElement('canvas')
            canvas.width = 1280
            canvas.height = 720
            const ctx = canvas.getContext('2d')
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(async (blob) => {
                if (blob && running) {
                    try {
                        const { data } = await worker.recognize(blob)
                        setText(data.text.trim() || 'No text')
                    } catch (e) { /* ignore */ }
                }
            }, 'image/jpeg', 0.9)

            setTimeout(scanLoop, 1500) // every 1.5 sec
        }

        init()

        return () => {
            running = false
            worker?.terminate()
            videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
        }
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">Tesseract Live</h1>
                <p className="text-yellow-400">Updates every 1.5s</p>
            </header>

            <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover" />

            <div className="p-6 bg-gray-900">
                <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="w-full bg-yellow-600 py-4 rounded-xl font-bold mb-4"
                >
                    Copy Text
                </button>
                <pre className="bg-black p-5 rounded-xl text-sm whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono border border-yellow-800">
                    {text}
                </pre>
            </div>
        </div>
    )
}