import type { Order } from '@commercetools/platform-sdk';
import type { Order202507GetOrderDetailResponseDataOrders } from '../../tiktok-sdk';
import {
  extractCountryCode,
  mapCommercetoolsOrderToTiktokOrderReference,
  mapOrderState,
  mapPaymentState,
  mapShipmentState,
  normalizeOrderStatus,
  orderStatusToUpdateActions,
  TIKTOK_ORDER_STATUSES,
  tiktokOrderToCommercetoolsOrderImportDraft,
} from './order.mapper';

const tiktokOrder = {
  id: '576653688135258178',
  status: 'AWAITING_SHIPMENT',
  buyerEmail: 'buyer@example.com',
  paymentMethodName: 'CARD',
  fulfillmentType: 'FULFILLED_BY_SELLER',
  deliveryType: 'HOME_DELIVERY',
  shippingType: 'TIKTOK',
  warehouseId: 'wh-1',
  buyerMessage: 'please hurry',
  createTime: 1718305000,
  paidTime: 1718305100,
  updateTime: 1718305585,
  trackingNumber: 'TRACK123',
  shippingProvider: 'UPS',
  deliveryOptionName: 'Standard',
  payment: {
    currency: 'USD',
    totalAmount: '27.50',
    subTotal: '20.00',
    shippingFee: '5.00',
    shippingFeeTax: '0.50',
    tax: '2.00',
  },
  packages: [{ id: 'pkg-1' }],
  lineItems: [
    {
      id: 'li-1',
      productName: 'Mug',
      sellerSku: 'MUG-1',
      salePrice: '10.00',
      currency: 'USD',
      itemTax: [{ taxType: 'SALES_TAX', taxRate: '0.1' }],
    },
    {
      id: 'li-2',
      productName: 'Cup',
      sellerSku: 'CUP-1',
      salePrice: '10.00',
    },
  ],
  recipientAddress: {
    name: 'Jane Q Doe',
    addressLine1: '1 Main St',
    addressLine2: 'Apt 2',
    postalCode: '94016',
    phoneNumber: '+15550100',
    regionCode: 'US',
    districtInfo: [
      { addressLevel: 'L0', addressName: 'United States' },
      { addressLevel: 'L1', addressName: 'California' },
      { addressLevel: 'L2', addressName: 'San Francisco' },
    ],
  },
} as unknown as Order202507GetOrderDetailResponseDataOrders;

describe('order status mapping', () => {
  it('maps every documented TikTok status', () => {
    expect(
      TIKTOK_ORDER_STATUSES.map((status) => [
        status,
        mapOrderState(status),
        mapShipmentState(status),
      ]),
    ).toMatchInlineSnapshot(`
[
  [
    "UNPAID",
    "Open",
    "Pending",
  ],
  [
    "ON_HOLD",
    "Open",
    "Pending",
  ],
  [
    "AWAITING_SHIPMENT",
    "Open",
    "Ready",
  ],
  [
    "PARTIALLY_SHIPPING",
    "Open",
    "Partial",
  ],
  [
    "AWAITING_COLLECTION",
    "Open",
    "Ready",
  ],
  [
    "IN_TRANSIT",
    "Open",
    "Shipped",
  ],
  [
    "DELIVERED",
    "Complete",
    "Delivered",
  ],
  [
    "COMPLETED",
    "Complete",
    "Delivered",
  ],
  [
    "CANCEL",
    "Cancelled",
    "Pending",
  ],
]
`);
  });

  it('accepts both CANCEL and the legacy CANCELLED spelling', () => {
    expect(normalizeOrderStatus('CANCEL')).toBe('CANCEL');
    expect(normalizeOrderStatus('CANCELLED')).toBe('CANCEL');
    expect(normalizeOrderStatus(' cancel ')).toBe('CANCEL');
    expect(mapOrderState('CANCELLED')).toBe('Cancelled');
    expect(mapOrderState('CANCEL')).toBe('Cancelled');
  });

  it('falls back to Open/Pending for unknown or missing statuses', () => {
    expect(normalizeOrderStatus('SOMETHING_NEW')).toBeUndefined();
    expect(mapOrderState('SOMETHING_NEW')).toBe('Open');
    expect(mapShipmentState(undefined)).toBe('Pending');
  });

  it('maps payment state from status and paid time', () => {
    expect(mapPaymentState('UNPAID')).toBe('Pending');
    expect(mapPaymentState('CANCEL')).toBe('Failed');
    expect(mapPaymentState('CANCELLED')).toBe('Failed');
    expect(mapPaymentState('CANCEL', 1718305100)).toBe('Paid');
    expect(mapPaymentState('IN_TRANSIT')).toBe('Paid');
  });
});

