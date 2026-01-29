# BigqueryConnection

Google BigQuery database connection configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**defaultProjectId** | **string** | Default BigQuery project ID for queries | [optional] [default to undefined]
**billingProjectId** | **string** | BigQuery project ID for billing purposes | [optional] [default to undefined]
**location** | **string** | BigQuery dataset location/region | [optional] [default to undefined]
**serviceAccountKeyJson** | **string** | JSON string containing Google Cloud service account credentials | [optional] [default to undefined]
**maximumBytesBilled** | **string** | Maximum bytes to bill for query execution (prevents runaway costs) | [optional] [default to undefined]
**queryTimeoutMilliseconds** | **string** | Query timeout in milliseconds | [optional] [default to undefined]

## Example

```typescript
import { BigqueryConnection } from './api';

const instance: BigqueryConnection = {
    defaultProjectId,
    billingProjectId,
    location,
    serviceAccountKeyJson,
    maximumBytesBilled,
    queryTimeoutMilliseconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
