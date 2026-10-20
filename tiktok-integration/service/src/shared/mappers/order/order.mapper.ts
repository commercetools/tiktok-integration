import {
  BaseAddress,
  LineItemImportDraft,
  Order,
  OrderImportDraft,
} from '@commercetools/platform-sdk';
import {
  Order202406AddExternalOrderReferencesRequestBodyOrders,
  Order202507GetOrderDetailResponseDataOrders,
  Order202507GetOrderDetailResponseDataOrdersLineItems,
  Order202507GetOrderDetailResponseDataOrdersRecipientAddress,
} from '../../interfaces/tiktok/models';
import { convertPriceToCentAmount } from '../../utils';

/**
 * Map TikTok order status to CommerceTools OrderState
 */
export const mapOrderState = (status?: string): string => {
  const statusMap: Record<string, string> = {
    UNPAID: 'Open',
    ON_HOLD: 'Open',
    AWAITING_SHIPMENT: 'Open',
    PARTIALLY_SHIPPING: 'Open',
    AWAITING_COLLECTION: 'Open',
    IN_TRANSIT: 'Open',
    DELIVERED: 'Complete',
    COMPLETED: 'Complete',
    CANCELLED: 'Cancelled',
  };
  return statusMap[status || ''] || 'Open';
};

/**
 * Map TikTok order status to CommerceTools ShipmentState
 */
export const mapShipmentState = (status?: string): string => {
  const statusMap: Record<string, string> = {
    UNPAID: 'Pending',
    ON_HOLD: 'Pending',
    AWAITING_SHIPMENT: 'Ready',
    PARTIALLY_SHIPPING: 'Partial',
    AWAITING_COLLECTION: 'Ready',
    IN_TRANSIT: 'Shipped',
    DELIVERED: 'Delivered',
    COMPLETED: 'Delivered',
    CANCELLED: 'Pending',
  };
  return statusMap[status || ''] || 'Pending';
};

/**
 * Map TikTok order status to CommerceTools PaymentState
 */
export const mapPaymentState = (status?: string, paidTime?: number): string => {
  if (paidTime && paidTime > 0) {
    return 'Paid';
  }
  if (status === 'UNPAID') {
    return 'Pending';
  }
  if (status === 'CANCELLED') {
    return 'Failed';
  }
  return 'Paid';
};

/**
 * Extract country code from TikTok district info or region code
 */
export const extractCountryCode = (
  recipientAddress?: Order202507GetOrderDetailResponseDataOrdersRecipientAddress,
  options?: { locale?: string; shopRegion?: string }
): string => {
  const countryName = recipientAddress?.districtInfo?.find(
    (d) => d.addressLevel === 'L0'
  )?.addressName;
  if (countryName === 'United States') {
    return options?.shopRegion || 'US';
  }
  return recipientAddress?.regionCode || options?.shopRegion || 'US';
};

/**
 * Map TikTok line item to CommerceTools LineItemImportDraft
 */
export const mapLineItem = (
  item: Order202507GetOrderDetailResponseDataOrdersLineItems,
  index: number,
  options: { currency: string; locale?: string; countryCode: string }
): LineItemImportDraft => {
  return {
    key: item.id || `line-item-${index}`,
    name: {
      [options.locale || 'en']: item.productName || 'Unknown Product',
    },
    variant: {
      sku: item.sellerSku,
    },
    // productId: item.productId,
    quantity: 1, // TikTok line items represent single items
    price: {
      value: {
        currencyCode: item.currency || options.currency,
        centAmount: convertPriceToCentAmount(item.salePrice),
      },
    },
    taxRate: item.itemTax?.[0]
      ? {
          name: item.itemTax[0].taxType || 'Tax',
          amount: parseFloat(item.itemTax[0].taxRate || '0'),
          includedInPrice: false,
          country: options.countryCode,
        }
      : undefined,
  };
};

/**
 * Map TikTok recipient address to CommerceTools BaseAddress
 */
