import { getPendingWorkouts, updateWorkoutStatus } from './dbService';
import { stravaService } from './stravaService';
import { createTcxBlob } from '@/lib/strava/fitEncoder';
import type { WorkoutRecording } from '@/types';

class SyncService {
    private isSyncing = false;

    async syncPendingWorkouts() {
        if (this.isSyncing) return;

        // Don't sync if offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return;
        }

        this.isSyncing = true;

        try {
            const pendingWorkouts = await getPendingWorkouts();

            for (const workout of pendingWorkouts) {
                if (!workout.id || !workout.profileId) continue;

                try {
                    const isAuthenticated = await stravaService.isAuthenticated(workout.profileId);
                    if (!isAuthenticated) {
                        // Profile is not connected to Strava, skip
                        continue;
                    }

                    console.log(`[SyncService] Uploading workout ${workout.id} for profile ${workout.profileId} to Strava...`);
                    const tcxBlob = createTcxBlob(workout as WorkoutRecording);
                    const uploadResult = await stravaService.uploadActivity(workout.profileId, tcxBlob, workout.name, 'tcx');

                    await updateWorkoutStatus(workout.id, 'synced', uploadResult.id_str);
                    console.log(`[SyncService] Workout ${workout.id} synced with Strava Upload ID ${uploadResult.id_str}.`);

                } catch (error: any) {
                    console.error(`[SyncService] Failed to sync workout ${workout.id}:`, error);
                    if (error.response?.status === 401) {
                        console.log(`[SyncService] Strava authentication error for profile ${workout.profileId}. Disconnecting.`);
                        await stravaService.disconnect(workout.profileId);
                    }
                    // Stop syncing this specific workout, but continue with others
                }
            }
        } catch (error) {
            console.error('[SyncService] Global sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    initAutoSync() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[SyncService] Network became online. Triggering sync...');
                this.syncPendingWorkouts();
            });

            // Also trigger a sync occasionally (e.g. every 15 minutes) if app is left open
            setInterval(() => {
                this.syncPendingWorkouts();
            }, 15 * 60 * 1000);
        }
    }
}

export const syncService = new SyncService();
