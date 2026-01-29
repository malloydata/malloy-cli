# Query

Named model query definition

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Name of the query | [optional] [default to undefined]
**sourceName** | **string** | Name of the source this query operates on | [optional] [default to undefined]
**annotations** | **Array&lt;string&gt;** | Annotations attached to the query | [optional] [default to undefined]

## Example

```typescript
import { Query } from './api';

const instance: Query = {
    name,
    sourceName,
    annotations,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
