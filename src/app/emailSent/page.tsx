'use client';

import { Suspense } from 'react';
import ResetPage from './EmailSentPage';

export default function Page() {

    return (
            <Suspense fallback={null}>
                <ResetPage></ResetPage>
            </Suspense>
    );
}
