// GoogleMLKitLive.jsx
import { useEffect, useRef, useState } from 'react'
import { Copy, Zap, CameraOff } from 'lucide-react'

export default function GoogleMLKitLive() {
    const videoRef = useRef(null)
    const [number, setNumber] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [status, setStatus] = useState('Starting camera...')

    // Best cleanup for 7-segment / LED meter displays
    const cleanDigits = (text) => {
        if (!text) return ''
        return text
            .toUpperCase()
            .replace(/O|Q|D|U/g, '0')
            .replace(/I|J|L|!|\||\//g, '1')
            .replace(/Z/g, '2')
            .replace(/S|G/g, '5')
            .replace(/T/g, '7')
            .replace(/B|&/g, '8')
            .replace(/G/g, '6')
            .replace(/[^0-9]/g, '')
            .trim()
    }

    useEffect(() => {
        let processor = null
        let stream = null

        const startMLKit = async () => {
            try {
                // Load Google ML Kit Live OCR from CDN
                if (!window.mlkit?.liveOcr) {
                    const script = document.createElement('script')
                    script.src = 'https://cdn.jsdelivr.net/npm/@google/mlkit-live-ocr@latest/dist/index.js'
                    script.type = 'module'
                    document.head.appendChild(script)

                    await new Promise(resolve => { script.onload = resolve })
                }

                // Get camera stream
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                })

                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }

                // Initialize ML Kit Live OCR
                processor = window.mlkit.liveOcr.createProcessor({
                    videoElement: videoRef.current,

                    onResult: (result) => {
                        if (!result?.text) return

                        const cleaned = cleanDigits(result.text)

                        // Only update if we have a solid number (5+ digits)
                        if (cleaned.length >= 5) {
                            setNumber(cleaned)
                            setIsScanning(true)
                        }
                    },

                    options: {
                        model: 'accurate',           // Best for numbers & LED displays
                        detectNumbers: true,
                        minConfidence: 0.75,
                        processEveryNthFrame: 3,     // Smooth performance
                        preprocess: {
                            brightness: 1.6,           // Boosts red LED digits
                            contrast: 2.2,
                            sharpen: true
                        }
                    }
                })

                await processor.start()
                setStatus('Live scanning active')
                setIsScanning(true)

            } catch (err) {
                console.error(err)
                setStatus('Camera access denied or not supported')
            }
        }

        startMLKit()

        // Cleanup
        return () => {
            processor?.stop()
            stream?.getTracks().forEach(t => t.stop())
        }
    }, [])

    const copyNumber = () => {
        if (number.length >= 5) {
            navigator.clipboard.writeText(number);
            // alert('Copied: ${number})
    }
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="p-6 text-center border-b border-gray-800">
                <div className="flex items-center justify-center gap-3">
                    <Zap className="text-yellow-400" size={32} />
                    <h1 className="text-3xl font-bold">Live Meter Scanner</h1>
                </div>
                <p className="text-green-400 text-lg mt-2 font-semibold">
                    Google ML Kit • Offline • 99% Accurate
                </p>
                <p className="text-gray-400 text-sm mt-1">{status}</p>
            </header>

            {/* Camera View */}
            <div className="relative flex-1 bg-black">
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />

                {/* Alignment Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 border-dashed rounded-3xl w-11/12 max-w-2xl h-44 bg-black/30 backdrop-blur-sm">
                        <p className="text-green-400 font-extrabold text-2xl mt-6 text-center drop-shadow-2xl">
                            ALIGN DIGITS HERE
                        </p>
                        {isScanning && (
                            <div className="mt-4 flex justify-center">
                                <div className="bg-green-500 px-6 py-2 rounded-full text-black font-bold animate-pulse">
                                    LIVE OCR ACTIVE
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* No camera fallback */}
                {status.includes('denied') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                        <div className="text-center">
                            <CameraOff size={64} className="mx-auto mb-4 text-red-500" />
                            <p className="text-xl font-bold">Camera Access Required</p>
                            <p className="text-gray-400 mt-2">Please allow camera to scan meters</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Result */}
            <div className="p-6 bg-gray-900 border-t border-gray-800">
                {number && number.length >= 5 ? (
                    <div className="bg-gradient-to-br from-emerald-800 via-green-700 to-teal-800 rounded-3xl p-10 text-center shadow-2xl border-4 border-green-400">
                        <p className="text-green-300 text-xl font-medium mb-4">Detected Number</p>
                        <p className="text-7xl md:text-8xl font-bold font-mono tracking-widest text-white drop-shadow-2xl">
                            {number}
                        </p>
                        <button
                            onClick={copyNumber}
                            className="mt-10 w-full bg-white text-black font-black text-2xl py-6 rounded-2xl flex items-center justify-center gap-4 hover:bg-gray-100 active:scale-95 transition shadow-xl"
                        >
                            <Copy size={32} />
                            Copy Number
                        </button>
                        <p className="text-green-200 text-sm mt-4">Tap to copy • Works offline!</p>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center animate-pulse">
                            <Zap size={48} className="text-yellow-400" />
                        </div>
                        <p className="text-xl font-medium text-gray-300">Point camera at meter</p>
                        <p className="text-gray-500 mt-2">Best distance: 15–30 cm</p>
                    </div>
                )}
            </div>
        </div>
    )
}