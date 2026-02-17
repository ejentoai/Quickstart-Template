'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface UserConfig {
  baseUrl: string;
  ejentoAccessToken: string;
  apiKey: string;
  agentId: string;
  userInfo?: {
    id?: string;
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
  };
  theme?: 'light' | 'dark';
  defaultModel?: string;
}

type ConfigSource = 'environment' | 'database' | null;

interface ConfigContextType {
  config: UserConfig | null;
  configSource: ConfigSource;
  updateConfig: (newConfig: Partial<UserConfig>, source: ConfigSource) => void;
  clearConfig: () => Promise<void>;
  isConfigured: boolean;
  isEnvConfigured: boolean;
  saveConfig: () => void;
  loadConfig: () => void;
  isLoading: boolean;
  isValidating: boolean;
  validationError: string | null;
  setConfigSource: (source: ConfigSource) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [configSource, setConfigSource] = useState<ConfigSource>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';

  const updateConfig = (newConfig: Partial<UserConfig>, source: ConfigSource) => {
    setConfig(prev => (prev ? { ...prev, ...newConfig } : (newConfig as UserConfig)));
    setConfigSource(source);
  };

  const clearConfig = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    setConfig(null);
    setConfigSource(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('config_validated');
    }

    try {
      await fetch('/api/config', { method: 'DELETE', signal: controller.signal });
    } catch (error) {
      console.error('Failed to clear server-side credentials:', error);
    } finally {
      clearTimeout(timeout);
    }
  };

  // Only used if we ever explicitly set source = 'localStorage' (e.g. for theme)
  const saveConfig = () => {
    if (config && typeof window !== 'undefined' && configSource === 'localStorage') {
      localStorage.setItem('app-config', JSON.stringify(config));
    }
  };

  const validateEnvConfig = async (configToValidate: UserConfig): Promise<boolean> => {
    setIsValidating(true);
    setValidationError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configToValidate }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (result.success) {
        setValidationError(null);
        return true;
      } else {
        setValidationError(result.message || 'Validation failed');
        return false;
      }
    } catch (error: any) {
      let errorMessage = 'Failed to validate configuration';
      if (error.name === 'AbortError') {
        errorMessage = 'Validation timed out';
      } else {
        errorMessage = error.message;
      }
      setValidationError(errorMessage);
      return false;
    } finally {
      setIsValidating(false);
      clearTimeout(timeout);
    }
  };

  const loadConfig = async () => {
 
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
 
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
 
    try {
      // Step 1: Check for environment-based configuration first
      // The API endpoint will respect ENV_DRIVEN flag and return appropriate response
      try {
        const envConfigResponse = await fetch('/api/config',{signal : controller.signal});
        if (envConfigResponse.ok) {
          const envConfigData = await envConfigResponse.json();
         
          // If ENV_DRIVEN is explicitly false, API returns envDrivenEnabled: false
          // In this case, skip env config and go straight to localStorage
          if (envConfigData.envDrivenEnabled === false) {
            // ENV_DRIVEN is false - skip env config, go straight to localStorage (Step 2)
            // Continue to Step 2 below
          } else if (envConfigData.config && envConfigData.source === 'environment') {
            // Environment config found - validate it before using
            const envConfig = envConfigData.config;
            setConfig(envConfig);
            setConfigSource('environment');
           
            // Validate the env config (same validations as manual config)
            const isValid = await validateEnvConfig(envConfig);
           
            if (!isValid) {
              // Validation failed - clear config so app doesn't use invalid credentials
              // BUT keep configSource as 'environment' so we can show env-specific error messages
              setConfig(null);
              // Keep configSource as 'environment' so validation error can be displayed
              // This allows the UI to show that it was an env config validation failure
              // console.error('Environment configuration validation failed. App will not start with invalid credentials.');
            }
           
            setIsLoading(false);
            return;
          } else if (envConfigData.envDrivenEnabled === true && !envConfigData.config && envConfigData.error) {
            // ENV_DRIVEN is true but config is invalid/missing - log error but continue to localStorage
            console.error('Environment-driven config error:', envConfigData.error);
          }
        } else if (envConfigResponse.status >= 500) {
          // Server error - if ENV_DRIVEN was enabled, this is a problem
          const errorData = await envConfigResponse.json().catch(() => ({}));
          if (errorData.envDrivenEnabled) {
            console.error('Environment-driven config failed:', errorData.error || 'Server error');
          }
        }
      } catch (error) {
        // If API call fails, fall back to localStorage
        console.warn('Failed to load env config, falling back to localStorage:', error);
      }
 
      try {
        const isAuthFlow = process.env.NEXT_PUBLIC_AUTH_FLOW === "true";
        // ✅ In auth flow, DO NOT call protected API before login
        if (isAuthFlow) {
          console.log("Auth flow detected");
          const configValidator = localStorage.getItem("config_validated");
       
          // If we have a stored config and validator is true, do nothing
          if (configValidator === "true") {
            console.log("Config validator is true, skipping fetch");
            setIsLoading(false);
            return;
          }
       
          try {
            console.log("Fetching config from backend...");
            const res = await fetch("/api/ejento-config");
            if (!res.ok) throw new Error("Failed to fetch config");
       
            const config = await res.json();
       
            if (config) {
              setConfig(config);
            }
       
          } catch (error) {
            console.error("Error fetching config:", error);
          } finally {
            setIsLoading(false);
          }
       
          return;
        }
       
   
        // ✅ If auth flow is disabled → safe to fetch DB config
        const dbConfigResponse = await fetch("/api/ejento-config");
   
        if (dbConfigResponse.ok) {
          const data = await dbConfigResponse.json();
          if (data.success) {
            setConfig(data.data);
          }
        }
   
      } catch (error) {
        console.error("Error loading config:", error);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
      clearTimeout(timeout);
    }
  }; 
 
  

  useEffect(() => {
    loadConfig();
  }, []);

  // Auto‑save only for localStorage source (currently unused for credentials)
  useEffect(() => {
    if (config && configSource === 'localStorage') {
      saveConfig();
    }
  }, [config, configSource]);

  const isConfigured = Boolean(
    config?.agentId &&
      (configSource === 'environment'
        ? !validationError
        : configSource === 'database'
          ? true
          : false)
  );

  const isEnvConfigured = configSource === 'environment';

  return (
    <ConfigContext.Provider
      value={{
        config,
        configSource,
        updateConfig,
        clearConfig,
        isConfigured,
        isEnvConfigured,
        saveConfig,
        loadConfig,
        isLoading,
        isValidating,
        validationError,
        setConfigSource,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}