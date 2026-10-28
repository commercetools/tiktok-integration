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
    "en-US" = "Shop identity, encrypted TikTok tokens and mapping configuration. Written by the connector."
  }

  resource_type_ids = ["store"]

  field {
    input_hint = "SingleLine"
    name       = "isTikTokShop"
    label = {
      "en-US" = "Does store represent Tiktok store?"
    }
    type {
      name = "Boolean"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokShopId"
    label = {
      "en-US" = "TikTok shop ID"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokShopCipher"
    label = {
      "en-US" = "TikTok shop cipher"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokShopName"
    label = {
      "en-US" = "TikTok shop name"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokShopCode"
    label = {
      "en-US" = "TikTok shop code"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokRegion"
    label = {
      "en-US" = "TikTok shop region"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokLocale"
    label = {
      "en-US" = "TikTok shop locale"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "MultiLine"
    name       = "tiktokWarehouses"
    label = {
      "en-US" = "TikTok warehouses (JSON)"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokAccessToken"
    label = {
      "en-US" = "TikTok access token (encrypted)"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokRefreshToken"
    label = {
      "en-US" = "TikTok refresh token (encrypted)"
    }
    type {
      name = "String"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokAccessExpiresAt"
    label = {
      "en-US" = "TikTok access token expiry (epoch seconds)"
    }
    type {
      name = "Number"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokRefreshExpiresAt"
    label = {
      "en-US" = "TikTok refresh token expiry (epoch seconds)"
    }
    type {
      name = "Number"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokAuthorizedAt"
    label = {
      "en-US" = "TikTok authorized at (epoch)"
    }
    type {
      name = "Number"
    }
    required = false
  }

  field {
    input_hint = "SingleLine"
    name       = "tiktokDeauthorizedAt"
    label = {
      "en-US" = "TikTok deauthorized at (epoch)"
    }
    type {
      name = "Number"
    }
    required = false
  }

  field {
    input_hint = "MultiLine"
    name       = "mappingConfig"
    label = {
      "en-US" = "Product mapping configuration (JSON)"
    }
    type {
      name = "String"
    }
    required = false
  }
}
