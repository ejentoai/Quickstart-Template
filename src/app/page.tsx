'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfig } from './context/ConfigContext';
import { isPublicAgentMode } from '@/lib/storage/indexeddb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isConfigured, isLoading, isValidating, validationError, configSource, config } = useConfig();
  const isPublicAgent = isPublicAgentMode();

  useEffect(() => {
    // Wait for loading and validation to complete before routing
    if (isLoading || isValidating) {
      return; // Still loading/validating
    }

    // PUBLIC_AGENT mode: Still need credentials, but allow routing to chat if config is available
    // In PUBLIC_AGENT mode, config should come from ENV_DRIVEN mode (EJENTO_* env vars)
    if (isPublicAgent) {
      // In PUBLIC_AGENT mode, we still need the author's credentials from env vars
      // Check if env config is available (via ENV_DRIVEN mode)
      if (configSource === 'environment') {
        if (config && !validationError && isConfigured) {
          // Env config validated successfully - route to chat
          router.replace('/chat');
          return;
        } else if (validationError) {
          // Show validation error
          return;
        } else if (!config) {
          // No env config found - show helpful message
          return;
        }
      } else {
        // PUBLIC_AGENT mode but no env config - need to set up ENV_DRIVEN mode
        // Show helpful message about required env vars
        return;
      }
    }

    // If there's a validation error for env config, don't route - show error instead
    if (validationError && configSource === 'environment') {
      return; // Stay on home page to show error
    }

    // For env config, ensure we have valid config (not null) and no validation error
    if (configSource === 'environment') {
      if (config && !validationError && isConfigured) {
        // Env config validated successfully - automatically route to chat
        router.replace('/chat');
        return;
      } else if (!config || validationError) {
        // Env config invalid or validation failed - don't route (show error)
        return;
      }
    }

    // For localStorage config or no config source
    if (isConfigured && config) {
      router.replace('/chat');
    } else {
      // Only route to settings if we're fully done loading and no config
      router.replace('/settings');
    }
  }, [router, isConfigured, isLoading, isValidating, validationError, configSource, config, isPublicAgent]);

  // Show loading state while config is being loaded or validated
  if (isLoading || isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">
          {isValidating ? 'Validating configuration...' : 'Loading...'}
        </p>
      </div>
    );
  }

  // PUBLIC_AGENT mode: Show helpful message if env config is missing
  if (isPublicAgent && !isLoading && !isValidating && configSource !== 'environment') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <XCircle className="h-5 w-5" />
                PUBLIC_AGENT Mode Active
              </CardTitle>
              <CardDescription>
                PUBLIC_AGENT mode is enabled, but environment-based configuration is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Required Environment Variables:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li><code>NEXT_PUBLIC_AGENT=true</code> ✓ (already set)</li>
                  <li><code>ENV_DRIVEN=true</code> (or auto-detect)</li>
                  <li><code>EJENTO_BASE_URL=...</code></li>
                  <li><code>EJENTO_API_KEY=...</code></li>
                  <li><code>EJENTO_ACCESS_TOKEN=...</code></li>
                  <li><code>EJENTO_AGENT_ID=...</code></li>
                </ul>
              </div> */}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-1">What to do:</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Add all EJENTO_* environment variables to your .env.local file</li>
                  <li>Set ENV_DRIVEN=true to enable environment-based configuration</li>
                  <li>Restart your development server after adding the variables</li>
                  <li>These credentials are used by the author to make API calls on behalf of public users</li>
                </ul>
              </div>

              <div className="pt-4">
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Retry After Updating .env.local
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show validation error if env config validation failed
  if (validationError && configSource === 'environment') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Configuration Validation Failed
              </CardTitle>
              <CardDescription>
                The environment-based configuration could not be validated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Error:</p>
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium mb-1">What to do:</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Check your environment variables</li>
                  <li>Ensure your API credentials are valid</li>
                  <li>Restart the server after updating environment variables</li>
                </ul>
              </div>

              <div className="pt-4 flex gap-3">
                <Link href="/settings" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Settings
                  </Button>
                </Link>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default loading state (shouldn't usually reach here, but just in case)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  );
}
