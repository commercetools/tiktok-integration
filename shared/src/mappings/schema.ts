import { z } from 'zod';

export const MAPPING_CONFIG_VERSION = 1;

export const TRANSFORMS = [
  'identity',
  'lowercase',
  'uppercase',
  'number',
  'boolean',
  'enumKeyToLabel',
  'localizedPick',
] as const;

export const transformSchema = z.enum(TRANSFORMS);

/** A TikTok attribute value: a predefined value id, a free-text name, or both. */
export const valueRefSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine((value) => value.id !== undefined || value.name !== undefined, {
    message: 'A value needs an id or a name',
  });

/**
 * Maps one commercetools attribute (or a constant) onto one TikTok attribute.
 *
 * - `ctAttribute`: name of the commercetools product/variant attribute to read.
 * - `constantValues`: fixed TikTok values used instead of a commercetools attribute.
 * - `transform`: how the raw commercetools value becomes text (default `identity`).
 * - `valueMap`: translates the transformed text into TikTok values. Text without
 *   an entry is sent to TikTok as a free-text name.
 */
export const attributeMappingSchema = z
  .object({
    name: z.string().optional(),
    ctAttribute: z.string().min(1).optional(),
    tiktokAttributeId: z.string().min(1),
    transform: transformSchema.optional(),
    valueMap: z.record(z.string(), valueRefSchema).optional(),
    constantValues: z.array(valueRefSchema).min(1).optional(),
  })
  .refine(
    (mapping) =>
      (mapping.ctAttribute !== undefined) !==
      (mapping.constantValues !== undefined),
    { message: 'Provide exactly one of ctAttribute or constantValues' },
  );

export const productTypeMappingSchema = z.object({
  categoryId: z.string().min(1),
  productAttributes: z.array(attributeMappingSchema).default([]),
  skuAttributes: z.array(attributeMappingSchema).default([]),
});

export const mappingConfigSchema = z.object({
  version: z.literal(MAPPING_CONFIG_VERSION).default(MAPPING_CONFIG_VERSION),
  /** Keyed by commercetools product type id. */
  productTypes: z.record(z.string(), productTypeMappingSchema),
});

export type Transform = z.infer<typeof transformSchema>;
export type ValueRef = z.infer<typeof valueRefSchema>;
export type AttributeMapping = z.infer<typeof attributeMappingSchema>;
export type ProductTypeMapping = z.infer<typeof productTypeMappingSchema>;
export type MappingConfig = z.infer<typeof mappingConfigSchema>;

export const emptyMappingConfig = (): MappingConfig => ({
  version: MAPPING_CONFIG_VERSION,
  productTypes: {},
});
