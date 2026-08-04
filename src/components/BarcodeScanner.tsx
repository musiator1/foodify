import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  useEffect(() => {
    // Inicjalizacja skanera (szuka elementu o id="reader")
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 }, // Wymiary okienka skanowania
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Po pomyślnym zeskanowaniu - zatrzymujemy skaner i przekazujemy kod do rodzica
        scanner.clear();
        onResult(decodedText);
      },
      (errorMessage) => {
        // Ignorujemy błędy, bo skaner wyrzuca je co klatkę, gdy nie widzi kodu
      }
    );

    // Czyszczenie (zatrzymanie kamery), gdy użytkownik zamknie skaner
    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 backdrop-blur-sm">
      <div className="flex justify-end mb-8 mt-4 pt-safe">
        <button 
          onClick={onClose} 
          className="text-white text-sm font-bold bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-full transition-colors"
        >
          Anuluj skanowanie
        </button>
      </div>
      
      {/* Tu biblioteka wstrzyknie podgląd z kamery */}
      <div id="reader" className="w-full max-w-sm mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl" />
      
      <p className="text-slate-300 text-center mt-8 text-sm font-medium">
        Nakieruj aparat na kod kreskowy na opakowaniu.<br/>
        Aplikacja wykryje go automatycznie.
      </p>
    </div>
  );
}