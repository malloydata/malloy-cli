# Package

Represents a Malloy package containing models, notebooks, and embedded databases

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the package | [optional] [default to undefined]
**name** | **string** | Package name | [optional] [default to undefined]
**description** | **string** | Package description | [optional] [default to undefined]
**location** | **string** | Package location, can be an absolute path or URI (e.g. github, s3, gcs, etc.) | [optional] [default to undefined]

## Example

```typescript
import { Package } from './api';

const instance: Package = {
    resource,
    name,
    description,
    location,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
