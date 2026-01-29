# ModelError

Standard error response format

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **string** | Human-readable error message describing what went wrong | [default to undefined]
**details** | **string** | Additional error details or context | [optional] [default to undefined]

## Example

```typescript
import { ModelError } from './api';

const instance: ModelError = {
    message,
    details,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
