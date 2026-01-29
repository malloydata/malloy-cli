# Project

Represents a Malloy project containing packages, connections, and other resources

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resource** | **string** | Resource path to the project | [optional] [default to undefined]
**name** | **string** | Project name | [optional] [default to undefined]
**readme** | **string** | Project README content | [optional] [default to undefined]
**location** | **string** | Project location, can be an absolute path or URI (e.g. github, s3, gcs, etc.) | [optional] [default to undefined]
**connections** | [**Array&lt;Connection&gt;**](Connection.md) | List of database connections configured for this project | [optional] [default to undefined]
**packages** | [**Array&lt;Package&gt;**](Package.md) | List of Malloy packages in this project | [optional] [default to undefined]

## Example

```typescript
import { Project } from './api';

const instance: Project = {
    resource,
    name,
    readme,
    location,
    connections,
    packages,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
