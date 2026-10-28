import { useShowNotification } from '@commercetools-frontend/actions-global';
import {
  DOMAINS,
  NOTIFICATION_KINDS_SIDE,
} from '@commercetools-frontend/constants';

/** Side notification in the Merchant Center. */
export const useNotify = () => {
  const showNotification = useShowNotification();
  return (kind: 'success' | 'error', text: string) =>
    showNotification({
      kind: NOTIFICATION_KINDS_SIDE[kind],
      domain: DOMAINS.SIDE,
      text,
    });
};
