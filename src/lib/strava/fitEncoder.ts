'use client';
import type { WorkoutRecording } from '@/types';

const toISOStringWithMilliseconds = (date: Date) => {
    const pad = (num: number) => (num < 10 ? '0' : '') + num;
    return (
        date.getUTCFullYear() +
        '-' +
        pad(date.getUTCMonth() + 1) +
        '-' +
        pad(date.getUTCDate()) +
        'T' +
        pad(date.getUTCHours()) +
        ':' +
        pad(date.getUTCMinutes()) +
        ':' +
        pad(date.getUTCSeconds()) +
        '.' +
        (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z'
    );
};

export const createTcxBlob = (workout: WorkoutRecording): Blob => {
    let accumulatedDistance = 0;

    const trackpoints = workout.rawData.map((point, index) => {
        const speed_ms = point.speed / 3.6;
        let distanceIncrement = 0;
        if (index > 0) {
            const prevPoint = workout.rawData[index - 1];
            const timeDiff = point.time - prevPoint.time; // in seconds
            distanceIncrement = speed_ms * timeDiff;
        }
        accumulatedDistance += distanceIncrement;
        const workoutDate = new Date(workout.date);
        const pointTime = new Date(workoutDate.getTime() + point.time * 1000);

        return `
            <Trackpoint>
                <Time>${toISOStringWithMilliseconds(pointTime)}</Time>
                <DistanceMeters>${accumulatedDistance.toFixed(2)}</DistanceMeters>
                ${point.heartRate > 0 ? `<HeartRateBpm><Value>${Math.round(point.heartRate)}</Value></HeartRateBpm>` : ''}
                ${point.cadence > 0 ? `<Cadence>${Math.round(point.cadence)}</Cadence>` : ''}
                <Extensions>
                    <TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
                        ${point.power > 0 ? `<Watts>${Math.round(point.power)}</Watts>` : ''}
                    </TPX>
                </Extensions>
            </Trackpoint>`;
    }).join('');

    const totalDistance = accumulatedDistance;
    const avgCadence = workout.rawData.length > 0 ? Math.round(workout.rawData.reduce((sum, p) => sum + p.cadence, 0) / workout.rawData.filter(p => p.cadence > 0).length) : 0;

    const startTimeISO = toISOStringWithMilliseconds(workout.date);

    const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
    xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
    <Activities>
        <Activity Sport="Biking">
            <Id>${startTimeISO}</Id>
            <Lap StartTime="${startTimeISO}">
                <TotalTimeSeconds>${workout.duration}</TotalTimeSeconds>
                <DistanceMeters>${totalDistance.toFixed(2)}</DistanceMeters>
                <MaximumSpeed>${workout.rawData.length > 0 ? Math.max(...workout.rawData.map(p => p.speed / 3.6)).toFixed(2) : 0}</MaximumSpeed>
                <Calories>0</Calories> <!-- Calories calculation is complex -->
                ${avgCadence > 0 ? `<Cadence>${avgCadence}</Cadence>` : ''}
                <Intensity>Active</Intensity>
                <TriggerMethod>Manual</TriggerMethod>
                <Track>
                    ${trackpoints}
                </Track>
            </Lap>
        </Activity>
    </Activities>
</TrainingCenterDatabase>
`;

    return new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
};
