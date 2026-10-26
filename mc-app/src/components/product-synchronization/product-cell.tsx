import { Box, Text } from '@commercetools/nimbus';
import type { TEnrichedProduct } from '../../hooks/use-products';

/** A product's thumbnail, or a placeholder when it has no image. */
const ProductImage = ({ product }: { product: TEnrichedProduct }) => (
  <Box
    width="32px"
    height="32px"
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    {product.imageUrl ? (
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{ maxWidth: 32, maxHeight: 32, objectFit: 'contain' }}
      />
    ) : (
      <Text textStyle="xs" color="neutral.11">
        None
      </Text>
    )}
  </Box>
);

ProductImage.displayName = 'ProductImage';

export default ProductImage;
