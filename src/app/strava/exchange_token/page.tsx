'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { stravaService } from '@/services/stravaService';
import { getActiveProfileId } from '@/services/profileService';
import { Suspense } from 'react';

function StravaExchangeTokenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Authenticating with Strava...');

  useEffect(() => {
    const code = searchParams.get('code');
    const scope = searchParams.get('scope');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      return;
    }

    if (code) {
      if (!scope?.includes('activity:write')) {
        setError('The required permissions (activity:write) were not granted.');
        return;
      }

      const activeProfileId = getActiveProfileId();
      if (!activeProfileId) {
        setError('Nessun profilo attivo trovato. Per favore, seleziona un profilo prima di collegare Strava.');
        return;
      }

      setStatus('Exchanging token...');
      stravaService.exchangeToken(activeProfileId, code)
        .then(() => {
          setStatus('Success! Redirecting...');
          router.push('/');
        })
        .catch(err => {
          console.error(err);
          setError('Failed to exchange token. Please try again.');
        });
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans text-white bg-idx-bg">
      <div className="p-8 rounded-3xl shadow-2xl text-center bg-idx-surface/50 backdrop-blur-xl border border-white/10 max-w-md w-full">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-neon-red mb-4">Authentication Error</h1>
            <p className="text-gray-400">{error}</p>
            <button onClick={() => router.push('/')} className="mt-6 bg-neon-blue text-white font-bold py-2 px-6 rounded-xl transition-transform hover:scale-105">
              Go Home
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-4">{status}</h1>
            <p className="text-gray-400">Please wait, you will be redirected shortly.</p>
            <div className="mt-6 w-16 h-16 border-4 border-dashed rounded-full animate-spin border-neon-blue mx-auto"></div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StravaExchangeTokenPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white bg-idx-bg">Loading...</div>}>
      <StravaExchangeTokenContent />
    </Suspense>
  );
}
