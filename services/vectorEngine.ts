import { A1, A_NT_corrected, M_corrected } from '../constants';
import { ClassificationType, GradientPoint, MatrixAnalysisReport, StabilityState, SpectralPoint, Matrix, Vector } from '../types';

// --- Matrix Math Helpers ---

const dot = (v1: Vector, v2: Vector): number => {
  return v1.reduce((sum, val, i) => sum + val * (v2[i] || 0), 0);
};

const multiplyMatrixVector = (M: Matrix, V: Vector): Vector => {
  return M.map(row => dot(row, V));
};

const normalizeVector = (V: Vector): Vector => {
  const magnitude = Math.sqrt(V.reduce((acc, val) => acc + val * val, 0));
  return magnitude === 0 ? V : V.map(v => v / magnitude);
};

const addVectors = (v1: Vector, v2: Vector): Vector => {
  return v1.map((val, i) => val + (v2[i] || 0));
};

// --- QUANTUM WORKER KERNEL: HYPER-SPEED BRENT ---
const QUANTUM_WORKER_BLOB = `
self.onmessage = function(e) {
    const { nStr, startC, seedVal } = e.data;
    const n = BigInt(nStr);
    
    // BINARY GCD: Optimized for V8 BigInt implementation
    // Using bitwise ops where possible for speed
    const gcd = (a, b) => {
        if (a === 0n) return b;
        if (b === 0n) return a;
        let shift = 0n;
        while (((a | b) & 1n) === 0n) {
            a >>= 1n; b >>= 1n; shift++;
        }
        while ((a & 1n) === 0n) a >>= 1n;
        while (b !== 0n) {
            while ((b & 1n) === 0n) b >>= 1n;
            if (a > b) { const t = b; b = a; a = t; }
            b -= a;
        }
        return a << shift;
    };

    // --- RAW BRENT-RHO: TURBO MODE ---
    const solveRawBrent = (constantC, startY) => {
        let c = BigInt(constantC);
        let y = BigInt(startY);
        let x = y;
        let g = 1n;
        let r = 1n;
        let q = 1n;
        
        let xs = x;
        let ys = y;

        // HYPER-TUNING for 30+ Digits:
        // GCD is the bottleneck. We increase batch size 'm' significantly.
        // We perform 1000 multiplications before 1 GCD check.
        const m = 1000n; 
        
        // Safety Limit
        const STEPS_LIMIT = 50000000; 
        let steps = 0;

        // Pre-allocate diff to avoid GC churn (conceptual in JS)
        let diff = 0n;

        while (g === 1n && steps < STEPS_LIMIT) {
            x = y;
            
            // Advance by power of 2 (Phase 1)
            // Unrolled 4x for speed
            const rNum = Number(r);
            const rMod4 = rNum & 3;
            const rSteps = rNum - rMod4;
            
            // Bulk steps
            for (let i = 0; i < rSteps; i += 4) {
                y = (y * y + c) % n;
                y = (y * y + c) % n;
                y = (y * y + c) % n;
                y = (y * y + c) % n;
            }
            // Residual steps
            for (let i = 0; i < rMod4; i++) {
                y = (y * y + c) % n;
            }
            steps += rNum;

            let k = 0n;
            while (k < r && g === 1n) {
                ys = y;
                xs = x;
                
                // Determine batch limit
                let condition = (r - k) < m ? (r - k) : m;
                let limit = Number(condition);
                
                q = 1n;
                
                // UNROLLED INNER LOOP (Phase 2)
                // We unroll 4x to minimize loop overhead and JIT checks.
                // This is the "Hot Path" - optimized for throughput.
                
                let j = 0;
                const limitMod4 = limit & 3;
                const limitSteps = limit - limitMod4;

                // Loop Unrolled Block
                for (; j < limitSteps; j += 4) {
                    // Step 1
                    y = (y * y + c) % n;
                    diff = x > y ? x - y : y - x;
                    q = (q * diff) % n;

                    // Step 2
                    y = (y * y + c) % n;
                    diff = x > y ? x - y : y - x;
                    q = (q * diff) % n;

                    // Step 3
                    y = (y * y + c) % n;
                    diff = x > y ? x - y : y - x;
                    q = (q * diff) % n;

                    // Step 4
                    y = (y * y + c) % n;
                    diff = x > y ? x - y : y - x;
                    q = (q * diff) % n;
                }

                // Handle remaining iterations
                for (; j < limit; j++) {
                    y = (y * y + c) % n;
                    diff = x > y ? x - y : y - x;
                    q = (q * diff) % n;
                }
                
                g = gcd(q, n);
                k += BigInt(limit);
            }
            r <<= 1n;
        }

        // Backtracking logic (Standard)
        if (g === n) {
            while (true) {
                ys = (ys * ys + c) % n;
                diff = xs > ys ? xs - ys : ys - xs;
                g = gcd(diff, n);
                if (g > 1n) break;
            }
        }

        return g;
    };

    try {
        let factor = solveRawBrent(startC, seedVal);
        
        // Fallback: Aggressive polynomial switch
        if (factor === 1n || factor === n) {
             // Try c + 3 to jump to a different graph
             factor = solveRawBrent(BigInt(startC) + 3n, seedVal);
        }

        if (factor > 1n && factor < n) {
            self.postMessage({ factor: factor.toString() });
        } else {
            self.postMessage({ factor: null });
        }

    } catch(err) {
        self.postMessage({ factor: null });
    }
};
`;

