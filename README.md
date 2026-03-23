# WattFlow

This is a NextJS PWA for cycling power training.

## Multi-User & Strava Sync

WattFlow is built as a **local-first** application using IndexedDB. Each user has their own isolated data on their device. To enable Strava synchronization for multiple users (on different devices), follow these steps:

### 1. Configure Strava Application
1. Go to your [Strava API Settings](https://www.strava.com/settings/api).
2. Set the **Authorization Callback Domain** to the domain where you hosted the app (e.g., `wattflow.vercel.app` or `localhost:3000`).

### 2. Set Environment Variables
The following variables must be configured in your hosting platform (e.g., Vercel):
- `NEXT_PUBLIC_STRAVA_CLIENT_ID`: Your Strava Client ID.
- `STRAVA_CLIENT_SECRET`: Your Strava Client Secret (keep this private!).
- `NEXT_PUBLIC_APP_URL`: The full URL of your app (e.g., `https://wattflow.vercel.app`).

### 3. Usage for Other Users
Anyone can visit your URL, create a local profile, and connect their own Strava account. The app supports up to 100 users in trial mode.
