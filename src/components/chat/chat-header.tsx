"use client";

import { useWindowSize } from "usehooks-ts";

import { ModelSelector } from "@/components/model-selector";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/icons";
import { useSidebar } from "@/components/ui/sidebar";
import { memo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  VisibilityType,
  VisibilitySelector,
} from "@/components/visibility-selector";
import { getAccessToken, getUserFromStorage } from '@/cookie';
import { toast } from "sonner";
import { encryptData, handleSetQueryParams } from "@/lib/utils";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  chatStarted,
  selectedCorpus,
  setSelectedCorpus,
  corpus,
  messages
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  chatStarted: boolean;
  selectedCorpus: any;
  setSelectedCorpus: any;
  corpus: any;
  messages?: any[];
}) {
  const { open } = useSidebar();
  const [user, setUser] = useState<{ id: string, email: string, full_name: string, is_super_user: boolean } | null>(null)

  useEffect(() => {
    setUser(getUserFromStorage())
  }, [])

  const { width: windowWidth } = useWindowSize();

  const addNewThread = () => {  
    try {
      if (user) {
        // Check if there's already an empty thread by calling the sidebar function
        // The sidebar manages the thread list and knows about existing empty threads
        if ((window as any).addNewThreadFromHeader) {
          (window as any).addNewThreadFromHeader();
        } else {
          // Fallback: create new thread directly (in case sidebar function is not available)
          const tempThreadId = -Date.now();
          const newTitle = 'New Chat';
          
          // Navigate to the new local chat thread
          handleSetQueryParams(tempThreadId.toString(), newTitle);
          localStorage.setItem('active_thread_id', tempThreadId.toString());
          
          toast.success('New chat created');
        }
      }
    } catch (e) {
      console.error('Error creating new thread:', e);
      toast.error('Failed to create new chat');
    }
  }

  return (
    <header className="flex sticky top-0 bg-background py-1.5 pt-[0.5rem] items-center px-2 md:px-2 gap-2">
      {/* Left side - existing buttons */}
      <div className="flex items-center gap-2">
        <SidebarToggle />

        {(!open || windowWidth < 768) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="md:px-2 px-2 md:h-fit"
                onClick={addNewThread}
              >
                <PlusIcon />
                <span className="md:sr-only">New Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        )}

        
      </div>


    </header>
  );
}

export const ChatHeader = memo(PureChatHeader);
