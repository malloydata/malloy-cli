# Connection

Database connection configuration and metadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the connection | [optional] [default to undefined]
**name** | **string** | Name of the connection | [optional] [default to undefined]
**type** | **string** | Type of database connection | [optional] [default to undefined]
**attributes** | [**ConnectionAttributes**](ConnectionAttributes.md) |  | [optional] [default to undefined]
**postgresConnection** | [**PostgresConnection**](PostgresConnection.md) |  | [optional] [default to undefined]
**bigqueryConnection** | [**BigqueryConnection**](BigqueryConnection.md) |  | [optional] [default to undefined]
**snowflakeConnection** | [**SnowflakeConnection**](SnowflakeConnection.md) |  | [optional] [default to undefined]
**trinoConnection** | [**TrinoConnection**](TrinoConnection.md) |  | [optional] [default to undefined]
**mysqlConnection** | [**MysqlConnection**](MysqlConnection.md) |  | [optional] [default to undefined]
**duckdbConnection** | [**DuckdbConnection**](DuckdbConnection.md) |  | [optional] [default to undefined]
**motherduckConnection** | [**MotherDuckConnection**](MotherDuckConnection.md) |  | [optional] [default to undefined]

## Example

```typescript
import { Connection } from './api';

const instance: Connection = {
    resource,
    name,
    type,
    attributes,
    postgresConnection,
    bigqueryConnection,
    snowflakeConnection,
    trinoConnection,
    mysqlConnection,
    duckdbConnection,
    motherduckConnection,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
