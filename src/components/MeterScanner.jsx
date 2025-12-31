import { useEffect, useRef, useState } from 'react'
import { Copy, Settings, X, AlertCircle } from 'lucide-react'

export default function MeterScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [number, setNumber] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const [tempApiKey, setTempApiKey] = useState('')
    const [error, setError] = useState('')

    // Load API key from localStorage (safe alternative to window.storage)
    useEffect(() => {
        const savedKey = localStorage.getItem('K88643498688957')
        if (savedKey) {
            setApiKey(savedKey)
            setTempApiKey(savedKey)
        } else {
            setShowSettings(true) // Auto-show settings on first use
        }
    }, [])

    // Save API key
    const saveApiKey = () => {
        if (!tempApiKey.trim()) {
            alert('Please enter a valid API key')
            return
        }
        localStorage.setItem('meter_ocr_apikey', tempApiKey.trim())
        setApiKey(tempApiKey.trim())
        setShowSettings(false)
        alert('API Key saved successfully!')
    }

    // Start camera
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

    const extractOnlyNumbers = (text) => {
        if (!text) return ''
        return text
            .replace(/O|o/gi, '0')
            .replace(/I|l|!/gi, '1')
            .replace(/S|s/gi, '5')
            .replace(/B/gi, '8')
            .replace(/G/gi, '6')
            .replace(/Z/gi, '2')
            .replace(/[^0-9]/g, '')
            .trim()
    }

    const scan = async () => {
        if (!ready || scanning) return
        if (!apiKey) {
            setError('Please set your OCR.space API key first')
            setShowSettings(true)
            return
        }

        setScanning(true)
        setNumber('')
        setError('')
        setNumber('Scanning...')

        const canvas = canvasRef.current
        const video = videoRef.current
        if (!canvas || !video) {
            setNumber('Camera not ready')
            setScanning(false)
            return
        }

        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setNumber('Failed to capture image')
                setScanning(false)
                return
            }

            try {
                const formData = new FormData()
                formData.append('file', blob, 'meter.jpg')
                formData.append('apikey', apiKey)
                formData.append('language', 'eng')
                formData.append('isOverlayRequired', 'false')
                formData.append('detectOrientation', 'true')
                formData.append('scale', 'true')
                formData.append('OCREngine', '2')

                const response = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    body: formData
                })

                const result = await response.json()

                if (result?.ParsedResults?.[0]?.ParsedText) {
                    const rawText = result.ParsedResults[0].ParsedText
                    const digits = extractOnlyNumbers(rawText)

                    if (digits && digits.length >= 4) {
                        setNumber(digits)
                    } else {
                        setNumber('No clear number found\n\nTry:\n• Getting closer (15-25cm)\n• Better lighting\n• Steady hand\n• Red digits preferred')
                    }
                } else {
                    const err = result.ErrorMessage?.[0] || 'OCR failed'
                    if (err.includes('Invalid API key')) {
                        setError('Invalid API Key - Please update in settings')
                        localStorage.removeItem('K88643498688957')
                        setApiKey('')
                        setShowSettings(true)
                    } else {
                        setNumber(`OCR Error:\n${err}`)
                    }
                }
            } catch (err) {
                console.error(err)
                setNumber('No internet connection')
            } finally {
                setScanning(false)
            }
        }, 'image/jpeg', 0.92)
    }

    const copyNumber = () => {
        if (number && !number.includes('❌') && !number.includes('Scanning')) {
            navigator.clipboard.writeText(number.replace(/\n/g, ' '))
            alert('Copied: ' + number)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="p-5 text-center relative border-b border-gray-800">
                <h1 className="text-2xl font-bold">Meter Scanner</h1>
                <p className="text-green-400 text-xs mt-1">Free OCR.space Powered</p>
                <button
                    onClick={() => {
                        setShowSettings(true)
                        setTempApiKey(apiKey)
                    }}
                    className="absolute right-4 top-5 p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                >
                    <Settings size={22} />
                </button>
            </header>

            {/* Warning if no API key */}
            {!apiKey && (
                <div className="mx-4 mt-3 p-3 bg-orange-900/50 border border-orange-600 rounded-lg flex items-center gap-2">
                    <AlertCircle size={18} />
                    <p className="text-sm">Tap ⚙️ to add your free OCR.space API key</p>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold">OCR.space API Key</h2>
                            <button onClick={() => setShowSettings(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <input
                            type="password"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            placeholder="Paste your API key here"
                            className="w-full bg-black border border-gray-600 rounded-lg px-4 py-3 mb-4 focus:border-green-500 outline-none"
                        />

                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4 text-sm">
                            <p className="font-bold text-blue-300 mb-2">Get Free API Key:</p>
                            <ol className="text-blue-200 space-y-1 text-xs">
                                <li>1. Go to <a href="https://ocr.space/ocrapi" target="_blank" className="underline">ocr.space/ocrapi</a></li>
                                <li>2. Register (free)</li>
                                <li>3. Copy your API key</li>
                                <li>4. Paste here → Save</li>
                            </ol>
                            <p className="mt-2 text-green-400 text-xs">25,000 free scans/month!</p>
                        </div>

                        <button
                            onClick={saveApiKey}
                            className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg font-bold text-lg"
                        >
                            Save API Key
                        </button>
                    </div>
                </div>
            )}

            {/* Camera + Overlay */}
            <div className="relative flex-1 bg-black">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                {/* Alignment Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-green-500 border-dashed rounded-3xl w-11/12 max-w-lg h-32 opacity-80">
                        <p className="text-green-400 text-sm font-bold mt-2 text-center">ALIGN DIGITS HERE</p>
                    </div>
                </div>

                {/* Scan Button */}
                <button
                    onClick={scan}
                    disabled={scanning || !ready}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 text-black font-bold text-2xl rounded-full w-28 h-28 shadow-2xl active:scale-95 transition-all flex items-center justify-center"
                >
                    {scanning ? '•••' : 'SCAN'}
                </button>

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Result */}
            <div className="p-5 bg-gray-900 border-t border-gray-800">
                {number && !scanning && (
                    <div className={number.includes('No ') || number.includes('Error') || number.includes('❌')
                        ? "bg-red-900/40 border-2 border-red-600 rounded-2xl p-5"
                        : "bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-500 rounded-2xl p-6"
                    }>
                        {(!number.includes('No ') && !number.includes('Error') && !number.includes('❌')) ? (
                            <>
                                <p className="text-green-300 text-sm font-medium mb-3 text-center">Detected Number</p>
                                <div className="relative overflow-x-auto py-4"> {/* Adds horizontal scroll if needed */}
                                    <p className="text-3xl font-bold font-mono text-center text-white tracking-wider min-w-fit inline-block px-4">
                                        {number}
                                    </p>
                                </div>
                                <button
                                    onClick={copyNumber}
                                    className="mt-6 w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200"
                                >
                                    <Copy size={22} /> Copy Number
                                </button>
                            </>
                        ) : (
                            <pre className="text-sm text-red-200 whitespace-pre-wrap">{number}</pre>
                        )}
                    </div>
                )}

                {scanning && (
                    <div className="text-center py-8">
                        <p className="text-yellow-400 text-lg animate-pulse">Reading meter...</p>
                        <p className="text-gray-400 text-sm mt-2">Hold steady • Good lighting helps</p>
                    </div>
                )}

                {!number && !scanning && apiKey && (
                    <p className="text-center text-gray-400 text-sm">
                        Point camera at meter digits and tap SCAN
                    </p>
                )}
            </div>
        </div>
    )
}