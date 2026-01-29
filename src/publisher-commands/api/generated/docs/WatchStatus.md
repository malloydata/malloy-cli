# WatchStatus

Current file watching status and configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**enabled** | **boolean** | Whether file watching is currently active | [optional] [default to undefined]
**projectName** | **string** | Name of the project being watched for file changes | [optional] [default to undefined]
**watchingPath** | **string** | The file system path being monitored for changes, null if not watching | [optional] [default to undefined]

## Example

```typescript
import { WatchStatus } from './api';

const instance: WatchStatus = {
    enabled,
    projectName,
    watchingPath,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
