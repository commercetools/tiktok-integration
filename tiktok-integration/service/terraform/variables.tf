variable "ct_client_id" {
  description   = "commercetools API client ID"
  type          = string
  sensitive     = true 
}

variable "ct_client_secret" {
  description   = "commercetools API client secret"
  type          = string
  sensitive     = true 
}

variable "ct_project_key" {
  description   = "commercetools target project"
  type          = string
  sensitive     = false 
}

variable "ct_scopes" {
  description   = "List of space separated commercetools API client scopes, for example: manage_project:<project key>"
  type          = string
  sensitive     = false 
}

variable "ct_api_url" {
  description   = "commercetools target api url for example: https://api.us-central1.gcp.commercetools.com/"
  type          = string
  sensitive     = false 
}

variable "ct_auth_url" {
  description   = "commercetools target auth url for example: https://auth.us-central1.gcp.commercetools.com/"
  type          = string
  sensitive     = false 
}