'use client';
import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { useConfig } from '@/app/context/ConfigContext';
import avatar from '../../public/avatar.png'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { clearUserFromStorage, getUserFromCookie, removeAccessToken, removeEjentoAccessToken, setUserToCookie, getEjentoAccessToken, clearUserFromCookie } from '@/cookie';
import { toast } from 'sonner';
import { Eye, EyeOff,LogOut } from 'lucide-react';
import { isPublicAgentMode } from '@/lib/utils';
import { usePublicAgentSession } from '@/hooks/usePublicAgentSession';

export function SidebarUserNav() {
  const { config, clearConfig, updateConfig, saveConfig, configSource } = useConfig();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isManageConfigOpen, setIsManageConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    baseUrl: '',
    ejentoAccessToken: '',
    apiKey: '',
    agentId: ''
  });
  const [user_info, setUserInfo] = useState(() => {
    const storedUser = getUserFromCookie();
    if (!storedUser) return null;
    return storedUser
  });
  const userId = user_info?.data?.id
  const [showTokens, setShowTokens] = useState({
    apiKey: false,
    ejentoAccessToken: false,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const isAuthFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
  const publicAgentSession = usePublicAgentSession(); 
  const isPublicAgent = isPublicAgentMode(); 

  useEffect(() => {
    if (isManageConfigOpen && config) {
      setConfigForm({
        baseUrl: config.baseUrl || '',
        ejentoAccessToken:
          process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
            ? getEjentoAccessToken() || ''
            : config?.ejentoAccessToken || '',
        apiKey: config.apiKey || '',
        agentId: config.agentId || ''
      });
    }
  }, [isManageConfigOpen, config]);
  

  const clearTokens = () => {
    const responseOfAccessToken = removeAccessToken()
    const responseOfEjentoAccessToken = removeEjentoAccessToken()
    if(responseOfAccessToken && responseOfEjentoAccessToken){
      return true
    }
    else{
      return false
    }
  }

  const handleLogout = async (userId: number) => {
    try {
      // Clear local tokens and storage
      const result = clearTokens();  
      if (result) {
        toast.success('Logout Successfully');
        router.push('/');
      } else {
        toast.error('Something went wrong while logging out. Please try again.');
      }
    } catch (error: any) {
      toast.error('Error during logout');
    }
  };
  

  const handleConfigChange = (field: string, value: string) => {
    setConfigForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleTokenVisibility = (field: keyof typeof showTokens) => {
    setShowTokens(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveConfig = async () => {

    // Prevent saving if config is environment-driven
    if (configSource === 'environment') {
      toast.error('Configuration cannot be modified. This application uses environment-driven configuration.');
      setIsManageConfigOpen(false);
      return;
    }
  
    // Check required fields based on auth flow
    if (
      !configForm.baseUrl ||
      !configForm.apiKey ||
      !configForm.agentId ||
      (process.env.NEXT_PUBLIC_AUTH_FLOW !== 'true' && !configForm.ejentoAccessToken)
    ) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSavingConfig(true);
  
    try {
      // Create config object based on auth flow
      let newConfig;
      if (process.env.NEXT_PUBLIC_AUTH_FLOW === 'true') {
        newConfig = {
          baseUrl: configForm.baseUrl.trim(),
          apiKey: configForm.apiKey.trim(),
          agentId: String(configForm.agentId).trim(),
        };
      } else {
        newConfig = {
          baseUrl: configForm.baseUrl.trim(),
          ejentoAccessToken: configForm.ejentoAccessToken.trim(),
          apiKey: configForm.apiKey.trim(),
          agentId: String(configForm.agentId).trim(),
          // Keep existing user info if available
          userInfo: config?.userInfo || {
            id: 'user-1',
            name: '',
            email: '',
          }
        };
      }
    

      if(isAuthFlowEnabled){
        //First, validate agent using token from cookie
        const validationResponse = await fetch('/api/config/validate-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config: newConfig })
        });

        const validationResult = await validationResponse.json();

        if (!validationResult.success) {
          toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
          setIsSavingConfig(false);
          return;
        }
      }
      
      // Call server-side validation endpoint
      const response = await fetch('/api/config/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: newConfig }),
      });
  
      const validationResult = await response.json();
  
      if (!validationResult.success) {
        toast.error(validationResult.message || 'Failed to validate configuration');
        setIsSavingConfig(false);
        return;
      }
  
      // Both validations passed, proceed with saving
      // Check if critical config values have changed
      let configChanged;
      if (process.env.NEXT_PUBLIC_AUTH_FLOW === 'true') {
        configChanged = !config || 
          config.agentId !== newConfig.agentId ||
          config.baseUrl !== newConfig.baseUrl ||
          config.apiKey !== newConfig.apiKey;
      } else {
        configChanged = !config || 
          config.agentId !== newConfig.agentId ||
          config.baseUrl !== newConfig.baseUrl ||
          config.ejentoAccessToken !== newConfig.ejentoAccessToken ||
          config.apiKey !== newConfig.apiKey;
      }
  
      // For non-auth flow mode, update user data if available
      if (process.env.NEXT_PUBLIC_AUTH_FLOW !== 'true' && validationResult.userData) {
        const userData = validationResult.userData;
        setUserToCookie(userData);
        
        // Update the config with the fetched user info
        const updatedConfig = {
          ...newConfig,
          userInfo: {
            id: userData.id || userData?.user_id || newConfig?.userInfo?.id,
            name: userData.name || userData.full_name || newConfig?.userInfo?.name,
            email: userData.email || newConfig?.userInfo?.email,
          }
        };
        updateConfig(updatedConfig as any,configSource);
        saveConfig(updatedConfig);
        setUserInfo(getUserFromCookie()); // Refresh user info display
        setIsManageConfigOpen(false);
        localStorage.setItem('configSaved','true')
        toast.success('Configuration updated successfully!');
        
        // If critical config changed, reload the page to refresh all components
        if (configChanged) {
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to allow toast to show
        }
        return;
      }
      
      // For auth flow mode or when user data is not available
      updateConfig(newConfig as any,configSource);
      saveConfig(newConfig);
      setIsManageConfigOpen(false);
      localStorage.setItem('configSaved','true')
      toast.success('Configuration updated successfully!');
      
      // If critical config changed, reload the page to refresh all components
      if (configChanged) {
        setTimeout(() => {
          window.location.reload();
        }, 500); // Small delay to allow toast to show
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration. Please verify your credentials and try again.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  //   // Prevent clearing if config is environment-driven
  //   if (configSource === 'environment') {
  //     toast.error('Configuration cannot be cleared. This application uses environment-driven configuration.');
  //     setIsManageConfigOpen(false);
  //     return;
  //   }

  //   clearConfig();
  //   setIsManageConfigOpen(false);
  //   toast.success('Configuration cleared successfully!');
  //   // Force redirect to settings page
  //   setTimeout(() => {
  //     router.push('/settings');
  //   }, 1000);
  // };

  const handleDestroySession = async () => {
    localStorage.removeItem('configSaved')
    if (configSource === 'environment') {
      toast.error(
        'Session cannot be destroyed because configuration is managed via environment variables.'
      );
      setIsManageConfigOpen(false);
      return;
    }
  
    try {
      
      const tokensCleared = clearTokens();
      if (!tokensCleared) {
        toast.error('Failed to clear tokens. Session not destroyed.');
        return; 
      }

      const userCleared = clearUserFromCookie();
      if (!userCleared) {
        toast.error('Failed to clear user data. Session not destroyed.');
        return; 
      }

      await clearConfig();
  
      toast.success('Session destroyed successfully');
      setIsManageConfigOpen(false);
  
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (error) {
      console.error('[DestroySession]', error);
      toast.error('Failed to fully destroy session. Some data may still exist.');
    }
  };
  
  return (
    <>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogTitle>Profile Information</DialogTitle>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">Session Information</h2>
                <p className="text-sm text-muted-foreground">
                  Based on Ejento Access Token, the current session is under user: <span className="font-medium">
                    {user_info?.data ? 
                      `${user_info.data.first_name} ${user_info.data.last_name}`.trim() || user_info.data.email || 'Unknown User' 
                      : 'Unknown User'
                    }
                  </span>
                </p>
              </div>
              
              {(user_info?.data?.first_name || user_info?.data?.last_name) && (
                <div>
                  <h3 className="text-sm font-medium mb-1">User Name</h3>
                  <p className="text-sm text-muted-foreground">{`${user_info.data?.first_name || ''} ${user_info.data?.last_name || ''}`.trim()}</p>
                </div>
              )}
              
              {user_info?.data?.email && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">{user_info.data.email}</p>
                </div>
              )}
              
              {user_info?.data?.id && (
                <div>
                  <h3 className="text-sm font-medium mb-1">User ID</h3>
                  <p className="text-sm text-muted-foreground font-mono">{user_info.data.id}</p>
                </div>
              )}
              
              {(user_info?.data?.is_staff || user_info?.data?.is_superuser) && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Role</h3>
                  <p className="text-sm text-muted-foreground">
                    {user_info.data.is_superuser ? 'Super User' : user_info.data.is_staff ? 'Staff' : 'User'}
                  </p>
                </div>
              )}
              
              {user_info?.data?.organization && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Organization</h3>
                  <p className="text-sm text-muted-foreground">{user_info.data.organization.org_name}</p>
                  {user_info.data.organization.domain && (
                    <p className="text-xs text-muted-foreground">{user_info.data.organization.domain}</p>
                  )}
                </div>
              )}
              
              {/* <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-2">Data Retention Policy</h3>
                <p className="text-sm text-muted-foreground">
                  Your chat logs and associated metadata are retained for a period of 90 days, after which they are permanently deleted. This means your interactions from the past 90 days are stored and accessible to you.
                </p>
              </div> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageConfigOpen} onOpenChange={setIsManageConfigOpen}>
        <DialogContent className="max-w-lg w-full">
          <DialogTitle>Manage Configuration</DialogTitle>
          <DialogDescription>
            {configSource === 'environment' 
              ? 'Configuration is managed via environment variables and cannot be modified here.'
              : 'Edit your configuration settings or clear them to start fresh.'}
          </DialogDescription>
          
          {configSource === 'environment' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
              <p className="text-sm text-blue-800 font-medium mb-2">Environment-Driven Configuration</p>
              <p className="text-xs text-blue-700">
                This application is using environment-based configuration. Settings are managed server-side 
                through environment variables and cannot be modified through this interface.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                To modify configuration, update your server environment variables and restart the application.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input
                id="baseUrl"
                value={configForm.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://api.example.com"
                disabled={configSource === 'environment'}
                className={configSource === 'environment' ? 'bg-gray-50 cursor-not-allowed' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showTokens.apiKey ? 'text' : 'password'}
                  value={configForm.apiKey}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  placeholder="your-api-key"
                  className={`pr-10 ${configSource === 'environment' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  disabled={configSource === 'environment'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleTokenVisibility('apiKey')}
                  disabled={configSource === 'environment'}
                >
                  {showTokens.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {
              process.env.NEXT_PUBLIC_AUTH_FLOW === 'true' ? 
              <div className="space-y-2">
                <Label htmlFor="ejentoAccessToken">Ejento Access Token</Label>
                <div className="relative">
                  <Input
                    id="ejentoAccessToken"
                    type={showTokens.ejentoAccessToken ? 'text' : 'password'}
                    value={configForm.ejentoAccessToken || 'your ejento access token'}
                    onChange={(e) => handleConfigChange('ejentoAccessToken', e.target.value)}
                    placeholder="your-access-token"
                    className={`pr-10 ${configSource === 'environment' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    disabled
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleTokenVisibility('ejentoAccessToken')}
                    disabled={configSource === 'environment'}
                  >
                    {showTokens.ejentoAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              : 
              <div className="space-y-2">
                <Label htmlFor="ejentoAccessToken">Ejento Access Token</Label>
                <div className="relative">
                  <Input
                    id="ejentoAccessToken"
                    type={showTokens.ejentoAccessToken ? 'text' : 'password'}
                    value={configForm.ejentoAccessToken}
                    onChange={(e) => handleConfigChange('ejentoAccessToken', e.target.value)}
                    placeholder="your-access-token"
                    className={`pr-10 ${configSource === 'environment' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    disabled={configSource === 'environment'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleTokenVisibility('ejentoAccessToken')}
                    disabled={configSource === 'environment'}
                  >
                    {showTokens.ejentoAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            }
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID *</Label>
              <Input
                id="agentId"
                value={configForm.agentId}
                onChange={(e) => handleConfigChange('agentId', e.target.value)}
                placeholder="your-agent-id"
                disabled={configSource === 'environment'}
                className={configSource === 'environment' ? 'bg-gray-50 cursor-not-allowed' : ''}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            {configSource !== 'environment' && (
              <Button
                variant="destructive"
                onClick={handleDestroySession}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Destroy Session
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setIsManageConfigOpen(false)}
              >
                Close
              </Button>
              {configSource !== 'environment' && (
                <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
                  {isSavingConfig ? 'Validating...' : 'Save Configuration'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SidebarMenu>
        <SidebarMenuItem>
          {/* Don't render anything for public agent with auth flow */}
        
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
                <Image
                  src={avatar}
                  alt={user_info?.data?.email ?? 'User Avatar'}
                  style={{
                    borderRadius: '100%',
                    height: '26px',
                    width: '26px'
                  }}
                />
                <span className="truncate">
                  {isPublicAgent && !isAuthFlowEnabled 
                    ? 'Session User' 
                    : (user_info?.data?.email || 'Not configured')
                  }
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                {/* Profile Information */}
                {!(isPublicAgent && !isAuthFlowEnabled) && (
                  <>
                     <DropdownMenuItem asChild>
                      <button
                        type="button"
                        className="w-full cursor-pointer"
                        onClick={() => setIsOpen(true)}
                      >
                        Profile Information
                      </button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                  
                )}
                {/* Manage Configuration - only for non-environment config */}
                {configSource !== 'environment' && (
                  <DropdownMenuItem asChild>
                    <button
                      type="button"
                      className="w-full cursor-pointer"
                      onClick={() => setIsManageConfigOpen(true)}
                    >
                      Manage Configuration
                    </button>
                  </DropdownMenuItem>
                )}
                
                {/* Environment notice */}
                {configSource === 'environment' && (
                    <DropdownMenuItem disabled className="opacity-60 cursor-not-allowed">
                      <span className="text-xs text-muted-foreground">
                        Configuration managed via environment variables
                      </span>
                    </DropdownMenuItem>
                )}
                {
                  isAuthFlowEnabled && 
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                    <button
                      type="button"
                      className="w-full cursor-pointer text-red-500 flex items-center gap-2 font-semibold"
                      onClick={() => {
                        if (userId !== null) {
                          handleLogout(userId);
                        } else {
                          toast.error("User ID not found. Cannot logout properly.");
                        }
                      }}
                    >
                      <LogOut className='h-5 w-5 text-[#71717B]'/>
                      Log out
                    </button>
                  </DropdownMenuItem>
                  </>
                  
                }
                
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
