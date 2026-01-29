# NotebookCell

Individual cell within a Malloy notebook

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** | Type of notebook cell | [optional] [default to undefined]
**text** | **string** | Text contents of the notebook cell (either markdown or Malloy code) | [optional] [default to undefined]
**newSources** | **Array&lt;string&gt;** | Array of JSON strings containing SourceInfo objects made available in this cell | [optional] [default to undefined]
**queryInfo** | **string** | JSON string containing QueryInfo object for the query in this cell (if the cell contains a query) | [optional] [default to undefined]

## Example

```typescript
import { NotebookCell } from './api';

const instance: NotebookCell = {
    type,
    text,
    newSources,
    queryInfo,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
