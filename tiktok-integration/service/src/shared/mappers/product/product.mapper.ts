import {
  Attribute,
  ByProjectKeyRequestBuilder,
  Price,
  ProductProjection,
  ProductVariant,
} from '@commercetools/platform-sdk';
import {
  Product202309CreateProductRequestBody,
  Product202309CreateProductRequestBodyPackageDimensions,
  Product202309CreateProductRequestBodyPackageWeight,
  Product202309CreateProductRequestBodyProductAttributes,
  Product202309CreateProductRequestBodySkus,
  Product202309CreateProductRequestBodySkusInventory,
  Product202309CreateProductRequestBodySkusListPrice,
  Product202309CreateProductRequestBodySkusPrice,
  Product202309CreateProductRequestBodySkusSalesAttributes,
  Product202309EditProductRequestBody,
  Product202309GetProductResponseData,
} from '../../interfaces/tiktok/models';
import { CommercetoolsStorage, Services } from '../..';
import { FALLBACK_PRODUCT_TYPE_TO_TIKTOK_CATEGORY } from './product-type-to-category';
import {
  FALLBACK_PRODUCT_TYPE_TO_TIKTOK_PRODUCT_ATTRIBUTE,
  FALLBACK_PRODUCT_TYPE_TO_TIKTOK_SKU_ATTRIBUTE,
} from './product-type-to-attribute';
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
} from './product-contants';
import {
  ShopConfigurationData,
  ProductTypeToCategoryMap,
  ProductTypeToSkuAttributeMap,
  ProductTypeToProductAttributeMap,
} from '../../interfaces';

// Cache for mapper data to avoid repeated custom object reads
let categoryMapCache: ProductTypeToCategoryMap | null = null;
let skuAttributeMapCache: ProductTypeToSkuAttributeMap | null = null;
let productAttributeMapCache: ProductTypeToProductAttributeMap | null = null;

/**
 * Get product type to category mapping from custom objects with caching
 */
const getCategoryMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToCategoryMap> => {
  if (categoryMapCache !== null) {
    return categoryMapCache;
  } 
  
  const map = await CommercetoolsStorage.ProductMapperController.getProductTypeToCategoryMap(
    apiRoot
  );
  
  // If custom object map is empty, use hard-coded fallback
  if (Object.keys(map).length !== 0) {
    categoryMapCache = map;
  } else {
    categoryMapCache = FALLBACK_PRODUCT_TYPE_TO_TIKTOK_CATEGORY;
  }
  
  return categoryMapCache;
};

/**
 * Get product type to SKU attribute mapping from custom objects with caching
 */
const getSkuAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToSkuAttributeMap> => {
  if (skuAttributeMapCache !== null) {
    return skuAttributeMapCache;
  }
  
  const map = await CommercetoolsStorage.ProductMapperController.getProductTypeToSkuAttributeMap(
    apiRoot
  );
  
  // If custom object map is empty, use hard-coded fallback
  if (Object.keys(map).length !== 0) {
    skuAttributeMapCache = map;
  } else {
    skuAttributeMapCache = FALLBACK_PRODUCT_TYPE_TO_TIKTOK_SKU_ATTRIBUTE;
  }
  
  return skuAttributeMapCache;
};

/**
 * Get product type to product attribute mapping from custom objects with caching
 */
const getProductAttributeMap = async (
  apiRoot: ByProjectKeyRequestBuilder
): Promise<ProductTypeToProductAttributeMap> => {
  if (productAttributeMapCache !== null) {
    return productAttributeMapCache;
  }
  
  const map = await CommercetoolsStorage.ProductMapperController.getProductTypeToProductAttributeMap(
    apiRoot
  );
  
  // If custom object map is empty, use hard-coded fallback
  if (Object.keys(map).length !== 0) {
    productAttributeMapCache = map;
  } else {
    productAttributeMapCache = FALLBACK_PRODUCT_TYPE_TO_TIKTOK_PRODUCT_ATTRIBUTE;
  }
  
  return productAttributeMapCache;
};

/**
 * Clear mapper caches (useful for testing or when mappers are updated)
 */
export const clearMapperCaches = (): void => {
  categoryMapCache = null;
  skuAttributeMapCache = null;
  productAttributeMapCache = null;
};

