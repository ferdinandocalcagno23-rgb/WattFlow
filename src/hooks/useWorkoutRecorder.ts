import { useState, useRef, useCallback } from 'react';
import { addWorkout } from '@/services/dbService';
import type { RawDataPoint, IntervalStep } from '@/types';
import { syncService } from '@/services/syncService';

export const useWorkoutRecorder = (workoutName: string, steps: IntervalStep[], profileId: number | null) => {
  const [isRecording, setIsRecording] = useState(false);
  const rawDataRef = useRef<RawDataPoint[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    rawDataRef.current = [];
    startTimeRef.current = Date.now();
    setIsRecording(true);
    console.log('Workout recording started.');
  }, []);

  const addDatapoint = useCallback((power: number, cadence: number, heartRate: number, speed: number) => {
    if (!isRecording || startTimeRef.current === null) return;

    const time = (Date.now() - startTimeRef.current) / 1000; // time in seconds
    rawDataRef.current.push({ time, power, cadence, heartRate, speed });
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || startTimeRef.current === null) return;

    const endTime = Date.now();
    const duration = (endTime - startTimeRef.current) / 1000;

    const totalPower = rawDataRef.current.reduce((sum, point) => sum + point.power, 0);
    const avgPower = rawDataRef.current.length > 0 ? Math.round(totalPower / rawDataRef.current.length) : 0;

    const workoutData = {
      profileId: profileId || 0, // Fallback to 0 if no profile selected (shouldn't happen)
      name: workoutName,
      date: new Date(startTimeRef.current),
      duration,
      avgPower,
      steps,
      rawData: rawDataRef.current,
    };

    await addWorkout(workoutData);

    // Trigger an immediate background sync after saving a new workout
    syncService.syncPendingWorkouts().catch(err => console.error("Auto-sync failed:", err));

    // Reset state
    setIsRecording(false);
    startTimeRef.current = null;
    rawDataRef.current = [];
    console.log('Workout recording stopped and saved.');
  }, [isRecording, workoutName, steps, profileId]);

  return { isRecording, startRecording, stopRecording, addDatapoint };
};
