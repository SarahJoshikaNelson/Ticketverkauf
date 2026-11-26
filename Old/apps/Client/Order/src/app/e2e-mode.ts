export function isE2EMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasQueryFlag = new URLSearchParams(window.location.search).get('e2e') === 'true';
  const hasStorageFlag = window.localStorage.getItem('__e2e') === 'true';

  return hasQueryFlag || hasStorageFlag;
}

