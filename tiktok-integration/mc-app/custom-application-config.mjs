import { PERMISSIONS } from './src/constants';

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
  headers:{
    csp:{
      "connect-src": ["*.commercetools.app","localhost"],
      "script-src": ["*.commercetools.app","localhost"],
    }
  },
  oAuthScopes: {
    view: ['view_products', 'view_stores', 'view_key_value_documents','view_api_clients'],
    manage: ['manage_products', 'manage_stores', 'manage_key_value_documents','manage_api_clients'],
  },
  icon: '${path:@tabler/icons/outline/brand-tiktok.svg}',
  mainMenuLink: {
    defaultLabel: 'Tiktok Connect',
    labelAllLocales: [],
    permissions: [PERMISSIONS.View],
  }
};

export default config;
