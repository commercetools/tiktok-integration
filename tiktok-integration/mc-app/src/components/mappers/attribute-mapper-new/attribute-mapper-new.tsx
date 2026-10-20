import { useState } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import SelectField from '@commercetools-uikit/select-field';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import { useProductTypesFetcher } from '../../../hooks/use-product-types';
import { useTikTokCategories } from '../../../hooks/use-tiktok-categories';
import {
  useProductMappersFetcher,
  useProductMappersUpdater,
} from '../../../hooks/use-product-mappers';

const AttributeMapperNew = () => {
  const match = useRouteMatch();
  const history = useHistory();
  const showNotification = useShowNotification();

  const [selectedProductType, setSelectedProductType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();
  const { leafCategories, loading: categoriesLoading } = useTikTokCategories();
  const {
    categoryMap,
    skuAttributeMap,
    productAttributeMap,
    refetch: refetchMappers,
  } = useProductMappersFetcher();
  const {
    updateCategoryMap,
    updateSkuAttributeMap,
    updateProductAttributeMap,
  } = useProductMappersUpdater();

  const loading = productTypesLoading || categoriesLoading;

  const handleBack = () => {
    history.push(match.url.replace('/new', ''));
  };

  const handleSubmit = async () => {
    if (!selectedProductType || !selectedCategory) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: 'Please select both a product type and a category',
      });
      return;
    }

    // Check if product type is already mapped
    if (categoryMap[selectedProductType]) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: 'This product type is already mapped. Please edit the existing mapping.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create category mapping
      const newCategoryMap = {
        ...categoryMap,
        [selectedProductType]: selectedCategory,
      };
      await updateCategoryMap(newCategoryMap);

      // Create empty SKU attribute mapping
      const newSkuAttributeMap = {
        ...skuAttributeMap,
        [selectedProductType]: [],
      };
      await updateSkuAttributeMap(newSkuAttributeMap);

      // Create empty product attribute mapping
      const newProductAttributeMap = {
        ...productAttributeMap,
        [selectedProductType]: [],
      };
      await updateProductAttributeMap(newProductAttributeMap);

      showNotification({
        kind: 'success',
        domain: DOMAINS.SIDE,
        text: 'Mapper created successfully',
      });

      // Refetch and navigate to details
      await refetchMappers();
      history.push(`${match.url.replace('/new', '')}/${selectedProductType}`);
    } catch (error) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: `Failed to create mapper: ${(error as Error).message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out already mapped product types
  const availableProductTypes =
    productTypes?.filter((pt) => !categoryMap[pt.id]) || [];

  const productTypeOptions = availableProductTypes.map((pt) => ({
    value: pt.id,
    label: `${pt.name} (${pt.key})`,
  }));

  const categoryOptions = leafCategories.map((cat) => ({
    value: cat.id || '',
    label: `${cat.localName} (${cat.id})`,
  }));

  if (loading) {
    return (
      <Spacings.Stack alignItems="center">
        <LoadingSpinner />
      </Spacings.Stack>
    );
  }

  return (
    <Spacings.Stack scale="l">
      <Spacings.Inline justifyContent="space-between" alignItems="center">
        <Text.Headline as="h1">Create New Attribute Mapper</Text.Headline>
        <SecondaryButton label="Back" onClick={handleBack} />
      </Spacings.Inline>

      <Text.Body>
        Select a CommerceTools product type and a TikTok category to create a
        new mapping. You will be able to configure attribute mappings in the
        next step.
      </Text.Body>

      <Spacings.Stack scale="m">
        <SelectField
          title="Product Type"
          value={selectedProductType}
          options={productTypeOptions}
          onChange={(e) => setSelectedProductType(e.target.value as string)}
          isRequired
          isDisabled={isSubmitting}
        />

        <SelectField
          title="TikTok Category (Leaf Categories Only)"
          value={selectedCategory}
          options={categoryOptions}
          onChange={(e) => setSelectedCategory(e.target.value as string)}
          isRequired
          isDisabled={isSubmitting}
        />

        <Spacings.Inline>
          <PrimaryButton
            label="Create Mapper"
            onClick={handleSubmit}
            isDisabled={
              !selectedProductType || !selectedCategory || isSubmitting
            }
          />
          <SecondaryButton
            label="Cancel"
            onClick={handleBack}
            isDisabled={isSubmitting}
          />
        </Spacings.Inline>
      </Spacings.Stack>
    </Spacings.Stack>
  );
};

export default AttributeMapperNew;
