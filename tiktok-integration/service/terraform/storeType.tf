resource "commercetools_store" "tiktok-store" {
  key = "tiktok-store"
  name = {
    "en-US" = "Tiktok Store"
  }
  distribution_channels = ["tiktok-channel"]
  supply_channels       = ["tiktok-channel"]

  depends_on = [
    commercetools_channel.tiktok-channel,
  ]
}

resource "commercetools_type" "tiktok-store-type" {
  key = "tiktok-store-type"
  name = {
    "en-US" = "Store type for commercetools to tiktok shop"
  }
  description = {
    "en-US" = "Additional information for shop"
  }

  resource_type_ids = ["store"]

  field {
    input_hint = "SingleLine"
    name = "isTikTokShop"
    label = {
      "en-US" = "Does store represent Tiktok store?"
    }
    type {
      name = "Boolean"
    }
    required = false
  }
}
