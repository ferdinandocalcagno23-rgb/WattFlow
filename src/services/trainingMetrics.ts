import type { WorkoutRecording } from '@/types';

// --- Helpers ---

/**
 * Find the maximum rolling average for a given window size in a 1Hz power array.
 */
export function findMaxRollingAvg(arr: number[], windowSize: number): number {
    if (arr.length < windowSize) return 0;
    let maxAvg = 0;
    let sum = 0;
    for (let i = 0; i < windowSize; i++) sum += arr[i];
    maxAvg = sum / windowSize;
    for (let i = windowSize; i < arr.length; i++) {
        sum = sum - arr[i - windowSize] + arr[i];
        const avg = sum / windowSize;
        if (avg > maxAvg) maxAvg = avg;
    }
    return Math.round(maxAvg);
}

// --- Normalized Power (NP) ---

/**
 * Calculate Normalized Power from a 1Hz power array.
 * 1. 30s moving average
 * 2. Raise each value to the 4th power
 * 3. Average of raised values
 * 4. 4th root
 */
export function calculateNormalizedPower(rawPower: number[]): number {
    if (rawPower.length < 30) {
        // Fallback to simple average for very short efforts
        const avg = rawPower.reduce((a, b) => a + b, 0) / rawPower.length;
        return Math.round(avg);
    }

    // 1. 30s moving average
    const smoothed: number[] = [];
    let windowSum = 0;
    for (let i = 0; i < 30; i++) windowSum += rawPower[i];
    smoothed.push(windowSum / 30);
    for (let i = 30; i < rawPower.length; i++) {
        windowSum = windowSum - rawPower[i - 30] + rawPower[i];
        smoothed.push(windowSum / 30);
    }

    // 2. Raise to the 4th power
    let sum4th = 0;
    for (const val of smoothed) {
        sum4th += val ** 4;
    }

    // 3. Average, then 4th root
    const avg4th = sum4th / smoothed.length;
    return Math.round(avg4th ** 0.25);
}

// --- Training Stress Score (TSS) ---

/**
 * Calculate TSS = (duration_sec * NP * IF) / (FTP * 3600) * 100
 * where IF = NP / FTP
 */
export function calculateTSS(durationSec: number, np: number, ftp: number): number {
    if (ftp <= 0) return 0;
    const intensityFactor = np / ftp;
    return Math.round((durationSec * np * intensityFactor) / (ftp * 3600) * 100);
}

// --- Critical Power Estimation (Monod & Scherrer 2-parameter model) ---

/**
 * Estimate Critical Power (CP) and W' from workout history using linear regression
 * on (Time, Work) pairs extracted from MMP at 180s, 300s, 600s, 1200s.
 * 
 * Returns { cp, wPrime } or null if insufficient data.
 */
export function estimateCriticalPower(
    workouts: WorkoutRecording[]
): { cp: number; wPrime: number } | null {
    const windows = [180, 300, 600, 1200]; // seconds
    const points: { time: number; work: number }[] = [];

    for (const w of windows) {
        let bestMMP = 0;
        for (const workout of workouts) {
            if (!workout.rawData || workout.rawData.length < w) continue;
            const powers = workout.rawData.map(d => d.power);
            const mmp = findMaxRollingAvg(powers, w);
            if (mmp > bestMMP) bestMMP = mmp;
        }
        if (bestMMP > 0) {
            points.push({ time: w, work: bestMMP * w }); // Work = Power * Time (Joules)
        }
    }

    // Need at least 2 points for linear regression
    if (points.length < 2) return null;

    // Linear regression: Work = CP * Time + W'
    // y = mx + q where m = CP, q = W'
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of points) {
        sumX += p.time;
        sumY += p.work;
        sumXY += p.time * p.work;
        sumXX += p.time * p.time;
    }

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const cp = (n * sumXY - sumX * sumY) / denom;
    const wPrime = (sumY - cp * sumX) / n;

    if (cp <= 0) return null;

    return {
        cp: Math.round(cp),
        wPrime: Math.round(Math.max(0, wPrime)), // W' in Joules, must be positive
    };
}

