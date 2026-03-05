'use client';

import React, { useMemo, useState } from 'react';
import { User, Zap, Activity, Heart, TrendingUp, Edit2, Save, Wind, Battery, Target, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar } from 'recharts';
import type { UserProfile, WorkoutRecording } from '@/types';
import {
    estimateCriticalPower,
    estimateVO2max,
    calculatePMC,
    calculatePowerPeaks,
    findMaxRollingAvg,
} from '@/services/trainingMetrics';
import { updateProfile } from '@/services/dbService';

interface ProfileDashboardProps {
    profile: UserProfile;
    workouts: WorkoutRecording[];
    onProfileUpdated: (profile: UserProfile) => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
    profile,
    workouts,
    onProfileUpdated,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        ftp: profile.ftp,
        trainingFrequency: profile.trainingFrequency,
        trainingHours: profile.trainingHours,
    });

    // --- Computed Metrics ---
    const cpResult = useMemo(() => estimateCriticalPower(workouts), [workouts]);
    const vo2max = useMemo(() => estimateVO2max(workouts, profile.weight), [workouts, profile.weight]);
    const pmcData = useMemo(() => calculatePMC(workouts, profile.ftp), [workouts, profile.ftp]);
    const peaks = useMemo(() => calculatePowerPeaks(workouts), [workouts]);

    const latestPMC = pmcData.length > 0 ? pmcData[pmcData.length - 1] : null;

    // Show last 90 days of PMC for the chart
    const pmcChartData = useMemo(() => pmcData.slice(-90), [pmcData]);

    // Power Duration Curve
    const powerCurveData = useMemo(() => {
        const durations = [
            { sec: 5, label: '5s' },
            { sec: 10, label: '10s' },
            { sec: 30, label: '30s' },
            { sec: 60, label: '1m' },
            { sec: 120, label: '2m' },
            { sec: 180, label: '3m' },
            { sec: 300, label: '5m' },
            { sec: 600, label: '10m' },
            { sec: 1200, label: '20m' },
            { sec: 1800, label: '30m' },
            { sec: 3600, label: '60m' },
        ];
        const result: { label: string; watts: number }[] = [];
        for (const d of durations) {
            let best = 0;
            for (const w of workouts) {
                if (!w.rawData || w.rawData.length < d.sec) continue;
                const p = w.rawData.map(x => x.power);
                const avg = findMaxRollingAvg(p, d.sec);
                if (avg > best) best = avg;
            }
            if (best > 0) result.push({ label: d.label, watts: best });
        }
        return result;
    }, [workouts]);

    // Weekly training volume (last 12 weeks)
    const weeklyVolume = useMemo(() => {
        const weeks: Map<string, { hours: number; tss: number; count: number }> = new Map();
        const sorted = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const w of sorted) {
            const d = new Date(w.date);
            // Get ISO week start (Monday)
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(d);
            monday.setDate(diff);
            const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

            const existing = weeks.get(weekKey) || { hours: 0, tss: 0, count: 0 };
            existing.hours += w.duration / 3600;
            existing.count += 1;
            weeks.set(weekKey, existing);
        }

        return Array.from(weeks.entries())
            .map(([week, data]) => ({
                week: week.split('-').slice(1).join('/'),
                ore: Math.round(data.hours * 10) / 10,
                sessioni: data.count,
            }))
            .slice(-12);
    }, [workouts]);

    const handleSave = async () => {
        if (!profile.id) return;
        await updateProfile(profile.id, form);
        onProfileUpdated({ ...profile, ...form });
        setIsEditing(false);
    };

    const MetricCard = ({ icon: Icon, label, value, unit, color, subtitle }: {
        icon: React.ElementType; label: string; value: string | number; unit: string; color: string; subtitle?: string;
    }) => (
        <div className="relative bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden group hover:bg-white/[0.07] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ backgroundImage: `linear-gradient(135deg, ${color}10, transparent)` }} />
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight">{value}</span>
                    <span className="text-sm font-bold text-gray-500">{unit}</span>
                </div>
                {subtitle && <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">{subtitle}</p>}
            </div>
        </div>
    );

    const PMCTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-2xl text-xs">
                    <p className="text-gray-400 mb-2 font-bold">{label}</p>
                    {payload.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-gray-400">{p.name}:</span>
                            <span className="text-white font-bold">{p.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-5xl mx-auto w-full px-6 py-8 animate-fade-in space-y-10 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center p-[3px] shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <div className="w-full h-full rounded-[calc(1.5rem-3px)] bg-[#09090b] flex items-center justify-center overflow-hidden">
                            {profile.avatar ? (
                                <img src={`/avatars/${profile.avatar}.png`} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-neon-blue" />
                            )}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">{profile.name}</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            <span>{profile.age} anni</span>
                            <span>·</span>
                            <span>{profile.weight} kg</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-neon-cyan"><Zap size={12} className="fill-neon-cyan" /> {profile.ftp}W FTP</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${isEditing
                        ? 'bg-neon-green/20 text-neon-green border-neon-green/30 hover:bg-neon-green/30'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {isEditing ? <><Save size={16} /> Salva</> : <><Edit2 size={16} /> Modifica</>}
                </button>
            </div>

            {/* Editable Settings */}
            {isEditing && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Impostazioni Profilo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Peso (kg)', key: 'weight' as const, type: 'number' },
                            { label: 'Altezza (cm)', key: 'height' as const, type: 'number' },
                            { label: 'Età', key: 'age' as const, type: 'number' },
                            { label: 'FTP (W)', key: 'ftp' as const, type: 'number' },
                            { label: 'Allenamenti/Settimana', key: 'trainingFrequency' as const, type: 'number' },
                            { label: 'Ore/Settimana', key: 'trainingHours' as const, type: 'number' },
                        ].map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{field.label}</label>
                                <input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => setForm({ ...form, [field.key]: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue transition-colors text-white font-bold"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Estimated Metrics */}
            <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Metriche Stimate</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                        icon={Target}
                        label="Critical Power"
                        value={cpResult ? cpResult.cp : '—'}
                        unit="W"
                        color="#06b6d4"
                        subtitle={cpResult ? 'Modello Monod-Scherrer' : 'Dati insufficienti'}
                    />
                    <MetricCard
                        icon={Battery}
                        label="W' (Anaerobico)"
                        value={cpResult ? (cpResult.wPrime / 1000).toFixed(1) : '—'}
                        unit="kJ"
                        color="#f59e0b"
                        subtitle="Capacità anaerobica"
                    />
                    <MetricCard
                        icon={Wind}
                        label="VO2max"
                        value={vo2max ?? '—'}
                        unit="ml/kg/min"
                        color="#10b981"
                        subtitle={vo2max ? 'Metodo ACSM' : 'Dati insufficienti'}
                    />
                    <MetricCard
                        icon={Activity}
                        label="Forma (TSB)"
                        value={latestPMC ? latestPMC.tsb : '—'}
                        unit=""
                        color={latestPMC && latestPMC.tsb >= 0 ? '#10b981' : '#ef4444'}
                        subtitle={latestPMC ? (latestPMC.tsb > 5 ? 'Fresco' : latestPMC.tsb < -10 ? 'Affaticato' : 'Neutro') : 'No data'}
                    />
                </div>
            </div>

            {/* Power Peaks */}
            <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Picchi di Potenza</h2>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: '5s', value: peaks.peak5s, name: 'Sprint', color: '#ef4444' },
                        { label: '1min', value: peaks.peak1m, name: 'Anaerobico', color: '#f59e0b' },
                        { label: '5min', value: peaks.peak5m, name: 'VO2 Max', color: '#06b6d4' },
                        { label: '20min', value: peaks.peak20m, name: 'Soglia', color: '#8b5cf6' },
                    ].map(peak => (
                        <div key={peak.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/[0.07] transition-all">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">{peak.label}</div>
                            <div className="text-3xl font-black text-white">{peak.value || '—'}</div>
                            <div className="text-[10px] uppercase tracking-wider mt-1 font-bold" style={{ color: peak.color }}>{peak.name}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PMC Chart */}
            {pmcChartData.length > 7 && (
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Performance Management (90 giorni)</h2>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={pmcChartData}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#52525b"
                                        fontSize={10}
                                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis stroke="#52525b" fontSize={10} />
                                    <Tooltip content={<PMCTooltip />} />
                                    <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} dot={false} name="Fitness (CTL)" />
                                    <Line type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} dot={false} name="Fatica (ATL)" />
                                    <Line type="monotone" dataKey="tsb" stroke="#10b981" strokeWidth={2} dot={false} name="Forma (TSB)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            {[
                                { label: 'Fitness (CTL)', color: '#3b82f6' },
                                { label: 'Fatica (ATL)', color: '#ef4444' },
                                { label: 'Forma (TSB)', color: '#10b981' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-2 text-xs text-gray-400">
                                    <div className="w-3 h-1 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Power Duration Curve */}
            {powerCurveData.length > 3 && (
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Curva Potenza-Durata</h2>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={powerCurveData}>
                                    <defs>
                                        <linearGradient id="powerCurveGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" stroke="#52525b" fontSize={10} />
                                    <YAxis stroke="#52525b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                        itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                                        formatter={(value: number) => [`${value} W`, 'Potenza']}
                                    />
                                    <Area type="monotone" dataKey="watts" stroke="#06b6d4" strokeWidth={2.5} fill="url(#powerCurveGrad)" dot={{ fill: '#06b6d4', r: 4 }} activeDot={{ r: 6, fill: '#06b6d4' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-gray-500 text-center mt-3 uppercase tracking-wider">Migliore potenza media per ogni durata</p>
                    </div>
                </div>
            )}

            {/* Weekly Training Volume */}
            {weeklyVolume.length > 2 && (
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Volume Settimanale (ultime 12 settimane)</h2>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden">
                        <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyVolume}>
                                    <defs>
                                        <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="week" stroke="#52525b" fontSize={10} />
                                    <YAxis stroke="#52525b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                        formatter={(value: number, name: string) => {
                                            if (name === 'ore') return [`${value} h`, 'Ore'];
                                            return [`${value}`, 'Sessioni'];
                                        }}
                                    />
                                    <Bar dataKey="ore" fill="url(#volumeGrad)" radius={[6, 6, 0, 0]} name="ore" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="w-3 h-3 rounded bg-gradient-to-b from-[#8b5cf6] to-[#3b82f6]" />
                                <span>Ore di allenamento</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4 pl-1">Riepilogo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard icon={Activity} label="Workout Totali" value={workouts.length} unit="" color="#8b5cf6" />
                    <MetricCard
                        icon={TrendingUp}
                        label="CTL Attuale"
                        value={latestPMC ? latestPMC.ctl : 0}
                        unit=""
                        color="#3b82f6"
                        subtitle="Fitness"
                    />
                    <MetricCard
                        icon={Heart}
                        label="ATL Attuale"
                        value={latestPMC ? latestPMC.atl : 0}
                        unit=""
                        color="#ef4444"
                        subtitle="Fatica"
                    />
                    <MetricCard
                        icon={Zap}
                        label="W/kg"
                        value={profile.weight > 0 ? (profile.ftp / profile.weight).toFixed(2) : '—'}
                        unit=""
                        color="#06b6d4"
                        subtitle="FTP / Peso"
                    />
                </div>
            </div>
        </div>
    );
};
