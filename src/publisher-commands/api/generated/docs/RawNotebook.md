# RawNotebook

Raw Malloy notebook with unexecuted cell contents

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the notebook | [optional] [default to undefined]
**packageName** | **string** | Name of the package containing this notebook | [optional] [default to undefined]
**path** | **string** | Relative path to the notebook file within its package directory | [optional] [default to undefined]
**malloyVersion** | **string** | Version of the Malloy compiler used to generate the notebook data | [optional] [default to undefined]
**notebookCells** | [**Array&lt;NotebookCell&gt;**](NotebookCell.md) | Array of notebook cells containing raw markdown and code content | [optional] [default to undefined]
**annotations** | **Array&lt;string&gt;** | Array of file-level (##) annotations attached to the notebook | [optional] [default to undefined]

## Example

```typescript
import { RawNotebook } from './api';

const instance: RawNotebook = {
    resource,
    packageName,
    path,
    malloyVersion,
    notebookCells,
    annotations,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
