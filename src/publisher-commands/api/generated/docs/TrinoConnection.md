# TrinoConnection

Trino database connection configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**server** | **string** | Trino server hostname or IP address | [optional] [default to undefined]
**port** | **number** | Trino server port number | [optional] [default to undefined]
**catalog** | **string** | Trino catalog name | [optional] [default to undefined]
**schema** | **string** | Trino schema name | [optional] [default to undefined]
**user** | **string** | Trino username for authentication | [optional] [default to undefined]
**password** | **string** | Trino password for authentication | [optional] [default to undefined]
**peakaKey** | **string** | Peaka API key for authentication with Peaka-hosted Trino clusters | [optional] [default to undefined]

## Example

```typescript
import { TrinoConnection } from './api';

const instance: TrinoConnection = {
    server,
    port,
    catalog,
    schema,
    user,
    password,
    peakaKey,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
