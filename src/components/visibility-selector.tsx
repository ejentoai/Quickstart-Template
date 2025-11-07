'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
} from './icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';

export type VisibilityType = 'private' | 'public';

const visibilities: Array<{
  id: VisibilityType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: 'private',
    label: 'Private',
    description: 'Only you can access this chat',
    icon: <LockIcon />,
  },
  {
    id: 'public',
    label: 'Public',
    description: 'Anyone with the link can access this chat',
    icon: <GlobeIcon />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
  corpus,
  selectedCorpus,
  setSelectedCorpus,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  corpus: any;
  selectedCorpus: any;
  setSelectedCorpus: any;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          variant="outline"
          className="hidden md:flex md:px-2 md:h-[34px]"
        >
          {selectedCorpus?.version}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[150px]">
        {corpus?.find((item:any) => item.name == selectedCorpus?.name)?.versions?.map((visibility:string, index: number) => (
          <DropdownMenuItem
            key={visibility}
            onSelect={() => {
              setOpen(false);
              setSelectedCorpus({ ...selectedCorpus, corpusId: corpus?.find((item:any) => item.name == selectedCorpus?.name)?.corpusIds?.at(index), version: visibility });
              localStorage.setItem(
                "selectedCorpus",
                JSON.stringify({
                  name: selectedCorpus?.name,
                  version: visibility,
                  corpusId: corpus?.find((item:any) => item.name == selectedCorpus?.name)?.corpusIds?.at(index),
                })
              );
            }}
            className="gap-4 group/item flex flex-row justify-between items-center cursor-pointer"
            // data-active={visibility.id === visibilityType}
          >
              {visibility}
              {selectedCorpus?.version == visibility && <CheckCircleFillIcon />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
