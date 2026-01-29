# MysqlConnection

MySQL database connection configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**host** | **string** | MySQL server hostname or IP address | [optional] [default to undefined]
**port** | **number** | MySQL server port number | [optional] [default to undefined]
**database** | **string** | Name of the MySQL database | [optional] [default to undefined]
**user** | **string** | MySQL username for authentication | [optional] [default to undefined]
**password** | **string** | MySQL password for authentication | [optional] [default to undefined]

## Example

```typescript
import { MysqlConnection } from './api';

const instance: MysqlConnection = {
    host,
    port,
    database,
    user,
    password,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
