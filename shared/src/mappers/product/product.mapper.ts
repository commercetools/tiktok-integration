import type {
  Attribute,
  ByProjectKeyRequestBuilder,
  Price,
  ProductProjection,
  ProductVariant,
} from '@commercetools/platform-sdk';
import type {
  Product202309CreateProductRequestBody,
  Product202309CreateProductRequestBodyPackageDimensions,
  Product202309CreateProductRequestBodyPackageWeight,
  Product202309CreateProductRequestBodySkus,
  Product202309CreateProductRequestBodySkusInventory,
  Product202309CreateProductRequestBodySkusListPrice,
  Product202309CreateProductRequestBodySkusPrice,
  Product202309EditProductRequestBody,
  Product202309GetProductResponseData,
} from '../../../tiktok-sdk';
import {
  ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_HEIGHT,
  ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_LENGTH,
  ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_UNIT,
  ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_WIDTH,
  ATTRIBUTE_KEY_PACKAGE_WEIGHT_UNIT,
  ATTRIBUTE_KEY_PACKAGE_WEIGHT_VALUE,
  FALLBACK_PACKAGE_DIMENSIONS_HEIGHT,
  FALLBACK_PACKAGE_DIMENSIONS_LENGTH,
  FALLBACK_PACKAGE_DIMENSIONS_UNIT,
  FALLBACK_PACKAGE_DIMENSIONS_WIDTH,
  FALLBACK_PACKAGE_WEIGHT_UNIT,
  FALLBACK_PACKAGE_WEIGHT_VALUE,
  USE_NO_CHANNEL_FOR_INVENTORY_FALLBACK,
  USE_NO_CHANNEL_FOR_LIST_PRICE,
  USE_NO_CHANNEL_FOR_MAIN_PRICE,
} from '../../constants';
import type { ShopContext } from '../../interfaces';
import {
  getProductTypeMapping,
  resolveProductAttributes,
  resolveSkuAttributes,
} from '../../mappings/engine';
import type { MappingConfig } from '../../mappings/schema';
import { loadMappingConfig } from '../../mappings/store';
import { getShopContext } from '../../services/shop-context.service';

export interface ProductMappingContext {
  shop: ShopContext;
  mappings: MappingConfig;
}

export const loadProductMappingContext = async (
  apiRoot: ByProjectKeyRequestBuilder,
): Promise<ProductMappingContext> => {
  const [shop, mappings] = await Promise.all([
    getShopContext(apiRoot),
    loadMappingConfig(),
  ]);
  return { shop, mappings };
};

const findAttribute = (
  attributes: Attribute[] | undefined,
  name: string,
): Attribute['value'] =>
  attributes?.find((attribute) => attribute.name === name)?.value;

const priceCentAmountToAmount = (
  price: number,
  fractionDigits: number,
): string => {
  if (typeof price !== 'number' || price === 0) {
    return '0';
  }
  return (price / Math.pow(10, fractionDigits)).toFixed(fractionDigits);
};

const sameRegion = (country: string | undefined, region: string): boolean =>
  country?.toLowerCase() === region.toLowerCase();

const commercetoolsProductStateToSaveMode = (
  product: ProductProjection,
): string => (product.published === false ? 'AS_DRAFT' : 'LISTING');

export const commercetoolsPriceToTiktokPrice = (
  price: Price,
): Product202309CreateProductRequestBodySkusPrice | undefined => {
  if (!price) {
    return undefined;
  }
  const discounted = price.discounted?.value;
  return {
    amount: priceCentAmountToAmount(
      price.value.centAmount,
      price.value.fractionDigits,
    ),
    currency: price.value.currencyCode,
    salePrice: discounted
      ? priceCentAmountToAmount(
          discounted.centAmount,
          discounted.fractionDigits,
        )
      : priceCentAmountToAmount(
          price.value.centAmount,
          price.value.fractionDigits,
        ),
  };
};

export const commercetoolsVariantToPrice = (
  variant: ProductVariant,
  shop: Pick<ShopContext, 'shopRegion' | 'ctDistributionChannelId'>,
): Product202309CreateProductRequestBodySkusPrice | undefined => {
  const region = shop?.shopRegion;
  if (!region) {
    return undefined;
  }
  const channelPrice = variant.prices?.find(
    (price) =>
      typeof price.channel !== 'undefined' &&
      sameRegion(price.country, region) &&
      price.channel.id === shop.ctDistributionChannelId,
  );
  if (channelPrice) {
    return commercetoolsPriceToTiktokPrice(channelPrice);
  }
  if (USE_NO_CHANNEL_FOR_MAIN_PRICE) {
    const noChannelPrice = variant.prices?.find(
      (price) =>
        typeof price.channel === 'undefined' &&
        sameRegion(price.country, region),
    );
    if (noChannelPrice) {
      return commercetoolsPriceToTiktokPrice(noChannelPrice);
    }
  }
  return undefined;
};

