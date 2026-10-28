import { readState } from 'tiktok-shared/dist/src/state';
import { getTikTokClient, type TikTokClient } from 'tiktok-shared/dist/src/tiktok/client';
import { TtlCache } from 'tiktok-shared/dist/src/utils/ttl-cache';
import { HttpError } from '../errors/http-error';

const CACHE_TTL_MS = 10 * 60_000;
const CATEGORY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface TikTokCategory {
  id: string;
  localName?: string;
  isLeaf?: boolean;
  parentId?: string;
}

export interface TikTokAttribute {
  id: string;
  name?: string;
  type?: string;
  isRequired?: boolean;
  isCustomizable?: boolean;
  isMultipleSelection?: boolean;
  values: { id?: string; name?: string }[];
}

export interface CategoryQuery {
  locale?: string;
  keyword?: string;
  listingPlatform?: string;
  includeProhibitedCategories?: boolean;
}

const cache = new TtlCache<unknown>(CACHE_TTL_MS);

/** Category trees are large and change rarely; the cache is keyed by shop so a new shop starts clean. */
const cached = async <T>(parts: unknown[], load: () => Promise<T>): Promise<T> => {
  const shopId = (await readState())?.tiktokShopId ?? '';
  return (await cache.getOrLoad(JSON.stringify([shopId, ...parts]), load)) as T;
};

export const assertCategoryId = (value: unknown): string => {
  if (typeof value !== 'string' || !CATEGORY_ID_PATTERN.test(value)) {
    throw new HttpError(400, 'A valid category id is required');
  }
  return value;
};

export const listCategories = (query: CategoryQuery): Promise<{ categories: TikTokCategory[] }> =>
  cached(['categories', query], async () => {
    const categories = await (await getTikTokClient()).categories.list(query);
    return {
      categories: categories.flatMap(({ id, localName, isLeaf, parentId }) =>
        id
          ? [
              {
                id,
                ...(localName !== undefined ? { localName } : {}),
                ...(isLeaf !== undefined ? { isLeaf } : {}),
                ...(parentId ? { parentId } : {}),
              },
            ]
          : [],
      ),
    };
  });

export const getCategoryRules = (categoryId: string): Promise<{ rules: unknown }> =>
  cached(['rules', categoryId], async () => {
    const locale = (await readState())?.tiktokLocale;
    return { rules: await (await getTikTokClient()).categories.rules(categoryId, { locale }) };
  });

/** `{ [key]: value }` unless the value is undefined (false and 0 are kept), for spreading into an object. */
const defined = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  value !== undefined ? ({ [key]: value } as { [P in K]?: V }) : {};

/** Present, non-empty text only. */
const nonEmpty = <K extends string>(key: K, value: string | undefined): { [P in K]?: string } =>
  value ? ({ [key]: value } as { [P in K]?: string }) : {};

type SdkAttribute = NonNullable<
  Awaited<ReturnType<TikTokClient['categories']['attributes']>>['attributes']
>[number];

const toAttribute = (attribute: SdkAttribute & { id: string }): TikTokAttribute => ({
  id: attribute.id,
  ...defined('name', attribute.name),
  ...defined('type', attribute.type),
  // The SDK spells this field "isRequried".
  ...defined('isRequired', attribute.isRequried),
  ...defined('isCustomizable', attribute.isCustomizable),
  ...defined('isMultipleSelection', attribute.isMultipleSelection),
  values: (attribute.values ?? []).map(({ id, name }) => ({
    ...nonEmpty('id', id),
    ...nonEmpty('name', name),
  })),
});

export const getCategoryAttributes = (categoryId: string): Promise<{ attributes: TikTokAttribute[] }> =>
  cached(['attributes', categoryId], async () => {
    const locale = (await readState())?.tiktokLocale;
    const data = await (await getTikTokClient()).categories.attributes(categoryId, { locale });
    return {
      attributes: (data.attributes ?? []).flatMap((attribute) =>
        attribute.id ? [toAttribute({ ...attribute, id: attribute.id })] : [],
      ),
    };
  });
