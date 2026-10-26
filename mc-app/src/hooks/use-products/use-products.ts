/// <reference path="../../../@types-extensions/graphql-ctp/index.d.ts" />

import { useMcLazyQuery } from '@commercetools-frontend/application-shell';
import { GRAPHQL_TARGETS } from '@commercetools-frontend/constants';
import FetchProductsByIdsQuery from './fetch-products-by-ids.ctp.graphql';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';

type TImage = {
  url: string;
};

type TVariantPrice = {
  country?: string | null;
  channelRef?: { id: string } | null;
  value: { centAmount: number; currencyCode: string; fractionDigits: number };
};

type TVariant = {
  sku?: string | null;
  images?: TImage[];
  prices?: TVariantPrice[] | null;
  availability?: {
    channels: {
      results: {
        channelRef: { id: string };
        availability: { availableQuantity?: number | null };
      }[];
    };
  } | null;
};

type TProduct = {
  id: string;
  productTypeRef: { id: string };
  masterData: {
    current: {
      name?: string | null;
      masterVariant: TVariant;
      variants: TVariant[];
    };
  };
};

type TFetchProductsByIdsQuery = {
  products: {
    results: TProduct[];
  };
};

type TFetchProductsByIdsQueryVariables = {
  where: string;
  locale: string;
  channelIds: string[];
  limit: number;
};

/** A variant's channel prices and the stock it has on the requested channels. */
export type TVariantOffer = {
  prices: {
    channelId?: string;
    country?: string;
    centAmount: number;
    currencyCode: string;
    fractionDigits: number;
  }[];
  /** Available quantity per channel id; a channel is missing when the variant has no inventory entry there. */
  stock: Record<string, number>;
};

export type TEnrichedProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string;
  productTypeId: string;
  /** The master variant first, then the others. */
  variants: TVariantOffer[];
};

/** Ids per request: keeps the `where` predicate short and within one page of results. */
const CHUNK_SIZE = 100;

const toOffer = (variant: TVariant, channelIds: string[]): TVariantOffer => ({
  prices: (variant.prices ?? []).map((price) => ({
    channelId: price.channelRef?.id,
    country: price.country ?? undefined,
    ...price.value,
  })),
  stock: Object.fromEntries(
    (variant.availability?.channels.results ?? [])
      .filter(
        ({ channelRef, availability }) =>
          channelIds.includes(channelRef.id) &&
          typeof availability.availableQuantity === 'number'
      )
      .map(({ channelRef, availability }) => [
        channelRef.id,
        availability.availableQuantity as number,
      ])
  ),
});

type TUseProductsByIds = () => {
  /** `channelIds` are the channels whose stock is read. */
  getProductsByIds: (
    ids: string[],
    channelIds?: string[]
  ) => Promise<TEnrichedProduct[]>;
  loading: boolean;
};

export const useProductsByIds: TUseProductsByIds = () => {
  const { dataLocale } = useApplicationContext((context) => ({
    dataLocale: context.dataLocale,
  }));
  const [fetchProducts, { loading }] = useMcLazyQuery<
    TFetchProductsByIdsQuery,
    TFetchProductsByIdsQueryVariables
  >(FetchProductsByIdsQuery);

  const getProductsByIds = async (
    ids: string[],
    channelIds: string[] = []
  ): Promise<TEnrichedProduct[]> => {
    const enriched: TEnrichedProduct[] = [];
    for (let start = 0; start < ids.length; start += CHUNK_SIZE) {
      const chunk = ids.slice(start, start + CHUNK_SIZE);
      const result = await fetchProducts({
        variables: {
          where: `id in (${chunk.map((id) => `"${id}"`).join(',')})`,
          locale: dataLocale,
          channelIds,
          limit: CHUNK_SIZE,
        },
        context: {
          target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM,
        },
        fetchPolicy: 'network-only',
      });
      for (const product of result.data?.products?.results ?? []) {
        const { masterVariant, variants } = product.masterData.current;
        enriched.push({
          id: product.id,
          name: product.masterData.current.name || 'Unnamed Product',
          sku: masterVariant.sku || 'No SKU',
          imageUrl: masterVariant.images?.[0]?.url,
          productTypeId: product.productTypeRef.id,
          variants: [masterVariant, ...variants].map((variant) =>
            toOffer(variant, channelIds)
          ),
        });
      }
    }
    return enriched;
  };

  return {
    getProductsByIds,
    loading,
  };
};
