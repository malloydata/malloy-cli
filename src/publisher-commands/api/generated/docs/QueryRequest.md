# QueryRequest

Request body for executing a Malloy query

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**query** | **string** | Query string to execute on the model. If the query parameter is set, the queryName parameter must be empty. | [optional] [default to undefined]
**sourceName** | **string** | Name of the source in the model to use for queryName, search, and topValue requests. | [optional] [default to undefined]
**queryName** | **string** | Name of a query to execute on a source in the model. Requires the sourceName parameter is set. If the queryName parameter is set, the query parameter must be empty. | [optional] [default to undefined]
**versionId** | **string** | Version ID | [optional] [default to undefined]

## Example

```typescript
import { QueryRequest } from './api';

const instance: QueryRequest = {
    query,
    sourceName,
    queryName,
    versionId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