export const mapAddress = (
  recipientAddress?: Order202507GetOrderDetailResponseDataOrdersRecipientAddress,
  buyerEmail?: string,
  options?: { locale?: string; shopRegion?: string }
): BaseAddress | undefined => {
  if (!recipientAddress) return undefined;

  const countryCode = extractCountryCode(recipientAddress, options);
  const stateName =
    recipientAddress.districtInfo?.find((d) => d.addressLevel === 'L1')
      ?.addressName || '';
  const cityName =
    recipientAddress.districtInfo?.find((d) => d.addressLevel === 'L2')
      ?.addressName ||
    recipientAddress.postTown ||
    '';

  return {
    firstName:
      recipientAddress.firstName || recipientAddress.name?.split(' ')[0] || '',
    lastName:
      recipientAddress.lastName ||
      recipientAddress.name?.split(' ').slice(1).join(' ') ||
      '',
    streetName:
      recipientAddress.addressLine1 || recipientAddress.addressDetail || '',
    streetNumber: recipientAddress.addressLine2 || '',
    additionalStreetInfo:
      [recipientAddress.addressLine3, recipientAddress.addressLine4]
        .filter(Boolean)
        .join(', ') || undefined,
    postalCode: recipientAddress.postalCode || '',
    city: cityName,
    region: stateName,
    state: stateName,
    country: countryCode,
    phone: recipientAddress.phoneNumber,
    email: buyerEmail,
  };
};

/**
 * Map TikTok shipping information to CommerceTools ShippingInfoImportDraft
 */
export const mapShippingInfo = (
  tiktokOrder: Order202507GetOrderDetailResponseDataOrders,
  currency: string,
  lineItems: LineItemImportDraft[],
  options: { locale?: string; shopRegion?: string }
) => {
  return {
    shippingMethodName:
      tiktokOrder.deliveryOptionName ||
      tiktokOrder.shippingType ||
      'Standard Shipping',
    price: {
      currencyCode: currency,
      centAmount: convertPriceToCentAmount(tiktokOrder.payment?.shippingFee),
    },
    shippingRate: {
      price: {
        currencyCode: currency,
        centAmount: convertPriceToCentAmount(tiktokOrder.payment?.shippingFee),
      },
    },
    taxRate: tiktokOrder.payment?.shippingFeeTax
      ? {
          name: 'Shipping Tax',
          amount:
            convertPriceToCentAmount(tiktokOrder.payment.shippingFeeTax) /
            (convertPriceToCentAmount(tiktokOrder.payment.shippingFee) || 1),
          includedInPrice: false,
          country: options.shopRegion || 'US',
        }
      : undefined,
    deliveries: tiktokOrder.trackingNumber
      ? [
          {
            items: lineItems.map((li) => ({
              id: li.key || '',
              quantity: li.quantity,
            })),
            parcels: [
              {
                id: tiktokOrder.packages?.[0]?.id || tiktokOrder.id || '',
                trackingData: {
                  trackingId: tiktokOrder.trackingNumber,
                  carrier: tiktokOrder.shippingProvider,
                },
              },
            ],
          },
        ]
      : undefined,
  };
};

/**
 * Create tax portions for the order
 */

/**
 * Create custom fields for TikTok order metadata
 */
export const createCustomFields = (
  tiktokOrder: Order202507GetOrderDetailResponseDataOrders
) => {
  return {
    type: {
      typeId: 'type' as const,
      key: 'tiktok-order-info',
    },
    fields: {
      tiktokOrderId: tiktokOrder.id,
      tiktokOrderStatus: tiktokOrder.status,
      tiktokPaymentMethodName: tiktokOrder.paymentMethodName,
      tiktokFulfillmentType: tiktokOrder.fulfillmentType,
      tiktokDeliveryType: tiktokOrder.deliveryType,
      tiktokShippingType: tiktokOrder.shippingType,
      tiktokWarehouseId: tiktokOrder.warehouseId,
      tiktokBuyerMessage: tiktokOrder.buyerMessage,
      tiktokCreateTime: tiktokOrder.createTime,
      tiktokPaidTime: tiktokOrder.paidTime,
      tiktokUpdateTime: tiktokOrder.updateTime,
    },
  };
};

