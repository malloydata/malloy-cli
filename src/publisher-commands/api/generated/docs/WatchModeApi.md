# WatchModeApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getWatchStatus**](#getwatchstatus) | **GET** /watch-mode/status | Get watch mode status|
|[**startWatching**](#startwatching) | **POST** /watch-mode/start | Start file watching|
|[**stopWatching**](#stopwatching) | **POST** /watch-mode/stop | Stop file watching|

# **getWatchStatus**
> WatchStatus getWatchStatus()

Retrieves the current status of the file watching system. This includes whether watch mode is enabled, which project is being watched, and the path being monitored. Useful for monitoring the development workflow and ensuring file changes are being detected. 

### Example

```typescript
import {
    WatchModeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new WatchModeApi(configuration);

const { status, data } = await apiInstance.getWatchStatus();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WatchStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | The current watch mode status. |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startWatching**
> startWatching(startWatchRequest)

Initiates file watching for the specified project. This enables real-time monitoring of file changes within the project directory, allowing for automatic reloading and updates during development. Only one project can be watched at a time. 

### Example

```typescript
import {
    WatchModeApi,
    Configuration,
    StartWatchRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new WatchModeApi(configuration);

let startWatchRequest: StartWatchRequest; //

const { status, data } = await apiInstance.startWatching(
    startWatchRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **startWatchRequest** | **StartWatchRequest**|  | |


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Watch mode started successfully. |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **stopWatching**
> stopWatching()

Stops the current file watching session. This disables real-time monitoring of file changes and releases system resources. Use this when development is complete or when switching to a different project. 

### Example

```typescript
import {
    WatchModeApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new WatchModeApi(configuration);

const { status, data } = await apiInstance.stopWatching();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Watch mode stopped successfully. |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

