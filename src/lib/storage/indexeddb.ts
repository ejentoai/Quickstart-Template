
export function isPublicAgentMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const publicAgent = process.env.NEXT_PUBLIC_AGENT;
  const result = publicAgent === 'true' || publicAgent === '1';

  return result;
}