export const createTaxPortions = (
  tax?: string,
  subTotal?: string,
  currency?: string
) => {
  if (!tax || !currency) return [];

  return [
    {
      rate:
        convertPriceToCentAmount(tax) /
        (convertPriceToCentAmount(subTotal) || 1),
      amount: {
        currencyCode: currency,
        centAmount: convertPriceToCentAmount(tax),
      },
      name: 'Sales Tax',
    },
  ];
};

/**
 * Converts a TikTok order to a CommerceTools OrderImportDraft
 * @param tiktokOrderResponse - The TikTok order response containing order data
 * @returns OrderImportDraft for CommerceTools
 */
export const tiktokOrderToCommercetoolsOrderImportDraft = async (
  tiktokOrderResponse: Order202507GetOrderDetailResponseDataOrders,
  options: { locale?: string; shopRegion?: string }
): Promise<OrderImportDraft> => {
  // Extract the first order from the response

  if (!tiktokOrderResponse) {
    throw new Error('No order data found in TikTok response');
  }

  // Extract basic order information
  const currency = tiktokOrderResponse.payment?.currency || 'USD';
  const totalAmount = convertPriceToCentAmount(
    tiktokOrderResponse.payment?.totalAmount
  );
  const countryCode = extractCountryCode(
    tiktokOrderResponse.recipientAddress,
    options
  );

  // Map line items
  const lineItems =
    tiktokOrderResponse.lineItems?.map((item, index) =>
      mapLineItem(item, index, {
        currency,
        countryCode,
        locale: options.locale,
      })
    ) || [];

  // Map addresses
  const shippingAddress = mapAddress(
    tiktokOrderResponse.recipientAddress,
    tiktokOrderResponse.buyerEmail,
    options
  );
  const billingAddress = shippingAddress; // Using shipping address as billing address

  // Map shipping info
  const shippingInfo = mapShippingInfo(
    tiktokOrderResponse,
    currency,
    lineItems,
    options
  );

  // Build the OrderImportDraft
  const orderImportDraft: OrderImportDraft = {
    customerEmail: tiktokOrderResponse.buyerEmail,
    lineItems,
    totalPrice: {
      currencyCode: currency,
      centAmount: totalAmount,
    },
    taxedPrice: {
      totalNet: {
        currencyCode: currency,
        centAmount: convertPriceToCentAmount(
          tiktokOrderResponse.payment?.subTotal
        ),
      },
      totalGross: {
        currencyCode: currency,
        centAmount: totalAmount,
      },
      taxPortions: createTaxPortions(
        tiktokOrderResponse.payment?.tax,
        tiktokOrderResponse.payment?.subTotal,
        currency
      ),
    },
    shippingAddress,
    billingAddress,
    shippingInfo,
    orderState: mapOrderState(tiktokOrderResponse.status),
    shipmentState: mapShipmentState(tiktokOrderResponse.status),
    country: countryCode,
    inventoryMode: 'None',
    origin: 'Merchant',
    custom: createCustomFields(tiktokOrderResponse),
  };

  return orderImportDraft;
};

export const mapCommercetoolsOrderToTiktokOrderReference = (
  tiktokOrder: Order202507GetOrderDetailResponseDataOrders,
  commercetoolsOrder: Order
): Order202406AddExternalOrderReferencesRequestBodyOrders => {
  return {
    id: tiktokOrder.id,
    externalOrder: {
      id: commercetoolsOrder.id,
      platform: 'COMMERCETOOLS',
      lineItems: commercetoolsOrder.lineItems.map((item) => ({
        id: item.id,
        originId:
          tiktokOrder.lineItems?.find((li) => li.sellerSku === item.variant.sku)
            ?.id || '',
      })),
    },
  };
};