// --- VO2max Estimation (ACSM Method) ---

/**
 * Estimate VO2max using the ACSM cycling equation:
 * VO2 = (MAP * 10.8 / weight) + 7
 * 
 * MAP = best 5-minute Mean Maximal Power across all workouts.
 */
export function estimateVO2max(
    workouts: WorkoutRecording[],
    weight: number
): number | null {
    if (weight <= 0) return null;

    let bestMAP = 0;
    for (const workout of workouts) {
        if (!workout.rawData || workout.rawData.length < 300) continue;
        const powers = workout.rawData.map(d => d.power);
        const map5 = findMaxRollingAvg(powers, 300);
        if (map5 > bestMAP) bestMAP = map5;
    }

    if (bestMAP === 0) return null;

    const vo2max = (bestMAP * 10.8) / weight + 7;
    return Math.round(vo2max * 10) / 10; // 1 decimal place
}

// --- Performance Management Chart (CTL / ATL / TSB) ---

export interface PMCDataPoint {
    date: string; // YYYY-MM-DD
    tss: number;
    ctl: number;
    atl: number;
    tsb: number;
}

/**
 * Calculate Performance Management Chart data using EWMA.
 * CTL (Fitness): τ = 42 days
 * ATL (Fatigue): τ = 7 days
 * TSB (Form): CTL_yesterday - ATL_yesterday
 */
export function calculatePMC(
    workouts: WorkoutRecording[],
    ftp: number
): PMCDataPoint[] {
    if (workouts.length === 0 || ftp <= 0) return [];

    // Build daily TSS map
    const dailyTSS: Map<string, number> = new Map();
    const sorted = [...workouts].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const w of sorted) {
        const d = new Date(w.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        let np: number;
        if (w.rawData && w.rawData.length >= 30) {
            np = calculateNormalizedPower(w.rawData.map(d => d.power));
        } else {
            np = Math.round(w.avgPower * 1.05); // Proxy if no raw data
        }

        const tss = calculateTSS(w.duration, np, ftp);
        dailyTSS.set(dateStr, (dailyTSS.get(dateStr) || 0) + tss);
    }

    // Generate day-by-day from first workout to today
    const firstDate = new Date(sorted[0].date);
    firstDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: PMCDataPoint[] = [];
    let ctl = 0;
    let atl = 0;

    const current = new Date(firstDate);
    while (current <= today) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const tss = dailyTSS.get(dateStr) || 0;

        // TSB uses yesterday's values
        const tsb = Math.round((ctl - atl) * 10) / 10;

        // EWMA update
        ctl = ctl + (tss - ctl) / 42;
        atl = atl + (tss - atl) / 7;

        result.push({
            date: dateStr,
            tss,
            ctl: Math.round(ctl * 10) / 10,
            atl: Math.round(atl * 10) / 10,
            tsb,
        });

        current.setDate(current.getDate() + 1);
    }

    return result;
}

// --- Power Peaks ---

export interface PowerPeaks {
    peak5s: number;
    peak1m: number;
    peak5m: number;
    peak20m: number;
}

export function calculatePowerPeaks(workouts: WorkoutRecording[]): PowerPeaks {
    let peak5s = 0, peak1m = 0, peak5m = 0, peak20m = 0;

    for (const w of workouts) {
        if (!w.rawData || w.rawData.length < 5) continue;
        const p = w.rawData.map(d => d.power);

        const p5s = findMaxRollingAvg(p, 5);
        const p1m = findMaxRollingAvg(p, 60);
        const p5m = findMaxRollingAvg(p, 300);
        const p20m = findMaxRollingAvg(p, 1200);

        if (p5s > peak5s) peak5s = p5s;
        if (p1m > peak1m) peak1m = p1m;
        if (p5m > peak5m) peak5m = p5m;
        if (p20m > peak20m) peak20m = p20m;
    }

    return { peak5s, peak1m, peak5m, peak20m };
}
