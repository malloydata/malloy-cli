# ServerStatus

Current server status and health information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**timestamp** | **number** | Unix timestamp of the status check | [optional] [default to undefined]
**projects** | [**Array&lt;Project&gt;**](Project.md) | List of available projects | [optional] [default to undefined]
**initialized** | **boolean** | Whether the server is fully initialized and ready to serve requests | [optional] [default to undefined]
**frozenConfig** | **boolean** | Whether the server configuration is frozen (read-only mode). When true, all mutation operations are disabled. | [optional] [default to undefined]

## Example

```typescript
import { ServerStatus } from './api';

const instance: ServerStatus = {
    timestamp,
    projects,
    initialized,
    frozenConfig,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
