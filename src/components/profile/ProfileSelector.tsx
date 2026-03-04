'use client';

import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, Edit2, Zap, LogOut } from 'lucide-react';
import { UserProfile } from '@/types';
import { getProfiles, createProfile, deleteProfile, updateProfile } from '@/services/dbService';
import { ProfileSetup } from './ProfileSetup';
import { setActiveProfileId, getActiveProfileId } from '@/services/profileService';

interface ProfileSelectorProps {
    onProfileSelected: (profile: UserProfile) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onProfileSelected }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-idx-bg/95 backdrop-blur-2xl overflow-y-auto">
            <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight bg-gradient-to-r from-neon-blue via-neon-purple to-neon-cyan bg-clip-text text-transparent">
                        Who's training today?
                    </h1>
                    <p className="text-gray-400 font-medium">Select a profile to start your session</p>
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

                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border-2 border-white/20 flex items-center justify-center group-hover:border-neon-blue group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500">
                                        <User className="w-12 h-12 text-white/80 group-hover:text-white" />
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-white mb-1">{profile.name}</h3>
                                        <div className="flex items-center justify-center gap-2 text-neon-cyan font-bold text-sm">
                                            <Zap className="w-3.5 h-3.5 fill-neon-cyan" />
                                            {profile.ftp}W
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-6 border-t border-white/5 w-full grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Weight</p>
                                            <p className="text-sm font-bold text-gray-300">{profile.weight}kg</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Age</p>
                                            <p className="text-sm font-bold text-gray-300">{profile.age}</p>
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
