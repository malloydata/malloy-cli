# PostgresConnection

PostgreSQL database connection configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**host** | **string** | PostgreSQL server hostname or IP address | [optional] [default to undefined]
**port** | **number** | PostgreSQL server port number | [optional] [default to undefined]
**databaseName** | **string** | Name of the PostgreSQL database | [optional] [default to undefined]
**userName** | **string** | PostgreSQL username for authentication | [optional] [default to undefined]
**password** | **string** | PostgreSQL password for authentication | [optional] [default to undefined]
**connectionString** | **string** | Complete PostgreSQL connection string (alternative to individual parameters) | [optional] [default to undefined]

## Example

```typescript
import { PostgresConnection } from './api';

const instance: PostgresConnection = {
    host,
    port,
    databaseName,
    userName,
    password,
    connectionString,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
