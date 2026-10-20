import { useHistory, useRouteMatch } from 'react-router-dom';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import SecondaryButton from '@commercetools-uikit/secondary-button';
import DataTable from '@commercetools-uikit/data-table';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import { useProductMappersFetcher } from '../../../hooks/use-product-mappers';
import { useProductTypesFetcher } from '../../../hooks/use-product-types';
import { ListIcon, PlusBoldIcon } from '@commercetools-uikit/icons';
import FlatButton from '@commercetools-uikit/flat-button';

const AttributeMappersList = () => {
  const match = useRouteMatch();
  const history = useHistory();
  const { categoryMap, loading: mappersLoading } = useProductMappersFetcher();
  const { productTypes, loading: productTypesLoading } =
    useProductTypesFetcher();

  const loading = mappersLoading || productTypesLoading;

  const handleNavigateToNew = () => {
    history.push(`${match.url}/new`);
  };

  const handleNavigateToDetails = (productTypeId: string) => {
    history.push(`${match.url}/${productTypeId}`);
  };

  const handleBack = () => {
    history.push(match.url.replace('/attributes', ''));
  };

  // Get mapped product types
  const mappedProductTypeIds = Object.keys(categoryMap || {});
  const mappedProductTypes =
    productTypes?.filter((pt) => mappedProductTypeIds.includes(pt.id)) || [];

  const columns = [
    { key: 'name', label: 'Product Type Name' },
    { key: 'key', label: 'Key' },
    { key: 'id', label: 'ID' },
  ];

  const rows = mappedProductTypes.map((pt) => ({
    id: pt.id,
    name: pt.name,
    key: pt.key,
  }));

  const itemRenderer = (item: any, column: any) => {
    switch (column.key) {
      case 'name':
      case 'key':
      case 'id':
        return item[column.key];
      default:
        return null;
    }
  };

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
        <FlatButton label="Back" onClick={handleBack} icon={<ListIcon />} />
        <PrimaryButton
          label="Add New Mapper"
          iconLeft={<PlusBoldIcon />}
          onClick={handleNavigateToNew}
        />
      </Spacings.Inline>
      <Text.Headline as="h1">Attribute Mappers</Text.Headline>

      <Text.Body>
        Product types mapped to TikTok categories. Click on a row to edit the
        mapping details.
      </Text.Body>

      {rows.length === 0 ? (
        <Text.Body>
          No mappers configured yet. Click "Add New Mapper" to get started.
        </Text.Body>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          itemRenderer={itemRenderer}
          onRowClick={(row) => handleNavigateToDetails(row.id)}
        />
      )}
    </Spacings.Stack>
  );
};

export default AttributeMappersList;
