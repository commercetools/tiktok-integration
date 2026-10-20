***NOTE***: This is NOT an official commercetools code and NOT production ready. Use it at your own risk


<p align="center">
  <a href="https://commercetools.com/">
    <img alt="commercetools logo" src="https://unpkg.com/@commercetools-frontend/assets/logos/commercetools_primary-logo_horizontal_RGB.png">
  </a></br>
  <b>Connect Application Starter in TypeScript</b>
</p>

This is the `starter-typescript` template to develop [connect applications](https://marketplace.commercetools.com/) in TypeScript.

## Instructions

Use `create-connect-app` cli with `starter-typescript` as `template` value to download this template repository to build the integration application , folder structure needs to be followed to ensure certification & deployment from commercetools connect team as stated [here](https://github.com/commercetools/connect-application-kit#readme) 

## Architecture principles for building an connect application 

* Connector solution should be lightweight in nature
* Connector solutions should follow test driven development. Unit , Integration (& E2E) tests should be included and successfully passed to be used
* No hardcoding of customer related config. If needed, values in an environment file which should not be maintained in repository
* Connector solution should be supported with detailed documentation
* Connectors should be point to point in nature, currently doesnt support any persistence capabilities apart from in memory persistence
* Connector solution should use open source technologies, although connector itself can be private for specific customer(s)
* Code should not contain console.log statements, use [the included logger](https://github.com/commercetools/merchant-center-application-kit/tree/main/packages-backend/loggers#readme) instead.

## Environment Variables

### Standard Configuration

| Variable Name | Description | Required | Default Value |
|--------------|-------------|----------|---------------|
| `FEATURE_FLAG_ENABLE_TEST_TIKTOK_ROUTES` | Enable test routes | No | `false` |
| `CTP_REGION` | commercetools Composable Commerce API region | Yes | `europe-west1.gcp` |
| `CTP_PROJECT_KEY` | commercetools Composable Commerce project key | Yes | - |
| `CTP_CLIENT_ID` | commercetools Composable Commerce client ID | Yes | - |
| `CTP_SCOPE` | commercetools Composable Commerce client scope | Yes | - |
| `TIKTOK_APP_KEY` | TikTok app key | Yes | - |
| `TIKTOK_SHOP_CODE` | TikTok shop code | No | - |
| `TIKTOK_SHOP_ID` | TikTok shop ID | Yes | - |
| `TIKTOK_SHOP_NAME` | TikTok shop Name | Yes | - |

### Secured Configuration

| Variable Name | Description | Required |
|--------------|-------------|----------|
| `CTP_CLIENT_SECRET` | commercetools Composable Commerce client secret | Yes |
| `TIKTOK_APP_SECRET` | TikTok app secret | Yes |

## API Routes

### Service Routes

#### GET /authorize-app
Authorizes the TikTok app with the configured shop credentials.

**Response:**
- 200: Authorization successful
- 500: Authorization failed with error message

#### GET /full-product-sync
Triggers a full product synchronization between commercetools and TikTok.

**Response:**
- 200: Sync completed successfully
- 500: Sync failed with error message

#### GET /full-product-check
Checks all products to determine which can be imported to TikTok and which cannot.

**Response:**
- 200: Returns an object with two arrays:
  - `importableProducts`: Array of product IDs that can be imported
  - `unimportableProducts`: Array of objects containing product IDs and error messages
- 500: Check failed with error message

#### GET /shop-config-sync
Synchronizes shop configuration data between TikTok and commercetools.

**Response:**
- 200: Shop config sync completed successfully
- 500: Shop config sync failed with error message

### Webhook Routes

#### POST /webhook
Receives and processes TikTok webhook events.

**Request Body:**
```json
{
  "shop_id": "string",
  "type": 1 | 2,
  ...
}
```

**Event Types:**
- Type 1: Order status change
- Type 2: Reverse status update

**Response:**
- 200: Webhook processed successfully
- 400: Invalid shop ID
- 500: Internal server error

## Setup Steps

1. authorize_shop
2. terraform


TODO:
[] run data-job after authorize_shop
[] do not run jobs/events until authorize_shop
[] data-job
  [] isInitialized = false  in shop config
  [] isAuthorized = false  "
  [] store shopCode, shopId, shopName in .env
  [] /shops > find shop cipher
  [] ct > channels > channel with custom type > isTikTokWarehouse +  warehouseId + warehouseEntityId
  [] /warehouses > find warehouseId :check? > store in shop config
  [] ct > channels > channel with custom type > isTikTokPrice > store in shop config
  [] /categories > store in categories

[] order webhook
[] log errors to custom-objects
[] Use Tailored values
[] update to tiktok V2025 apis
[] unverify shop endpoint
[] remove tiktok-integration-shared/build imports
[] Promise.all sync methods
[] mc-app:
  [] wizard: 1- select your store 2- copy authorization key from tiktok 3- authorize with tiktok > redirect to mc-app with key
