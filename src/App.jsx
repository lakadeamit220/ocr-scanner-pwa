import GoogleMLKitLive from "./components/GoogleMLKitLive"
import MeterScanner from "./components/MeterScanner"
import OCRScanner from "./components/OCRScanner"
import Scanner from "./components/Scanner"
import TesseractLive from "./components/TesseractLive"
import TesseractSnapshot from "./components/TesseractSnapshot"
import KoloAPI from "./components/KoloAPI"
import StaticMeter from "./components/StaticMeter"

function App() {

  return (
    <>

      {/* <KoloAPI /> */}

      {/* <OCRScanner /> */}
      {/* <TesseractSnapshot /> */}
      {/* <TesseractLive /> */}
      {/* <GoogleMLKitLive /> */}
      {/* <Scanner /> */}

      {/* <MeterScanner/> */}

      <StaticMeter detectedNumber="245.45" />
    </>
  )
}

export default App
