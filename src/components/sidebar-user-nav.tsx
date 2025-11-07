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
import { getUserFromStorage, setUserToStorage } from '@/cookie';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { ApiService } from '@/api';

export function SidebarUserNav() {
  const { config, clearConfig, updateConfig, saveConfig, configSource } = useConfig();
  const router = useRouter();
  const [user_info, setUserInfo] = useState<{
    success: boolean,
    message: string,
    data: {
      id: number, 
      email: string, 
      first_name: string, 
      last_name: string, 
      is_staff: boolean, 
      is_superuser: boolean, 
      is_active: boolean,
      date_joined: string,
      organization?: {
        id: number,
        org_name: string,
        domain: string,
        description: string,
        org_logo_url?: string,
        org_icon_url?: string
      }
    }
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isManageConfigOpen, setIsManageConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    baseUrl: '',
    ejentoAccessToken: '',
    apiKey: '',
    agentId: ''
  });
  const [showTokens, setShowTokens] = useState({
    apiKey: false,
    ejentoAccessToken: false,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    setUserInfo(getUserFromStorage());
  }, []);

  useEffect(() => {
    if (isManageConfigOpen && config) {
      setConfigForm({
        baseUrl: config.baseUrl || '',
        ejentoAccessToken: config.ejentoAccessToken || '',
        apiKey: config.apiKey || '',
        agentId: config.agentId || ''
      });
    }
  }, [isManageConfigOpen, config]);

  const handleLogout = () => {
    clearConfig();
    router.push('/settings');
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

    if (!configForm.baseUrl || !configForm.ejentoAccessToken || !configForm.apiKey || !configForm.agentId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSavingConfig(true);

    try {
      const newConfig = {
        baseUrl: configForm.baseUrl.trim(),
        ejentoAccessToken: configForm.ejentoAccessToken.trim(),
        apiKey: configForm.apiKey.trim(),
        agentId: configForm.agentId.trim(),
        // Keep existing user info if available
        userInfo: config?.userInfo || {
          id: 'user-1',
          name: '',
          email: '',
        }
      };

      // Validate user and agent before saving
      const tempApiService = new ApiService(newConfig);
      
      // 1. Validate user exists
      const userData = await tempApiService.getCurrentUser();
      if (!userData || typeof userData === 'number' || Number.isInteger(userData)) {
        toast.error('Could not verify credentials. Please make sure your provided values are correct.');
        setIsSavingConfig(false);
        return;
      }

      // 2. Validate agent exists
      const agentResponse = await tempApiService.getAgent(newConfig.agentId);
      if (!agentResponse.success || !agentResponse.data) {
        const errorMessage = agentResponse.message || 'Agent could not be retrieved';
        toast.error(`Invalid agent ID. ${errorMessage}. Please check your Agent ID.`);
        setIsSavingConfig(false);
        return;
      }

      // Both validations passed, proceed with saving
      // Check if critical config values have changed (agentId, baseUrl, or ejentoAccessToken)
      const configChanged = !config || 
        config.agentId !== newConfig.agentId ||
        config.baseUrl !== newConfig.baseUrl ||
        config.ejentoAccessToken !== newConfig.ejentoAccessToken ||
        config.apiKey !== newConfig.apiKey;

      // Store user data
      if (userData && typeof userData === 'object' && !Number.isInteger(userData)) {
        setUserToStorage(userData);
        
        // Update the config with the fetched user info
        const updatedConfig = {
          ...newConfig,
          userInfo: {
            id: userData.id || userData.user_id || newConfig.userInfo.id,
            name: userData.name || userData.full_name || newConfig.userInfo.name,
            email: userData.email || newConfig.userInfo.email,
          }
        };
        
        updateConfig(updatedConfig);
        saveConfig();
        setUserInfo(getUserFromStorage()); // Refresh user info display
        setIsManageConfigOpen(false);
        toast.success('Configuration updated successfully!');
        
        // If critical config changed, reload the page to refresh all components
        if (configChanged) {
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to allow toast to show
        }
      } else {
        updateConfig(newConfig);
        saveConfig();
        setIsManageConfigOpen(false);
        toast.success('Configuration updated successfully!');
        
        // If critical config changed, reload the page to refresh all components
        if (configChanged) {
          setTimeout(() => {
            window.location.reload();
          }, 500); // Small delay to allow toast to show
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration. Please verify your credentials and try again.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleClearConfig = () => {
    // Prevent clearing if config is environment-driven
    if (configSource === 'environment') {
      toast.error('Configuration cannot be cleared. This application uses environment-driven configuration.');
      setIsManageConfigOpen(false);
      return;
    }

    clearConfig();
    setIsManageConfigOpen(false);
    toast.success('Configuration cleared successfully!');
    // Force redirect to settings page
    setTimeout(() => {
      router.push('/settings');
    }, 1000);
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
                  <h3 className="text-sm font-medium mb-1">Full Name</h3>
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
            
            <div className="space-y-2">
              <Label htmlFor="ejentoAccessToken">Ejento Access Token *</Label>
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
                onClick={handleClearConfig}
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

                <span className="truncate">{user_info?.data?.email || 'Not configured'}</span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width]"
            >
              {(
                <>
                  <DropdownMenuItem asChild>
                    <button
                      type="button"
                      className="w-full cursor-pointer"
                      onClick={() => {
                        setIsOpen(true)
                      }}
                    >
                      Profile Information
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {configSource !== 'environment' && (
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    className="w-full cursor-pointer"
                    onClick={() => {
                      setIsManageConfigOpen(true)
                    }}
                  >
                    Manage Configuration
                  </button>
                </DropdownMenuItem>
              )}
              
              {configSource === 'environment' && (
                <DropdownMenuItem disabled className="opacity-60 cursor-not-allowed">
                  <span className="text-xs text-muted-foreground">
                    Configuration managed via environment variables
                  </span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
