import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

interface ConfigErrorProps {
  validationError?: string | null;
}

export function ConfigError({ validationError }: ConfigErrorProps) {
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
              The configuration could not be validated. Please check your environment variables or manual configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Error:</p>
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-1">What to do:</p>
              <ul className="text-xs text-yellow-700 space-y-1 list-disc list-outside break-words ml-2">
                <li>Verify your environment variables if environment-based configuration (NEXT_PUBLIC_ENV_DRIVEN) is enabled.</li>
                <li>Verify your manual configuration values if manual configuration is being used.</li>
                <li>Ensure your API credentials and endpoints are valid.</li>
                <li>Check that your network connection.</li>
                <li>Restart the server after making changes.</li>
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
