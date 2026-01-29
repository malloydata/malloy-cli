# CompiledModel

Compiled Malloy model with sources, queries, and metadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the model | [optional] [default to undefined]
**packageName** | **string** | Name of the package containing this model | [optional] [default to undefined]
**path** | **string** | Relative path to the model file within its package directory | [optional] [default to undefined]
**malloyVersion** | **string** | Version of the Malloy compiler used to generate the model data | [optional] [default to undefined]
**modelInfo** | **string** | JSON string containing model metadata and structure information | [optional] [default to undefined]
**sourceInfos** | **Array&lt;string&gt;** | Array of JSON strings containing source information for each data source | [optional] [default to undefined]
**queries** | [**Array&lt;Query&gt;**](Query.md) | Array of named queries defined in the model | [optional] [default to undefined]

## Example

```typescript
import { CompiledModel } from './api';

const instance: CompiledModel = {
    resource,
    packageName,
    path,
    malloyVersion,
    modelInfo,
    sourceInfos,
    queries,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
