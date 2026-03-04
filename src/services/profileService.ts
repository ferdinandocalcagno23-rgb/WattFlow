import { UserProfile } from '@/types';

/**
 * Heuristic-based FTP estimation algorithm ("WattFlow Estimate")
 * Estimates FTP based on training habits, experience, age, and gender.
 */
export function estimateFTP(profile: Omit<UserProfile, 'id' | 'ftp'>): number {
    const { weight, age, gender, experience, trainingFrequency, trainingHours } = profile;

    // 1. Base W/kg based on Experience
    let baseWkg = 2.0; // Default
    if (experience === 'beginner') baseWkg = 1.8;
    else if (experience === 'intermediate') baseWkg = 2.5;
    else if (experience === 'advanced') baseWkg = 3.2;

    // 2. Adjust for Training Volume (Hours per week)
    if (trainingHours < 3) baseWkg -= 0.2;
    else if (trainingHours >= 6 && trainingHours <= 9) baseWkg += 0.2;
    else if (trainingHours > 9) baseWkg += 0.4;

    // 3. Adjust for Training Frequency (Days per week)
    if (trainingFrequency <= 2) baseWkg -= 0.2;
    else if (trainingFrequency >= 5) baseWkg += 0.2;

    // 4. Calculate initial FTP (Watts)
    let estimatedFTP = baseWkg * weight;

    // 5. Age Adjustment: -0.5% per year over 35
    if (age > 35) {
        const yearsOver35 = age - 35;
        const discount = yearsOver35 * 0.005;
        estimatedFTP = estimatedFTP * (1 - discount);
    }

    // 6. Gender Adjustment (Approximate biological differences in VO2 max/Power)
    if (gender === 'female') {
        estimatedFTP = estimatedFTP * 0.90; // -10% for females (general physiological gap)
    }

    return Math.round(estimatedFTP);
}

/**
 * Local storage key for the currently active profile ID
 */
const ACTIVE_PROFILE_KEY = 'wattflow_active_profile_id';

export function getActiveProfileId(): number | null {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return id ? parseInt(id, 10) : null;
}

export function setActiveProfileId(id: number | null) {
    if (id === null) {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } else {
        localStorage.setItem(ACTIVE_PROFILE_KEY, id.toString());
    }
}
