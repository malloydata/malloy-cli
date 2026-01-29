# ConnectionAttributes

Connection capabilities and configuration attributes

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**dialectName** | **string** | SQL dialect name for the connection | [optional] [default to undefined]
**isPool** | **boolean** | Whether the connection uses connection pooling | [optional] [default to undefined]
**canPersist** | **boolean** | Whether the connection supports persistent storage operations | [optional] [default to undefined]
**canStream** | **boolean** | Whether the connection supports streaming query results | [optional] [default to undefined]

## Example

```typescript
import { ConnectionAttributes } from './api';

const instance: ConnectionAttributes = {
    dialectName,
    isPool,
    canPersist,
    canStream,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
