// src/components/TesseractLive.jsx
import { useRef, useEffect, useState } from 'react'
import { createWorker } from 'tesseract.js'

export default function TesseractLive() {
    const video = useRef(null)
    const [text, setText] = useState('Point at text...')

    useEffect(() => {
        let worker
        let running = true

        const init = async () => {
            worker = await createWorker()
            await worker.load()
            await worker.loadLanguage('eng')
            await worker.initialize('eng')

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            video.current.srcObject = stream

            const process = async () => {
                if (!running) return
                const canvas = document.createElement('canvas')
                canvas.width = 640
                canvas.height = 480
                const ctx = canvas.getContext('2d')
                ctx.drawImage(video.current, 0, 0, 640, 480)
                canvas.toBlob(async blob => {
                    if (blob) {
                        const { data } = await worker.recognize(blob)
                        setText(data.text || 'No text')
                    }
                }, 'image/jpeg', 0.8)
                setTimeout(process, 800) // every 0.8s
            }
            process()
        }
        init()

        return () => { running = false; worker?.terminate() }
    }, [])

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-4 text-center text-xl font-bold">Live Tesseract OCR</header>
            <video ref={video} autoPlay playsInline className="flex-1 w-full object-cover" />
            <div className="p-4 bg-gray-900">
                <pre className="bg-black p-4 rounded text-sm whitespace-pre-wrap">{text}</pre>
            </div>
        </div>
    )
}