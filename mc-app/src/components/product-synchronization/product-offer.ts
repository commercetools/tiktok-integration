import type { TEnrichedProduct } from '../../hooks/use-products';
import type { MappingConfig } from '../../hooks/use-tiktok-service';

type OfferContext = {
  distributionChannelId?: string;
  supplyChannelId?: string;
  /** The shop's region; the connector uses only prices of this country. */
  region?: string;
};

const formatAmount = (
  centAmount: number,
  fractionDigits: number,
  currencyCode: string
) =>
  `${(centAmount / 10 ** fractionDigits).toFixed(
    fractionDigits
  )} ${currencyCode}`;

/**
 * The prices the connector sends: those on the distribution channel for the
 * shop's region. Several variants with different prices show as a range.
 */
export const describePrice = (
  product: TEnrichedProduct,
  { distributionChannelId, region }: OfferContext
): string => {
  const prices = product.variants.flatMap((variant) =>
    variant.prices.filter(
      (price) =>
        distributionChannelId !== undefined &&
        price.channelId === distributionChannelId &&
        (!region || price.country?.toLowerCase() === region.toLowerCase())
    )
  );
  if (prices.length === 0) {
    return 'No price';
  }
  const sorted = [...prices].sort(
    (a, b) =>
      a.centAmount / 10 ** a.fractionDigits -
      b.centAmount / 10 ** b.fractionDigits
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const low = formatAmount(
    first.centAmount,
    first.fractionDigits,
    first.currencyCode
  );
  const high = formatAmount(
    last.centAmount,
    last.fractionDigits,
    last.currencyCode
  );
  return low === high ? low : `${low} – ${high}`;
};

/** The stock on the supply channel, summed over the variants that have an inventory entry there. */
export const describeInventory = (
  product: TEnrichedProduct,
  { supplyChannelId }: OfferContext
): string => {
  const quantities = product.variants.flatMap((variant) =>
    supplyChannelId !== undefined && supplyChannelId in variant.stock
      ? [variant.stock[supplyChannelId]]
      : []
  );
  return quantities.length === 0
    ? 'No inventory'
    : String(quantities.reduce((sum, quantity) => sum + quantity, 0));
};

/** "{commercetools attribute} > {TikTok attribute}" for every attribute the product type's mapping defines. */
export const describeMappings = (
  product: TEnrichedProduct,
  mappings: MappingConfig
): string[] => {
  const mapping = mappings.productTypes[product.productTypeId];
  if (!mapping) {
    return [];
  }
  return [...mapping.productAttributes, ...mapping.skuAttributes].map(
    (attribute) =>
      `${attribute.ctAttribute ?? 'fixed value'} > ${
        attribute.name || attribute.tiktokAttributeId
      }`
  );
};
