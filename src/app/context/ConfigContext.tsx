'use client';

import { getEjentoAccessToken } from '@/cookie';
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

type ConfigSource = 'environment' | 'database' | 'cookie' | null;

interface ConfigContextType {
  config: UserConfig | null;
  configSource: ConfigSource;
  updateConfig: (newConfig: Partial<UserConfig>, source: ConfigSource) => void;
  clearConfig: () => Promise<void>;
  isConfigured: boolean;
  isEnvConfigured: boolean;
  saveConfig: () => void;
  isLoading: boolean;
  isValidating: boolean;
  validationError: string | null;
  setConfigSource: (source: ConfigSource) => void;
  setConfig: (config: UserConfig) => void,
  loadConfig: () => Promise<void>


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
  let accessToken : any;

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
  const saveConfig = async () => {
    if (!config || typeof window === 'undefined' || configSource !== 'database') {
      return;
    }
    console.log(config,)
  
    try {
      // if(isAuthEnabled){
      //   accessToken = getEjentoAccessToken();
      // }
      // else{
      //   accessToken = config.ejentoAccessToken
      //   console.log('gge')
      // }
      const response = await fetch('/api/ejento-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          agentId: Number(config.agentId), // ensure it's a number
          accessToken: config.ejentoAccessToken,
        }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save config:', error.error);
        // Optionally show a toast or handle the error
      } else {
        console.log('Config saved to database');
        // Optionally update local state or show success message
      }
    } catch (error) {
      console.error('Error saving config:', error);
      // Handle network errors
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
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
  
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
  
    const cleanup = () => {
      setIsLoading(false);
      clearTimeout(timeout);
    };
  
    const fetchEnvConfig = async (): Promise<UserConfig | null> => {
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (!res.ok) {
          if (res.status >= 500) {
            const errorData = await res.json().catch(() => ({}));
            if (errorData.envDrivenEnabled) {
              console.error('Environment-driven config failed:', errorData.error || 'Server error');
            }
          }
          return null;
        }
  
        const data = await res.json();
  
        if (data.envDrivenEnabled === false) return null;
  
        if (data.config && data.source === 'environment') {
          const envConfig: UserConfig = data.config;
          const isValid = await validateEnvConfig(envConfig);
  
          if (!isValid) {
            setConfig(null); // keep source for UI error messages
            setConfigSource('environment');
            return null;
          }
  
          return envConfig;
        }
  
        if (data.envDrivenEnabled === true && !data.config && data.error) {
          console.error('Environment-driven config error:', data.error);
        }
      } catch (err) {
        console.warn('Failed to load env config, falling back to localStorage:', err);
      }
      return null;
    };
  
    const fetchCookieConfig = async (): Promise<UserConfig | null> => {
      try {
        const res = await fetch("/api/env-from-cookies");
        if (!res.ok) return null;
  
        const result = await res.json();
        if (result.success && result.data) {
          return {
            baseUrl: result.data.baseUrl,
            apiKey: result.data.apiKey,
            agentId: result.data.agentId,
            ejentoAccessToken: '', // not needed in auth mode
          };
        }
      } catch (err) {
        console.error("Error fetching config from cookies:", err);
      }
      return null;
    };
  
    const fetchDBConfig = async (): Promise<UserConfig | null> => {
      try {
        const res = await fetch("/api/ejento-config");
        if (!res.ok) return null;
  
        const dbConfig = await res.json();
        return dbConfig || null;
      } catch (err) {
        console.error("Error fetching config:", err);
        return null;
      }
    };
  
    try {
      // Step 1: Try ENV config first
      const envConfig = await fetchEnvConfig();
      if (envConfig) {
        setConfig(envConfig);
        setConfigSource('environment');
        cleanup();
        return;
      }
  
      const isAuthFlow = process.env.NEXT_PUBLIC_AUTH_FLOW === "true";
  
      if (isAuthFlow) {
        console.log("Auth flow detected");
  
        const configValidator = localStorage.getItem("config_validated");
        if (configValidator === "true") {
          const cookieConfig = await fetchCookieConfig();
          if (cookieConfig) {
            setConfig(cookieConfig);
            setConfigSource('cookie');
            cleanup();
            return;
          }
          console.log("No valid config in cookies, waiting for login");
          cleanup();
          return;
        }
  
        // If validator not present, fetch from DB
        const dbConfig = await fetchDBConfig();
        if (dbConfig) {
          setConfig(dbConfig);
          setConfigSource('database');
        }
  
        cleanup();
        return;
      }
  
      // Auth flow disabled → fetch DB config
      const dbConfig = await fetchDBConfig();
      if (dbConfig) {
        setConfig(dbConfig);
        setConfigSource('database');
      }
  
    } catch (err) {
      console.error("Error loading config:", err);
    } finally {
      cleanup();
    }
  };
  

  
  useEffect(() => {
    loadConfig();
  }, []);

  // Auto‑save only for localStorage source (currently unused for credentials)
  useEffect(() => {
    if (config && configSource === 'database') {
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
        setConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}