import { useState } from 'react';
import Spacings from '@commercetools-uikit/spacings';
import Text from '@commercetools-uikit/text';
import PrimaryButton from '@commercetools-uikit/primary-button';
import LoadingSpinner from '@commercetools-uikit/loading-spinner';
import Grid from '@commercetools-uikit/grid';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import { useConnectProject } from '../../hooks/use-service-url';
import { useProductsByIds } from '../../hooks/use-products';
import type { TEnrichedProduct } from '../../hooks/use-products';
import ImportableProductsTable from './ImportableProductsTable';
import UnimportableProductsTable from './UnimportableProductsTable';

type TUnimportableProduct = TEnrichedProduct & {
  error: string;
};

const ProductSynchronization = () => {
  const { fullProductCheck, selectiveProductSync, loading: serviceLoading } =
    useConnectProject();
  const { getProductsByIds, loading: productsLoading } = useProductsByIds();
  const showNotification = useShowNotification();

  const [importableProducts, setImportableProducts] = useState<TEnrichedProduct[]>(
    []
  );
  const [unimportableProducts, setUnimportableProducts] = useState<
    TUnimportableProduct[]
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<
    Record<string, boolean>
  >({});
  const [hasChecked, setHasChecked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCheckProducts = async () => {
    try {
      setHasChecked(false);
      setImportableProducts([]);
      setUnimportableProducts([]);
      setSelectedProductIds({});

      const result = await fullProductCheck();

      // Fetch enriched product data for importable products
      const importableEnriched = await getProductsByIds(
        result.importableProducts
      );
      setImportableProducts(importableEnriched);

      // Fetch enriched product data for unimportable products
      const unimportableIds = result.unimportableProducts.map((p) => p.id);
      const unimportableEnriched = await getProductsByIds(unimportableIds);

      // Merge with error information
      const unimportableWithErrors = unimportableEnriched.map((product) => {
        const errorInfo = result.unimportableProducts.find(
          (p) => p.id === product.id
        );
        return {
          ...product,
          error: errorInfo?.error || 'Unknown error',
        };
      });
      setUnimportableProducts(unimportableWithErrors);

      setHasChecked(true);

      showNotification({
        kind: 'success',
        domain: DOMAINS.SIDE,
        text: `Product check completed. Found ${result.importableProducts.length} importable and ${result.unimportableProducts.length} unimportable products.`,
      });
    } catch (error) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: `${(error as Error).message}`,
      });
    }
  };

  const handleSelectionChange = (productId: string, isSelected: boolean) => {
    setSelectedProductIds((prev) => ({
      ...prev,
      [productId]: isSelected,
    }));
  };

  const handleImportToTikTok = async () => {
    const selectedIds = Object.keys(selectedProductIds).filter(
      (id) => selectedProductIds[id]
    );

    if (selectedIds.length === 0) {
      showNotification({
        kind: 'warning',
        domain: DOMAINS.SIDE,
        text: 'Please select at least one product to import.',
      });
      return;
    }

    try {
      setIsSyncing(true);
      await selectiveProductSync(selectedIds);

      showNotification({
        kind: 'success',
        domain: DOMAINS.SIDE,
        text: `Import started for ${selectedIds.length} product(s). This may take a few moments.`,
      });

      // Clear selection after successful import
      setSelectedProductIds({});
    } catch (error) {
      showNotification({
        kind: 'error',
        domain: DOMAINS.SIDE,
        text: `Failed to import products: ${(error as Error).message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isLoading = serviceLoading || productsLoading;
  const selectedCount = Object.values(selectedProductIds).filter(Boolean).length;

  return (
    <Spacings.Stack scale="xl">
      <Spacings.Stack scale="m">
        <Text.Headline as="h1">Product Synchronization</Text.Headline>
        <Text.Body>
          Check which products can be imported to TikTok and sync them selectively.
        </Text.Body>
      </Spacings.Stack>

      <Spacings.Inline scale="m">
      <PrimaryButton
        label="Check Products"
        onClick={handleCheckProducts}
        isDisabled={isLoading}
      />
      </Spacings.Inline>

      

      {isLoading && (
        <Spacings.Stack alignItems="center">
          <LoadingSpinner />
        </Spacings.Stack>
      )}

      {hasChecked && !isLoading && (
        <Spacings.Stack scale="l">
          <Grid gridGap="16px" gridTemplateColumns="1fr 1fr">
            <Grid.Item>
              <ImportableProductsTable
                products={importableProducts}
                selectedProductIds={selectedProductIds}
                onSelectionChange={handleSelectionChange}
              />
            </Grid.Item>
            <Grid.Item>
              <UnimportableProductsTable products={unimportableProducts} />
            </Grid.Item>
          </Grid>

          {importableProducts.length > 0 && (
            <div>
              <PrimaryButton
                label={`Import to TikTok (${selectedCount} selected)`}
                onClick={handleImportToTikTok}
                isDisabled={selectedCount === 0 || isSyncing}
              />
            </div>
          )}
        </Spacings.Stack>
      )}
    </Spacings.Stack>
  );
};

export default ProductSynchronization;

