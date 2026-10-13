import { Suspense } from 'react';

import { TokenCheckPage } from '@/modules/token-check';

// One page with no in-app navigation: nothing to validate for instant navigations.
export const instant = false;

export default function HomePage() {
  return (
    <Suspense>
      <TokenCheckPage />
    </Suspense>
  );
}
