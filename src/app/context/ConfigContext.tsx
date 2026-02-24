'use client';

import { setUserToCookie } from '@/cookie';
import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  saveConfig: (config : any) => void;
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
  const router = useRouter();
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [configSource, setConfigSource] = useState<ConfigSource>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  let stored : any;

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

  //this method is used to store configuration to data base basen on next js api
  const saveConfig = async (updatedConfig? : any ) => {
    if (!config || typeof window === 'undefined' || configSource !== 'database') {
      return;
    }
    try {
      const response = await fetch('/api/ejento-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: updatedConfig ? updatedConfig.baseUrl : config.baseUrl,
          apiKey: updatedConfig ? updatedConfig.apiKey : config.apiKey,
          agentId: updatedConfig ? Number(updatedConfig.agentId) : Number(config.agentId), // ensure it's a number
          ejentoAccessToken: updatedConfig ? updatedConfig.ejentoAccessToken : config.ejentoAccessToken,
        }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save config:', error.error);
      } else {
        console.log('Config saved to database');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };
 
  //this method is used to validate configuration 
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
      let stored = true;
      //store user in cookie at this time, if authentication is disable 
      if(!isAuthEnabled){
        const userData = result.userData;
        const userInfo = userData?.data || userData;
        stored = setUserToCookie({
          success: true,
          message: 'User data loaded',
          data: userInfo,
        });
      }
      if (result.success && stored) {
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

  //this will load configuration variable from respective source on page mount
  //there are three places from where configuration come 
  //1. cookie : when we donot have env configuration stored in data base yet
  //2. data base (prisma)
  //3. env variables when env driven is enable
  const loadConfig = async () => {
    const configSaved = localStorage.getItem('configSaved')
    if(configSource !== 'environment' && configSaved){
      setIsConfigured(true)
    }
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const showErrorAndRedirect = (message: string) => {
      setTimeout(() => {
        router.push('/settings');
      }, 500);
    };
  
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
  
    const cleanup = () => {
      setIsLoading(false);
      clearTimeout(timeout);
    };
    
    //fetch from env variables
    const fetchEnvConfig = async (): Promise<UserConfig | null | undefined> => {
      try {
        const res = await fetch('/api/config', { signal: controller.signal });
        if (!res.ok) {
          if (res.status >= 500) {
            const errorData = await res.json().catch(() => ({}));
            if (errorData.envDrivenEnabled) {
              console.error('Environment-driven config failed:', errorData.error || 'Server error');
            }
          }
          throw new Error('env variable validation fails');
        }
  
        const data = await res.json();
  
        if (data.envDrivenEnabled === 'false') return null;
  
        if (data.config && data.source === 'environment') {
          const envConfig: UserConfig = data.config;
          const isValid = await validateEnvConfig(envConfig);
          if (!isValid) {
            console.log('i come here')
            setConfig(null);
            setConfigSource('environment');
            throw new Error('env variable validation fails');
          }
  
          return envConfig;
        }
  
        if (data.envDrivenEnabled === true && !data.config && data.error) {
          throw new Error('env variable validation fails');
        }
      } catch (err) {
        showErrorAndRedirect('env variable validation fails')
      }
    };
  
    //fetch from cookie
    const fetchCookieConfig = async (): Promise<UserConfig | null> => {
      try {
        const res = await fetch("/api/env-from-cookies");
        if (!res.ok) throw new Error('Error fetching config from cookies');
  
        const result = await res.json();
        if (result.success && result.data) {
          return {
            baseUrl: result.data.baseUrl,
            apiKey: result.data.apiKey,
            agentId: result.data.agentId,
            ejentoAccessToken: result.data.ejentoAccessToken || '',
          };
        }
        else{
          throw new Error('error fetching cookies')
        }
      } catch (err) {
        console.error("Error fetching config from cookies:", err);
        showErrorAndRedirect('Error fetching config from cookies')
      }
      return null;
    };
    
    //fetch from data base
    const fetchDBConfig = async (): Promise<UserConfig | null> => {
      try {
        const res = await fetch("/api/ejento-config");
        if (!res.ok) throw new Error('Error loading config!');
  
        const dbConfig = await res.json();
        return dbConfig || null;
      } catch (err) {
        console.error("Error fetching config:", err);
        showErrorAndRedirect('Error fetching config')
        return null
      }
    };
  
    try {
      // Step 1: Try ENV config first
      const envConfig = await fetchEnvConfig();
      if (envConfig) {
        setIsConfigured(true)
        setConfig(envConfig);
        setConfigSource('environment');
        cleanup();
        return;
      }

      const isAuthFlow = process.env.NEXT_PUBLIC_AUTH_FLOW === "true";
  
      if (isAuthFlow) {
        //when auth is enable there are 2 cases 
        //1. variables are in cookie and not store to data base yet because user id is not available 
        // this will be decided with the help of flag
        //if config_validate is true it means configuration are valid but data base donot contain them yet
        //if it is false it means env has been stored to data base so now fetch from there

        const configValidator = localStorage.getItem("config_validated");
        if (configValidator === "true") {
          const cookieConfig = await fetchCookieConfig();
          if (cookieConfig) {
            setConfig(cookieConfig);
            setConfigSource('cookie');
            cleanup();
            return;
          }
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
      //when auth is disable , variables would always be in Data Base because they had stored after validation
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


  const isEnvConfigured = configSource === 'environment';

  const value = useMemo(() => ({
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
  }), [
    config, 
    configSource, 
    isConfigured, 
    isEnvConfigured, 
    isLoading, 
    isValidating, 
    validationError,
    updateConfig,
    clearConfig,
    saveConfig,
    loadConfig,
    setConfigSource,
    setConfig
  ]);

  return (
    <ConfigContext.Provider
      value={value}
    >
      {children}
    </ConfigContext.Provider>
  );
}