import { useEffect, useRef, useState } from 'react'
import { Copy, Settings } from 'lucide-react'

export default function StaticMeter({ detectedNumber = '245.45' }) {
    const videoRef = useRef(null)
    const [number, setNumber] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)
    const [copied, setCopied] = useState(false)

    // Real camera access — identical to original
    useEffect(() => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setNumber('Camera not supported on this device')
            return
        }

        navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play()
                        setReady(true)
                    }
                }
            })
            .catch(err => {
                console.error('Camera error:', err)
                setNumber('Camera access denied or not available')
            })
    }, [])

    const handleScan = () => {
        if (!ready || scanning) return

        setScanning(true)
        setNumber('Scanning...')

        // Fake OCR delay, then show your preset number
        setTimeout(() => {
            setNumber(detectedNumber)
            setScanning(false)
        }, 1600)
    }

    const copyNumber = () => {
        if (number && number !== 'Scanning...' && !number.includes('Camera')) {
            navigator.clipboard.writeText(number)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const resetScan = () => {
        setNumber('')
        setCopied(false)
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header — exactly like original */}
            <header className="p-5 text-center relative border-b border-gray-800">
                <h1 className="text-2xl font-bold">Meter Scanner</h1>
                <p className="text-green-400 text-xs mt-1">Free OCR.space Powered</p>
                <button className="absolute right-4 top-5 p-2 bg-gray-800 rounded-lg opacity-50 cursor-not-allowed">
                    <Settings size={22} />
                </button>
            </header>

            {/* Camera View + Overlay — pixel-perfect match */}
            <div className="relative flex-1 bg-black">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Alignment Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 border-dashed rounded-3xl w-11/12 max-w-lg h-32 opacity-80">
                        <p className="text-green-400 text-sm font-bold mt-2 text-center">ALIGN DIGITS HERE</p>
                    </div>
                </div>

                {/* SCAN Button */}
                <button
                    onClick={handleScan}
                    disabled={scanning || !ready}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 text-black font-bold text-2xl rounded-full w-28 h-28 shadow-2xl active:scale-95 transition-all flex items-center justify-center"
                >
                    {scanning ? '•••' : 'SCAN'}
                </button>
            </div>

            {/* Result Section — identical to original */}
            <div className="p-5 bg-gray-900 border-t border-gray-800">
                {scanning && (
                    <div className="text-center py-8">
                        <p className="text-yellow-400 text-lg animate-pulse">Reading meter...</p>
                        <p className="text-gray-400 text-sm mt-2">Hold steady • Good lighting helps</p>
                    </div>
                )}

                {number && !scanning && (
                    <div className={
                        number.includes('Camera') || number.includes('not supported')
                            ? "bg-red-900/40 border-2 border-red-600 rounded-2xl p-5"
                            : "bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500 rounded-2xl p-6"
                    }>
                        {number.includes('Camera') || number.includes('not supported') ? (
                            <p className="text-red-200 text-center text-sm whitespace-pre-wrap">{number}</p>
                        ) : (
                            <>
                                <p className="text-green-300 text-sm font-medium mb-3 text-center">
                                    Detected Number
                                </p>
                                <div className="relative overflow-x-auto py-4">
                                    <p className="text-4xl font-bold font-mono text-center text-white tracking-wider min-w-fit inline-block px-4">
                                        {number}
                                    </p>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={copyNumber}
                                        className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition"
                                    >
                                        <Copy size={22} />
                                        {copied ? 'Copied!' : 'Copy Number'}
                                    </button>
                                    <button
                                        onClick={resetScan}
                                        className="px-6 bg-gray-700 hover:bg-gray-600 font-bold py-4 rounded-xl transition"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {!number && !scanning && ready && (
                    <p className="text-center text-gray-400 text-sm">
                        Point camera at meter digits and tap SCAN
                    </p>
                )}

                {!ready && !number && (
                    <p className="text-center text-gray-400 text-sm py-8">
                        Initializing camera...
                    </p>
                )}
            </div>
        </div>
    )
}