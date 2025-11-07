'use client';

import { useConfig } from '@/app/context/ConfigContext';
import Link from 'next/link';
import { Button } from './ui/button';
import { AlertCircle, XCircle } from 'lucide-react';

interface ConfigGuardProps {
  children: React.ReactNode;
  requireConfig?: boolean;
}

export function ConfigGuard({ children, requireConfig = true }: ConfigGuardProps) {
  const { isConfigured, isLoading, isValidating, validationError, configSource } = useConfig();

  // Show loading state while config is being loaded or validated
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-4">
            {isValidating ? 'Validating configuration...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show validation error if config validation failed (unified message for all config sources)
  if (requireConfig && validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-red-600">Configuration Error</h1>
          <p className="text-gray-600 text-lg">
            Unable to validate the application configuration.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-red-800 font-medium mb-2">Error:</p>
            <p className="text-sm text-red-700">{validationError}</p>
          </div>

          <div className="pt-4 space-y-2">
            {configSource !== 'environment' && (
              <Link href="/settings" className="block">
                <Button size="lg" className="w-full">
                  Update Settings
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Only show "Configuration Required" after loading is complete and config is missing
  if (requireConfig && !isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-gray-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration Required</h1>
          <p className="text-gray-600 text-lg">
            Please configure your API settings to start using the chat application.
          </p>
          
          <div className="space-y-3 mt-4">
            <p className="text-sm text-gray-500">
              You'll need to provide:
            </p>
            <ul className="text-sm text-gray-600 text-left space-y-1 bg-gray-50 rounded-lg p-4">
              <li>• Base URL</li>
              <li>• API Key</li>
              <li>• Ejento Access Token</li>
              <li>• Agent ID</li>
            </ul>
          </div>
          
          {configSource !== 'environment' && (
            <Link href="/settings" className="block mt-6">
              <Button size="lg" className="w-full">
                Configure Settings
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Config is valid - show children
  // Optionally show a success indicator for env config (can be removed if not needed)
  if (requireConfig && isConfigured && configSource === 'environment') {
    // Config is valid, allow access
    return <>{children}</>;
  }

  // Default: allow access if configured
  return <>{children}</>;
}
