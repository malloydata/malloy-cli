# TableDescription

Database table structure and metadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Name of the table | [optional] [default to undefined]
**rowCount** | **number** | Number of rows in the table | [optional] [default to undefined]
**columns** | [**Array&lt;Column&gt;**](Column.md) | List of columns in the table | [optional] [default to undefined]

## Example

```typescript
import { TableDescription } from './api';

const instance: TableDescription = {
    name,
    rowCount,
    columns,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
