import type { IntervalStep } from '@/types';

export interface PreMadeIntervalStep extends Omit<IntervalStep, 'targetPower' | 'startPower' | 'id'> {
    targetPowerPercent: number;
    startPowerPercent?: number;
}

export interface PreMadeWorkout {
    id: string;
    name: string;
    description: string;
    category: 'Recovery' | 'Endurance' | 'Sweet Spot' | 'Threshold' | 'VO2 Max' | 'Testing';
    steps: PreMadeIntervalStep[];
}

export const PRE_MADE_WORKOUTS: PreMadeWorkout[] = [

    // ─── RECOVERY ───────────────────────────────────────────────
    {
        id: 'rec-1', name: 'Active Recovery', category: 'Recovery',
        description: 'Pedalata leggera sotto il 50% FTP per favorire il recupero muscolare.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.40, targetPowerPercent: 0.50, description: 'Warm Up' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.50, description: 'Recovery Spin' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Cool Down' },
        ]
    },
    {
        id: 'rec-2', name: 'Easy Spin', category: 'Recovery',
        description: 'Cadenza alta, potenza bassissima. Perfetto il giorno dopo una gara.',
        steps: [
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Easy Spin' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.45, description: 'Easy Spin' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Easy Spin' },
        ]
    },
    {
        id: 'rec-3', name: 'Deep Recovery', category: 'Recovery',
        description: 'Un\'ora costante a 50% FTP per chi ha nelle gambe una settimana intensa.',
        steps: [
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Warm Up' },
            { type: 'steady', duration: 3000, targetPowerPercent: 0.50, description: 'Deep Recovery' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Cool Down' },
        ]
    },
    {
        id: 'rec-4', name: 'Mobilità + Spin', category: 'Recovery',
        description: 'Alternanza leggera tra 40% e 55% FTP. Ideale per sciogliere le gambe.',
        steps: [
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Warm Up' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Light Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Rest' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Light Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Rest' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Light Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Cool Down' },
        ]
    },
    {
        id: 'rec-5', name: 'Opener Workout', category: 'Recovery',
        description: 'Breve attivazione pre-gara con sprint brevi per aprire le gambe.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.40, targetPowerPercent: 0.55, description: 'Warm Up' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.50, description: 'Easy' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.30, description: 'Sprint 1' },
            { type: 'steady', duration: 290, targetPowerPercent: 0.50, description: 'Recovery' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.30, description: 'Sprint 2' },
            { type: 'steady', duration: 290, targetPowerPercent: 0.50, description: 'Recovery' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.30, description: 'Sprint 3' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.40, description: 'Cool Down' },
        ]
    },

    // ─── ENDURANCE ──────────────────────────────────────────────
    {
        id: 'end-1', name: 'Classic Endurance', category: 'Endurance',
        description: 'Blocco Z2 costante a 65-70% FTP. Costruisce la base aerobica.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 2700, targetPowerPercent: 0.70, description: 'Endurance Block' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.65, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-2', name: 'Long Ride Z2', category: 'Endurance',
        description: '75 min a 65% FTP con ramp di riscaldamento. Simula una lunga uscita.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 4500, targetPowerPercent: 0.65, description: 'Long Z2' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.60, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-3', name: 'Tempo Endurance', category: 'Endurance',
        description: 'Blocco centrale a 75% FTP (Z3) con riscaldamento e defaticamento.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.70, description: 'Warm Up' },
            { type: 'steady', duration: 2700, targetPowerPercent: 0.75, description: 'Tempo Block' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-4', name: '3×15 Endurance', category: 'Endurance',
        description: 'Tre blocchi da 15 min a 70% FTP con 5 min di recupero tra loro.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Endurance 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Endurance 2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Endurance 3' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.65, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-5', name: 'Pyramidal Ride', category: 'Endurance',
        description: 'Z2→Z3→Z4→Z3→Z2: la potenza sale e scende come un\'uscita collinare.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.68, description: 'Z2' },
            { type: 'ramp', duration: 600, startPowerPercent: 0.68, targetPowerPercent: 0.78, description: 'Rising Z3' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.92, description: 'Z4 Peak' },
            { type: 'ramp', duration: 600, startPowerPercent: 0.78, targetPowerPercent: 0.68, description: 'Descending Z3' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.65, description: 'Z2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-6', name: 'Fatmax Session', category: 'Endurance',
        description: 'Lunga sessione a 60-65% FTP per massimizzare l\'ossidazione dei grassi.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            { type: 'steady', duration: 3300, targetPowerPercent: 0.63, description: 'Fatmax Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-7', name: 'Muscular Endurance', category: 'Endurance',
        description: 'Z2 con blocchi a bassa cadenza (55 rpm) per reclutare più fibre muscolari.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.70, description: 'Z2 Normal' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.70, description: 'Low Cadence (55rpm)' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.70, description: 'Z2 Normal' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.70, description: 'Low Cadence (55rpm)' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.70, description: 'Z2 Normal' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.70, description: 'Low Cadence (55rpm)' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.70, description: 'Z2 Normal' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-8', name: 'Aerobic Decoupling Test', category: 'Endurance',
        description: '50 min costanti a 70% FTP. Testa la deriva cardiaca (drift).',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.65, description: 'Warm Up' },
            { type: 'steady', duration: 3000, targetPowerPercent: 0.70, description: 'Steady State' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-9', name: 'Zone 2 Base Builder', category: 'Endurance',
        description: '60 min di endurance con 3 brevi pause attive per spezzare la monotonia.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.68, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Z2 Block 1' },
            { type: 'steady', duration: 60, targetPowerPercent: 0.50, description: 'Active Pause' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Z2 Block 2' },
            { type: 'steady', duration: 60, targetPowerPercent: 0.50, description: 'Active Pause' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.70, description: 'Z2 Block 3' },
            { type: 'steady', duration: 60, targetPowerPercent: 0.50, description: 'Active Pause' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-10', name: 'Endurance Foundation', category: 'Endurance',
        description: 'Sessione semplice: 45 min continui a 65% FTP. Ideale per principianti.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.62, description: 'Warm Up' },
            { type: 'steady', duration: 2700, targetPowerPercent: 0.65, description: 'Z2 Steady' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    // Endurance con micro-intervalli 1min/1min
    {
        id: 'end-11', name: 'Micro Intervals Z2', category: 'Endurance',
        description: '40 ripetizioni 1 min a 73% / 1 min a 58% FTP. Stimola la base aerobica senza affaticare.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...Array.from({ length: 20 }, (_, i) => [
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.73, description: `Z2 High ${i + 1}` },
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.58, description: `Z1 High ${i + 1}` },
            ]).flat(),
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-12', name: 'Easy Cruise Blinks', category: 'Endurance',
        description: '3 blocchi da 12 min con micro-alternanza 1/1 a 75%/57% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...([1, 2, 3] as const).flatMap((b) => [
                ...Array.from({ length: 6 }, (_, i) => [
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.75, description: `Block ${b} – High ${i + 1}` },
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.57, description: `Block ${b} – Low ${i + 1}` },
                ]).flat(),
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.50, description: `Recovery ${b}` },
            ]),
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-13', name: 'Soft Pulses', category: 'Endurance',
        description: '4 blocchi da 11 min con micro-intervalli 1/1 a 72%/55% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...([1, 2, 3, 4] as const).flatMap((b) => [
                ...Array.from({ length: 5 }, (_, i) => [
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.72, description: `Block ${b} – High ${i + 1}` },
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.55, description: `Block ${b} – Low ${i + 1}` },
                ]).flat(),
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.50, description: `Recovery ${b}` },
            ]),
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-14', name: 'Aerobic Blinks', category: 'Endurance',
        description: '22 ripetizioni 1/1 a 70%/56% FTP seguite da 5 min di steady Z2.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...Array.from({ length: 11 }, (_, i) => [
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.70, description: `High ${i + 1}` },
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.56, description: `Low ${i + 1}` },
            ]).flat(),
            { type: 'steady', duration: 300, targetPowerPercent: 0.68, description: 'Z2 Finish' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-15', name: 'Z2 Flicker', category: 'Endurance',
        description: '25 ripetizioni 1/1 a 74%/58% FTP. Sessione da 60 min, facile ma efficace.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...Array.from({ length: 25 }, (_, i) => [
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.74, description: `High ${i + 1}` },
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.58, description: `Low ${i + 1}` },
            ]).flat(),
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-16', name: 'Easy Tempo Blinks', category: 'Endurance',
        description: '4 blocchi da 14 min con alternanza 1/1 a 75%/58% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.62, description: 'Warm Up' },
            ...([1, 2, 3, 4] as const).flatMap((b) => [
                ...Array.from({ length: 7 }, (_, i) => [
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.75, description: `Block ${b} – High ${i + 1}` },
                    { type: 'steady' as const, duration: 60, targetPowerPercent: 0.58, description: `Block ${b} – Low ${i + 1}` },
                ]).flat(),
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.50, description: `Recovery ${b}` },
            ]),
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'end-17', name: 'Rolling Micro Watts', category: 'Endurance',
        description: '22 ripetizioni 1/1 a 72%/57% FTP poi 3 min di defaticamento attivo.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.45, targetPowerPercent: 0.60, description: 'Warm Up' },
            ...Array.from({ length: 22 }, (_, i) => [
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.72, description: `High ${i + 1}` },
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.57, description: `Low ${i + 1}` },
            ]).flat(),
            { type: 'steady', duration: 180, targetPowerPercent: 0.55, description: 'Active Cooldown' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },

    // ─── SWEET SPOT ─────────────────────────────────────────────
    {
        id: 'ss-1', name: '2×20 Sweet Spot', category: 'Sweet Spot',
        description: 'Il classico. Due blocchi da 20 min a 88-93% FTP per costruire FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.90, description: 'Sweet Spot 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.90, description: 'Sweet Spot 2' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-2', name: '3×15 Sweet Spot', category: 'Sweet Spot',
        description: 'Tre blocchi da 15 min a 88% FTP con 5 min di recupero.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'SS 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'SS 2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'SS 3' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-3', name: '4×12 Sweet Spot', category: 'Sweet Spot',
        description: 'Quattro blocchi da 12 min. Più recuperi, stesso volume di lavoro.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 720, targetPowerPercent: 0.88, description: 'SS 1' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 720, targetPowerPercent: 0.88, description: 'SS 2' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 720, targetPowerPercent: 0.88, description: 'SS 3' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 720, targetPowerPercent: 0.88, description: 'SS 4' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-4', name: '1×40 Sweet Spot', category: 'Sweet Spot',
        description: 'Un unico lungo blocco da 40 min a 88% FTP. Mentalmente impegnativo.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 2400, targetPowerPercent: 0.88, description: 'Long Sweet Spot' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-5', name: 'Sweet Spot Over-Under', category: 'Sweet Spot',
        description: 'Alternanza 3 min al 95% / 3 min all\'85% FTP per 4 serie.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            ...([1, 2, 3, 4]).flatMap(i => [
                { type: 'steady' as const, duration: 180, targetPowerPercent: 0.95, description: `Over ${i}` },
                { type: 'steady' as const, duration: 180, targetPowerPercent: 0.85, description: `Under ${i}` },
            ]),
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-6', name: 'Progressive Sweet Spot', category: 'Sweet Spot',
        description: 'Inizia all\'85% e sale fino al 95% nell\'ultimo blocco.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.85, description: 'SS Block 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.90, description: 'SS Block 2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.95, description: 'SS Block 3' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-7', name: 'SS + Threshold Combo', category: 'Sweet Spot',
        description: '2×15 Sweet Spot seguiti da 2×8 Threshold. Sessione avanzata.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.78, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'SS 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'SS 2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Threshold 1' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Threshold 2' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ss-8', name: 'Sustained Power', category: 'Sweet Spot',
        description: 'Un blocco centrale da 35 min a 90% FTP. Massima concentrazione.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 2100, targetPowerPercent: 0.90, description: 'Sustained Sweet Spot' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },

    // ─── THRESHOLD ──────────────────────────────────────────────
    {
        id: 'thr-1', name: '3×10 Threshold', category: 'Threshold',
        description: 'Il classico. Tre blocchi da 10 min esatti all\'FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            { type: 'steady', duration: 600, targetPowerPercent: 1.00, description: 'Threshold 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 600, targetPowerPercent: 1.00, description: 'Threshold 2' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 600, targetPowerPercent: 1.00, description: 'Threshold 3' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-2', name: '2×20 Threshold', category: 'Threshold',
        description: 'Due lunghi blocchi da 20 min al 95-100% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.97, description: 'Threshold 1' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.97, description: 'Threshold 2' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-3', name: '4×8 Threshold', category: 'Threshold',
        description: 'Quattro blocchi da 8 min all\'FTP. Alta intensità, recuperi brevi.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Thr 1' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Thr 2' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Thr 3' },
            { type: 'steady', duration: 240, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.00, description: 'Thr 4' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-4', name: 'Threshold Over-Unders', category: 'Threshold',
        description: '4 min al 105% → 4 min al 95% × 4 serie. Simula l\'intensità di gara.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4]).flatMap(i => [
                { type: 'steady' as const, duration: 240, targetPowerPercent: 1.05, description: `Over ${i}` },
                { type: 'steady' as const, duration: 240, targetPowerPercent: 0.95, description: `Under ${i}` },
            ]),
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-5', name: 'Tempo to Threshold', category: 'Threshold',
        description: 'Progressione da 75% a 100% FTP su 3 blocchi crescenti.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.75, description: 'Tempo Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 900, targetPowerPercent: 0.88, description: 'Sweet Spot Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 600, targetPowerPercent: 1.00, description: 'Threshold Block' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-6', name: 'Punch & Hold', category: 'Threshold',
        description: '20 sec sprint al 130% + 3 min 40 sec al 95% × 6. Attacco e tenuta.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5, 6]).flatMap(i => [
                { type: 'steady' as const, duration: 20, targetPowerPercent: 1.30, description: `Punch ${i}` },
                { type: 'steady' as const, duration: 220, targetPowerPercent: 0.95, description: `Hold ${i}` },
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.55, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-7', name: 'Lactate Clearance', category: 'Threshold',
        description: 'Intervalli at-threshold con recuperi brevissimi (ratio 1:1). Duro.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5]).flatMap(i => [
                { type: 'steady' as const, duration: 360, targetPowerPercent: 1.00, description: `Threshold ${i}` },
                { type: 'steady' as const, duration: 360, targetPowerPercent: 0.55, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-8', name: 'Crit Simulation', category: 'Threshold',
        description: 'Sprint + threshold in loop a simulare il ritmo di un criterium.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5]).flatMap(i => [
                { type: 'steady' as const, duration: 30, targetPowerPercent: 1.40, description: `Sprint ${i}` },
                { type: 'steady' as const, duration: 270, targetPowerPercent: 0.95, description: `Threshold ${i}` },
                { type: 'steady' as const, duration: 60, targetPowerPercent: 0.60, description: `Rest ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-9', name: '10-20-30 Threshold', category: 'Threshold',
        description: 'Un blocco da 10, uno da 20 e uno da 30 min a 95% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.95, description: '10 min Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 1200, targetPowerPercent: 0.95, description: '20 min Block' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.55, description: 'Recovery' },
            { type: 'steady', duration: 1800, targetPowerPercent: 0.95, description: '30 min Block' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.80, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'thr-10', name: 'Broken Threshold', category: 'Threshold',
        description: '3 serie di: 2×8 min al 100% FTP con 2 min rec. Blocchi "rotti" per più volume.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3]).flatMap(s => [
                { type: 'steady' as const, duration: 480, targetPowerPercent: 1.00, description: `Set ${s} – A` },
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.55, description: `Short Rest` },
                { type: 'steady' as const, duration: 480, targetPowerPercent: 1.00, description: `Set ${s} – B` },
                { type: 'steady' as const, duration: 300, targetPowerPercent: 0.55, description: `Set Rest ${s}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.75, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },

    // ─── VO2 MAX ─────────────────────────────────────────────────
    {
        id: 'vo2-1', name: '5×3 VO2 Max', category: 'VO2 Max',
        description: 'Il classico: cinque blocchi da 3 min al 115-120% FTP.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5]).flatMap(i => [
                { type: 'steady' as const, duration: 180, targetPowerPercent: 1.17, description: `VO2 ${i}` },
                { type: 'steady' as const, duration: 180, targetPowerPercent: 0.50, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-2', name: '8×2 VO2 Max', category: 'VO2 Max',
        description: 'Otto blocchi da 2 min. Più ripetizioni, stesso stress fisiologico.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5, 6, 7, 8]).flatMap(i => [
                { type: 'steady' as const, duration: 120, targetPowerPercent: 1.18, description: `VO2 ${i}` },
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.50, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-3', name: '4×4 Norwegian', category: 'VO2 Max',
        description: 'Il protocollo norvegese scientifico: 4×4 min con 3 min di recupero.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4]).flatMap(i => [
                { type: 'steady' as const, duration: 240, targetPowerPercent: 1.15, description: `4 min VO2 ${i}` },
                { type: 'steady' as const, duration: 180, targetPowerPercent: 0.55, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-4', name: '40/20 Microbursts', category: 'VO2 Max',
        description: '40 sec a 120% + 20 sec a 50% × 15 ripetizioni. Classico microburst.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...Array.from({ length: 15 }, (_, i) => [
                { type: 'steady' as const, duration: 40, targetPowerPercent: 1.20, description: `Work ${i + 1}` },
                { type: 'steady' as const, duration: 20, targetPowerPercent: 0.50, description: `Rest ${i + 1}` },
            ]).flat(),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-5', name: '30/30 Intervals', category: 'VO2 Max',
        description: '30 sec a 130% + 30 sec a 40% × 20 ripetizioni.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...Array.from({ length: 20 }, (_, i) => [
                { type: 'steady' as const, duration: 30, targetPowerPercent: 1.30, description: `High ${i + 1}` },
                { type: 'steady' as const, duration: 30, targetPowerPercent: 0.40, description: `Low ${i + 1}` },
            ]).flat(),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-6', name: '6×2 Aerobic Power', category: 'VO2 Max',
        description: 'Sei blocchi da 2 min a 110% FTP con recupero 1:1.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4, 5, 6]).flatMap(i => [
                { type: 'steady' as const, duration: 120, targetPowerPercent: 1.10, description: `Power ${i}` },
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.55, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-7', name: 'VO2 Progressivo', category: 'VO2 Max',
        description: '3 min a 110% → 3 min a 115% → 3 min a 120% × 4 cicli.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...([1, 2, 3, 4]).flatMap(i => [
                { type: 'steady' as const, duration: 180, targetPowerPercent: 1.10, description: `Set ${i} – 110%` },
                { type: 'steady' as const, duration: 180, targetPowerPercent: 1.15, description: `Set ${i} – 115%` },
                { type: 'steady' as const, duration: 180, targetPowerPercent: 1.20, description: `Set ${i} – 120%` },
                { type: 'steady' as const, duration: 240, targetPowerPercent: 0.50, description: `Recovery ${i}` },
            ]),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'vo2-8', name: 'Anaerobic Capacity', category: 'VO2 Max',
        description: '10×1 min a 130% FTP con 2 min di recupero. Costruisce la capacità anaerobica.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            ...Array.from({ length: 10 }, (_, i) => [
                { type: 'steady' as const, duration: 60, targetPowerPercent: 1.30, description: `Anaerobic ${i + 1}` },
                { type: 'steady' as const, duration: 120, targetPowerPercent: 0.50, description: `Recovery ${i + 1}` },
            ]).flat(),
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },

    // ─── TESTING ─────────────────────────────────────────────────
    {
        id: 'ftp-1', name: 'FTP Ramp Test', category: 'Testing',
        description: 'Incremento ogni minuto fino all\'esaurimento. FTP stimato = miglior min × 0.75.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.40, targetPowerPercent: 0.50, description: 'Warm Up' },
            ...[0.55, 0.62, 0.69, 0.76, 0.83, 0.90, 0.97, 1.04, 1.11, 1.18, 1.25, 1.32, 1.39, 1.46, 1.53, 1.60, 1.67, 1.74, 1.81].map(p => ({
                type: 'steady' as const, duration: 60, targetPowerPercent: p, description: 'Ramp Step',
            })),
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.30, description: 'Cool Down' },
        ]
    },
    {
        id: 'ftp-2', name: '20-Minute FTP Test', category: 'Testing',
        description: '20 min al massimo sforzo sostenibile. FTP = 95% della potenza media.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.65, description: 'Easy' },
            { type: 'steady', duration: 1200, targetPowerPercent: 1.05, description: '20 Min Max Effort' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ftp-3', name: '8-Minute FTP Test', category: 'Testing',
        description: 'Due blocchi da 8 min. FTP = 90% della media. Meno estenuante del 20 min.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.05, description: '8 Min Test 1' },
            { type: 'steady', duration: 600, targetPowerPercent: 0.55, description: 'Rest' },
            { type: 'steady', duration: 480, targetPowerPercent: 1.05, description: '8 Min Test 2' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
    {
        id: 'ftp-4', name: 'Sprint Power Test', category: 'Testing',
        description: '3 sprint massimali da 10 sec con 5 min di recupero. Misura la potenza neuromuscolare.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.75, description: 'Warm Up' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.65, description: 'Build' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.50, description: 'Sprint 1' },
            { type: 'steady', duration: 290, targetPowerPercent: 0.50, description: 'Recovery' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.50, description: 'Sprint 2' },
            { type: 'steady', duration: 290, targetPowerPercent: 0.50, description: 'Recovery' },
            { type: 'steady', duration: 10, targetPowerPercent: 1.50, description: 'Sprint 3' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.45, description: 'Cool Down' },
        ]
    },
    {
        id: 'ftp-5', name: 'CP 5-Min Test', category: 'Testing',
        description: '5 min al massimo per stimare la Critical Power e W\' anaerobica.',
        steps: [
            { type: 'ramp', duration: 300, startPowerPercent: 0.50, targetPowerPercent: 0.80, description: 'Warm Up' },
            { type: 'steady', duration: 300, targetPowerPercent: 0.65, description: 'Easy' },
            { type: 'steady', duration: 300, targetPowerPercent: 1.10, description: '5 Min Max Effort' },
            { type: 'ramp', duration: 300, startPowerPercent: 0.70, targetPowerPercent: 0.50, description: 'Cool Down' },
        ]
    },
];
