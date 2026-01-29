# NotebookCellResult

Result of executing a notebook cell

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** | Type of notebook cell | [optional] [default to undefined]
**text** | **string** | Text contents of the notebook cell | [optional] [default to undefined]
**result** | **string** | JSON string containing the execution result for this cell | [optional] [default to undefined]
**newSources** | **Array&lt;string&gt;** | Array of JSON strings containing SourceInfo objects made available in this cell | [optional] [default to undefined]

## Example

```typescript
import { NotebookCellResult } from './api';

const instance: NotebookCellResult = {
    type,
    text,
    result,
    newSources,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
