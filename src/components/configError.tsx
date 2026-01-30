import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

interface ConfigErrorProps {
  envDriven?: boolean; // true = ENV_DRIVEN, false = manual config
  validationError? : string | null
}

export function ConfigError({ envDriven,validationError }: ConfigErrorProps) {
  console.log(validationError,'vaaa')
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
              {
                validationError && 
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-2">Error:</p>
                  <p className="text-sm text-red-700">{validationError}</p>
                </div>
              }
              
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
