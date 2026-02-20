'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfig } from '@/app/context/ConfigContext';
import { isPublicAgentMode } from '@/lib/storage/indexeddb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { setUserToCookie } from '@/cookie';

export default function SettingsPage() {
  const { config, updateConfig, isEnvConfigured, isLoading, isValidating, validationError, isConfigured, configSource, saveConfig } = useConfig();
  const router = useRouter();
  const isPublicAgent = isPublicAgentMode();
  const redirectPath = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true' ? '/auth/login' : '/chat';

  const [formData, setFormData] = useState({
    baseUrl: '',
    apiKey: '',
    ejentoAccessToken: '',
    agentId: '',
  });

  const [showTokens, setShowTokens] = useState({
    apiKey: false,
    ejentoAccessToken: false,
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        baseUrl: config.baseUrl || '',
        apiKey: config.apiKey || '',
        ejentoAccessToken: config.ejentoAccessToken || '',
        agentId: config.agentId || '',
      });
    }
  }, [config]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTokenVisibility = (field: keyof typeof showTokens) => {
    setShowTokens(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveAndProceed = async () => {
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
    const isValid = isAuthEnabled
      ? formData.baseUrl.trim() && formData.apiKey.trim() && String(formData.agentId).trim()
      : formData.baseUrl.trim() && formData.apiKey.trim() && formData.ejentoAccessToken.trim() && String(formData.agentId).trim();

    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSavingConfig(true);

    try {
      // Always include ejentoAccessToken (empty string for auth‑enabled) to satisfy the type
      const newConfig = {
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey.trim(),
        agentId: String(formData.agentId).trim(),
        ejentoAccessToken: isAuthEnabled ? '' : formData.ejentoAccessToken.trim(),
      };

      const validationResponse = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });

      const validationResult = await validationResponse.json();

      if (!validationResult.success) {
        toast.error(validationResult.message || 'Configuration validation failed. Please check your credentials.');
        setIsSavingConfig(false);
        return;
      }

      if (isAuthEnabled) {
        // Auth enabled: store only a flag, then go to login
        localStorage.setItem('config_validated', 'true'); //it means cookie has now config , it will be removed when DB become source of truth
        localStorage.setItem('configSaved','true') //keep track that config is validated and saved , it will remain in local storage and not change with change in source of data
        updateConfig({ ...newConfig }, 'cookie');
        toast.success('Configuration validated. Please log in to continue.');
        setIsRedirecting(true);
        router.push('/auth/login');
      } else {
        // Auth disabled: we already have user data – store user cookie and go to chat
        const userData = validationResult.userData;
        const userInfo = userData?.data || userData;
        const userId = userInfo?.id;

        if (!userId) {
          toast.error('User ID not found in validation response');
          setIsSavingConfig(false);
          return;
        }

        setUserToCookie({
          success: true,
          message: 'User data loaded',
          data: userInfo,
        });

        updateConfig({ ...newConfig, userInfo }, 'database');
        saveConfig(newConfig)
        localStorage.setItem('configSaved','true') //keep track that config is validated and saved , it will remain in local storage and not change with change in source of data
        toast.success('Configuration saved successfully');
        setIsRedirecting(true);
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration. Please verify your credentials and try again.');
      setIsSavingConfig(false);
      setIsRedirecting(false);
    }
  };

  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
  const canProceed = isAuthEnabled
    ? formData.baseUrl.trim() && formData.apiKey.trim() && String(formData.agentId).trim()
    : formData.baseUrl.trim() && formData.apiKey.trim() && formData.ejentoAccessToken.trim() && String(formData.agentId).trim();

  // Redirect env‑driven users away
  useEffect(() => {
    if (!isLoading && !isValidating && configSource === 'environment' && isConfigured && !validationError) {
      router.replace(redirectPath);
    }
  }, [router, isLoading, isValidating, configSource, isConfigured, validationError]);

  // Show loading state while checking config
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

  // If env config is active and valid, show skeleton while redirecting
  if ((isEnvConfigured || configSource === 'environment') && isConfigured && !validationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show pre‑configured message if env config is active but invalid
  if (isEnvConfigured || configSource === 'environment') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Configuration</h1>
          <p className="text-gray-600 mt-2">Application Configuration Status</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationError ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Configuration Error
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Pre‑configured via Environment Variables
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isPublicAgent
                ? 'PUBLIC_AGENT mode is enabled. Configuration is managed via environment variables. You will be redirected to chat once validation completes.'
                : 'This application is using environment‑driven configuration. The settings below are managed server‑side and cannot be modified here.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Validation Error:</p>
                <p className="text-sm text-red-700">{validationError}</p>
                <p className="text-xs text-red-600 mt-2">
                  Please check your environment variables (.env file) and ensure all credentials are correct:
                </p>
                <ul className="text-xs text-red-600 mt-2 list-disc list-inside space-y-1">
                  <li>EJENTO_BASE_URL</li>
                  <li>EJENTO_API_KEY</li>
                  <li>EJENTO_ACCESS_TOKEN</li>
                  <li>EJENTO_AGENT_ID</li>
                  {isPublicAgent && <li className="text-blue-600">NEXT_PUBLIC_AGENT=true (already set)</li>}
                </ul>
                {isPublicAgent && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">PUBLIC_AGENT Mode:</p>
                    <p className="text-xs text-blue-600">
                      Make sure your .env file has all EJENTO_* variables set and restart your server.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-2">✓ Configuration Validated</p>
                <p className="text-sm text-green-700">
                  Your environment‑based configuration has been validated and is ready to use.
                </p>
                {isPublicAgent && (
                  <p className="text-xs text-green-600 mt-2">
                    PUBLIC_AGENT mode is active. Chat data will be stored locally in your browser.
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <Button onClick={() => router.replace('/chat')} className="w-full">
                    Go to Chat
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Base URL</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 font-mono">{config?.baseUrl || 'Not set'}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">API Key</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 font-mono">••••••••••••</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Ejento Access Token</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 font-mono">••••••••••••</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Agent ID</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 font-mono">{config?.agentId || 'Not set'}</p>
                </div>
              </div>

              {config?.userInfo && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">User Information</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-700">
                      {config.userInfo.name && `${config.userInfo.name} `}
                      {config.userInfo.email && `(${config.userInfo.email})`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-1">About Environment‑Driven Configuration</p>
                <p className="text-xs text-blue-700">
                  This configuration is loaded from server‑side environment variables. To modify these settings,
                  update your environment variables and restart the application server.
                </p>
              </div>
            </div>

            {validationError ? (
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                  Retry Validation
                </Button>
              </div>
            ) : (
              <div className="pt-4 flex gap-3">
                <Button className="w-full" size="lg" onClick={() => router.replace('/chat')}>
                  Continue to Chat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show normal form for manual configuration
  return (
    <div className="container mx-auto p-6 max-w-2xl relative">
      {isRedirecting ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : (
        <div>
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-gray-600 mt-2">Enter your API credentials to get started</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Required Configuration</CardTitle>
              <CardDescription>Please provide the following information to access the chat application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  placeholder="https://api.example.com"
                  className="mt-1"
                  disabled={isSavingConfig || isRedirecting}
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key *</Label>
                <div className="relative mt-1">
                  <Input
                    id="apiKey"
                    type={showTokens.apiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="Your API key"
                    className="pr-10"
                    disabled={isSavingConfig || isRedirecting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleTokenVisibility('apiKey')}
                    disabled={isSavingConfig || isRedirecting}
                  >
                    {showTokens.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isAuthEnabled && (
                <div>
                  <Label htmlFor="ejentoAccessToken">Ejento Access Token *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="ejentoAccessToken"
                      type={showTokens.ejentoAccessToken ? 'text' : 'password'}
                      value={formData.ejentoAccessToken}
                      onChange={(e) => handleInputChange('ejentoAccessToken', e.target.value)}
                      placeholder="Your Ejento access token"
                      className="pr-10"
                      disabled={isSavingConfig || isRedirecting}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleTokenVisibility('ejentoAccessToken')}
                      disabled={isSavingConfig || isRedirecting}
                    >
                      {showTokens.ejentoAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="agentId">Agent ID *</Label>
                <Input
                  id="agentId"
                  value={formData.agentId}
                  onChange={(e) => handleInputChange('agentId', e.target.value)}
                  placeholder="agentId"
                  className="mt-1"
                  disabled={isSavingConfig || isRedirecting}
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveAndProceed}
                  className="w-full"
                  disabled={isSavingConfig || isRedirecting || !canProceed}
                  size="lg"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingConfig ? 'Saving...' : 'Save Configuration and Proceed'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
