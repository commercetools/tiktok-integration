import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  LoadingSpinner,
  Stack,
  Tabs,
  Text,
} from '@commercetools/nimbus';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import {
  DOMAINS,
  NOTIFICATION_KINDS_SIDE,
} from '@commercetools-frontend/constants';
import { useMappings } from '../../hooks/use-mappings';
import { useProductTypesFetcher } from '../../hooks/use-product-types';
import { useTikTokAttributes } from '../../hooks/use-tiktok-attributes';
import type {
  AttributeMapping,
  ProductTypeMapping,
} from '../../hooks/use-tiktok-service';
import ErrorAlert from '../ui/error-alert';
import Page from '../ui/page';
import AttributeMappingList from './attribute-mapping-list';

const isComplete = (mapping: AttributeMapping) =>
  Boolean(mapping.tiktokAttributeId) &&
  (mapping.constantValues
    ? mapping.constantValues.length > 0 &&
      mapping.constantValues.every((value) => value.id || value.name)
    : Boolean(mapping.ctAttribute));

const MapperDetails = () => {
  const { productTypeId = '' } = useParams<{ productTypeId: string }>();
  const history = useHistory();
  const showNotification = useShowNotification();

  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();
  const { mappings, loading: mappingsLoading, saving, save } = useMappings();

  const stored = mappings.productTypes[productTypeId];
  const productType = productTypes?.find(
    (candidate) => candidate.id === productTypeId
  );
  const {
    attributes,
    error: attributesError,
    loading: attributesLoading,
  } = useTikTokAttributes(stored?.categoryId);

  const [draft, setDraft] = useState<ProductTypeMapping | undefined>(stored);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setDraft(stored);
  }, [stored]);

  const notify = (kind: 'success' | 'error', text: string) =>
    showNotification({
      kind: NOTIFICATION_KINDS_SIDE[kind],
      domain: DOMAINS.SIDE,
      text,
    });

  const handleSave = async () => {
    if (!draft) return;
    if (
      ![...draft.productAttributes, ...draft.skuAttributes].every(isComplete)
    ) {
      notify(
        'error',
        'Every mapper needs a TikTok attribute and either a commercetools attribute or a constant value'
      );
      return;
    }
    try {
      await save({
        productTypes: { ...mappings.productTypes, [productTypeId]: draft },
      });
      notify('success', 'Mappers saved successfully');
    } catch (error) {
      notify(
        'error',
        `Failed to save the mappers: ${(error as Error).message}`
      );
    }
  };

  const handleDelete = async () => {
    const { [productTypeId]: _removed, ...remaining } = mappings.productTypes;
    try {
      await save({ productTypes: remaining });
      history.replace(
        history.location.pathname.replace(`/${productTypeId}`, '')
      );
    } catch (error) {
      notify(
        'error',
        `Failed to delete the mapper: ${(error as Error).message}`
      );
    }
  };

  const goBack = () =>
    history.push(history.location.pathname.replace(`/${productTypeId}`, ''));

  if (productTypesLoading || mappingsLoading) {
    return <LoadingSpinner />;
  }

  if (!productType || !draft) {
    return (
      <Page
        title="Mapper Not Found"
        description="The requested product type mapper does not exist."
        onBack={goBack}
      />
    );
  }

  const ctAttributes = productType.attributeDefinitions.results.map(
    (attribute) => attribute.name
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);

  return (
    <Page
      title="Edit Product Mapper"
      onBack={goBack}
      actions={
        <Button
          variant="solid"
          colorPalette="primary"
          onPress={() => void handleSave()}
          isDisabled={!dirty || saving}
        >
          Save changes
        </Button>
      }
    >
      <Card.Root variant="outlined-elevated">
        <Card.Body>
          <Stack direction="column" gap="200">
            <Text textStyle="sm" color="neutral.11">
              Product type
            </Text>
            <Text fontWeight="600">
              {productType.name} ({productType.key})
            </Text>
            <Text textStyle="sm" color="neutral.11">
              TikTok category ID
            </Text>
            <Text>{draft.categoryId}</Text>
          </Stack>
        </Card.Body>
      </Card.Root>

      {attributesError && (
        <ErrorAlert
          title="The TikTok attributes could not be loaded"
          error={attributesError}
        />
      )}
      {attributesLoading ? (
        <LoadingSpinner />
      ) : (
        <Tabs.Root>
          <Tabs.List aria-label="Attribute mappings">
            <Tabs.Tab id="sku">SKU attributes</Tabs.Tab>
            <Tabs.Tab id="product">Product attributes</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panels>
            <Tabs.Panel id="sku">
              <Stack padding="400">
                <AttributeMappingList
                  kind="SKU"
                  mappings={draft.skuAttributes}
                  ctAttributes={ctAttributes}
                  tiktokAttributes={attributes}
                  onChange={(skuAttributes) =>
                    setDraft({ ...draft, skuAttributes })
                  }
                />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel id="product">
              <Stack padding="400">
                <AttributeMappingList
                  kind="product"
                  mappings={draft.productAttributes}
                  ctAttributes={ctAttributes}
                  tiktokAttributes={attributes}
                  onChange={(productAttributes) =>
                    setDraft({ ...draft, productAttributes })
                  }
                />
              </Stack>
            </Tabs.Panel>
          </Tabs.Panels>
        </Tabs.Root>
      )}

      <Stack direction="row" gap="200">
        {confirmingDelete ? (
          <>
            <Button
              variant="solid"
              colorPalette="critical"
              onPress={() => void handleDelete()}
              isDisabled={saving}
            >
              Confirm: delete this product mapper
            </Button>
            <Button
              variant="ghost"
              colorPalette="primary"
              onPress={() => setConfirmingDelete(false)}
            >
              Keep it
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            colorPalette="critical"
            onPress={() => setConfirmingDelete(true)}
          >
            Delete product mapper
          </Button>
        )}
      </Stack>
    </Page>
  );
};

MapperDetails.displayName = 'MapperDetails';

export default MapperDetails;
