import { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { CommercetoolsStorage } from '..';

const SUPPORTED_LOCALES_MAP = {
  en: 'en-US',
};

export const getCommercetoolsLocale = async (
  apiRoot: ByProjectKeyRequestBuilder,
) => {
  const { locale } =
    await CommercetoolsStorage.ShopConfigController.getLocaleAndShopRegion(
      apiRoot,
    );
  if (!locale) {
    throw new Error('No locale found');
  }
  return (
    SUPPORTED_LOCALES_MAP[locale as keyof typeof SUPPORTED_LOCALES_MAP] ||
    locale
  );
};
