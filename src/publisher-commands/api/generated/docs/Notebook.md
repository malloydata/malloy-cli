# Notebook

Malloy notebook metadata and status information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the notebook | [optional] [default to undefined]
**packageName** | **string** | Name of the package containing this notebook | [optional] [default to undefined]
**path** | **string** | Relative path to the notebook file within its package directory | [optional] [default to undefined]
**error** | **string** | Error message if the notebook failed to compile or load | [optional] [default to undefined]

## Example

```typescript
import { Notebook } from './api';

const instance: Notebook = {
    resource,
    packageName,
    path,
    error,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
