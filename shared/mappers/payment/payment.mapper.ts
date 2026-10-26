import type { PaymentDraft } from '@commercetools/platform-sdk';
import type { Order202507GetOrderDetailResponseDataOrders } from '../../tiktok-sdk';
import { convertPriceToCentAmount } from '../../utils/currency';

export const tiktokOrderToCommercetoolsPaymentDraft = (
  order: Order202507GetOrderDetailResponseDataOrders,
  options: { locale?: string; shopRegion?: string },
): PaymentDraft => ({
  amountPlanned: {
    currencyCode: order?.payment?.currency || 'USD',
    centAmount: convertPriceToCentAmount(order?.payment?.totalAmount),
  },
  paymentMethodInfo: {
    name: {
      [options.locale || 'en']:
        order?.paymentMethodName || 'Unknown Payment Method',
    },
  },
});
