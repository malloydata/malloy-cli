# AttachedDatabase

Attached DuckDB database

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** |  | [optional] [default to undefined]
**type** | **string** | Type of database connection | [optional] [default to undefined]
**attributes** | [**ConnectionAttributes**](ConnectionAttributes.md) |  | [optional] [default to undefined]
**bigqueryConnection** | [**BigqueryConnection**](BigqueryConnection.md) |  | [optional] [default to undefined]
**snowflakeConnection** | [**SnowflakeConnection**](SnowflakeConnection.md) |  | [optional] [default to undefined]
**postgresConnection** | [**PostgresConnection**](PostgresConnection.md) |  | [optional] [default to undefined]
**gcsConnection** | [**GCSConnection**](GCSConnection.md) |  | [optional] [default to undefined]
**s3Connection** | [**S3Connection**](S3Connection.md) |  | [optional] [default to undefined]

## Example

```typescript
import { AttachedDatabase } from './api';

const instance: AttachedDatabase = {
    name,
    type,
    attributes,
    bigqueryConnection,
    snowflakeConnection,
    postgresConnection,
    gcsConnection,
    s3Connection,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