// --- Matrix Factoring Architect (Parallel System) ---

class QuantumFactoringArchitect {
    private workerBlobURL: string;
    
    constructor() {
        const blob = new Blob([QUANTUM_WORKER_BLOB], { type: 'application/javascript' });
        this.workerBlobURL = URL.createObjectURL(blob);
    }

    private power(base: bigint, exp: bigint, mod: bigint): bigint {
        let res = 1n;
        base %= mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) res = (res * base) % mod;
            base = (base * base) % mod;
            exp /= 2n;
        }
        return res;
    }

    // High-Precision Miller-Rabin
    public isPrime(n: bigint): boolean {
        if (n < 2n) return false;
        if (n === 2n || n === 3n) return true;
        if (n % 2n === 0n) return false;

        let d = n - 1n;
        let s = 0n;
        while (d % 2n === 0n) {
            d /= 2n;
            s++;
        }

        const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
        for (const a of bases) {
            if (n <= a) break;
            let x = this.power(a, d, n);
            if (x === 1n || x === n - 1n) continue;
            let composite = true;
            for (let r = 1n; r < s; r++) {
                x = this.power(x, 2n, n);
                if (x === n - 1n) {
                    composite = false;
                    break;
                }
            }
            if (composite) return false;
        }
        return true;
    }

    private async findFactorParallel(n: bigint): Promise<bigint> {
        if (n % 2n === 0n) return 2n;
        if (this.isPrime(n)) return n;

        const logicalCores = navigator.hardwareConcurrency || 4;
        // Aggressive thread count for max throughput
        const workerCount = Math.max(4, logicalCores); 
        
        const workers: Worker[] = [];

        return new Promise<bigint>((resolve) => {
            let activeWorkers = workerCount;
            let resolved = false;

            const cleanup = () => {
                workers.forEach(w => w.terminate());
            };

            const flatA1 = A1.flat();

            for (let i = 0; i < workerCount; i++) {
                const worker = new Worker(this.workerBlobURL);
                workers.push(worker);

                let startC: number;
                let seedVal: number;

                // Strategy: Cover maximum polynomial space
                if (i === 0) {
                    startC = 1; seedVal = 2; // Standard
                } else if (i === 1) {
                    startC = 3; seedVal = 5; 
                } else if (i === 2) {
                    startC = 5; seedVal = 7;
                } else {
                    // Matrix-guided diversification
                    startC = flatA1[i % flatA1.length];
                    seedVal = flatA1[(i * 3) % flatA1.length] + i;
                }

                worker.onmessage = (e) => {
                    if (resolved) return;

                    const { factor } = e.data;
                    if (factor) {
                        const f = BigInt(factor);
                        if (f !== n && f !== 1n) {
                            resolved = true;
                            cleanup();
                            resolve(f);
                            return;
                        }
                    }

                    activeWorkers--;
                    if (activeWorkers === 0 && !resolved) {
                        resolve(0n); 
                    }
                };

                worker.postMessage({
                    nStr: n.toString(),
                    startC: startC.toString(), 
                    seedVal: seedVal.toString(),
                    workerId: i
                });
            }
            
            // 3 Minute timeout for Massive Numbers
            setTimeout(() => {
                if(!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(0n);
                }
            }, 180000);
        });
    }

    public async factorizeAsync(nVal: bigint): Promise<bigint[]> {
        if (nVal < 1n) return [];
        if (nVal === 1n) return [1n];

        const factors: bigint[] = [];
        let queue = [nVal];

        // 1. Main Thread Fast Sieve
        const smallBasis = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n];
        let nextQueue: bigint[] = [];
        
        for(let num of queue) {
             let temp = num;
             for (const p of smallBasis) {
                while (temp % p === 0n) {
                    factors.push(p);
                    temp /= p;
                }
             }
             if (temp > 1n) nextQueue.push(temp);
        }
        queue = nextQueue;

        // 2. Parallel Deep Processing
        while (queue.length > 0) {
            const current = queue.pop()!;
            
            if (this.isPrime(current)) {
                factors.push(current);
                continue;
            }

            const factor = await this.findFactorParallel(current);

            if (factor === 0n || factor === current) {
                factors.push(current); 
            } else {
                queue.push(factor);
                queue.push(current / factor);
            }
        }

        return factors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }
}

