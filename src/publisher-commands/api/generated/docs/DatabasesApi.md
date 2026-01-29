# DatabasesApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**listDatabases**](#listdatabases) | **GET** /projects/{projectName}/packages/{packageName}/databases | List embedded databases|

# **listDatabases**
> Array<Database> listDatabases()

Retrieves a list of all embedded databases within the specified package. These are typically DuckDB databases stored as .parquet files that provide local data storage for the package. Each database entry includes metadata about the database structure and content. 

### Example

```typescript
import {
    DatabasesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DatabasesApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)

const { status, data } = await apiInstance.listDatabases(
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

**Array<Database>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of embedded databases in the package |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

