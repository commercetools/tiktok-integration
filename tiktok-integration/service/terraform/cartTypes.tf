resource "commercetools_type" "tiktok-order-info" {
  description = {
    "en-US" = "Cart/Order type for tiktok integration"
  }
  key = "tiktok-order-info"
  name = {
    "en-US" = "Additional information for orders from tiktok"
  }
  resource_type_ids = [
    "order",
  ]
  
  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Order ID"
    }
    name     = "tiktokOrderId"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Order Status"
    }
    name     = "tiktokOrderStatus"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Payment Method Name"
    }
    name     = "tiktokPaymentMethodName"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Fulfillment Type"
    }
    name     = "tiktokFulfillmentType"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Delivery Type"
    }
    name     = "tiktokDeliveryType"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Shipping Type"
    }
    name     = "tiktokShippingType"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Warehouse ID"
    }
    name     = "tiktokWarehouseId"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "MultiLine"
    label = {
      "en-US" = "Tiktok Buyer Message"
    }
    name     = "tiktokBuyerMessage"
    required = false

    type {
      name = "String"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Create Time"
    }
    name     = "tiktokCreateTime"
    required = false

    type {
      name = "Number"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Paid Time"
    }
    name     = "tiktokPaidTime"
    required = false

    type {
      name = "Number"
    }
  }

  field {
    input_hint = "SingleLine"
    label = {
      "en-US" = "Tiktok Update Time"
    }
    name     = "tiktokUpdateTime"
    required = false

    type {
      name = "Number"
    }
  }
  
}