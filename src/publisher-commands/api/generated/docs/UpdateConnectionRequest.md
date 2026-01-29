# UpdateConnectionRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**postgresConnection** | [**PostgresConnection**](PostgresConnection.md) |  | [optional] [default to undefined]
**mysqlConnection** | [**MysqlConnection**](MysqlConnection.md) |  | [optional] [default to undefined]
**bigqueryConnection** | [**BigqueryConnection**](BigqueryConnection.md) |  | [optional] [default to undefined]
**snowflakeConnection** | [**SnowflakeConnection**](SnowflakeConnection.md) |  | [optional] [default to undefined]
**duckdbConnection** | [**DuckdbConnection**](DuckdbConnection.md) |  | [optional] [default to undefined]
**motherduckConnection** | [**MotherDuckConnection**](MotherDuckConnection.md) |  | [optional] [default to undefined]
**trinoConnection** | [**TrinoConnection**](TrinoConnection.md) |  | [optional] [default to undefined]

## Example

```typescript
import { UpdateConnectionRequest } from './api';

const instance: UpdateConnectionRequest = {
    postgresConnection,
    mysqlConnection,
    bigqueryConnection,
    snowflakeConnection,
    duckdbConnection,
    motherduckConnection,
    trinoConnection,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
