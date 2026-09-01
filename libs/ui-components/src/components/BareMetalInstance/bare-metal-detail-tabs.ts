import type { TFunction } from 'i18next';

export const BARE_METAL_DETAIL_OVERVIEW_TAB_ID = 'bare-metal-detail-overview';
export const BARE_METAL_DETAIL_NETWORKING_TAB_ID = 'bare-metal-detail-networking';

export const getBareMetalDetailTabLabels = (t: TFunction): string[] => [
  t('Overview'),
  t('Networking'),
];
