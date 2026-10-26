import type { Order202507GetOrderDetailResponseDataOrders } from '../../tiktok-sdk';
import { tiktokOrderToCommercetoolsPaymentDraft } from './payment.mapper';

describe('tiktokOrderToCommercetoolsPaymentDraft', () => {
  it('maps amount, currency and payment method', () => {
    const order = {
      paymentMethodName: 'CARD',
      payment: { currency: 'EUR', totalAmount: '19.99' },
    } as Order202507GetOrderDetailResponseDataOrders;
    expect(
      tiktokOrderToCommercetoolsPaymentDraft(order, { locale: 'en-US' }),
    ).toEqual({
      amountPlanned: { currencyCode: 'EUR', centAmount: 1999 },
      paymentMethodInfo: { name: { 'en-US': 'CARD' } },
    });
  });

  it('falls back to USD, zero and an unknown method', () => {
    expect(
      tiktokOrderToCommercetoolsPaymentDraft(
        {} as Order202507GetOrderDetailResponseDataOrders,
        {},
      ),
    ).toEqual({
      amountPlanned: { currencyCode: 'USD', centAmount: 0 },
      paymentMethodInfo: { name: { en: 'Unknown Payment Method' } },
    });
  });
});
