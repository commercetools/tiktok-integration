import {
  Accordion,
  Button,
  Stack,
  Text,
  TextInput,
} from '@commercetools/nimbus';
import { Add, DeleteOutline } from '@commercetools/nimbus-icons';
import type {
  AttributeMapping,
  AttributeTransform,
  TikTokAttribute,
} from '../../hooks/use-tiktok-service';
import ConstantValuesEditor from './constant-values-editor';
import Field from '../ui/field';
import OptionSelect from '../ui/option-select';
import ValueMapEditor from './value-map-editor';

const TRANSFORMS: { value: AttributeTransform; label: string }[] = [
  { value: 'identity', label: 'As is' },
  { value: 'lowercase', label: 'Lower case' },
  { value: 'uppercase', label: 'Upper case' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'enumKeyToLabel', label: 'Enum key to label' },
  { value: 'localizedPick', label: 'Pick the localized text' },
];

const SOURCES = [
  { value: 'attribute', label: 'A commercetools attribute' },
  { value: 'constant', label: 'A constant value' },
];

type Props = {
  kind: 'SKU' | 'product';
  mappings: AttributeMapping[];
  /** Attribute names defined on the commercetools product type. */
  ctAttributes: string[];
  tiktokAttributes: TikTokAttribute[];
  onChange: (mappings: AttributeMapping[]) => void;
};

const AttributeMappingList = ({
  kind,
  mappings,
  ctAttributes,
  tiktokAttributes,
  onChange,
}: Props) => {
  const replace = (index: number, mapping: AttributeMapping) =>
    onChange(mappings.map((m, i) => (i === index ? mapping : m)));

  return (
    <Stack direction="column" gap="300">
      <Stack
        direction="row"
        gap="200"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontWeight="600">{kind} attribute mappers</Text>
        <Button
          variant="outline"
          colorPalette="primary"
          onPress={() =>
            onChange([...mappings, { ctAttribute: '', tiktokAttributeId: '' }])
          }
        >
          <Add />
          Add {kind} mapper
        </Button>
      </Stack>
      {mappings.length === 0 && (
        <Text color="neutral.11">No {kind} attribute mappers configured.</Text>
      )}
      <Accordion.Root allowsMultipleExpanded>
        {mappings.map((mapping, index) => {
          const tiktokAttribute = tiktokAttributes.find(
            (attribute) => attribute.id === mapping.tiktokAttributeId
          );
          return (
            <Accordion.Item key={index} value={String(index)}>
              <Accordion.Header>
                {mapping.name ||
                  mapping.ctAttribute ||
                  (mapping.constantValues
                    ? 'Constant value'
                    : 'Unmapped attribute')}{' '}
                to{' '}
                {tiktokAttribute?.name ??
                  (mapping.tiktokAttributeId || 'no TikTok attribute')}
              </Accordion.Header>
              <Accordion.Content>
                <Stack direction="column" gap="300" padding="200">
                  <Field
                    label="Name"
                    description="Optional label, for display only."
                  >
                    <TextInput
                      name={`name-${index}`}
                      aria-label="Name"
                      value={mapping.name ?? ''}
                      onChange={(name) => {
                        const { name: _previous, ...rest } = mapping;
                        replace(index, name ? { ...rest, name } : rest);
                      }}
                    />
                  </Field>
                  <Field label="Value comes from">
                    <OptionSelect
                      name={`source-${index}`}
                      value={mapping.constantValues ? 'constant' : 'attribute'}
                      options={SOURCES}
                      onChange={(source) => {
                        const {
                          ctAttribute: _a,
                          constantValues: _c,
                          transform: _t,
                          valueMap: _v,
                          ...rest
                        } = mapping;
                        replace(
                          index,
                          source === 'constant'
                            ? { ...rest, constantValues: [] }
                            : { ...rest, ctAttribute: '' }
                        );
                      }}
                    />
                  </Field>
                  <Field label="TikTok attribute" isRequired>
                    <OptionSelect
                      name={`tiktok-attribute-${index}`}
                      value={mapping.tiktokAttributeId}
                      options={tiktokAttributes.map((attribute) => ({
                        value: attribute.id,
                        label: `${attribute.name ?? attribute.id} (${
                          attribute.id
                        })${attribute.type ? ` - ${attribute.type}` : ''}`,
                      }))}
                      placeholder="Select an attribute"
                      onChange={(tiktokAttributeId) =>
                        replace(index, { ...mapping, tiktokAttributeId })
                      }
                    />
                  </Field>
                  {mapping.constantValues ? (
                    <ConstantValuesEditor
                      values={mapping.constantValues}
                      tiktokValues={tiktokAttribute?.values ?? []}
                      onChange={(constantValues) =>
                        replace(index, { ...mapping, constantValues })
                      }
                    />
                  ) : (
                    <>
                      <Field label="commercetools attribute" isRequired>
                        <OptionSelect
                          name={`ct-attribute-${index}`}
                          value={mapping.ctAttribute ?? ''}
                          options={ctAttributes.map((name) => ({
                            value: name,
                            label: name,
                          }))}
                          placeholder="Select an attribute"
                          onChange={(ctAttribute) =>
                            replace(index, { ...mapping, ctAttribute })
                          }
                        />
                      </Field>
                      <Field
                        label="Transform"
                        description="Applied to the commercetools value before it is sent."
                      >
                        <OptionSelect
                          name={`transform-${index}`}
                          value={mapping.transform ?? 'identity'}
                          options={TRANSFORMS}
                          onChange={(transform) => {
                            const { transform: _previous, ...rest } = mapping;
                            replace(
                              index,
                              transform === 'identity'
                                ? rest
                                : {
                                    ...rest,
                                    transform: transform as AttributeTransform,
                                  }
                            );
                          }}
                        />
                      </Field>
                      <ValueMapEditor
                        value={mapping.valueMap}
                        tiktokValues={tiktokAttribute?.values ?? []}
                        onChange={(valueMap) => {
                          const { valueMap: _previous, ...rest } = mapping;
                          replace(
                            index,
                            valueMap ? { ...rest, valueMap } : rest
                          );
                        }}
                      />
                    </>
                  )}
                  <div>
                    <Button
                      variant="outline"
                      colorPalette="critical"
                      onPress={() =>
                        onChange(mappings.filter((_, i) => i !== index))
                      }
                    >
                      <DeleteOutline />
                      Delete mapper
                    </Button>
                  </div>
                </Stack>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </Stack>
  );
};

AttributeMappingList.displayName = 'AttributeMappingList';

export default AttributeMappingList;
