# Terraform

Creates the commercetools resources the connector expects, using the
[commercetools provider](https://registry.terraform.io/providers/labd/commercetools/latest) by Lab Digital.

| File | Resources |
|------|-----------|
| `channelType.tf` | `tiktok-channel` (roles `ProductDistribution`, `InventorySupply`) and the `tiktok-channel-type` type with `isTikTokWarehouse`, `isTikTokPrice`, `warehouseId`, `warehouseEntityId` |
| `storeType.tf` | `tiktok-store` and the `tiktok-store-type` type (see below) |
| `cartTypes.tf` | `tiktok-order-info` type for imported orders |

## The Store type holds the connector's state

The connector keeps everything it learns about the shop on the Store with `isTikTokShop = true`, as custom fields of
`tiktok-store-type`. There are no Custom Objects.

| Field | Type | Written by |
|-------|------|------------|
| `isTikTokShop` | Boolean | Merchant Center app setup wizard |
| `tiktokShopId`, `tiktokShopCipher`, `tiktokShopName`, `tiktokShopCode` | String | authorization callback |
| `tiktokRegion`, `tiktokLocale` | String | authorization callback, `shop-config-sync` |
| `tiktokWarehouses` | String (JSON) | `shop-config-sync` |
| `tiktokAccessToken`, `tiktokRefreshToken` | String, AES-256-GCM encrypted (`v1:<iv>:<tag>:<ciphertext>`) | authorization callback, token refresh |
| `tiktokAccessExpiresAt`, `tiktokRefreshExpiresAt` | Number (epoch seconds) | authorization callback, token refresh |
| `tiktokAuthorizedAt`, `tiktokDeauthorizedAt` | Number (epoch) | authorization callback, seller deauthorization webhook |
| `mappingConfig` | String (JSON) | Merchant Center mappings screen |

Anyone who can read the Store can read these fields. The tokens are encrypted, but read
[docs/token-storage-security.md](../docs/token-storage-security.md) before you apply this to a shared project.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) 1.x
- A commercetools project
- An API client that can manage types, channels, product types and stores:
  `manage_types`, `manage_products`, `manage_stores`

This is a setup-time client for you, not the connector's runtime client (Connect creates that one from `connect.yaml`).
Delete it when you are done.

## Run

Create `secrets.tfvars` in this directory. It is git-ignored; never commit it.

```properties
ct_client_id="<your-client-id>"
ct_client_secret="<your-client-secret>"
ct_project_key="<your-project-key>"
ct_scopes="manage_types:<key> manage_products:<key> manage_stores:<key>"
ct_api_url="https://api.<region>.<cloud>.commercetools.com"
ct_auth_url="https://auth.<region>.<cloud>.commercetools.com"
```

```console
terraform init
terraform plan -var-file secrets.tfvars
terraform apply -var-file secrets.tfvars
```

Terraform state can contain your API client secret. State files (`*.tfstate*`) are git-ignored; keep them out of the
repository, or use a remote backend.
