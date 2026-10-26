import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

// The Merchant Center needs the menu link's permission to show the app and open its routes;
// the app itself never checks permissions.
const PERMISSIONS = entryPointUriPathToPermissionKeys('tiktok-connect');

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Tiktok Connect',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
    development: {
      initialProjectKey: '${env:INITIAL_PROJECT_KEY}',
    },
  },
  headers: {
    csp: {
      'connect-src': ['*.commercetools.app', 'localhost'],
      'script-src': ['*.commercetools.app', 'localhost'],
    },
  },
  oAuthScopes: {
    // The setup wizard flags or creates a store, its channels (covered by the
    // products scopes) and its product selection; product types and products
    // are read for the mappers and the sync. Everything else goes through the
    // connector's service.
    view: ['view_products', 'view_stores', 'view_product_selections'],
    manage: ['manage_products', 'manage_stores', 'manage_product_selections'],
  },
  additionalEnv: {
    tiktokServiceUrl: '${env:SERVICE_URL}',
  },
  icon: '${path:@tabler/icons/outline/brand-tiktok.svg}',
  mainMenuLink: {
    defaultLabel: 'Tiktok Connect',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  },
};

export default config;
