import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

interface ConfigErrorProps {
  envDriven?: boolean; // true = ENV_DRIVEN, false = manual config
}

export function ConfigError({ envDriven }: ConfigErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {envDriven
                ? 'Configuration Validation Failed'
                : 'Configuration Not Set'}
            </CardTitle>
            <CardDescription>
              {envDriven
                ? 'The environment-based configuration could not be validated.'
                : 'You need to set your configuration variables manually.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-lg p-4 ${
                envDriven
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <p
                className={`text-sm font-medium mb-1 ${
                  envDriven ? 'text-yellow-800' : 'text-blue-800'
                }`}
              >
                {envDriven ? 'What to do:' : 'Next steps:'}
              </p>
              <ul
                className={`text-xs space-y-1 list-disc list-inside ${
                  envDriven ? 'text-yellow-700' : 'text-blue-700'
                }`}
              >
                {envDriven ? (
                  <>
                    <li>Check your environment variables</li>
                    <li>Ensure your API credentials are valid</li>
                    <li>Restart the server after updating environment variables</li>
                  </>
                ) : (
                  <>
                    <li>Go to settings</li>
                    <li>Manually enter your configuration variables</li>
                    <li>Save to apply configuration</li>
                  </>
                )}
              </ul>
            </div>

            <div className="pt-4 flex gap-3">
              <Link href="/settings" className="flex-1">
                <Button variant="outline" className="w-full">
                  View Settings
                </Button>
              </Link>
              {envDriven && (
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
