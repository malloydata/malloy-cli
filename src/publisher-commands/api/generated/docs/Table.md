# Table


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the table. | [optional] [default to undefined]
**source** | **string** | Table source as a JSON string. | [optional] [default to undefined]
**columns** | [**Array&lt;Column&gt;**](Column.md) | Table fields | [optional] [default to undefined]

## Example

```typescript
import { Table } from './api';

const instance: Table = {
    resource,
    source,
    columns,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
