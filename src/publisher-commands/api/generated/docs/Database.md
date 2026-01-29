# Database

Embedded database within a Malloy package

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the database | [optional] [default to undefined]
**path** | **string** | Relative path to the database file within its package directory | [optional] [default to undefined]
**info** | [**TableDescription**](TableDescription.md) |  | [optional] [default to undefined]
**type** | **string** | Type of embedded database | [optional] [default to undefined]

## Example

```typescript
import { Database } from './api';

const instance: Database = {
    resource,
    path,
    info,
    type,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
