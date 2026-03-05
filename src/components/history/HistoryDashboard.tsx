import React, { useState, useMemo } from 'react';
import { Download, Activity, Zap, Clock } from 'lucide-react';
import type { WorkoutRecording } from '@/types';
import { Search, ArrowUpDown } from 'lucide-react';

interface HistoryDashboardProps {
    workouts: WorkoutRecording[];
    onDownloadTcx: (workout: WorkoutRecording) => void;
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ workouts, onDownloadTcx }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const filteredWorkouts = useMemo(() => {
        let result = workouts.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));
        result = result.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
        return result;
    }, [workouts, searchTerm, sortOrder]);

    if (workouts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-black/20 rounded-3xl border border-white/5 h-64">
                <Activity className="w-12 h-12 text-gray-500 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Nessun Workout</h3>
                <p className="text-sm text-gray-500 max-w-sm">Completa il tuo primo allenamento per iniziare a tracciare le tue performance e scaricare i file TCX.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-24">
            {/* Search & Sort */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex gap-2 items-center w-full">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cerca workout..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-neon-cyan/50 w-full"
                        />
                    </div>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Toggle Sort Order"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Workout List */}
            {filteredWorkouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">Nessun workout trovato.</div>
            ) : (
                <div className="space-y-3">
                    {filteredWorkouts.map((workout, i) => (
                        <div key={workout.id || i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-white text-base">{workout.name}</span>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(workout.duration)}</span>
                                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-neon-cyan" /> {workout.avgPower}W Avg</span>
                                    <span>{new Date(workout.date).toLocaleDateString('it-IT')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onDownloadTcx(workout)}
                                className="p-3 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-xl transition-all duration-300 shadow-lg shadow-neon-cyan/10 hover:shadow-neon-cyan/30"
                                title="Download TCX"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
