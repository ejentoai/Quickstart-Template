'use client';

import { useApiService } from '@/hooks/useApiService';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setUserToStorage } from '@/cookie';

export interface UserConfig {
  
  // API Configuration
  baseUrl: string;
  ejentoAccessToken: string;
  apiKey: string;
  agentId: string;
  
  // User Information (optional, can be fetched)
  userInfo?: {
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
  };
  
  // App Settings
  theme?: 'light' | 'dark';
  defaultModel?: string;
}

type ConfigSource = 'environment' | 'localStorage' | null;

interface ConfigContextType {
  config: UserConfig | null;
  configSource: ConfigSource;
  updateConfig: (newConfig: Partial<UserConfig>) => void;
  clearConfig: () => Promise<void>;
  isConfigured: boolean;
  isEnvConfigured: boolean;
  saveConfig: () => void;
  loadConfig: () => void;
  isLoading: boolean;
  isValidating: boolean;
  validationError: string | null;
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

  const updateConfig = (newConfig: Partial<UserConfig>) => {
    setConfig(prev => prev ? { ...prev, ...newConfig } : newConfig as UserConfig);
    // When config is manually updated, it's from localStorage (settings page)
    // Only set source if not already set (to preserve env source)
    if (configSource === null || configSource === 'localStorage') {
      setConfigSource('localStorage');
    }
  };

  const clearConfig = async () => {
    setConfig(null);
    setConfigSource(null);
    
    // Clear localStorage config
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app-config');
    }
    
    // SECURITY: Clear server-side credentials cookie (for ENV_DRIVEN=false scenario)
    // This ensures credentials are removed from secure storage when user logs out
    try {
      await fetch('/api/config', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to clear server-side credentials:', error);
      // Continue even if this fails - localStorage is already cleared
    }
  };

  const saveConfig = () => {
    // Only save to localStorage if config source is 'localStorage'
    // Never save env-based config to localStorage
    if (config && typeof window !== 'undefined' && configSource === 'localStorage') {
      localStorage.setItem('app-config', JSON.stringify(config));
    }
  };

  /**
   * Validates environment-based configuration by checking credentials and agent
   * This ensures env config is valid before the app uses it
   */
  const validateEnvConfig = async (configToValidate: UserConfig): Promise<boolean> => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: configToValidate }),
      });

      const result = await response.json();

      if (result.success && result.userData) {

        const user = result.userData.data ? result.userData.data : result.userData;
  
        const filteredUser = {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          name: user.full_name || '' + ' ' + user.last_name || '',
          email: user.email || '',
          is_staff: user.is_staff || false,
          is_superuser: user.is_superuser || false,
        };

        // Validation successful - store filtered user info
        // The sidebar expects the user data in a specific format with a 'data' property
        // Always use filteredUser to ensure only required fields are stored
        const userInfoToStore = { 
          success: true, 
          message: 'User data loaded', 
          data: filteredUser
        };
        setUserToStorage(userInfoToStore);
        
        // Update config with user info
        // Ensure config is updated synchronously so isConfigured calculation works
        setConfig(prev => {
          if (!prev) {
            // This shouldn't happen if validation was called with a config, but handle it
            return prev;
          }
          return {
            ...prev,
            userInfo: filteredUser
          };
        });
        
        // Clear any validation errors
        setValidationError(null);
        return true;
      } else {
        // Validation failed
        const errorMessage = result.message || 'Configuration validation failed';
        setValidationError(errorMessage);
        console.error('Env config validation failed:', errorMessage);
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to validate configuration';
      setValidationError(errorMessage);
      console.error('Error validating env config:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const loadConfig = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Check for environment-based configuration first
      // The API endpoint will respect ENV_DRIVEN flag and return appropriate response
      try {
        const envConfigResponse = await fetch('/api/config');
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
              console.error('Environment configuration validation failed. App will not start with invalid credentials.');
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

      // Step 2: Fall back to localStorage if no env config or ENV_DRIVEN is false
      try {
        const saved = localStorage.getItem('app-config');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
          setConfigSource('localStorage');
        }
      } catch (error) {
        console.error('Failed to load config from localStorage:', error);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Auto-save when config changes (only for localStorage-based config)
  useEffect(() => {
    if (config && configSource === 'localStorage') {
      saveConfig();
    }
  }, [config, configSource]);

  // Only mark as configured if:
  // 1. Config exists with all required fields
  // 2. If env config, validation must have passed (no validation error)
  // For environment-driven config, sensitive credentials (baseUrl, apiKey, ejentoAccessToken) are server-side only
  // agentId is not sensitive and is required for both modes
  const isConfigured = Boolean(
    config?.agentId &&
    // For localStorage config, require baseUrl and credentials (they're stored client-side)
    // For environment config, baseUrl and credentials are server-side only (validation confirms they exist)
    (configSource === 'environment' || (config?.baseUrl && config?.apiKey && config?.ejentoAccessToken)) &&
    // For env config, ensure validation passed (no error)
    (configSource !== 'environment' || !validationError)
  );

  const isEnvConfigured = configSource === 'environment';

  return (
    <ConfigContext.Provider value={{
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
      validationError
    }}>
      {children}
    </ConfigContext.Provider>
  );
}
