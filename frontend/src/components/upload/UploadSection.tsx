import { useRef, useState } from 'react';

interface UploadSectionProps {
  onFile: (file: File) => void;
}

export function UploadSection({ onFile }: UploadSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="py-10 text-center">
      <h1 className="text-3xl font-bold text-text">Analyze your WiFi capture</h1>
      <p className="mx-auto mt-3 max-w-xl text-text-muted">
        Upload a packet capture file to map routers, clients, device types, and extract WPA handshakes.
      </p>
      <div
        className={`mx-auto mt-8 max-w-xl cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg viewBox="0 0 64 64" fill="none" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 42V28M32 28L26 34M32 28L38 34"
              stroke="#e8a020"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="20" y="44" width="24" height="3" rx="1.5" fill="#e8a02040" />
            <path
              d="M20 38a12 12 0 0 1 0-16 12 12 0 0 1 24 0 8 8 0 0 1 0 16"
              stroke="#e8a020"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <div className="text-lg font-semibold text-text">Drop your capture file here</div>
        <div className="mt-1 text-sm text-text-muted">or click to browse your files</div>
        <div className="mt-4 text-xs text-text-muted">Supports: .pcap · .pcapng · .cap</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pcap,.pcapng,.cap"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
