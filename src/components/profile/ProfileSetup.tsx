'use client';

import React, { useState } from 'react';
import { User, Weight, Ruler, Calendar, Activity, Zap, ChevronRight, Save, X } from 'lucide-react';
import { UserProfile } from '@/types';
import { estimateFTP } from '@/services/profileService';
import { cn } from '@/lib/utils';

interface ProfileSetupProps {
    initialProfile?: Partial<UserProfile>;
    onSave: (profile: Omit<UserProfile, 'id'>) => void;
    onCancel: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ initialProfile, onSave, onCancel }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        name: '',
        age: 30,
        gender: 'male',
        weight: 75,
        height: 175,
        experience: 'intermediate',
        trainingFrequency: 3,
        trainingHours: 5,
        ftp: 200,
        ...initialProfile
    });

    const [knowsFTP, setKnowsFTP] = useState(true);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const calculateAndSave = () => {
        let finalFTP = formData.ftp || 200;
        if (!knowsFTP) {
            finalFTP = estimateFTP(formData as Omit<UserProfile, 'id' | 'ftp'>);
        }

        onSave({
            ...formData,
            ftp: finalFTP,
            isDefault: false
        } as Omit<UserProfile, 'id'>);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-idx-surface/90 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white">
                        {initialProfile?.id ? 'Edit Profile' : 'Create Profile'}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-8 flex-1 overflow-y-auto max-h-[70vh]">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col items-center mb-4">
                                <p className="text-sm text-gray-400 mb-4">Choose your avatar</p>
                                <div className="grid grid-cols-5 gap-3">
                                    {['fox', 'bear', 'cat', 'rabbit', 'panda'].map(animal => (
                                        <button
                                            key={animal}
                                            onClick={() => setFormData({ ...formData, avatar: animal })}
                                            className={cn(
                                                "w-12 h-12 rounded-2xl border-2 transition-all overflow-hidden bg-white/5",
                                                formData.avatar === animal
                                                    ? "border-neon-blue shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110"
                                                    : "border-transparent hover:border-white/20"
                                            )}
                                        >
                                            <img
                                                src={`/avatars/${animal}.png`}
                                                alt={animal}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider ml-1">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="E.g. Mario"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue transition-colors text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wider ml-1">Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue transition-colors text-white"
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase text-gray-500 tracking-wider ml-1">Age</label>
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-blue transition-colors text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-20 h-20 rounded-full bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                    <Activity className="w-10 h-10 text-neon-cyan" />
                                </div>
                                <p className="text-sm text-gray-400">Physiology</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 tracking-wider ml-1">
                                        <Weight className="w-3.5 h-3.5" /> Weight (kg)
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan transition-colors text-white text-center text-lg font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-gray-500 tracking-wider ml-1">
                                        <Ruler className="w-3.5 h-3.5" /> Height (cm)
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.height}
                                        onChange={e => setFormData({ ...formData, height: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-cyan transition-colors text-white text-center text-lg font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-20 h-20 rounded-full bg-neon-purple/20 border-2 border-neon-purple flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                    <Zap className="w-10 h-10 text-neon-purple" />
                                </div>
                                <p className="text-sm text-gray-400">Fitness & FTP</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-200">Do you know your FTP?</label>
                                    <button
                                        onClick={() => setKnowsFTP(!knowsFTP)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${knowsFTP ? 'bg-neon-purple text-white' : 'bg-white/10 text-gray-400'}`}
                                    >
                                        {knowsFTP ? 'YES' : 'NO'}
                                    </button>
                                </div>

                                {knowsFTP ? (
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            value={formData.ftp}
                                            onChange={e => setFormData({ ...formData, ftp: parseInt(e.target.value) })}
                                            className="w-full bg-white/10 border border-neon-purple/50 rounded-xl px-4 py-3 outline-none text-white text-center text-3xl font-black"
                                        />
                                        <p className="text-center text-[10px] text-gray-500 uppercase tracking-tighter">Watts</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-gray-500">Experience</label>
                                            <select
                                                value={formData.experience}
                                                onChange={e => setFormData({ ...formData, experience: e.target.value as any })}
                                                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                            >
                                                <option value="beginner">Beginner (1-2 years)</option>
                                                <option value="intermediate">Intermediate (3-5 years)</option>
                                                <option value="advanced">Advanced (5+ years / Racing)</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-gray-500">Freq. (days/wk)</label>
                                                <input
                                                    type="number"
                                                    value={formData.trainingFrequency}
                                                    min={1} max={7}
                                                    onChange={e => setFormData({ ...formData, trainingFrequency: parseInt(e.target.value) })}
                                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-gray-500">Hours/wk</label>
                                                <input
                                                    type="number"
                                                    value={formData.trainingHours}
                                                    min={1}
                                                    onChange={e => setFormData({ ...formData, trainingHours: parseInt(e.target.value) })}
                                                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-center text-neon-blue italic">
                                            "I'll calculate a realistic FTP estimante based on your profile."
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white/5 border-t border-white/5 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-gray-300 font-bold hover:bg-white/10 transition-colors"
                        >
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && !formData.name}
                            className="flex-[2] py-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-neon-blue/20 hover:brightness-110 disabled:opacity-50 transition-all"
                        >
                            Continue <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={calculateAndSave}
                            className="flex-[2] py-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-neon-blue/20 hover:brightness-110 transition-all"
                        >
                            <Save className="w-5 h-5" /> Finish Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
