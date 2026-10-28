import { useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Button, LoadingSpinner, Stack } from '@commercetools/nimbus';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import {
  DOMAINS,
  NOTIFICATION_KINDS_SIDE,
} from '@commercetools-frontend/constants';
import { useMappings } from '../../hooks/use-mappings';
import { useProductTypesFetcher } from '../../hooks/use-product-types';
import { useTikTokCategories } from '../../hooks/use-tiktok-categories';
import ErrorAlert from '../ui/error-alert';
import Field from '../ui/field';
import OptionSelect from '../ui/option-select';
import Page from '../ui/page';

const MapperNew = () => {
  const match = useRouteMatch();
  const history = useHistory();
  const showNotification = useShowNotification();
  const [productTypeId, setProductTypeId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();
  const {
    leafCategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useTikTokCategories();
  const { mappings, saving, save } = useMappings();

  const listUrl = match.url.replace('/new', '');

  const handleSubmit = async () => {
    try {
      await save({
        productTypes: {
          ...mappings.productTypes,
          [productTypeId]: {
            categoryId,
            productAttributes: [],
            skuAttributes: [],
          },
        },
      });
      history.push(`${listUrl}/${productTypeId}`);
    } catch (error) {
      showNotification({
        kind: NOTIFICATION_KINDS_SIDE.error,
        domain: DOMAINS.SIDE,
        text: `Failed to create mapper: ${(error as Error).message}`,
      });
    }
  };

  if (productTypesLoading || categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Page
      title="Create New Product Mapper"
      description="Select a commercetools product type and a TikTok category. You configure the attribute mappings in the next step."
      onBack={() => history.push(listUrl)}
    >
      {categoriesError && (
        <ErrorAlert
          title="The TikTok categories could not be loaded"
          error={categoriesError}
        />
      )}
      <Stack direction="column" gap="400">
        <Field label="Product Type" isRequired>
          <OptionSelect
            name="productType"
            value={productTypeId}
            options={(productTypes ?? [])
              .filter((productType) => !mappings.productTypes[productType.id])
              .map((productType) => ({
                value: productType.id,
                label: `${productType.name} (${productType.key})`,
              }))}
            onChange={setProductTypeId}
            isDisabled={saving}
            placeholder="Select a product type"
          />
        </Field>
        <Field label="TikTok Category (leaf categories only)" isRequired>
          <OptionSelect
            name="category"
            value={categoryId}
            options={leafCategories.map((category) => ({
              value: category.id,
              label: `${category.localName ?? category.id} (${category.id})`,
            }))}
            onChange={setCategoryId}
            isDisabled={saving}
            placeholder="Select a category"
          />
        </Field>
        <Stack direction="row" gap="200">
          <Button
            variant="solid"
            colorPalette="primary"
            onPress={() => void handleSubmit()}
            isDisabled={!productTypeId || !categoryId || saving}
          >
            Create Mapper
          </Button>
          <Button
            variant="outline"
            colorPalette="primary"
            onPress={() => history.push(listUrl)}
            isDisabled={saving}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Page>
  );
};

MapperNew.displayName = 'MapperNew';

export default MapperNew;
