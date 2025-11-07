'use client';

import { useFormStatus } from 'react-dom';

import { LoaderIcon } from '@/components/icons';

import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  // const { pending } = useFormStatus();

  return (
    <Button
      type={'submit'}
      className="relative"
    >
      {children}

      {/* {(pending || isSuccessful) && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )} */}

      <output aria-live="polite" className="sr-only">
        {isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}