export const commercetoolsProductToTiktokProduct = async (
  apiRoot: ByProjectKeyRequestBuilder,
  product: ProductProjection
): Promise<Product202309CreateProductRequestBody> => {
  const locale = await Services.getCommercetoolsLocale(apiRoot);
  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );
  if (!shopConfig) {
    throw new Error('Shop configuration not found');
  }

  const allVariants = [product.masterVariant, ...product.variants];

  const categoryId = await commercetoolsProductTypeToTiktokCategory(
    apiRoot,
    product.productType.id
  );
  
  const skus = await Promise.all(
    allVariants.map((variant) =>
      commercetoolsVariantToTiktokSKU(
        apiRoot,
        product.productType.id,
        variant,
        shopConfig,
        locale
      )
    )
  );
  
  const productAttributes = await commercetoolsProductTypeToTiktokProductAttributeList(
    apiRoot,
    product.productType.id,
    product.masterVariant.attributes,
    locale
  );

  const productDraft: Product202309CreateProductRequestBody = {
    saveMode: commercetoolsProductStateToSaveMode(product),
    externalProductId: product.id,
    title: product.name?.[locale],
    description: product.description?.[locale],
    categoryVersion: 'v2',
    categoryId,
    skus: skus.filter((sku) => sku !== undefined),
    productAttributes,
    packageWeight: commercetoolsProductTypeToTiktokProductPackageWeight(
      product.masterVariant.attributes
    ),
    packageDimensions: commercetoolsProductTypeToTiktokProductPackageDimensions(
      product.masterVariant.attributes
    ),
  };
  if (!productDraft.categoryId || !productDraft.skus?.length) {
    throw new Error(`Product draft is invalid for product ${product.id}`);
  }
  return productDraft;
};

/**
 * This function is used to check if a product is ready to be imported into TikTok.
 * No image upload is performed, only the product data is checked.
 */
export const commercetoolsProductToTiktokProductCheck = async (
  apiRoot: ByProjectKeyRequestBuilder,
  product: ProductProjection
): Promise<Product202309CreateProductRequestBody> => {
  const locale = await Services.getCommercetoolsLocale(apiRoot);
  const shopConfig =
    await CommercetoolsStorage.ShopConfigController.getShopConfiguration(
      apiRoot
    );
  if (!shopConfig) {
    throw new Error('Shop configuration not found');
  }

  const allVariants = [product.masterVariant, ...product.variants];

  const categoryId = await commercetoolsProductTypeToTiktokCategory(
    apiRoot,
    product.productType.id
  );
  const skus = await Promise.all(
    allVariants.map((variant) =>
      commercetoolsVariantToTiktokSKU(
        apiRoot,
        product.productType.id,
        variant,
        shopConfig,
        locale
      )
    )
  );
  
  const productAttributes = await commercetoolsProductTypeToTiktokProductAttributeList(
    apiRoot,
    product.productType.id,
    product.masterVariant.attributes,
    locale
  );

  const productDraft: Product202309CreateProductRequestBody = {
    saveMode: commercetoolsProductStateToSaveMode(product),
    title: product.name?.[locale],
    description: product.description?.[locale],
    categoryVersion: 'v2',
    categoryId,
    skus: skus.filter((sku) => sku !== undefined),
    productAttributes,
    packageWeight: commercetoolsProductTypeToTiktokProductPackageWeight(
      product.masterVariant.attributes
    ),
    packageDimensions: commercetoolsProductTypeToTiktokProductPackageDimensions(
      product.masterVariant.attributes
    ),
  };
  if (!productDraft.categoryId) {
    throw new Error(
      `Product draft is invalid for product ${product.id}. Category ID is required.`
    );
  }
  if (!productDraft.skus?.length) {
    throw new Error(
      `Product draft is invalid for product ${product.id}. SKUs are required.`
    );
  }
  
  return productDraft;
};

const commercetoolsProductStateToSaveMode = (
  product: ProductProjection
): string => {
  if (product.published === false) {
    return 'AS_DRAFT';
  }
  return 'LISTING';
};

const commercetoolsVariantToTiktokSKU = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productTypeId: string,
  variant: ProductVariant,
  shopConfig: ShopConfigurationData,
  locale: string
): Promise<Product202309CreateProductRequestBodySkus | undefined> => {
  const listPrice = commercetoolsVariantToListPrice(
    variant,
    shopConfig.shop_region
  );
  const price = commercetoolsVariantToPrice(variant, shopConfig);
  const inventory = commercetoolsVariantToTiktokSKUInventory(
    variant,
    shopConfig
  );
  if (inventory.length === 0 || !price) {
    return undefined;
  }
  
  const salesAttributes = await commercetoolsProductTypeToTiktokSKUAttributeList(
    apiRoot,
    productTypeId,
    variant.attributes,
    locale
  );
  
  return {
    inventory: inventory,
    externalSkuId: variant.sku,
    sellerSku: variant.sku,
    ...(listPrice && { listPrice }),
    ...(price && { price }),
    salesAttributes,
  };
};

const commercetoolsProductTypeToTiktokCategory = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productTypeId: string
): Promise<string | undefined> => {
  const categoryMap = await getCategoryMap(apiRoot);
  return categoryMap[productTypeId];
};