// --- Algorithmic Components ---

const vectorizeNumber = (nStr: string): Vector => {
  let n: bigint;
  try {
     n = BigInt(nStr);
  } catch (e) {
     return [0, 0, 0, 0, 0, 0];
  }
  const nLen = nStr.length;
  const logN = nLen * 2.302585; 
  const base = [2, 3, 5, 7, 11, 13];
  return base.map(b => Number(n % BigInt(b)) + logN);
};

const generateSpectralData = (inputVector: Vector): { fused: Vector, eigenvalues: number[] } => {
  const s1 = multiplyMatrixVector(A1, inputVector);
  const s2 = multiplyMatrixVector(A_NT_corrected, inputVector);
  const fused = addVectors(s1, s2);
  const eigenvalues = fused.map((val, i) => Math.abs(val * Math.sin(i + 1))).sort((a, b) => b - a);
  return { fused, eigenvalues };
};

const calculateGradient = (eigenvalues: number[]): GradientPoint[] => {
  const points: GradientPoint[] = [];
  for (let i = 0; i < eigenvalues.length; i++) {
    const val = eigenvalues[i];
    const next = eigenvalues[i + 1] || 0;
    const grad = val - next;
    points.push({ x: i, potential: val, gradient: grad });
  }
  return points;
};

const projectToPrimeSpace = (fusedVector: Vector): Vector => {
  const truncatedVector = fusedVector.slice(0, 13);
  const normV = normalizeVector(truncatedVector);
  return multiplyMatrixVector(M_corrected, normV);
};

const calculateSpectralVariance = (eigenvalues: number[]): number => {
    if (eigenvalues.length === 0) return 0;
    const mean = eigenvalues.reduce((a, b) => a + b, 0) / eigenvalues.length;
    const variance = eigenvalues.reduce((a, b) => a + (b - mean) ** 2, 0) / eigenvalues.length;
    return variance;
};

const calculateStabilityScore = (eigenvalues: number[]): number => {
    const v = calculateSpectralVariance(eigenvalues);
    return 1 / (1 + v);
}

