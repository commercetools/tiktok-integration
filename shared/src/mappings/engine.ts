import type { Attribute } from '@commercetools/platform-sdk';
import type {
  AttributeMapping,
  MappingConfig,
  ProductTypeMapping,
  Transform,
  ValueRef,
} from './schema';

export interface ResolvedSkuAttribute {
  id: string;
  valueId?: string;
  valueName?: string;
}

export interface ResolvedProductAttribute {
  id: string;
  values: { id?: string; name?: string }[];
}

const TRUE_LITERALS = new Set(['true', 'yes', 'y', '1']);
const FALSE_LITERALS = new Set(['false', 'no', 'n', '0']);

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLocalizedString = (value: unknown): value is Record<string, string> =>
  isPlainObject(value) &&
  Object.keys(value).length > 0 &&
  Object.values(value).every((entry) => typeof entry === 'string');

const isEnumValue = (
  value: unknown,
): value is { key: string; label: unknown } =>
  isPlainObject(value) && typeof value.key === 'string' && 'label' in value;

/**
 * Picks the text for `locale`: exact match, case-insensitive match, then any
 * entry that shares the language (`en` matches `en-US` and vice versa).
 */
export const pickLocalized = (
  localized: Record<string, string>,
  locale: string,
): string | undefined => {
  if (localized[locale] !== undefined) return localized[locale];
  const wanted = locale.toLowerCase();
  const keys = Object.keys(localized);
  const exact = keys.find((key) => key.toLowerCase() === wanted);
  if (exact) return localized[exact];
  const language = wanted.split('-')[0];
  const sameLanguage = keys.find(
    (key) => key.toLowerCase().split('-')[0] === language,
  );
  return sameLanguage ? localized[sameLanguage] : undefined;
};

const flatten = (value: unknown): unknown[] =>
  Array.isArray(value) ? value.flatMap(flatten) : [value];

const scalarToText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const labelToText = (label: unknown, locale: string): string | undefined => {
  if (isLocalizedString(label)) return pickLocalized(label, locale);
  return scalarToText(label);
};

/** Text of a single (non-array) commercetools attribute value, per transform. */
const valueToText = (
  value: unknown,
  transform: Transform,
  locale: string,
): string | undefined => {
  if (transform === 'enumKeyToLabel' || transform === 'localizedPick') {
    if (isEnumValue(value)) return labelToText(value.label, locale);
    if (isLocalizedString(value)) return pickLocalized(value, locale);
    return scalarToText(value);
  }
  if (isEnumValue(value)) return value.key;
  if (isLocalizedString(value)) return pickLocalized(value, locale);
  return scalarToText(value);
};

/**
 * Applies a transform to a raw commercetools attribute value. Set-valued
 * attributes yield one entry per element. Empty results are dropped.
 */
export const applyTransform = (
  transform: Transform | undefined,
  raw: unknown,
  locale: string,
): string[] => {
  const effective = transform ?? 'identity';
  const texts: string[] = [];
  for (const value of flatten(raw)) {
    const text = valueToText(value, effective, locale);
    if (text === undefined) continue;
    const result = finishTransform(effective, text);
    if (result !== undefined && result !== '') texts.push(result);
  }
  return texts;
};

const finishTransform = (
  transform: Transform,
  text: string,
): string | undefined => {
  switch (transform) {
    case 'lowercase':
      return text.toLowerCase();
    case 'uppercase':
      return text.toUpperCase();
    case 'number': {
      const parsed = Number(text);
      return text.trim() !== '' && Number.isFinite(parsed)
        ? String(parsed)
        : undefined;
    }
    case 'boolean': {
      const normalized = text.trim().toLowerCase();
      if (TRUE_LITERALS.has(normalized)) return 'true';
      if (FALSE_LITERALS.has(normalized)) return 'false';
      return undefined;
    }
    default:
      return text;
  }
};

const findAttributeValue = (
  attributes: Attribute[] | undefined,
  name: string,
): unknown => attributes?.find((attribute) => attribute.name === name)?.value;

/** Resolves the TikTok values a mapping produces for the given attributes. */
export const resolveValues = (
  mapping: AttributeMapping,
  attributes: Attribute[] | undefined,
  locale: string,
): ValueRef[] => {
  if (mapping.constantValues) return mapping.constantValues;
  if (!mapping.ctAttribute) return [];
  const raw = findAttributeValue(attributes, mapping.ctAttribute);
  if (raw === undefined || raw === null) return [];
  return applyTransform(mapping.transform, raw, locale).map(
    (text) => mapping.valueMap?.[text] ?? { name: text },
  );
};

/** SKU (sales) attribute: carries a single value. */
export const resolveSkuAttribute = (
  mapping: AttributeMapping,
  attributes: Attribute[] | undefined,
  locale: string,
): ResolvedSkuAttribute | undefined => {
  const [value] = resolveValues(mapping, attributes, locale);
  if (!value) return undefined;
  return {
    id: mapping.tiktokAttributeId,
    ...(value.id !== undefined && { valueId: value.id }),
    ...(value.name !== undefined && { valueName: value.name }),
  };
};

/** Product attribute: carries zero or more values; empty ones are omitted. */
export const resolveProductAttribute = (
  mapping: AttributeMapping,
  attributes: Attribute[] | undefined,
  locale: string,
): ResolvedProductAttribute | undefined => {
  const values = resolveValues(mapping, attributes, locale).map((value) => ({
    ...(value.id !== undefined && { id: value.id }),
    ...(value.name !== undefined && { name: value.name }),
  }));
  if (values.length === 0) return undefined;
  return { id: mapping.tiktokAttributeId, values };
};

const definedOnly = <T>(items: (T | undefined)[]): T[] =>
  items.filter((item): item is T => item !== undefined);

export const resolveSkuAttributes = (
  mappings: AttributeMapping[],
  attributes: Attribute[] | undefined,
  locale: string,
): ResolvedSkuAttribute[] =>
  definedOnly(
    mappings.map((mapping) => resolveSkuAttribute(mapping, attributes, locale)),
  );

export const resolveProductAttributes = (
  mappings: AttributeMapping[],
  attributes: Attribute[] | undefined,
  locale: string,
): ResolvedProductAttribute[] =>
  definedOnly(
    mappings.map((mapping) =>
      resolveProductAttribute(mapping, attributes, locale),
    ),
  );

export const getProductTypeMapping = (
  config: MappingConfig,
  productTypeId: string,
): ProductTypeMapping | undefined => config.productTypes[productTypeId];
