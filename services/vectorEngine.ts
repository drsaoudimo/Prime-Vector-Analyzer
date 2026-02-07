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

// --- QUANTUM WORKER KERNEL: BRENT'S OPTIMIZED RHO WITH A1 MATRIX INJECTION ---
const QUANTUM_WORKER_BLOB = `
self.onmessage = function(e) {
    const { nStr, columnData, seedVal } = e.data;
    const n = BigInt(nStr);
    
    // Binary GCD Algorithm (Optimized for Bitwise operations on BigInt)
    const gcd = (a, b) => {
        if (a === 0n) return b;
        if (b === 0n) return a;
        let k = 0n;
        // Remove common factors of 2
        while (((a | b) & 1n) === 0n) {
            a >>= 1n;
            b >>= 1n;
            k++;
        }
        while ((a & 1n) === 0n) a >>= 1n;
        while (b !== 0n) {
            while ((b & 1n) === 0n) b >>= 1n;
            if (a > b) {
                const t = b; b = a; a = t;
            }
            b -= a;
        }
        return a << k;
    };

    try {
        // We iterate through the specific column values of Matrix A1 assigned to this worker.
        // This maps the matrix topology to the factorization attempts.
        
        for (let i = 0; i < columnData.length; i++) {
            const c = BigInt(columnData[i]);
            
            // Brent's Algo Setup
            let y = BigInt(seedVal) + BigInt(i); // Vary start point slightly per matrix row
            let r = 1n;
            let q = 1n;
            let g = 1n;
            let m = 128n; // Block size for GCD accumulation
            let x = y;
            let ys = y;

            // Polynomial f(x) = x^2 + c mod n
            const f = (v) => (v * v + c) % n;

            // Loop limit per matrix element to avoid infinite loops on prime numbers
            let stepLimit = 20000000; 
            let steps = 0;

            while (g === 1n && steps < stepLimit) {
                x = y;
                
                // Advance y by r steps (Powers of 2: 1, 2, 4, 8...)
                for (let j = 0; j < r; j++) {
                    y = f(y);
                }
                
                let k = 0n;
                while (k < r && g === 1n) {
                    ys = y;
                    
                    // Process in blocks of size m to reduce expensive GCD calls
                    let conditionLimit = (r - k) < m ? (r - k) : m;
                    // Force Number for loop comparison speed
                    let limit = Number(conditionLimit); 
                    
                    for (let j = 0; j < limit; j++) {
                        y = f(y);
                        // Calculate product of differences |x - y|
                        let diff = x > y ? x - y : y - x;
                        q = (q * diff) % n;
                    }
                    
                    g = gcd(q, n);
                    k += BigInt(limit);
                    steps += limit;
                }
                r *= 2n;
            }

            if (g === n) {
                // Backtrack to find the specific factor if we overshot
                while (true) {
                    ys = f(ys);
                    let diff = x > ys ? x - ys : ys - x;
                    g = gcd(diff, n);
                    if (g > 1n) break;
                }
            }

            if (g > 1n && g < n) {
                self.postMessage({ factor: g.toString() });
                return;
            }
            
            // If failed with this 'c' from Matrix A1, loop continues to next 'c' in the column
        }

        // All matrix parameters exhausted for this lane
        self.postMessage({ factor: null });

    } catch(err) {
        self.postMessage({ factor: null });
    }
};
`;

// --- Matrix Factoring Architect (Parallel System) ---

class QuantumFactoringArchitect {
    private workerBlobURL: string;
    // We will transpose A1 to get columns for the workers
    private A1_columns: number[][]; 

    constructor() {
        const blob = new Blob([QUANTUM_WORKER_BLOB], { type: 'application/javascript' });
        this.workerBlobURL = URL.createObjectURL(blob);
        
        // Transpose A1 (19x6) into 6 columns of 19 rows
        // This creates 6 unique "Search Lanes" based on the matrix structure
        this.A1_columns = Array.from({ length: 6 }, (_, colIndex) => 
            A1.map(row => row[colIndex])
        );
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

    // High-Precision Miller-Rabin Primality Test
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

        const bases = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
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

    /**
     * Parallel Deep-Dive Factorization using Brent's Method & Matrix A1
     */
    private async findFactorParallel(n: bigint): Promise<bigint> {
        if (n % 2n === 0n) return 2n;
        if (this.isPrime(n)) return n;

        // Determine concurrency. We want at least 6 workers to cover all 6 columns of A1.
        // If hardware has fewer cores, we still spawn 6 to ensure matrix coverage.
        // If hardware has more (e.g., 12), we double up on columns with different seeds.
        const logicalCores = navigator.hardwareConcurrency || 6;
        const workerCount = Math.max(6, logicalCores); // Ensure at least 6 lanes
        
        const workers: Worker[] = [];

        return new Promise<bigint>((resolve) => {
            let activeWorkers = workerCount;
            let resolved = false;

            const cleanup = () => {
                workers.forEach(w => w.terminate());
            };

            for (let i = 0; i < workerCount; i++) {
                const worker = new Worker(this.workerBlobURL);
                workers.push(worker);

                // Assign a column from Matrix A1 to this worker
                // Worker 0 gets Col 0, Worker 6 gets Col 0, etc.
                const columnIndex = i % 6;
                const columnData = this.A1_columns[columnIndex];
                
                // Unique seed based on worker ID to ensure randomness even if sharing a column
                const seedVal = Math.floor(Math.random() * 1000) + 2 + i * 100;

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
                        resolve(0n); // All workers exhausted their matrix columns
                    }
                };

                worker.postMessage({
                    nStr: n.toString(),
                    columnData: columnData, // Pass the Matrix A1 column
                    seedVal: seedVal.toString()
                });
            }
            
            // Timeout 60s
            setTimeout(() => {
                if(!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(0n);
                }
            }, 60000);
        });
    }

    public async factorizeAsync(nVal: bigint): Promise<bigint[]> {
        if (nVal < 1n) return [];
        if (nVal === 1n) return [1n];

        const factors: bigint[] = [];
        let queue = [nVal];

        // 1. Strip Small Factors (Trial Division)
        const smallBasis = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
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

            // Execute Parallel Brent's Rho with Matrix A1
            const factor = await this.findFactorParallel(current);

            if (factor === 0n || factor === current) {
                factors.push(current); // Unresolved
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

  // 7. Parallel Factor Detection (Brent's Optimized Rho with Matrix A1)
  const realFactorsBig = await architect.factorizeAsync(nBig);
  const realFactors = realFactorsBig.map(String);
  
  // 8. Classification
  let classification = ClassificationType.COMPOSITE;
  if (nBig === 1n) {
      classification = ClassificationType.UNIT;
  } else if (realFactorsBig.length === 1 && realFactorsBig[0] === nBig) {
      if (architect.isPrime(nBig)) {
          classification = ClassificationType.PRIME;
      } else {
          classification = ClassificationType.NON_PRIME_UNSTABLE;
      }
  } else if (realFactorsBig.length === 2) {
      classification = ClassificationType.SEMIPRIME;
  }
  
  // 9. Stability
  let stability = StabilityState.UNSTABLE;
  if (resonanceScore > 0.72 || classification === ClassificationType.PRIME) stability = StabilityState.STABLE;
  if (classification === ClassificationType.UNIT) stability = StabilityState.CRITICAL;
  
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