export const commercetoolsVariantToListPrice = (
  variant: ProductVariant,
  shopRegion?: string,
): Product202309CreateProductRequestBodySkusListPrice | undefined => {
  if (!shopRegion || !USE_NO_CHANNEL_FOR_LIST_PRICE) {
    return undefined;
  }
  const noChannelPrice = variant.prices?.find(
    (price) =>
      typeof price.channel === 'undefined' &&
      sameRegion(price.country, shopRegion),
  );
  if (!noChannelPrice) {
    return undefined;
  }
  return {
    amount: priceCentAmountToAmount(
      noChannelPrice.value.centAmount,
      noChannelPrice.value.fractionDigits,
    ),
    currency: noChannelPrice.value.currencyCode,
  };
};

const commercetoolsVariantToTiktokSKUInventory = (
  variant: ProductVariant,
  shop: ShopContext,
): Product202309CreateProductRequestBodySkusInventory[] => {
  const channelAvailability =
    variant.availability?.channels?.[shop.ctSupplyChannelId];
  let quantity = channelAvailability?.availableQuantity;
  if (!channelAvailability && USE_NO_CHANNEL_FOR_INVENTORY_FALLBACK) {
    quantity = variant.availability?.availableQuantity;
  }
  if (typeof quantity === 'undefined') {
    return [];
  }
  return [{ quantity, warehouseId: shop.tiktokWarehouseId }];
};

const commercetoolsVariantToTiktokSKU = (
  variant: ProductVariant,
  productTypeId: string,
  context: ProductMappingContext,
): Product202309CreateProductRequestBodySkus | undefined => {
  const { shop, mappings } = context;
  const listPrice = commercetoolsVariantToListPrice(variant, shop.shopRegion);
  const price = commercetoolsVariantToPrice(variant, shop);
  const inventory = commercetoolsVariantToTiktokSKUInventory(variant, shop);
  if (inventory.length === 0 || !price) {
    return undefined;
  }
  const skuMappings =
    getProductTypeMapping(mappings, productTypeId)?.skuAttributes ?? [];
  return {
    inventory,
    externalSkuId: variant.sku,
    sellerSku: variant.sku,
    ...(listPrice && { listPrice }),
    price,
    salesAttributes: resolveSkuAttributes(
      skuMappings,
      variant.attributes,
      shop.locale,
    ),
  };
};

const commercetoolsProductTypeToTiktokProductPackageWeight = (
  attributes: Attribute[] | undefined,
): Product202309CreateProductRequestBodyPackageWeight => {
  const fallback = {
    value: FALLBACK_PACKAGE_WEIGHT_VALUE,
    unit: FALLBACK_PACKAGE_WEIGHT_UNIT,
  };
  const unit = findAttribute(
    attributes,
    ATTRIBUTE_KEY_PACKAGE_WEIGHT_UNIT,
  )?.key;
  const value = Number(
    findAttribute(attributes, ATTRIBUTE_KEY_PACKAGE_WEIGHT_VALUE),
  );
  if (!unit || !Number.isFinite(value)) {
    return fallback;
  }
  let fractionDigits = 2;
  if (unit === 'KILOGRAM') {
    fractionDigits = 3;
  } else if (unit === 'GRAM') {
    fractionDigits = 0;
  }
  return { value: value.toFixed(fractionDigits), unit };
};

const commercetoolsProductTypeToTiktokProductPackageDimensions = (
  attributes: Attribute[] | undefined,
): Product202309CreateProductRequestBodyPackageDimensions => {
  const height = findAttribute(
    attributes,
    ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_HEIGHT,
  );
  const length = findAttribute(
    attributes,
    ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_LENGTH,
  );
  const width = findAttribute(
    attributes,
    ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_WIDTH,
  );
  const unit = findAttribute(
    attributes,
    ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_UNIT,
  )?.key;
  if (
    height === undefined ||
    length === undefined ||
    width === undefined ||
    !unit
  ) {
    return {
      height: FALLBACK_PACKAGE_DIMENSIONS_HEIGHT,
      length: FALLBACK_PACKAGE_DIMENSIONS_LENGTH,
      unit: FALLBACK_PACKAGE_DIMENSIONS_UNIT,
      width: FALLBACK_PACKAGE_DIMENSIONS_WIDTH,
    };
  }
  return {
    height: String(height),
    length: String(length),
    unit,
    width: String(width),
  };
};

