import Dexie, { type Table } from 'dexie';
import type { IntervalStep, RawDataPoint, UserProfile, WorkoutRecording, CustomWorkout } from '@/types';

export class CyclingDB extends Dexie {
  workouts!: Table<WorkoutRecording>;
  profiles!: Table<UserProfile>;
  customWorkouts!: Table<CustomWorkout>;

  constructor() {
    super('CyclingDB');
    this.version(3).stores({
      workouts: '++id, profileId, date, status',
      profiles: '++id, name, isDefault',
      customWorkouts: 'id, profileId',
    }).upgrade(async () => {
      // Logic for future migrations if needed.
    });
  }
}

export const db = new CyclingDB();

// --- Database Helper Functions ---

export async function addWorkout(workoutData: Omit<WorkoutRecording, 'id' | 'status' | 'stravaId'>) {
  try {
    const profileId = workoutData.profileId;
    if (!profileId) {
      console.warn('Attempted to save workout without profileId');
      // Should we fall back to a default profile?
    }
    await db.workouts.add({
      ...workoutData,
      status: 'pending',
    });
    console.log('Workout saved to IndexedDB');
  } catch (error) {
    console.error('Failed to save workout to IndexedDB:', error);
  }
}

export async function getWorkoutsByProfile(profileId: number) {
  return await db.workouts.where('profileId').equals(profileId).reverse().sortBy('date');
}

export async function getWorkoutCountByProfile(profileId: number) {
  return await db.workouts.where('profileId').equals(profileId).count();
}

export async function getProfiles() {
  return await db.profiles.toArray();
}

export async function getProfile(id: number) {
  return await db.profiles.get(id);
}

export async function createProfile(profile: Omit<UserProfile, 'id'>) {
  return await db.profiles.add(profile);
}

export async function updateProfile(id: number, profile: Partial<UserProfile>) {
  return await db.profiles.update(id, profile);
}

export async function deleteProfile(id: number) {
  await db.transaction('rw', db.profiles, db.workouts, async () => {
    await db.workouts.where('profileId').equals(id).delete();
    await db.profiles.delete(id);
  });
}

export async function getPendingWorkouts() {
  return await db.workouts.where('status').equals('pending').toArray();
}

export async function updateWorkoutStatus(id: number, status: 'synced', stravaId: string): Promise<void>;
export async function updateWorkoutStatus(id: number, status: 'pending'): Promise<void>;
export async function updateWorkoutStatus(id: number, status: 'pending' | 'synced', stravaId?: string) {
  const updates: { status: 'pending' | 'synced'; stravaId?: string } = { status };
  if (status === 'synced' && stravaId) {
    updates.stravaId = stravaId;
  }
  await db.workouts.update(id, updates);
}

export async function addCustomWorkout(workout: CustomWorkout) {
  return await db.customWorkouts.put(workout); // put will overwrite if id exists
}

export async function getCustomWorkoutsByProfile(profileId: number) {
  return await db.customWorkouts.where('profileId').equals(profileId).toArray();
}

export async function deleteCustomWorkout(id: string) {
  return await db.customWorkouts.delete(id);
}
