resource "commercetools_channel" "tiktok-channel" {
  key   = "tiktok-channel"
  roles = ["ProductDistribution","InventorySupply"]
  name = {
    "en-US" = "TikTok Channel"
  }
  description = {
    "en-US" = "TikTok Channel"
  }
}

resource "commercetools_type" "tiktok-channel-type" {
  description = {
    "en-US" = "Channel type for commercetools to TikTok warehouse and price."
    "en-GB" = "Channel type for commercetools to TikTok warehouse and price."
    "en-IE" = "Channel type for commercetools to TikTok warehouse and price."
    "en-AU" = "Channel type for commercetools to TikTok warehouse and price."
  }
  key = "tiktok-channel-type"
  name = {
    "en-US" = "TikTok Warehouse/Price info"
    "en-GB" = "TikTok Warehouse/Price info"
    "en-IE" = "TikTok Warehouse/Price info"
    "en-AU" = "TikTok Warehouse/Price info"
  }
  resource_type_ids = [
    "channel",
  ]

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Does channel represent Tiktok warehouse?"
      "en-GB" = "Does channel represent Tiktok warehouse?"
      "en-IE" = "Does channel represent Tiktok warehouse?"
      "en-AU" = "Does channel represent Tiktok warehouse?"
    }
    name     = "isTikTokWarehouse"
    required = false

    type {
      name = "Boolean"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Does channel represent Tiktok price?"
      "en-GB" = "Does channel represent Tiktok price?"
      "en-IE" = "Does channel represent Tiktok price?"
      "en-AU" = "Does channel represent Tiktok price?"
    }
    name     = "isTikTokPrice"
    required = false

    type {
      name = "Boolean"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Warehouse ID"
      "en-GB" = "Warehouse ID"
      "en-IE" = "Warehouse ID"
      "en-AU" = "Warehouse ID"
    }
    name     = "warehouseId"
    required = true

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Warehouse Entity ID"
      "en-GB" = "Warehouse Entity ID"
      "en-IE" = "Warehouse Entity ID"
      "en-AU" = "Warehouse Entity ID"
    }
    name     = "warehouseEntityId"
    required = false

    type {
      name = "String"
    }
  }
}
