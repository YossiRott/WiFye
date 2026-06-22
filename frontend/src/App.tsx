import { ErrorSection } from './components/error/ErrorSection';
import { Header } from './components/layout/Header';
import { LoadingSection } from './components/loading/LoadingSection';
import { ResultsSection } from './components/results/ResultsSection';
import { UploadSection } from './components/upload/UploadSection';
import { WordlistGeneratorSection } from './components/wordgen/WordlistGeneratorSection';
import { useAnalysis } from './hooks/useAnalysis';
import { useCracking } from './hooks/useCracking';

export default function App() {
  const analysis = useAnalysis();
  const cracking = useCracking();

  const handleReset = () => {
    analysis.reset();
    cracking.clear();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {analysis.status === 'idle' && <UploadSection onFile={analysis.analyze} />}
        {analysis.status === 'loading' && <LoadingSection fileName={analysis.fileName} />}
        {analysis.status === 'error' && (
          <ErrorSection message={analysis.error || 'Unknown error'} onRetry={handleReset} />
        )}
        {analysis.status === 'done' && analysis.data && (
          <ResultsSection data={analysis.data} cracking={cracking} onReset={handleReset} />
        )}

        <WordlistGeneratorSection onGenerated={cracking.checkWordgen} />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-text-muted">
        Wifye — WiFi Network Analyzer
      </footer>
    </div>
  );
}
