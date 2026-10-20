# Terraform for MIST/commercetools Reference Architecture

This implementation uses the Terraform [commercetools provider](https://registry.terraform.io/providers/labd/commercetools/latest) created by [LabDigital](https://www.labdigital.nl/).

### Prerequisits

- [Terraform CLI tool](https://www.terraform.io/downloads.html)
- Existing [commercetools Composable Commerce project](https://docs.commercetools.com/getting-started/)
- commercetools Composable Commerce API Client with sufficient scopes to [manage Types](https://docs.commercetools.com/api/scopes#manage_typesprojectkey)

## Basic Configuration

Create a `secrets.tfvars` file in the `terraform` directory and add the following to it (fill in your configuration values)

```Java Properties
ct_client_id="<your-client-id>"
ct_client_secret="<your-client-secret>"
ct_project_key="<your-project-key>"
ct_scopes="<scope-action>:<your-project-key>"
ct_api_url="https://api.<commercetools-instance>.<cloud>.commercetools.com"
ct_auth_url="https://auth.<commercetools-instance>.<cloud>.commercetools.com"
```

## Run

In the `terraform` directory, install the required modules by running:

```console
terraform init
```

To preview the execution [plan](https://www.terraform.io/docs/cli/commands/plan.html) using the values provided in the `secrets.tfvars` file, run:

```console
terraform plan -var-file secrets.tfvars
```

To execute and apply the operations run the `apply` command.

```console
terraform apply -var-file secrets.tfvars
```