const commercetoolsVariantToTiktokSKUInventory = (
  variant: ProductVariant,
  shopConfig: ShopConfigurationData
): Product202309CreateProductRequestBodySkusInventory[] => {
  let quantity = undefined;
  const inventory = Object.keys(variant.availability?.channels ?? {}).find(
    (channel) => channel === shopConfig.ctSupplyChannelId
  );
  if (inventory) {
    quantity = variant.availability?.channels?.[inventory]?.availableQuantity;
  }
  if (!inventory && USE_NO_CHANNEL_FOR_INVENTORY_FALLBACK) {
    quantity = variant.availability?.availableQuantity;
  }
  if (typeof quantity === 'undefined') {
    return [];
  }
  return [
    {
      quantity,
      warehouseId: shopConfig?.tiktokWarehouseId,
    },
  ];
};

export const commercetoolsPriceToTiktokPrice = (
  price: Price
): Product202309CreateProductRequestBodySkusPrice | undefined => {
  if (!price) {
    return undefined;
  }
  const discounted = price.discounted?.value;
  return {
    amount: priceCentAmountToAmount(
      price.value.centAmount,
      price.value.fractionDigits
    ),
    currency: price.value.currencyCode,
    salePrice: discounted
      ? priceCentAmountToAmount(
          discounted.centAmount,
          discounted.fractionDigits
        )
      : priceCentAmountToAmount(
          price.value.centAmount,
          price.value.fractionDigits
        ),
  };
};

export const commercetoolsVariantToPrice = (
  variant: ProductVariant,
  shopConfig: ShopConfigurationData
): Product202309CreateProductRequestBodySkusPrice | undefined => {
  if (!shopConfig || !shopConfig.shop_region) {
    return undefined;
  }
  let price = variant.prices?.find(
    (price) =>
      typeof price.channel !== 'undefined' &&
      price.country?.toLowerCase() === shopConfig.shop_region?.toLowerCase() &&
      price.channel?.id === shopConfig.ctDistributionChannelId
  );
  if (price) {
    return commercetoolsPriceToTiktokPrice(price);
  } else if (USE_NO_CHANNEL_FOR_MAIN_PRICE) {
    price = variant.prices?.find(
      (price) =>
        typeof price.channel === 'undefined' &&
        price.country?.toLowerCase() === shopConfig.shop_region?.toLowerCase()
    );

    if (price) {
      return commercetoolsPriceToTiktokPrice(price);
    }
  }
  return undefined;
};

export const commercetoolsVariantToListPrice = (
  variant: ProductVariant,
  shopRegion?: string
): Product202309CreateProductRequestBodySkusListPrice | undefined => {
  if (!shopRegion) {
    return undefined;
  }
  if (USE_NO_CHANNEL_FOR_LIST_PRICE) {
    const noChannelPrice = variant.prices?.find(
      (price) =>
        typeof price.channel === 'undefined' &&
        price.country?.toLowerCase() === shopRegion.toLowerCase()
    );
    if (noChannelPrice) {
      return {
        amount: priceCentAmountToAmount(
          noChannelPrice.value.centAmount,
          noChannelPrice.value.fractionDigits
        ),
        currency: noChannelPrice.value.currencyCode,
      };
    }
  }
  return undefined;
};

const commercetoolsProductTypeToTiktokSKUAttributeList = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productTypeId: string,
  attributes: Attribute[] | undefined,
  locale: string
): Promise<Product202309CreateProductRequestBodySkusSalesAttributes[]> => {
  if (!attributes) return [];
  
  const skuAttributeMap = await getSkuAttributeMap(apiRoot);
  const skuAttributes =
    skuAttributeMap[productTypeId]?.map((attributeMap) => {
      if (attributeMap.valueNameFetcher) {
        return {
          id: attributeMap.tiktokAttributeId,
          valueName: attributeMap.valueNameFetcher(attributes, locale),
        };
      }
      if (attributeMap.valueIdFetcher) {
        return {
          id: attributeMap.tiktokAttributeId,
          valueId: attributeMap.valueIdFetcher(attributes, locale),
        };
      }
      return {} as Product202309CreateProductRequestBodySkusSalesAttributes;
    }) ?? [];
  return skuAttributes.filter(
    (attribute) =>
      (typeof attribute.valueName !== 'undefined' &&
        attribute.valueName !== '') ||
      (typeof attribute.valueId !== 'undefined' && attribute.valueId !== '')
  );
};

