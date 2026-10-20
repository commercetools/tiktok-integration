import { useState } from 'react';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import TextField from '@commercetools-uikit/text-field';
import SelectField from '@commercetools-uikit/select-field';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import Card from '@commercetools-uikit/card';
import Constraints from '@commercetools-uikit/constraints';
import CollapsiblePanel from '@commercetools-uikit/collapsible-panel';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import {
  StoredTikTokSkuAttributeMapper,
  StoredTikTokProductAttributeMapper,
  encodeToBase64,
  decodeFromBase64,
} from '../../../hooks/use-product-mappers';
import type { TikTokAttribute } from '../../../hooks/use-tiktok-attributes';

type AttributeRowEditorProps = {
  mapper: StoredTikTokSkuAttributeMapper | StoredTikTokProductAttributeMapper;
  mapperType: 'sku' | 'product';
  attributes: TikTokAttribute[];
  productTypeId: string;
  mapperIndex: number;
  allMappers: any[];
  onUpdate: (updatedMappers: any[]) => void;
};

const AttributeRowEditor = ({
  mapper,
  mapperType,
  attributes,
  mapperIndex,
  allMappers,
  onUpdate,
}: AttributeRowEditorProps) => {
  const showNotification = useShowNotification();

  const [name, setName] = useState(mapper.name);
  const [tiktokAttributeId, setTiktokAttributeId] = useState(
    mapper.tiktokAttributeId
  );
  const [valueNameFetcher, setValueNameFetcher] = useState(
    'valueNameFetcher' in mapper && mapper.valueNameFetcher
      ? decodeFromBase64(mapper.valueNameFetcher)
      : ''
  );
  const [valueIdFetcher, setValueIdFetcher] = useState(
    'valueIdFetcher' in mapper && mapper.valueIdFetcher
      ? decodeFromBase64(mapper.valueIdFetcher)
      : ''
  );
  const [valueNamesFetcher, setValueNamesFetcher] = useState(
    'valueNamesFetcher' in mapper && mapper.valueNamesFetcher
      ? decodeFromBase64(mapper.valueNamesFetcher)
      : ''
  );
  const [valueIdsFetcher, setValueIdsFetcher] = useState(
    'valueIdsFetcher' in mapper && mapper.valueIdsFetcher
      ? decodeFromBase64(mapper.valueIdsFetcher)
      : ''
  );

  const handleSave = () => {
    if (!name || !tiktokAttributeId) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: 'Name and TikTok Attribute ID are required',
      });
      return;
    }

    const updatedMapper: any = {
      name,
      tiktokAttributeId,
    };

    if (mapperType === 'sku') {
      if (valueNameFetcher) {
        updatedMapper.valueNameFetcher = encodeToBase64(valueNameFetcher);
      }
      if (valueIdFetcher) {
        updatedMapper.valueIdFetcher = encodeToBase64(valueIdFetcher);
      }
    } else {
      if (valueNamesFetcher) {
        updatedMapper.valueNamesFetcher = encodeToBase64(valueNamesFetcher);
      }
      if (valueIdsFetcher) {
        updatedMapper.valueIdsFetcher = encodeToBase64(valueIdsFetcher);
      }
    }

    const updatedMappers = [...allMappers];
    updatedMappers[mapperIndex] = updatedMapper;
    onUpdate(updatedMappers);

    showNotification({
      kind: 'success',
      domain: DOMAINS.SIDE,
      text: 'Mapper saved successfully',
    });
  };

  const handleDelete = () => {
    const updatedMappers = allMappers.filter((_, idx) => idx !== mapperIndex);
    onUpdate(updatedMappers);

    showNotification({
      kind: 'success',
      domain: DOMAINS.SIDE,
      text: 'Mapper deleted successfully',
    });
  };

  const attributeOptions = attributes.map((attr) => ({
    value: attr.id || '',
    label: `${attr.name} (${attr.id}) - ${attr.type}`,
  }));

  const selectedAttribute = attributes.find(
    (attr) => attr.id === tiktokAttributeId
  );

  return (
    <Card type="raised">
      <CollapsiblePanel
        header={
          <Text.Body isBold>
            {name || 'Unnamed Mapper'} - {tiktokAttributeId || 'No Attribute'}
          </Text.Body>
        }
      >
        <Spacings.Stack scale="m">
          <Constraints.Horizontal max={13}>
            <TextField
              title="Mapper Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              horizontalConstraint={13}
            />
          </Constraints.Horizontal>

          <Constraints.Horizontal max={13}>
            <SelectField
              title="TikTok Attribute"
              value={tiktokAttributeId}
              options={attributeOptions}
              onChange={(e) => setTiktokAttributeId(e.target.value)}
              isRequired
              horizontalConstraint={13}
            />
          </Constraints.Horizontal>

          {/* Show attribute details if selected */}
          {selectedAttribute && selectedAttribute.values && (
            <Card type="flat">
              <Spacings.Stack scale="s">
                <Text.Detail tone="secondary">
                  Attribute Values (for reference)
                </Text.Detail>
                {selectedAttribute.values.slice(0, 10).map((val, idx) => (
                  <Text.Body key={idx}>
                    - {val.name} (ID: {val.id})
                  </Text.Body>
                ))}
                {selectedAttribute.values.length > 10 && (
                  <Text.Detail>
                    ... and {selectedAttribute.values.length - 10} more
                  </Text.Detail>
                )}
              </Spacings.Stack>
            </Card>
          )}

          {/* SKU Attribute Fetchers */}
          {mapperType === 'sku' && (
            <>
              <Constraints.Horizontal max={13}>
                <TextField
                  title="Value Name Fetcher (JavaScript function)"
                  value={valueNameFetcher}
                  onChange={(e) => setValueNameFetcher(e.target.value)}
                  isMultilineInput
                  horizontalConstraint={13}
                  hint="e.g., (attributes, locale) => attributes.find(a => a.name === 'color')?.value?.[locale]"
                />
              </Constraints.Horizontal>

              <Constraints.Horizontal max={13}>
                <TextField
                  title="Value ID Fetcher (JavaScript function)"
                  value={valueIdFetcher}
                  onChange={(e) => setValueIdFetcher(e.target.value)}
                  isMultilineInput
                  horizontalConstraint={13}
                  hint="e.g., (attributes, locale) => attributes.find(a => a.name === 'size')?.value?.id"
                />
              </Constraints.Horizontal>
            </>
          )}

          {/* Product Attribute Fetchers */}
          {mapperType === 'product' && (
            <>
              <Constraints.Horizontal max={13}>
                <TextField
                  title="Value Names Fetcher (JavaScript function)"
                  value={valueNamesFetcher}
                  onChange={(e) => setValueNamesFetcher(e.target.value)}
                  isMultilineInput
                  horizontalConstraint={13}
                  hint="e.g., (attributes, locale) => [{ name: 'value' }]"
                />
              </Constraints.Horizontal>

              <Constraints.Horizontal max={13}>
                <TextField
                  title="Value IDs Fetcher (JavaScript function)"
                  value={valueIdsFetcher}
                  onChange={(e) => setValueIdsFetcher(e.target.value)}
                  isMultilineInput
                  horizontalConstraint={13}
                  hint="e.g., (attributes, locale) => [{ id: '1000059' }]"
                />
              </Constraints.Horizontal>
            </>
          )}

          <Spacings.Inline>
            <PrimaryButton label="Save" onClick={handleSave} />
            <SecondaryButton
              label="Delete"
              onClick={handleDelete}
              tone="critical"
            />
          </Spacings.Inline>
        </Spacings.Stack>
      </CollapsiblePanel>
    </Card>
  );
};

export default AttributeRowEditor;
