# PackagesApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createPackage**](#createpackage) | **POST** /projects/{projectName}/packages | Create a new package|
|[**deletePackage**](#deletepackage) | **DELETE** /projects/{projectName}/packages/{packageName} | Delete a package|
|[**getPackage**](#getpackage) | **GET** /projects/{projectName}/packages/{packageName} | Get package details and metadata|
|[**listPackages**](#listpackages) | **GET** /projects/{projectName}/packages | List project packages|
|[**updatePackage**](#updatepackage) | **PATCH** /projects/{projectName}/packages/{packageName} | Update package configuration|

# **createPackage**
> Package createPackage(_package)

Creates a new Malloy package within the specified project. A package serves as a container for models, notebooks, embedded databases, and other resources. The package will be initialized with the provided metadata and can immediately accept content. 

### Example

```typescript
import {
    PackagesApi,
    Configuration,
    Package
} from './api';

const configuration = new Configuration();
const apiInstance = new PackagesApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let _package: Package; //

const { status, data } = await apiInstance.createPackage(
    projectName,
    _package
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **_package** | **Package**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|


### Return type

**Package**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the package created |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deletePackage**
> Package deletePackage()

Permanently deletes a package and all its associated resources including models, notebooks, databases, and metadata. This operation cannot be undone, so use with caution. The package must exist and be accessible for deletion. 

### Example

```typescript
import {
    PackagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PackagesApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)

const { status, data } = await apiInstance.deletePackage(
    projectName,
    packageName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|


### Return type

**Package**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the package deleted |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPackage**
> Package getPackage()

Retrieves detailed information about a specific package, including its models, notebooks, databases, and metadata. The reload parameter can be used to refresh the package state from disk before returning the information. The versionId parameter allows access to specific package versions. 

### Example

```typescript
import {
    PackagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PackagesApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Package name (default to undefined)
let versionId: string; //Version identifier for the package (optional) (default to undefined)
let reload: boolean; //Load / reload the package before returning result (optional) (default to undefined)

const { status, data } = await apiInstance.getPackage(
    projectName,
    packageName,
    versionId,
    reload
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Package name | defaults to undefined|
| **versionId** | [**string**] | Version identifier for the package | (optional) defaults to undefined|
| **reload** | [**boolean**] | Load / reload the package before returning result | (optional) defaults to undefined|


### Return type

**Package**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Package details and metadata |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPackages**
> Array<Package> listPackages()

Retrieves a list of all Malloy packages within the specified project. Each package contains models, notebooks, databases, and other resources. This endpoint is useful for discovering available packages and their basic metadata. 

### Example

```typescript
import {
    PackagesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PackagesApi(configuration);

let projectName: string; //Name of the project (default to undefined)

const { status, data } = await apiInstance.listPackages(
    projectName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|


### Return type

**Array<Package>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of all packages in the project |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updatePackage**
> Package updatePackage(_package)

Updates the configuration and metadata of an existing package. This allows you to modify package settings, update the description, change the location, or update other package-level properties. The package must exist and be accessible. 

### Example

```typescript
import {
    PackagesApi,
    Configuration,
    Package
} from './api';

const configuration = new Configuration();
const apiInstance = new PackagesApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let packageName: string; //Name of the package (default to undefined)
let _package: Package; //

const { status, data } = await apiInstance.updatePackage(
    projectName,
    packageName,
    _package
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **_package** | **Package**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **packageName** | [**string**] | Name of the package | defaults to undefined|


### Return type

**Package**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns the package updated |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |
|**501** | The requested operation is not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

