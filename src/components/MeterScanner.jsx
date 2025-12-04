import { useEffect, useRef, useState } from 'react'
import { Copy, Settings, X } from 'lucide-react'

export default function MeterScanner() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [number, setNumber] = useState('')
    const [scanning, setScanning] = useState(false)
    const [ready, setReady] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const [tempApiKey, setTempApiKey] = useState('')

    // Load API key from storage on mount
    useEffect(() => {
        const loadApiKey = async () => {
            try {
                const result = await window.storage.get('K81035834388957')
                if (result && result.value) {
                    setApiKey(result.value)
                }
            } catch (error) {
                console.log('No API key stored yet')
            }
        }
        loadApiKey()
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

    const saveApiKey = async () => {
        try {
            await window.storage.set('K81035834388957', tempApiKey)
            setApiKey(tempApiKey)
            setShowSettings(false)
            alert('✓ API Key saved!')
        } catch (error) {
            alert('Failed to save API key')
        }
    }

    const extractOnlyNumbers = (text) => {
        // Fix common OCR mistakes and extract digits
        let cleaned = text
            .replace(/O/gi, '0')
            .replace(/I/g, '1')
            .replace(/l/g, '1')
            .replace(/S/g, '5')
            .replace(/B/g, '8')
            .replace(/[^0-9]/g, '')

        return cleaned
    }

    const scan = async () => {
        if (!ready || scanning) {
            setNumber('⏳ Please wait...')
            return
        }

        if (!apiKey) {
            setNumber('❌ API Key required\n\nTap the ⚙️ icon to add your free OCR.space API key')
            return
        }

        setScanning(true)
        setNumber('🔍 Scanning with OCR.space...')

        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
            try {
                // Create form data for OCR.space API
                const formData = new FormData()
                formData.append('file', blob, 'meter.jpg')
                formData.append('apikey', apiKey)
                formData.append('language', 'eng')
                formData.append('isOverlayRequired', 'false')
                formData.append('detectOrientation', 'true')
                formData.append('scale', 'true')
                formData.append('OCREngine', '2') // Engine 2 is better for numbers

                // Call OCR.space API
                const response = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    body: formData
                })

                const result = await response.json()

                console.log('OCR.space response:', result)

                if (result.OCRExitCode === 1 || result.IsErroredOnProcessing === false) {
                    const ocrText = result.ParsedResults[0].ParsedText
                    console.log('Raw OCR text:', ocrText)

                    const extracted = extractOnlyNumbers(ocrText)

                    if (extracted && extracted.length >= 1) {
                        setNumber(extracted)
                    } else {
                        setNumber('❌ No numbers detected\n\nTips:\n• Move closer (15-20cm)\n• Better lighting needed\n• Hold camera steady\n• Align numbers in guide box')
                    }
                } else {
                    const errorMsg = result.ErrorMessage || result.ErrorDetails || 'Unknown error'
                    if (errorMsg.includes('Invalid API key')) {
                        setNumber('❌ Invalid API Key\n\nPlease check your API key in settings')
                    } else {
                        setNumber(`❌ OCR failed\n\n${errorMsg}`)
                    }
                }
            } catch (err) {
                console.error('Scan error:', err)
                setNumber('❌ Scan failed\n\nCheck your internet connection')
            }
            setScanning(false)
        }, 'image/jpeg', 0.95)
    }

    const copyNumber = () => {
        if (number && !number.startsWith('❌') && !number.startsWith('🔍') && !number.startsWith('⏳')) {
            navigator.clipboard.writeText(number)
            alert('✓ Copied: ' + number)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
            {/* Header */}
            <header className="p-6 text-center border-b border-gray-700 relative">
                <h1 className="text-3xl font-bold">Meter Number Scanner</h1>
                <p className="text-green-400 text-sm mt-2">Powered by OCR.space API</p>
                <button
                    onClick={() => {
                        setShowSettings(true)
                        setTempApiKey(apiKey)
                    }}
                    className="absolute right-6 top-6 p-2 bg-gray-800 rounded-lg hover:bg-gray-700"
                >
                    <Settings size={24} />
                </button>
            </header>

            {/* API Key Status */}
            {!apiKey && (
                <div className="mx-6 mt-4 p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-xl">
                    <p className="text-yellow-200 text-sm text-center">
                        ⚠️ <strong>Setup Required:</strong> Tap ⚙️ to add your free API key
                    </p>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border-2 border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">API Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">
                                OCR.space API Key
                            </label>
                            <input
                                type="text"
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="Enter your API key"
                                className="w-full bg-black border-2 border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                            />
                        </div>

                        <div className="bg-blue-900/30 border-2 border-blue-700 rounded-lg p-4 mb-4">
                            <p className="text-blue-200 text-sm mb-2">
                                <strong>📝 How to get FREE API key:</strong>
                            </p>
                            <ol className="text-xs text-blue-200 space-y-1 ml-4 list-decimal">
                                <li>Visit: <span className="text-blue-400 font-mono">ocr.space/ocrapi</span></li>
                                <li>Register with email (free)</li>
                                <li>Get API key instantly</li>
                                <li>25,000 free requests/month</li>
                            </ol>
                        </div>

                        <button
                            onClick={saveApiKey}
                            disabled={!tempApiKey}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:opacity-50 py-3 rounded-lg font-bold"
                        >
                            Save API Key
                        </button>
                    </div>
                </div>
            )}

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
                    disabled={!ready || scanning || !apiKey}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-black font-bold text-xl rounded-full w-24 h-24 shadow-2xl active:scale-95 disabled:opacity-50 disabled:bg-gray-600 transition-all flex items-center justify-center"
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
                                    className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 mb-3"
                                >
                                    <Copy size={20} />
                                    Copy Number
                                </button>
                                <button
                                    onClick={() => setNumber('')}
                                    className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-sm"
                                >
                                    Scan Again
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
                        <p className="text-yellow-400 text-lg font-medium mb-2">Processing with OCR.space...</p>
                        <p className="text-gray-400 text-sm">Hold steady for best results</p>
                    </div>
                )}
                {!number && !scanning && (
                    <div className="text-center text-gray-400">
                        <p className="text-sm">
                            {apiKey ? 'Align numbers in guide box and tap SCAN' : 'Setup API key first (tap ⚙️)'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}