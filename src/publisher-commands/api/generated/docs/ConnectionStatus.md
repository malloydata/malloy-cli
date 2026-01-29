# ConnectionStatus

Result of testing a database connection

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**status** | **string** | Connection test result status | [optional] [default to undefined]
**errorMessage** | **string** | Error message if the connection test failed, null if successful | [optional] [default to undefined]

## Example

```typescript
import { ConnectionStatus } from './api';

const instance: ConnectionStatus = {
    status,
    errorMessage,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
