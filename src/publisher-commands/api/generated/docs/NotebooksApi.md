# NotebooksApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**executeNotebookCell**](#executenotebookcell) | **GET** /projects/{projectName}/packages/{packageName}/notebooks/{path}/cells/{cellIndex} | Execute a specific notebook cell|
|[**getNotebook**](#getnotebook) | **GET** /projects/{projectName}/packages/{packageName}/notebooks/{path} | Get Malloy notebook cells|
|[**listNotebooks**](#listnotebooks) | **GET** /projects/{projectName}/packages/{packageName}/notebooks | List package notebooks|

# **executeNotebookCell**
> NotebookCellResult executeNotebookCell()

Executes a specific cell in a Malloy notebook by index. For code cells, this compiles and runs the Malloy code, returning query results and any new sources defined. For markdown cells, this simply returns the cell content. 

### Example

```typescript
import {
    NotebooksApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new NotebooksApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let path: string; //Path to notebook within the package (default to undefined)
let cellIndex: number; //Index of the cell to execute (0-based) (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.executeNotebookCell(
    projectName,
    packageName,
    path,
    cellIndex,
    versionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|
| **path** | [**string**] | Path to notebook within the package | defaults to undefined|
| **cellIndex** | [**number**] | Index of the cell to execute (0-based) | defaults to undefined|
| **versionId** | [**string**] | Version identifier for the package | (optional) defaults to undefined|


### Return type

**NotebookCellResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Cell execution result |  -  |
|**400** | The request was malformed or cannot be performed given the current state of the system |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getNotebook**
> RawNotebook getNotebook()

Retrieves a Malloy notebook with its raw cell contents (markdown and code). Cell execution should be done separately via the execute-notebook-cell endpoint. 

### Example

```typescript
import {
    NotebooksApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new NotebooksApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let path: string; //Path to notebook within the package. (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.getNotebook(
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
| **path** | [**string**] | Path to notebook within the package. | defaults to undefined|
| **versionId** | [**string**] | Version identifier for the package | (optional) defaults to undefined|


### Return type

**RawNotebook**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A Malloy notebook with raw cell contents. |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listNotebooks**
> Array<Notebook> listNotebooks()

Retrieves a list of all Malloy notebooks within the specified package. Each notebook entry includes the relative path, package name, and any compilation errors. This endpoint is useful for discovering available notebooks and checking their status. 

### Example

```typescript
import {
    NotebooksApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new NotebooksApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.listNotebooks(
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

**Array<Notebook>**

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

