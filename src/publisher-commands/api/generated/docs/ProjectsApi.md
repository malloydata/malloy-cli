# ProjectsApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createProject**](#createproject) | **POST** /projects | Create a new project|
|[**deleteProject**](#deleteproject) | **DELETE** /projects/{projectName} | Delete a project|
|[**getProject**](#getproject) | **GET** /projects/{projectName} | Get project details and metadata|
|[**listProjects**](#listprojects) | **GET** /projects | List all available projects|
|[**updateProject**](#updateproject) | **PATCH** /projects/{projectName} | Update project configuration|

# **createProject**
> Project createProject(project)

Creates a new Malloy project with the specified configuration. A project serves as a container for packages, connections, and other resources. The project will be initialized with the provided metadata and can immediately accept packages and connections. 

### Example

```typescript
import {
    ProjectsApi,
    Configuration,
    Project
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let project: Project; //

const { status, data } = await apiInstance.createProject(
    project
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **project** | **Project**|  | |


### Return type

**Project**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the project created |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProject**
> Project deleteProject()

Permanently deletes a project and all its associated resources including packages, connections, and metadata. This operation cannot be undone, so use with caution. The project must exist and be accessible for deletion. 

### Example

```typescript
import {
    ProjectsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let projectName: string; //Name of the project (default to undefined)

const { status, data } = await apiInstance.deleteProject(
    projectName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|


### Return type

**Project**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the project deleted |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getProject**
> Project getProject()

Retrieves detailed information about a specific project, including its packages, connections, configuration, and metadata. The reload parameter can be used to refresh the project state from disk before returning the information. 

### Example

```typescript
import {
    ProjectsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let reload: boolean; //Load / reload the project before returning result (optional) (default to undefined)

const { status, data } = await apiInstance.getProject(
    projectName,
    reload
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **reload** | [**boolean**] | Load / reload the project before returning result | (optional) defaults to undefined|


### Return type

**Project**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Project details and metadata |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listProjects**
> Array<Project> listProjects()

Retrieves a list of all projects currently hosted on this Malloy Publisher server. Each project contains metadata about its packages, connections, and configuration. This endpoint is typically used to discover available projects and their basic information. 

### Example

```typescript
import {
    ProjectsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

const { status, data } = await apiInstance.listProjects();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<Project>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of all available projects |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProject**
> Project updateProject(project)

Updates the configuration and metadata of an existing project. This allows you to modify project settings, update the README, change the location, or update other project-level properties. The project must exist and be accessible. 

### Example

```typescript
import {
    ProjectsApi,
    Configuration,
    Project
} from './api';

const configuration = new Configuration();
const apiInstance = new ProjectsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let project: Project; //

const { status, data } = await apiInstance.updateProject(
    projectName,
    project
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **project** | **Project**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|


### Return type

**Project**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the project updated |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