describe('orderStatusToUpdateActions', () => {
  it('produces absolute state changes per status', () => {
    expect(orderStatusToUpdateActions('AWAITING_SHIPMENT')).toEqual([
      { action: 'changeShipmentState', shipmentState: 'Ready' },
    ]);
    expect(orderStatusToUpdateActions('AWAITING_COLLECTION')).toEqual([
      { action: 'changeShipmentState', shipmentState: 'Ready' },
    ]);
    expect(orderStatusToUpdateActions('IN_TRANSIT')).toEqual([
      { action: 'changeShipmentState', shipmentState: 'Shipped' },
    ]);
    expect(orderStatusToUpdateActions('DELIVERED')).toEqual([
      { action: 'changeShipmentState', shipmentState: 'Delivered' },
    ]);
    expect(orderStatusToUpdateActions('COMPLETED')).toEqual([
      { action: 'changeShipmentState', shipmentState: 'Delivered' },
      { action: 'changeOrderState', orderState: 'Complete' },
    ]);
  });

  it('handles CANCEL and CANCELLED identically', () => {
    const expected = [{ action: 'changeOrderState', orderState: 'Cancelled' }];
    expect(orderStatusToUpdateActions('CANCEL')).toEqual(expected);
    expect(orderStatusToUpdateActions('CANCELLED')).toEqual(expected);
  });

  it('yields no actions for creation, hold and unknown statuses', () => {
    expect(orderStatusToUpdateActions('UNPAID')).toEqual([]);
    expect(orderStatusToUpdateActions('ON_HOLD')).toEqual([]);
    expect(orderStatusToUpdateActions('WHATEVER')).toEqual([]);
  });
});

describe('extractCountryCode', () => {
  it('prefers the shop region for United States addresses', () => {
    expect(
      extractCountryCode(tiktokOrder.recipientAddress, { shopRegion: 'US' }),
    ).toBe('US');
  });

  it('falls back to the region code, shop region, then US', () => {
    expect(extractCountryCode({ regionCode: 'GB' }, { shopRegion: 'IE' })).toBe(
      'GB',
    );
    expect(extractCountryCode({}, { shopRegion: 'IE' })).toBe('IE');
    expect(extractCountryCode(undefined)).toBe('US');
  });
});

describe('tiktokOrderToCommercetoolsOrderImportDraft', () => {
  it('maps a TikTok order to an order import draft', () => {
    const draft = tiktokOrderToCommercetoolsOrderImportDraft(tiktokOrder, {
      locale: 'en-US',
      shopRegion: 'US',
    });
    expect(draft).toMatchSnapshot();
  });

  it('omits deliveries without a tracking number', () => {
    const draft = tiktokOrderToCommercetoolsOrderImportDraft(
      { ...tiktokOrder, trackingNumber: undefined },
      { locale: 'en-US', shopRegion: 'US' },
    );
    expect(draft.shippingInfo?.deliveries).toBeUndefined();
  });

  it('rejects a missing order', () => {
    expect(() =>
      tiktokOrderToCommercetoolsOrderImportDraft(
        undefined as unknown as Order202507GetOrderDetailResponseDataOrders,
        {},
      ),
    ).toThrow('No order data');
  });
});

describe('mapCommercetoolsOrderToTiktokOrderReference', () => {
  it('links commercetools line items to TikTok line items by sku', () => {
    const ctOrder = {
      id: 'ct-order',
      lineItems: [{ id: 'ct-li-1', variant: { sku: 'CUP-1' } }],
    } as unknown as Order;
    expect(
      mapCommercetoolsOrderToTiktokOrderReference(tiktokOrder, ctOrder),
    ).toEqual({
      id: tiktokOrder.id,
      externalOrder: {
        id: 'ct-order',
        platform: 'COMMERCETOOLS',
        lineItems: [{ id: 'ct-li-1', originId: 'li-2' }],
      },
    });
  });
});
