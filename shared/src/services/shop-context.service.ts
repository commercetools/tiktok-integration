import type {
  ByProjectKeyRequestBuilder,
  Channel,
} from '@commercetools/platform-sdk';
import { z } from 'zod';
import {
  CHANNEL_PREDICATE_TIKTOK_PRICE,
  CHANNEL_PREDICATE_TIKTOK_WAREHOUSE,
} from '../constants';
import type { ShopContext } from '../interfaces';
import { readState } from '../state';
import { TtlCache } from '../utils/ttl-cache';
import { normalizeLocale } from './localization.service';

const CACHE_TTL_MS = 60_000;
const CACHE_KEY = 'shopContext';

const warehousesSchema = z.array(
  z.object({ id: z.string(), entityId: z.string().optional() }),
);

const cache = new TtlCache<ShopContext>(CACHE_TTL_MS);

const parseWarehouses = (raw: unknown) => {
  if (raw === undefined || raw === null || raw === '') return [];
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return warehousesSchema.parse(json);
};

const findChannels = async (
  apiRoot: ByProjectKeyRequestBuilder,
  where: string,
): Promise<Channel[]> => {
  const { body } = await apiRoot
    .channels()
    .get({ queryArgs: { where } })
    .execute();
  return body.results;
};

const loadShopContext = async (
  apiRoot: ByProjectKeyRequestBuilder,
): Promise<ShopContext> => {
  const state = await readState();
  if (!state?.tiktokLocale) {
    throw new Error('Shop configuration not found');
  }

  const warehouseChannels = await findChannels(
    apiRoot,
    CHANNEL_PREDICATE_TIKTOK_WAREHOUSE,
  );
  if (warehouseChannels.length === 0) {
    throw new Error('No warehouse channel found');
  }
  if (warehouseChannels.length > 1) {
    throw new Error('Multiple warehouse channels found');
  }
  const [supplyChannel] = warehouseChannels;
  const channelWarehouseId = supplyChannel.custom?.fields.warehouseId;
  if (!channelWarehouseId) {
    throw new Error('No warehouse ID found in warehouse channel');
  }

  const warehouses = parseWarehouses(state.tiktokWarehouses);
  const warehouse = warehouses.find(({ id }) => id === channelWarehouseId);
  if (!warehouse) {
    throw new Error('No TikTok warehouse matches the warehouse channel');
  }

  const [priceChannel] = await findChannels(
    apiRoot,
    CHANNEL_PREDICATE_TIKTOK_PRICE,
  );

  return {
    locale: normalizeLocale(state.tiktokLocale),
    shopRegion: state.tiktokRegion,
    ctSupplyChannelId: supplyChannel.id,
    ctDistributionChannelId: priceChannel?.id,
    tiktokWarehouseId: warehouse.id,
    tiktokWarehouseEntityId: warehouse.entityId,
  };
};

export const getShopContext = (
  apiRoot: ByProjectKeyRequestBuilder,
): Promise<ShopContext> =>
  cache.getOrLoad(CACHE_KEY, () => loadShopContext(apiRoot));

export const clearShopContextCache = (): void => cache.clear();
