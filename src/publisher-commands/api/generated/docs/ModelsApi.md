# ModelsApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**executeQueryModel**](#executequerymodel) | **POST** /projects/{projectName}/packages/{packageName}/models/{path}/query | Execute Malloy query|
|[**getModel**](#getmodel) | **GET** /projects/{projectName}/packages/{packageName}/models/{path} | Get compiled Malloy model|
|[**listModels**](#listmodels) | **GET** /projects/{projectName}/packages/{packageName}/models | List package models|

# **executeQueryModel**
> QueryResult executeQueryModel(queryRequest)

Executes a Malloy query against a model and returns the results. The query can be specified as a raw Malloy query string or by referencing a named query within the model. This endpoint supports both ad-hoc queries and predefined model queries, making it flexible for various use cases including data exploration, reporting, and application integration. 

### Example

```typescript
import {
    ModelsApi,
    Configuration,
    QueryRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ModelsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let path: string; //Path to the model within the package (default to undefined)
let queryRequest: QueryRequest; //

const { status, data } = await apiInstance.executeQueryModel(
    projectName,
    packageName,
    path,
    queryRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **queryRequest** | **QueryRequest**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|
| **path** | [**string**] | Path to the model within the package | defaults to undefined|


### Return type

**QueryResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Query execution results |  -  |
|**400** | The request was malformed or cannot be performed given the current state of the system |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getModel**
> CompiledModel getModel()

Retrieves a compiled Malloy model with its source information, queries, and metadata. The model is compiled using the specified version of the Malloy compiler. This endpoint provides access to the model\'s structure, sources, and named queries for use in applications. 

### Example

```typescript
import {
    ModelsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ModelsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let path: string; //Path to the model within the package (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.getModel(
    projectName,
    packageName,
    path,
    versionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|
| **path** | [**string**] | Path to the model within the package | defaults to undefined|
| **versionId** | [**string**] | Version identifier for the package | (optional) defaults to undefined|


### Return type

**CompiledModel**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Compiled Malloy model |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**424** | Model compilation failed due to syntax or semantic errors |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listModels**
> Array<Model> listModels()

Retrieves a list of all Malloy models within the specified package. Each model entry includes the relative path, package name, and any compilation errors. This endpoint is useful for discovering available models and checking their status. 

### Example

```typescript
import {
    ModelsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ModelsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.listModels(
    projectName,
    packageName,
    versionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|
| **versionId** | [**string**] | Version identifier for the package | (optional) defaults to undefined|


### Return type

**Array<Model>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of models in the package |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

