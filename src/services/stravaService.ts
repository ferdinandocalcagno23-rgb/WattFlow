'use client';
import axios from 'axios';
import { STRAVA_CLIENT_ID, APP_URL } from '@/lib/strava/config';
import type { StravaTokenData } from '@/types';
import { getProfile, updateProfile } from './dbService';

class StravaService {
  public getAuthUrl(): string {
    const redirectUri = `${APP_URL}/strava/exchange_token`;
    const scope = 'activity:write,read';
    return `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
  }

  public async isAuthenticated(profileId: number): Promise<boolean> {
    const profile = await getProfile(profileId);
    return !!profile?.stravaToken?.access_token;
  }

  private async saveTokenData(profileId: number, data: StravaTokenData) {
    const expires_at_ms = data.expires_at * 1000;
    const tokenData = { ...data, expires_at: expires_at_ms };
    await updateProfile(profileId, { stravaToken: tokenData });
  }

  public async disconnect(profileId: number) {
    const profile = await getProfile(profileId);
    if (profile) {
      await updateProfile(profileId, { stravaToken: undefined });
    }
  }

  async exchangeToken(profileId: number, code: string): Promise<void> {
    const response = await axios.post('/api/strava/token', { code });
    await this.saveTokenData(profileId, response.data);
  }

  private async getValidAccessToken(profileId: number): Promise<string> {
    const profile = await getProfile(profileId);
    if (!profile || !profile.stravaToken) throw new Error("Not authenticated with Strava.");

    // Check if token is expired or about to expire (within 5 minutes)
    if (Date.now() >= profile.stravaToken.expires_at - 5 * 60 * 1000) {
      console.log("Strava token expired or expiring soon, refreshing...");
      return await this.refreshToken(profileId, profile.stravaToken.refresh_token);
    }

    return profile.stravaToken.access_token;
  }

  private async refreshToken(profileId: number, refreshToken: string): Promise<string> {
    try {
      const response = await axios.post('/api/strava/token', {
        refreshToken: refreshToken
      });
      const expires_at_ms = response.data.expires_at * 1000;
      const newTokenData = { ...response.data, expires_at: expires_at_ms };
      await updateProfile(profileId, { stravaToken: newTokenData });
      return newTokenData.access_token;
    } catch (e) {
      console.error("Failed to refresh token, disconnecting", e);
      await this.disconnect(profileId);
      throw e;
    }
  }

  public async uploadActivity(profileId: number, activityBlob: Blob, name: string, dataType: 'fit' | 'tcx' = 'fit'): Promise<any> {
    const accessToken = await this.getValidAccessToken(profileId);

    const formData = new FormData();
    formData.append('file', activityBlob, `${name.replace(/\s+/g, '_')}.${dataType}`);
    formData.append('data_type', dataType);
    formData.append('name', name);

    const response = await axios.post('https://www.strava.com/api/v3/uploads', formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export const stravaService = new StravaService();
