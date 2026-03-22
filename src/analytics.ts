export type AnalyticsEvent = string;

export const getDistinctAnonUserId = () => '';

export interface AnalyticsInstance {
  identify: (id: string) => void;
  hasGivenConsent: (consentGiven: boolean) => void;
  track: (eventName: string, properties?: any, options?: any) => void;
  debouncedTrack: (eventName: string, properties?: any, options?: any) => void;
}

export const analytics = (): AnalyticsInstance | undefined => {
  return undefined;
};

export function getShortUniqueId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