const calculatePotentialScore = (gradient: GradientPoint[]): number => {
    if (gradient.length === 0) return 0;
    const avgGrad = gradient.reduce((sum, p) => sum + Math.abs(p.gradient), 0) / gradient.length;
    return 1 / (1 + avgGrad);
}

const calculateProjectionScore = (projection: Vector): number => {
    const variance = calculateSpectralVariance(projection);
    return 1 / (1 + variance); 
}

const calculateResonanceScore = (eigenvalues: number[], gradient: GradientPoint[], projection: Vector): number => {
    const s_stab = calculateStabilityScore(eigenvalues);
    const s_pot = calculatePotentialScore(gradient);
    const s_proj = calculateProjectionScore(projection);
    return s_stab * s_pot * s_proj;
}

// --- Main Analysis Function (ASYNC) ---

const architect = new QuantumFactoringArchitect();

export const analyzeNumber = async (nStr: string): Promise<MatrixAnalysisReport> => {
  const start = performance.now();
  
  let nBig: bigint;
  try {
    nBig = BigInt(nStr);
  } catch (e) {
    return {
      inputNumber: nStr,
      classification: ClassificationType.NON_PRIME_UNSTABLE,
      factors: [],
      eigenvalues: [],
      stability: StabilityState.UNSTABLE,
      convergenceScore: 0,
      vectorProjection: [],
      potentialGradient: [],
      spectralData: [],
      primeDensity: 0,
      resonanceScore: 0,
      executionTimeMs: 0
    };
  }

  // 1. Vectorize
  const vN = vectorizeNumber(nStr);
  
  // 2 & 3. Projection & Spectral
  const { fused, eigenvalues } = generateSpectralData(vN);
  
  // 4. Gradient
  const gradientData = calculateGradient(eigenvalues);
  
  // 5. M-Projection
  const projection = projectToPrimeSpace(fused);
  
  // 6. Resonance Score
  const resonanceScore = calculateResonanceScore(eigenvalues, gradientData, projection);

  // 7. Parallel Factor Detection (RAW BRENT)
  const realFactorsBig = await architect.factorizeAsync(nBig);
  const realFactors = realFactorsBig.map(String);
  
  // 8. Classification & Stability Logic
  let classification = ClassificationType.COMPOSITE;
  let stability = StabilityState.UNSTABLE;

  if (nBig === 1n) {
      classification = ClassificationType.UNIT;
      stability = StabilityState.CRITICAL;
  } else if (realFactorsBig.length === 1 && realFactorsBig[0] === nBig) {
      if (architect.isPrime(nBig)) {
          classification = ClassificationType.PRIME;
          stability = StabilityState.STABLE;
      } else {
          // Stubborn composite
          classification = ClassificationType.NON_PRIME_UNSTABLE;
      }
  } else {
      if (realFactorsBig.length === 2) {
          classification = ClassificationType.SEMIPRIME;
      } else {
          classification = ClassificationType.COMPOSITE;
      }
      
      if (resonanceScore > 0.72) {
          stability = StabilityState.STABLE;
      }
  }
  
  // 10. Prime Density
  let primeDensity = 0;
  if (nBig > 1n) {
      const lnN = nStr.length * 2.302585; 
      primeDensity = realFactors.length / lnN;
  }

  const spectralData: SpectralPoint[] = eigenvalues.map((val, idx) => ({
    index: idx + 1,
    value: val,
    type: idx < realFactors.length ? 'Eigen' : 'Noise' 
  }));

  const end = performance.now();

  return {
    inputNumber: nStr,
    classification,
    factors: realFactors,
    eigenvalues,
    stability,
    convergenceScore: resonanceScore * 100,
    vectorProjection: projection,
    potentialGradient: gradientData,
    spectralData,
    primeDensity,
    resonanceScore,
    executionTimeMs: end - start
  };
};