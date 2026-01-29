# GCSConnection

Google Cloud Storage connection configuration for DuckDB

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**keyId** | **string** | GCS HMAC access key ID | [default to undefined]
**secret** | **string** | GCS HMAC secret key | [default to undefined]

## Example

```typescript
import { GCSConnection } from './api';

const instance: GCSConnection = {
    keyId,
    secret,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