/**
 * Pure mapping of a commercetools product to a TikTok create-product body.
 * No image upload is performed; the result is only checked for completeness.
 */
export const buildTiktokProductDraft = (
  product: ProductProjection,
  context: ProductMappingContext,
  options: { includeExternalProductId?: boolean } = {},
): Product202309CreateProductRequestBody => {
  const { shop, mappings } = context;
  const productTypeId = product.productType.id;
  const productTypeMapping = getProductTypeMapping(mappings, productTypeId);
  const categoryId = productTypeMapping?.categoryId;
  if (!categoryId) {
    throw new Error(
      `Product draft is invalid for product ${product.id}. Category ID is required: map product type ${productTypeId} to a TikTok category.`,
    );
  }

  const skus = [product.masterVariant, ...product.variants]
    .map((variant) =>
      commercetoolsVariantToTiktokSKU(variant, productTypeId, context),
    )
    .filter(
      (sku): sku is Product202309CreateProductRequestBodySkus =>
        sku !== undefined,
    );
  if (skus.length === 0) {
    throw new Error(
      `Product draft is invalid for product ${product.id}. SKUs are required.`,
    );
  }

  const masterAttributes = product.masterVariant.attributes;
  return {
    saveMode: commercetoolsProductStateToSaveMode(product),
    ...(options.includeExternalProductId && { externalProductId: product.id }),
    title: product.name?.[shop.locale],
    description: product.description?.[shop.locale],
    categoryVersion: 'v2',
    categoryId,
    skus,
    productAttributes: resolveProductAttributes(
      productTypeMapping.productAttributes,
      masterAttributes,
      shop.locale,
    ),
    packageWeight:
      commercetoolsProductTypeToTiktokProductPackageWeight(masterAttributes),
    packageDimensions:
      commercetoolsProductTypeToTiktokProductPackageDimensions(
        masterAttributes,
      ),
  };
};

export const commercetoolsProductToTiktokProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  product: ProductProjection,
): Promise<Product202309CreateProductRequestBody> =>
  buildTiktokProductDraft(product, await loadProductMappingContext(apiRoot), {
    includeExternalProductId: true,
  });

/**
 * Checks whether a product is ready to be imported into TikTok.
 * No image upload is performed, only the product data is checked.
 */
export const commercetoolsProductToTiktokProductCheck = async (
  apiRoot: ByProjectKeyRequestBuilder,
  product: ProductProjection,
): Promise<Product202309CreateProductRequestBody> =>
  buildTiktokProductDraft(product, await loadProductMappingContext(apiRoot));

export const tiktokProductToTiktokProductEdit = (
  product: Product202309GetProductResponseData,
): Product202309EditProductRequestBody => ({
  title: product.title,
  description: product.description,
  categoryId: product.categoryChains?.find((cat) => cat.isLeaf)?.id,
  categoryVersion: 'v2',
  mainImages: product.mainImages?.map((image) => ({ uri: image.uri })),
  packageWeight: product.packageWeight,
  skus: product.skus?.map((sku) => ({
    id: sku.id,
    price: sku.price,
    listPrice: sku.listPrice,
  })),
});

export const mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit =
  async (
    apiRoot: ByProjectKeyRequestBuilder,
    currentProduct: Product202309GetProductResponseData,
    commercetoolsProduct?: ProductProjection,
  ): Promise<Product202309EditProductRequestBody> => {
    if (!commercetoolsProduct) {
      throw new Error('Commercetools product is required');
    }
    const mappedProductData = await commercetoolsProductToTiktokProduct(
      apiRoot,
      commercetoolsProduct,
    );
    return {
      title: currentProduct.title,
      description: currentProduct.description,
      categoryVersion: 'v2',
      mainImages: currentProduct.mainImages?.map((image) => ({
        uri: image.uri,
      })),
      packageWeight: currentProduct.packageWeight,
      skus: currentProduct.skus?.map((sku) => ({
        id: sku.id,
        price: sku.price,
        listPrice: sku.listPrice,
      })),
      ...mappedProductData,
    };
  };
