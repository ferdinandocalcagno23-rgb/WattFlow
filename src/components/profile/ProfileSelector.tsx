'use client';

import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Edit2, Zap, LogOut, Activity, Trophy } from 'lucide-react';
import { UserProfile } from '@/types';
import { getProfiles, createProfile, deleteProfile, updateProfile, getWorkoutCountByProfile } from '@/services/dbService';
import { ProfileSetup } from './ProfileSetup';
import { setActiveProfileId, getActiveProfileId } from '@/services/profileService';

interface ProfileSelectorProps {
    onProfileSelected: (profile: UserProfile) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onProfileSelected }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [workoutCounts, setWorkoutCounts] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setLoading(true);
        const data = await getProfiles();
        setProfiles(data);

        const counts: Record<number, number> = {};
        for (const profile of data) {
            if (profile.id) {
                counts[profile.id] = await getWorkoutCountByProfile(profile.id);
            }
        }
        setWorkoutCounts(counts);
        setLoading(false);

        // Auto-select if there's only one and it was active before
        const activeId = getActiveProfileId();
        if (activeId) {
            const active = data.find(p => p.id === activeId);
            if (active) {
                onProfileSelected(active);
            }
        }
    };

    const handleSaveProfile = async (profileData: Omit<UserProfile, 'id'>) => {
        if (editingProfile?.id) {
            await updateProfile(editingProfile.id, profileData);
        } else {
            await createProfile(profileData);
        }
        setEditingProfile(null);
        setIsSetupOpen(false);
        loadProfiles();
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this profile? All workout history for this user will be lost.')) {
            await deleteProfile(id);
            loadProfiles();
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-idx-bg/95 backdrop-blur-3xl overflow-y-auto">
            {/* Fitness-themed background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-neon-blue/20 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-neon-purple/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-neon-cyan/20 blur-[100px] rounded-full" />
            </div>

            <div className="w-full max-w-5xl relative z-10 animate-in fade-in zoom-in duration-700">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                        <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">WattFlow Training System</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter">
                        Watt<span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan bg-clip-text text-transparent">Flow</span>
                    </h1>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-[0.25em] mb-12">training made easy</p>
                    <p className="text-gray-400 font-medium text-lg">Chi si allena oggi?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Profile Slots */}
                    {[0, 1, 2].map(index => {
                        const profile = profiles[index];
                        if (profile) {
                            return (
                                <div
                                    key={profile.id}
                                    onClick={() => {
                                        setActiveProfileId(profile.id!);
                                        onProfileSelected(profile);
                                    }}
                                    className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 cursor-pointer hover:bg-white/10 hover:border-neon-blue/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] transition-all duration-500 active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingProfile(profile); setIsSetupOpen(true); }}
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, profile.id!)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-white/5 to-white/10 border-2 border-white/10 flex items-center justify-center group-hover:border-neon-blue group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group-hover:-translate-y-1 transition-all duration-500 shadow-xl relative overflow-hidden">
                                        {profile.avatar ? (
                                            <img
                                                src={`/avatars/${profile.avatar}.png`}
                                                alt={profile.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                                            />
                                        ) : (
                                            <User className="w-14 h-14 text-white/50 group-hover:text-white group-hover:scale-110 transition-all duration-500" />
                                        )}
                                        {workoutCounts[profile.id!] > 0 && (
                                            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl bg-neon-purple flex items-center justify-center shadow-lg border-2 border-idx-bg animate-in zoom-in duration-500 delay-300">
                                                <Trophy className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-3xl font-bold text-white mb-2">{profile.name}</h3>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-2 text-neon-cyan font-black text-xs uppercase tracking-widest">
                                                <Zap className="w-4 h-4 fill-neon-cyan" />
                                                {profile.ftp}W FTP
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                {workoutCounts[profile.id!] || 0} Sessions Completed
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-6 border-t border-white/5 w-full grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-600 uppercase font-black mb-1">Body Mass</p>
                                            <p className="text-lg font-black text-gray-300">{profile.weight}kg</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-600 uppercase font-black mb-1">Experience</p>
                                            <p className="text-lg font-black text-gray-300 capitalize">{profile.experience.slice(0, 3)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => { setEditingProfile(null); setIsSetupOpen(true); }}
                                className="group border-2 border-dashed border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-neon-purple/50 hover:bg-white/5 transition-all duration-300 active:scale-95"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-neon-purple/20 group-hover:border-neon-purple transition-all">
                                    <Plus className="w-8 h-8 text-gray-500 group-hover:text-neon-purple" />
                                </div>
                                <p className="text-sm font-bold text-gray-500 group-hover:text-neon-purple uppercase tracking-widest">New Profile</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {(isSetupOpen || editingProfile) && (
                <ProfileSetup
                    initialProfile={editingProfile || {}}
                    onSave={handleSaveProfile}
                    onCancel={() => { setIsSetupOpen(false); setEditingProfile(null); }}
                />
            )}
        </div>
    );
};
