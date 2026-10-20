resource "commercetools_product_type" "sample-product-type" {
  key = "sample-product-type"
  name = "Sample Product Type"
  description = "Product type for TikTok integration with package weight and dimensions"

  attribute {
    name = "weightValue"
    label = {
      "en-US" = "Package Weight Value"
      "en-GB" = "Package Weight Value"
    }
    type {
      name = "text"
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "None"
  }

  attribute {
    name = "weightUnit"
    label = {
      "en-US" = "Package Weight Unit"
      "en-GB" = "Package Weight Unit"
    }
    type {
      name = "enum"
      value {
        key = "POUND"
        label = "Pound"
      }
      value {
        key = "KILOGRAM"
        label = "Kilogram"
      }
      value {
        key = "GRAM"
        label = "Gram"
      }
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "SameForAll"
  }

  attribute {
    name = "heightValue"
    label = {
      "en-US" = "Package Height"
      "en-GB" = "Package Height"
    }
    type {
      name = "text"
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "SameForAll"
  }

  attribute {
    name = "lengthValue"
    label = {
      "en-US" = "Package Length"
      "en-GB" = "Package Length"
    }
    type {
      name = "text"
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "SameForAll"
  }

  attribute {
    name = "widthValue"
    label = {
      "en-US" = "Package Width"
      "en-GB" = "Package Width"
    }
    type {
      name = "text"
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "SameForAll"
  }

  attribute {
    name = "dimensionUnit"
    label = {
      "en-US" = "Package Dimension Unit"
      "en-GB" = "Package Dimension Unit"
    }
    type {
      name = "enum"
      value {
        key = "INCH"
        label = "Inch"
      }
      value {
        key = "CENTIMETER"
        label = "Centimeter"
      }
      value {
        key = "FOOT"
        label = "Foot"
      }
      value {
        key = "METER"
        label = "Meter"
      }
    }
    required          = false
    searchable        = false
    input_hint        = "SingleLine"
    constraint = "SameForAll"
  }
}

