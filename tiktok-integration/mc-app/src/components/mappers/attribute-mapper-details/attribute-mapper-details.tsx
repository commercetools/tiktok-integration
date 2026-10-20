import { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import Card from '@commercetools-uikit/card';
import Constraints from '@commercetools-uikit/constraints';
import { useProductTypesFetcher } from '../../../hooks/use-product-types';
import { useTikTokAttributes } from '../../../hooks/use-tiktok-attributes';
import {
  useProductMappersFetcher,
  useProductMappersUpdater,
} from '../../../hooks/use-product-mappers';
import AttributeRowEditor from './attribute-row-editor';
import FlatButton from '@commercetools-uikit/flat-button';
import { ListIcon } from '@commercetools-uikit/icons';
import ViewSwitcher from '@commercetools-uikit/view-switcher';

const AttributeMapperDetails = () => {
  const { productTypeId } = useParams<{ productTypeId: string }>();
  const history = useHistory();

  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();
  const {
    categoryMap,
    skuAttributeMap,
    productAttributeMap,
    loading: mappersLoading,
    refetch: refetchMappers,
  } = useProductMappersFetcher();
  const {
    attributes,
    fetchAttributes,
    loading: attributesLoading,
  } = useTikTokAttributes();
  const { updateSkuAttributeMap, updateProductAttributeMap } =
    useProductMappersUpdater();

  const [activeSection, setActiveSection] = useState<string>('sku');

  const loading = productTypesLoading || mappersLoading;

  const productType = productTypes?.find((pt) => pt.id === productTypeId);
  const categoryId = categoryMap[productTypeId];
  const skuMappers = skuAttributeMap[productTypeId] || [];
  const productMappers = productAttributeMap[productTypeId] || [];

  useEffect(() => {
    if (categoryId) {
      fetchAttributes(categoryId);
    }
  }, [categoryId]);

  const handleBack = () => {
    history.goBack();
  };

  const handleAddSkuMapper = () => {
    // Add a new empty SKU mapper
    const newMapper = {
      name: '',
      tiktokAttributeId: '',
    };
    const updatedMappers = [...skuMappers, newMapper];
    updateSkuAttributeMap({
      ...skuAttributeMap,
      [productTypeId]: updatedMappers,
    }).then(() => refetchMappers());
  };

  const handleAddProductMapper = () => {
    // Add a new empty product mapper
    const newMapper = {
      name: '',
      tiktokAttributeId: '',
    };
    const updatedMappers = [...productMappers, newMapper];
    updateProductAttributeMap({
      ...productAttributeMap,
      [productTypeId]: updatedMappers,
    }).then(() => refetchMappers());
  };

  if (loading) {
    return (
      <Spacings.Stack alignItems="center">
        <LoadingSpinner />
      </Spacings.Stack>
    );
  }

  if (!productType || !categoryId) {
    return (
      <Spacings.Stack scale="l">
        <Text.Headline as="h1">Mapper Not Found</Text.Headline>
        <Text.Body>The requested product type mapper does not exist.</Text.Body>
        <SecondaryButton label="Back" onClick={handleBack} />
      </Spacings.Stack>
    );
  }

  return (
    <Spacings.Stack scale="l">
      <FlatButton label="Back" onClick={handleBack} icon={<ListIcon />} />
      <Text.Headline as="h1">Edit Attribute Mapper</Text.Headline>

      <Card>
        <Spacings.Stack scale="m">
          <Constraints.Horizontal max={13}>
            <Spacings.Stack scale="xs">
              <Text.Detail tone="secondary">Product Type</Text.Detail>
              <Text.Body isBold>
                {productType.name} ({productType.key})
              </Text.Body>
            </Spacings.Stack>
          </Constraints.Horizontal>

          <Constraints.Horizontal max={13}>
            <Spacings.Stack scale="xs">
              <Text.Detail tone="secondary">TikTok Category ID</Text.Detail>
              <Text.Body>{categoryId}</Text.Body>
            </Spacings.Stack>
          </Constraints.Horizontal>
        </Spacings.Stack>
      </Card>

      <Spacings.Stack scale="m">
        <Text.Headline as="h2">Attribute Mappings</Text.Headline>

        {/* Section Tabs */}

        <ViewSwitcher.Group
          selectedValue={activeSection}
          onChange={setActiveSection}
        >
          <ViewSwitcher.Button value="sku">SKU Attributes</ViewSwitcher.Button>
          <ViewSwitcher.Button value="product">
            Product Attributes
          </ViewSwitcher.Button>
        </ViewSwitcher.Group>

        {/* SKU Attributes Section */}
        {activeSection === 'sku' && (
          <Card>
            <Spacings.Stack scale="m">
              <Spacings.Inline
                justifyContent="space-between"
                alignItems="center"
              >
                <Text.Subheadline as="h4">
                  SKU Attribute Mappers
                </Text.Subheadline>
                <SecondaryButton
                  label="+ Add SKU Mapper"
                  onClick={handleAddSkuMapper}
                />
              </Spacings.Inline>

              {attributesLoading && <LoadingSpinner />}

              {!attributesLoading && skuMappers.length === 0 && (
                <Text.Body>
                  No SKU attribute mappers configured. Click "Add SKU Mapper" to
                  create one.
                </Text.Body>
              )}

              {!attributesLoading &&
                skuMappers.map((mapper, index) => (
                  <AttributeRowEditor
                    key={index}
                    mapper={mapper}
                    mapperType="sku"
                    attributes={attributes}
                    productTypeId={productTypeId}
                    mapperIndex={index}
                    allMappers={skuMappers}
                    onUpdate={(updatedMappers) => {
                      updateSkuAttributeMap({
                        ...skuAttributeMap,
                        [productTypeId]: updatedMappers,
                      }).then(() => refetchMappers());
                    }}
                  />
                ))}
            </Spacings.Stack>
          </Card>
        )}

        {/* Product Attributes Section */}
        {activeSection === 'product' && (
          <Card>
            <Spacings.Stack scale="m">
              <Spacings.Inline
                justifyContent="space-between"
                alignItems="center"
              >
                <Text.Subheadline as="h4">
                  Product Attribute Mappers
                </Text.Subheadline>
                <SecondaryButton
                  label="+ Add Product Mapper"
                  onClick={handleAddProductMapper}
                />
              </Spacings.Inline>

              {attributesLoading && <LoadingSpinner />}

              {!attributesLoading && productMappers.length === 0 && (
                <Text.Body>
                  No product attribute mappers configured. Click "Add Product
                  Mapper" to create one.
                </Text.Body>
              )}

              {!attributesLoading &&
                productMappers.map((mapper, index) => (
                  <AttributeRowEditor
                    key={index}
                    mapper={mapper}
                    mapperType="product"
                    attributes={attributes}
                    productTypeId={productTypeId}
                    mapperIndex={index}
                    allMappers={productMappers}
                    onUpdate={(updatedMappers) => {
                      updateProductAttributeMap({
                        ...productAttributeMap,
                        [productTypeId]: updatedMappers,
                      }).then(() => refetchMappers());
                    }}
                  />
                ))}
            </Spacings.Stack>
          </Card>
        )}
      </Spacings.Stack>
    </Spacings.Stack>
  );
};

export default AttributeMapperDetails;
