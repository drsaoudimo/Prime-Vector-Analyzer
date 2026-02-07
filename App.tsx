import React, { useState } from 'react';
import { Activity, Cpu, Database, GitBranch, Layers, ShieldCheck, Zap, Scale, AlertTriangle, ArrowRight, Gauge, Lock, Unlock, UserCircle } from 'lucide-react';
import { analyzeNumber } from './services/vectorEngine';
import { MatrixAnalysisReport, ClassificationType, StabilityState } from './types';
import { Card } from './components/Card';
import { SpectralChart } from './components/SpectralChart';
import { GradientChart } from './components/GradientChart';

const App: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [inputA, setInputA] = useState<string>('796559576193775931841242891093');
  const [inputB, setInputB] = useState<string>('');
  
  const [reportA, setReportA] = useState<MatrixAnalysisReport | null>(null);
  const [reportB, setReportB] = useState<MatrixAnalysisReport | null>(null);
  
  const [isResearchMode, setIsResearchMode] = useState<boolean>(false);
  const [computing, setComputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const validateInput = (val: string): boolean => {
    if (!val.match(/^\d+$/)) return false;
    const n = BigInt(val);
    return n >= 1n; // Allowing 1 as Unit
  };

  const handleAnalyze = async () => {
    setError(null);
    setReportA(null);
    setReportB(null);

    if (!validateInput(inputA)) {
      setError("Input A must be a positive integer ≥ 1.");
      return;
    }
    if (mode === 'compare') {
      if (!inputB) {
        setError("Please enter a second number for comparison.");
        return;
      }
      if (!validateInput(inputB)) {
        setError("Input B must be a positive integer ≥ 1.");
        return;
      }
    }

    setComputing(true);

    try {
      // Async quantum-like factorization
      const resA = await analyzeNumber(inputA);
      setReportA(resA);

      if (mode === 'compare' && inputB) {
        const resB = await analyzeNumber(inputB);
        setReportB(resB);
      }
    } catch (e) {
      console.error(e);
      setError("Computation error or timeout. Input might be too large.");
    } finally {
      setComputing(false);
    }
  };

  const renderComparisonView = () => {
    if (!reportA || !reportB) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Column A */}
        <div className="space-y-6">
          <h3 className="text-center font-mono text-cyan-400 border-b border-cyan-900 pb-2">DATASET A</h3>
          <ReportSummary report={reportA} showCharts={false} />
          <Card title="Resonance Lock (Confidence)" className="h-48">
             <div className="h-full flex flex-col items-center justify-center gap-2">
                <span className="text-4xl font-bold text-cyan-400">
                  {reportA.resonanceScore.toFixed(4)}
                </span>
                <span className={`text-sm font-mono ${reportA.resonanceScore > 0.72 ? 'text-green-500' : 'text-amber-500'}`}>
                  {reportA.resonanceScore > 0.72 ? 'LOCKED' : 'NOISE DETECTED'}
                </span>
             </div>
          </Card>
        </div>
        
        {/* Column B */}
        <div className="space-y-6">
          <h3 className="text-center font-mono text-purple-400 border-b border-purple-900 pb-2">DATASET B</h3>
          <ReportSummary report={reportB} showCharts={false} />
          <Card title="Resonance Lock (Confidence)" className="h-48">
             <div className="h-full flex flex-col items-center justify-center gap-2">
                <span className="text-4xl font-bold text-purple-400">
                  {reportB.resonanceScore.toFixed(4)}
                </span>
                <span className={`text-sm font-mono ${reportB.resonanceScore > 0.72 ? 'text-green-500' : 'text-amber-500'}`}>
                  {reportB.resonanceScore > 0.72 ? 'LOCKED' : 'NOISE DETECTED'}
                </span>
             </div>
          </Card>
        </div>

        {/* Comparative Log */}
        <div className="md:col-span-2">
            <ComparisonLog reportA={reportA} reportB={reportB} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-900 selection:text-white pb-20 flex flex-col">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Cpu className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                PVA <span className="text-slate-500 font-normal">| Precision</span>
              </h1>
              <p className="text-xs text-slate-500 font-mono">Quantum-Matrix Factorization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={() => {
                 setMode(mode === 'single' ? 'compare' : 'single');
                 setReportA(null);
                 setReportB(null);
               }}
               className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all flex items-center gap-2 ${mode === 'compare' ? 'bg-purple-900/30 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
             >
               <Scale className="w-3 h-3" />
               COMPARE MODE
             </button>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono uppercase ${isResearchMode ? 'text-cyan-400' : 'text-slate-500'}`}>Research</span>
              <button 
                onClick={() => setIsResearchMode(!isResearchMode)}
                className={`w-8 h-4 rounded-full relative transition-colors ${isResearchMode ? 'bg-cyan-900/50 border-cyan-500/50' : 'bg-slate-800 border-slate-700'} border`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-current transition-all ${isResearchMode ? 'left-4 text-cyan-400' : 'left-0.5 text-slate-400'}`}></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow">
        
        {/* Input Section */}
        <div className="mb-8 relative z-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex flex-col gap-4">
            
            <div className="flex flex-col md:flex-row gap-4">
               {/* Input A */}
               <div className="flex-grow">
                 <label className="block text-xs font-mono text-slate-500 mb-2">TARGET INTEGER {mode === 'compare' ? 'A' : '(N)'}</label>
                 <input
                  type="text"
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xl font-mono py-3 px-4 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-700"
                  placeholder="Enter Positive Integer..."
                />
               </div>

               {/* Input B */}
               {mode === 'compare' && (
                 <div className="flex-grow animate-in fade-in slide-in-from-left-4">
                   <label className="block text-xs font-mono text-purple-500 mb-2">TARGET INTEGER B</label>
                   <input
                    type="text"
                    value={inputB}
                    onChange={(e) => setInputB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xl font-mono py-3 px-4 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder-slate-700"
                    placeholder="Enter comparison number..."
                  />
                 </div>
               )}

               <button
                onClick={handleAnalyze}
                disabled={computing}
                className={`md:w-64 px-6 py-3 font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto h-[54px] ${mode === 'compare' ? 'bg-gradient-to-r from-cyan-700 to-purple-700 hover:from-cyan-600 hover:to-purple-600' : 'bg-cyan-700 hover:bg-cyan-600'}`}
              >
                {computing ? (
                  <div className="flex items-center gap-2">
                    <Activity className="animate-spin w-5 h-5" />
                    <span className="text-xs font-mono animate-pulse">QUANTUM PROCESSING...</span>
                  </div>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>{mode === 'compare' ? 'COMPARE' : 'ANALYZE (QUANTUM)'}</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-950/20 p-3 rounded-lg border border-rose-900/50 text-sm animate-in fade-in">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
          </div>
        </div>

        {/* Results */}
        {mode === 'single' && reportA && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <ReportSummary report={reportA} showCharts={true} isResearch={isResearchMode} />
               <div className="mt-6">
                 <ComputationalLog report={reportA} />
               </div>
             </div>
        )}

        {mode === 'compare' && renderComparisonView()}

      </main>

      {/* Developer Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-md py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
           <div className="flex items-center gap-2 mb-2 md:mb-0">
             <ShieldCheck className="w-4 h-4 text-slate-600" />
             <span className="font-mono">PVA | Precision Algorithm v2.5 (Brent-Rho/A1)</span>
           </div>
           <div className="flex items-center gap-2">
             <UserCircle className="w-4 h-4 text-cyan-500" />
             <span>Developed by <span className="text-slate-300 font-semibold">Dr Saoudi Mohamed Algeria</span></span>
           </div>
        </div>
      </footer>
    </div>
  );
};

// --- Sub-components ---

const ReportSummary: React.FC<{ report: MatrixAnalysisReport, showCharts: boolean, isResearch?: boolean }> = ({ report, showCharts, isResearch }) => {
  const isPrime = report.classification === ClassificationType.PRIME;
  const isUnstable = report.classification === ClassificationType.NON_PRIME_UNSTABLE;
  const isSafe = report.stability === StabilityState.STABLE;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Primality Status & Factors */}
      <div className="md:col-span-8">
        <Card title="Primality Detection & Factorization" className="h-full bg-gradient-to-br from-slate-900 to-slate-900/50">
          <div className="flex flex-col gap-4 h-full">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg border ${isPrime ? 'bg-green-500/20 border-green-500/50 text-green-400' : isUnstable ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
                    {isPrime ? <Lock className="w-6 h-6" /> : isUnstable ? <AlertTriangle className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                 </div>
                 <div>
                    <div className="text-slate-400 text-[10px] mb-0.5 uppercase tracking-widest font-mono">Primality Status</div>
                    <div className={`text-2xl font-black tracking-tight ${isPrime ? 'text-green-400' : isUnstable ? 'text-amber-400' : 'text-rose-400'}`}>
                      {isPrime ? 'PASSED (PRIME)' : isUnstable ? 'UNRESOLVED (COMPOSITE)' : report.classification === ClassificationType.UNIT ? 'UNIT' : 'FAILED (COMPOSITE)'}
                    </div>
                 </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-mono">Density (ρ)</div>
                <div className="text-xl font-mono text-cyan-300">
                  {report.primeDensity.toFixed(4)}
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-2">
              <div className="text-slate-400 text-[10px] mb-2 uppercase tracking-widest font-mono">Prime Factors Decomposed</div>
              <div className="flex flex-wrap gap-2">
                {report.factors.length > 0 && !isUnstable ? (
                  report.factors.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-lg font-mono text-cyan-300 shadow-sm break-all">
                      {f}
                    </span>
                  ))
                ) : isUnstable ? (
                    <span className="text-amber-500 italic flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Analysis inconclusive. Number is composite but factors are large/hidden.
                    </span>
                ) : (
                  <span className="text-slate-500 italic">None</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="md:col-span-4">
        <Card title="Resonance & Stability" className="h-full">
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <Gauge className={`w-12 h-12 ${report.resonanceScore > 0.72 ? 'text-green-400' : 'text-amber-400'}`} />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className={`w-2 h-2 rounded-full ${isSafe ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
              </div>
            </div>
            
            <div className="text-center">
               <div className="text-2xl font-bold">{report.resonanceScore.toFixed(3)}</div>
               <div className="text-[10px] text-slate-500 font-mono mt-1">Resonance Score (θ)</div>
               <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSafe ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                  {report.stability.toUpperCase()}
               </div>
            </div>
          </div>
        </Card>
      </div>

      {showCharts && (
        <>
          <div className="md:col-span-6">
            <Card title="Spectral Analysis" headerAction={<Layers className="w-4 h-4 text-slate-500"/>}>
              <SpectralChart data={report.spectralData} />
            </Card>
          </div>
          <div className="md:col-span-6">
            <Card title="Potential Gradient" headerAction={<Activity className="w-4 h-4 text-slate-500"/>}>
              <GradientChart data={report.potentialGradient} />
            </Card>
          </div>
        </>
      )}

      {isResearch && (
         <div className="md:col-span-12">
            <Card title="Research Data: M-Projection" className="border-cyan-900/30 bg-cyan-950/10">
              <div className="font-mono text-xs text-slate-400 break-all">
                 <div className="mb-2 text-cyan-500">VECTOR PROJECTION (First 5 dims):</div>
                 [{report.vectorProjection.slice(0,5).map(n => n.toFixed(5)).join(', ')}...]
              </div>
            </Card>
         </div>
      )}
    </div>
  );
};

const ComputationalLog: React.FC<{ report: MatrixAnalysisReport }> = ({ report }) => {
  return (
    <Card title="Computational Log" headerAction={<Database className="w-4 h-4 text-slate-500"/>}>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs md:text-sm text-slate-400">
          
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 text-slate-500 font-bold">1. INPUT ANALYSIS</div>
            <div className="pl-2 space-y-2 border-l-2 border-cyan-900/50">
               <p><span className="text-cyan-500">N_Magnitude:</span> {report.inputNumber.length} digits</p>
               <p><span className="text-cyan-500">Classification:</span> {report.classification}</p>
               <p><span className="text-cyan-500">Prime Density:</span> {report.primeDensity.toFixed(5)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 text-slate-500 font-bold">2. MATRIX & RESONANCE</div>
            <div className="pl-2 space-y-2 border-l-2 border-purple-900/50">
               <p><span className="text-purple-500">Matrices:</span> A1 ⊕ A_NT_refined</p>
               <p><span className="text-purple-500">Projection:</span> M_precision</p>
               <p><span className="text-purple-500">Score (θ):</span> {report.resonanceScore.toFixed(5)}</p>
               <p className="text-[10px] text-slate-600">Formula: S_stab × S_pot × S_proj</p>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <div className="border-b border-slate-800 pb-2 text-slate-500 font-bold">3. FACTORIZATION PATH</div>
            <div className="bg-slate-950/50 p-3 rounded border border-slate-800/50 flex flex-wrap gap-2 items-center">
               <span className="text-green-500">ROOT</span>
               <ArrowRight className="w-3 h-3 text-slate-600" />
               {report.factors.map((f, i) => (
                  <React.Fragment key={i}>
                     <span className="text-slate-200">{f}</span>
                     {i < report.factors.length - 1 && <span className="text-slate-600">+</span>}
                  </React.Fragment>
               ))}
            </div>
            <div className="flex justify-end text-[10px] text-slate-600">
               Execution Time: {report.executionTimeMs.toFixed(2)}ms
            </div>
          </div>
       </div>
    </Card>
  );
};

const ComparisonLog: React.FC<{ reportA: MatrixAnalysisReport, reportB: MatrixAnalysisReport }> = ({ reportA, reportB }) => {
   return (
    <Card title="Comparative Analysis Log" className="border-cyan-900/30">
        <div className="grid grid-cols-3 gap-4 font-mono text-xs text-center border-b border-slate-800 pb-2 mb-2 font-bold text-slate-500">
           <div>METRIC</div>
           <div className="text-cyan-500">DATASET A</div>
           <div className="text-purple-500">DATASET B</div>
        </div>
        <div className="space-y-2 font-mono text-xs">
           <div className="grid grid-cols-3 gap-4 text-center py-2 border-b border-slate-800/50">
              <div className="text-slate-400">Class</div>
              <div>{reportA.classification}</div>
              <div>{reportB.classification}</div>
           </div>
           <div className="grid grid-cols-3 gap-4 text-center py-2 border-b border-slate-800/50">
              <div className="text-slate-400">Prime Density</div>
              <div>{reportA.primeDensity.toFixed(4)}</div>
              <div>{reportB.primeDensity.toFixed(4)}</div>
           </div>
           <div className="grid grid-cols-3 gap-4 text-center py-2 border-b border-slate-800/50">
              <div className="text-slate-400">Resonance (θ)</div>
              <div className={reportA.resonanceScore > 0.72 ? 'text-green-400' : 'text-amber-400'}>{reportA.resonanceScore.toFixed(4)}</div>
              <div className={reportB.resonanceScore > 0.72 ? 'text-green-400' : 'text-amber-400'}>{reportB.resonanceScore.toFixed(4)}</div>
           </div>
           <div className="grid grid-cols-3 gap-4 text-center py-2">
              <div className="text-slate-400">Factors Count</div>
              <div>{reportA.factors.length}</div>
              <div>{reportB.factors.length}</div>
           </div>
        </div>
    </Card>
   );
};

export default App;