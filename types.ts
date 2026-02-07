export enum ClassificationType {
  PRIME = "Prime",
  SEMIPRIME = "Semiprime",
  COMPOSITE = "Composite",
  NON_PRIME_UNSTABLE = "Non-Prime (Unstable)",
  UNIT = "Unit"
}

export enum StabilityState {
  STABLE = "Stable",
  UNSTABLE = "Unstable",
  CRITICAL = "Critical"
}

export interface SpectralPoint {
  index: number;
  value: number;
  type: 'Eigen' | 'Noise';
}

export interface GradientPoint {
  x: number;
  potential: number;
  gradient: number;
}

export interface MatrixAnalysisReport {
  inputNumber: string;
  classification: ClassificationType;
  factors: string[];
  eigenvalues: number[];
  stability: StabilityState;
  convergenceScore: number;
  vectorProjection: number[];
  potentialGradient: GradientPoint[];
  spectralData: SpectralPoint[];
  primeDensity: number;
  resonanceScore: number;
  executionTimeMs: number;
}

export type Matrix = number[][];
export type Vector = number[];