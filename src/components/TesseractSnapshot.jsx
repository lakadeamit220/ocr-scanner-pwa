// src/components/TesseractSnapshot.jsx
import { useRef, useEffect, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { Camera, Copy, Loader2 } from 'lucide-react'

export default function TesseractSnapshot() {
    const video = useRef(null)
    const canvas = useRef(null)
    const [text, setText] = useState('')
    const [working, setWorking] = useState(false)

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => video.current.srcObject = stream)
    }, [])

    const scan = async () => {
        setWorking(true)
        const ctx = canvas.current.getContext('2d')
        ctx.drawImage(video.current, 0, 0, 640, 480)
        const blob = await new Promise(r => canvas.current.toBlob(r, 'image/jpeg', 0.9))

        const worker = await createWorker()
        await worker.load()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')
        const { data } = await worker.recognize(blob)
        setText(data.text || 'No text found')
        await worker.terminate()
        setWorking(false)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-4 text-center">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                    <Camera /> Tesseract Snapshot
                </h1>
            </header>

            <div className="relative flex-1">
                <video ref={video} autoPlay playsInline className="w-full h-full object-cover" />
                <button
                    onClick={scan}
                    disabled={working}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-black rounded-full p-6 shadow-2xl"
                >
                    {working ? <Loader2 className="w-10 h-10 animate-spin" /> : <Camera className="w-10 h-10" />}
                </button>
                <canvas ref={canvas} width={640} height={480} className="hidden" />
            </div>

            <div className="p-4 bg-gray-900">
                {text && (
                    <>
                        <button onClick={() => navigator.clipboard.writeText(text)} className="mb-2 bg-blue-600 px-4 py-2 rounded flex items-center gap-2 mx-auto">
                            <Copy size={16} /> Copy
                        </button>
                        <pre className="bg-black p-4 rounded text-sm whitespace-pre-wrap">{text}</pre>
                    </>
                )}
            </div>
        </div>
    )
}