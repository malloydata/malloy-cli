# SnowflakeConnection

Snowflake database connection configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**account** | **string** | Snowflake account identifier | [optional] [default to undefined]
**username** | **string** | Snowflake username for authentication | [optional] [default to undefined]
**password** | **string** | Snowflake password for authentication | [optional] [default to undefined]
**privateKey** | **string** | Snowflake private key for authentication | [optional] [default to undefined]
**privateKeyPass** | **string** | Passphrase for the Snowflake private key | [optional] [default to undefined]
**warehouse** | **string** | Snowflake warehouse name | [optional] [default to undefined]
**database** | **string** | Snowflake database name | [optional] [default to undefined]
**schema** | **string** | Snowflake schema name | [optional] [default to undefined]
**role** | **string** | Snowflake role name | [optional] [default to undefined]
**responseTimeoutMilliseconds** | **number** | Query response timeout in milliseconds | [optional] [default to undefined]

## Example

```typescript
import { SnowflakeConnection } from './api';

const instance: SnowflakeConnection = {
    account,
    username,
    password,
    privateKey,
    privateKeyPass,
    warehouse,
    database,
    schema,
    role,
    responseTimeoutMilliseconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
