// src/components/TesseractSnapshot.jsx
import { useEffect, useRef, useState } from 'react'

export default function TesseractSnapshot() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [text, setText] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play()
                    setReady(true)
                }
            })
    }, [])

    const scan = async () => {
        if (!ready || scanning) return
        setScanning(true)
        setText('Processing...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        // Preprocess: high contrast
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imgData.data
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11
            const v = gray > 130 ? 255 : 0
            data[i] = data[i + 1] = data[i + 2] = v
        }
        ctx.putImageData(imgData, 0, 0)

        canvas.toBlob(async blob => {
            const worker = await Tesseract.createWorker()
            await worker.load()
            await worker.loadLanguage('eng')
            await worker.initialize('eng')
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -.,/:@()',
                tessedit_pageseg_mode: '6'
            })
            const { data } = await worker.recognize(blob)
            await worker.terminate()
            setText(data.text.trim() || 'No text found')
            setScanning(false)
        }, 'image/jpeg')
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <header className="p-6 text-center border-b border-gray-800">
                <h1 className="text-3xl font-bold">Tesseract Snapshot</h1>
                <p className="text-blue-400">Tap to scan – Highest accuracy</p>
            </header>

            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <button
                    onClick={scan}
                    disabled={scanning || !ready}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-2xl rounded-full w-32 h-32 shadow-2xl active:scale-95 disabled:opacity-50"
                >
                    {scanning ? '...' : 'SCAN'}
                </button>
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {text && !scanning && (
                <div className="p-6 bg-gray-900">
                    <button onClick={() => navigator.clipboard.writeText(text)} className="w-full bg-blue-600 py-4 rounded-xl font-bold mb-4">
                        Copy Text
                    </button>
                    <pre className="bg-black p-5 rounded-xl text-sm whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono border border-blue-800">
                        {text}
                    </pre>
                </div>
            )}
        </div>
    )
}