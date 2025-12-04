import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'

export default function MeterScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [number, setNumber] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)
    const [tesseractReady, setTesseractReady] = useState(false)

    // Load Tesseract from CDN
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js'
        script.onload = () => {
            console.log('Tesseract.js loaded')
            setTesseractReady(true)
        }
        document.head.appendChild(script)
    }, [])

    // Start camera
    useEffect(() => {
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
                        videoRef.current.play()
                        setReady(true)
                    }
                }
            })
            .catch(() => setNumber('❌ Camera access denied'))
    }, [])

    const extractOnlyNumbers = (text) => {
        // First fix common OCR mistakes, then extract digits
        let cleaned = text
            .replace(/O/gi, '0')     // O/o → 0
            .replace(/I/g, '1')      // I → 1
            .replace(/l/g, '1')      // l → 1
            .replace(/S/g, '5')      // S → 5
            .replace(/B/g, '8')      // B → 8
            .replace(/[^0-9]/g, '')  // Keep only digits

        return cleaned
    }

    const scan = async () => {
        if (!ready || scanning || !tesseractReady) {
            setNumber('⏳ Please wait...')
            return
        }

        setScanning(true)
        setNumber('🔍 Scanning meter...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Enhanced preprocessing for meter digits
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Convert to grayscale with adaptive contrast
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
            // Use threshold for better digit recognition
            const value = gray > 128 ? 255 : 0
            data[i] = data[i + 1] = data[i + 2] = value
        }
        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob(async (blob) => {
            try {
                const worker = await Tesseract.createWorker()
                await worker.load()
                await worker.loadLanguage('eng')
                await worker.initialize('eng')

                // OPTIMIZED FOR DIGITS ONLY
                await worker.setParameters({
                    tessedit_char_whitelist: '0123456789',
                    tessedit_pageseg_mode: '6',  // Uniform block of text
                    preserve_interword_spaces: '0',
                })

                const { data: { text } } = await worker.recognize(blob)
                await worker.terminate()

                const extracted = extractOnlyNumbers(text)

                if (extracted && extracted.length >= 1) {
                    setNumber(extracted)
                } else {
                    setNumber('❌ No numbers detected\n\nTips:\n• Move closer to display\n• Better lighting needed\n• Hold camera steady\n• Align numbers in guide box')
                }
            } catch (err) {
                console.error(err)
                setNumber('❌ Scan failed - try again')
            }
            setScanning(false)
        }, 'image/jpeg', 0.98)
    }

    const copyNumber = () => {
        if (number && !number.startsWith('❌') && !number.startsWith('🔍')) {
            navigator.clipboard.writeText(number)
            alert('✓ Copied: ' + number)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
            {/* Header */}
            <header className="p-6 text-center border-b border-gray-700">
                <h1 className="text-3xl font-bold">Number Scanner</h1>
                <p className="text-green-400 text-sm mt-2">Extract Numbers from Meters</p>
            </header>

            {/* Camera View */}
            <div className="relative flex-1">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                {/* Guide box for numbers */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 border-dashed rounded-2xl w-10/12 max-w-md h-32">
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold opacity-70">
                            ALIGN NUMBERS HERE
                        </div>
                    </div>
                </div>

                {/* Scan Button */}
                <button
                    onClick={scan}
                    disabled={!ready || scanning || !tesseractReady}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-black font-bold text-xl rounded-full w-24 h-24 shadow-2xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                    {scanning ? '...' : 'SCAN'}
                </button>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Results Section */}
            <div className="p-6 bg-gray-900">
                {number && !scanning && !number.startsWith('⏳') && (
                    <>
                        {!number.startsWith('❌') && !number.startsWith('🔍') && (
                            <>
                                <div className="bg-black p-6 rounded-2xl mb-4 border-2 border-green-600">
                                    <p className="text-gray-400 text-sm mb-2 font-medium">
                                        Scanned Number
                                    </p>
                                    <p className="text-5xl font-mono font-bold text-green-400 tracking-wider text-center">
                                        {number}
                                    </p>
                                </div>
                                <button
                                    onClick={copyNumber}
                                    className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                                >
                                    <Copy size={20} />
                                    Copy Number
                                </button>
                            </>
                        )}
                        {(number.startsWith('❌') || number.startsWith('🔍')) && (
                            <div className="bg-red-900/30 border-2 border-red-600 p-5 rounded-xl">
                                <pre className="text-sm whitespace-pre-wrap text-red-200">
                                    {number}
                                </pre>
                            </div>
                        )}
                    </>
                )}
                {scanning && (
                    <div className="text-center">
                        <p className="text-yellow-400 text-lg font-medium mb-2">Processing...</p>
                        <p className="text-gray-400 text-sm">Hold steady for best results</p>
                    </div>
                )}
                {!number && !scanning && (
                    <div className="text-center text-gray-400">
                        <p className="text-sm">Align numbers in guide box and tap SCAN</p>
                    </div>
                )}
            </div>
        </div>
    )
}