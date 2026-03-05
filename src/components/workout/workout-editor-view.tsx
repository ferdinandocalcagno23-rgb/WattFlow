'use client';
import { useEffect } from 'react';
import { FtpEditor } from './ftp-editor';
import { ZoneDisplay } from './zone-display';
import { WorkoutBuilder } from './workout-builder';
import { WorkoutChart } from './workout-chart';
import { WorkoutPlayer } from './workout-player';
import { useWorkout, useWorkoutActions } from '@/store/workout-store';
import { useDeviceActions, useMetrics } from '@/store/device-store';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';

export function WorkoutEditorView() {
  const { isPlaying, blocks, currentBlockIndex, timeInBlock } = useWorkout();
  const { tick } = useWorkoutActions();
  const { setTargetPower, setResistance } = useDeviceActions();
  const { cadence } = useMetrics();
  const { toast } = useToast();

  const [isErgAutoDisabled, setIsErgAutoDisabled] = useState(false);
  const lowCadenceCounter = useRef(0);
  const highCadenceCounter = useRef(0);
  const lastToastId = useRef<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentBlock = blocks[currentBlockIndex];

        // Auto-ERG logic
        if (!isErgAutoDisabled) {
          if (cadence < 30 && cadence > 0) { // Only count if actually pedaling but slow
            lowCadenceCounter.current += 1;
            if (lowCadenceCounter.current >= 5) {
              setIsErgAutoDisabled(true);
              setResistance(0);
              lowCadenceCounter.current = 0;
              toast({
                title: 'ERG Mode Disabled',
                description: 'Cadence < 30 RPM detected for 5s. Switch to manual to recover.',
                variant: 'destructive',
              });
            }
          } else {
            lowCadenceCounter.current = 0;
          }
        } else {
          if (cadence >= 30) {
            highCadenceCounter.current += 1;
            if (highCadenceCounter.current >= 5) {
              setIsErgAutoDisabled(false);
              highCadenceCounter.current = 0;
              if (currentBlock) {
                setTargetPower(currentBlock.targetPower);
              }
              toast({
                title: 'ERG Mode Reactivated',
                description: 'Cadence recovered. Resuming target power.',
              });
            }
          } else {
            highCadenceCounter.current = 0;
          }
        }

        const newBlock = tick();
        if (newBlock && !isErgAutoDisabled) {
          setTargetPower(newBlock.targetPower);
        }
      }, 1000);
    } else {
      // Reset counters and state when workout is not playing
      setIsErgAutoDisabled(false);
      lowCadenceCounter.current = 0;
      highCadenceCounter.current = 0;
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, tick, setTargetPower, setResistance, cadence, isErgAutoDisabled, blocks, currentBlockIndex, toast]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-headline text-4xl font-bold">Workout Editor</h1>
        <p className="text-muted-foreground">
          Build your custom workout or let our AI coach create one for you.
        </p>
      </div>

      {!isPlaying ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <FtpEditor />
            <ZoneDisplay />
          </div>
          <div className="lg:col-span-2">
            <WorkoutBuilder />
          </div>
        </div>
      ) : (
        <WorkoutPlayer />
      )}

      {blocks.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="font-headline text-3xl font-bold mb-4">Workout Profile</h2>
            <WorkoutChart
              blocks={blocks}
              currentBlockIndex={isPlaying ? currentBlockIndex : undefined}
              timeInBlock={isPlaying ? timeInBlock : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}