const commercetoolsProductTypeToTiktokProductAttributeList = async (
  apiRoot: ByProjectKeyRequestBuilder,
  productTypeId: string,
  attributes: Attribute[] | undefined,
  locale: string
): Promise<Product202309CreateProductRequestBodyProductAttributes[]> => {
  if (!attributes) return [];
  
  const productAttributeMap = await getProductAttributeMap(apiRoot);
  const productAttributes =
    productAttributeMap[productTypeId]?.map(
      (attributeMap) => {
        if (attributeMap.valueNamesFetcher) {
          return {
            id: attributeMap.tiktokAttributeId,
            values: attributeMap.valueNamesFetcher(attributes, locale),
          };
        }
        if (attributeMap.valueIdsFetcher) {
          return {
            id: attributeMap.tiktokAttributeId,
            values: attributeMap.valueIdsFetcher(attributes, locale) ?? [],
          };
        }
        return {} as Product202309CreateProductRequestBodyProductAttributes;
      }
    ) ?? [];

  const filteredProductAttributes = productAttributes.filter(
    (attribute) =>
      typeof attribute.values !== 'undefined' && attribute.values.length !== 0
  );
  return filteredProductAttributes;
};

const commercetoolsProductTypeToTiktokProductPackageWeight = (
  attributes: Attribute[] | undefined
): Product202309CreateProductRequestBodyPackageWeight => {
  if (!attributes)
    return {
      value: FALLBACK_PACKAGE_WEIGHT_VALUE,
      unit: FALLBACK_PACKAGE_WEIGHT_UNIT,
    };
  const packageWeightUnit = attributes.find(
    (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_WEIGHT_UNIT
  )?.value?.key;
  let toFixedValue = 2;
  if (!packageWeightUnit) {
    return {
      value: FALLBACK_PACKAGE_WEIGHT_VALUE,
      unit: FALLBACK_PACKAGE_WEIGHT_UNIT,
    };
  }
  if (packageWeightUnit === 'KILOGRAM') {
    toFixedValue = 3;
  } else if (packageWeightUnit === 'GRAM') {
    toFixedValue = 0;
  }
  const packageWeightValue = Number(
    attributes.find(
      (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_WEIGHT_VALUE
    )?.value
  ).toFixed(toFixedValue);
  return {
    value: packageWeightValue,
    unit: packageWeightUnit,
  };
};

const commercetoolsProductTypeToTiktokProductPackageDimensions = (
  attributes: Attribute[] | undefined
): Product202309CreateProductRequestBodyPackageDimensions => {
  if (!attributes)
    return {
      height: FALLBACK_PACKAGE_DIMENSIONS_HEIGHT,
      length: FALLBACK_PACKAGE_DIMENSIONS_LENGTH,
      unit: FALLBACK_PACKAGE_DIMENSIONS_UNIT,
      width: FALLBACK_PACKAGE_DIMENSIONS_WIDTH,
    };
  const packageDimensionsHeight = attributes.find(
    (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_HEIGHT
  )?.value;
  const packageDimensionsLength = attributes.find(
    (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_LENGTH
  )?.value;
  const packageDimensionsWidth = attributes.find(
    (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_WIDTH
  )?.value;
  const packageDimensionsUnit = attributes.find(
    (attribute) => attribute.name === ATTRIBUTE_KEY_PACKAGE_DIMENSIONS_UNIT
  )?.value?.key;
  return {
    height: packageDimensionsHeight,
    length: packageDimensionsLength,
    unit: packageDimensionsUnit,
    width: packageDimensionsWidth,
  };
};

const priceCentAmountToAmount = (
  price: number,
  fractionDigits: number
): string => {
  if (typeof price !== 'number' || price === 0) {
    return '0';
  }
  return (price / Math.pow(10, fractionDigits)).toFixed(fractionDigits);
};

export const tiktokProductToTiktokProductEdit = (
  product: Product202309GetProductResponseData
): Product202309EditProductRequestBody => {
  const categoryId = product.categoryChains?.find((cat) => cat.isLeaf)?.id;

  const editProductData: Product202309EditProductRequestBody = {
    title: product.title,
    description: product.description,
    categoryId: categoryId,
    categoryVersion: 'v2',
    mainImages: product.mainImages?.map((image) => ({
      uri: image.uri,
    })),
    packageWeight: product.packageWeight,
    skus: product.skus?.map((sku) => ({
      id: sku.id,
      price: sku.price,
      listPrice: sku.listPrice,
    })),
  };
  return editProductData;
};

export const mergeTiktokProductAndCommercetoolsProductToTiktokProductEdit =
  async (
    apiRoot: ByProjectKeyRequestBuilder,
    currentProduct: Product202309GetProductResponseData,
    commercetoolsProduct?: ProductProjection
  ): Promise<Product202309EditProductRequestBody> => {
    if (!commercetoolsProduct) {
      throw new Error('Commercetools product is required');
    }
    const mappedProductData = await commercetoolsProductToTiktokProduct(
      apiRoot,
      commercetoolsProduct
    );

    const editProductData: Product202309EditProductRequestBody = {
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
    return editProductData;
  };
