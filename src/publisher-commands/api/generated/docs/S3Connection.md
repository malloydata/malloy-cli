# S3Connection

AWS S3 connection configuration for DuckDB

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**accessKeyId** | **string** | AWS access key ID | [default to undefined]
**secretAccessKey** | **string** | AWS secret access key | [default to undefined]
**region** | **string** | AWS region (e.g., us-east-1) | [optional] [default to 'us-east-1']
**endpoint** | **string** | Custom S3-compatible endpoint URL (optional, for MinIO, etc.) | [optional] [default to undefined]
**sessionToken** | **string** | AWS session token for temporary credentials (optional) | [optional] [default to undefined]

## Example

```typescript
import { S3Connection } from './api';

const instance: S3Connection = {
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
    sessionToken,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
