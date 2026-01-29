# PublisherApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getStatus**](#getstatus) | **GET** /status | Get server status and health information|

# **getStatus**
> ServerStatus getStatus()

Returns the current status of the Malloy Publisher server, including initialization state, available projects, and server timestamp. This endpoint is useful for health checks and monitoring server availability. 

### Example

```typescript
import {
    PublisherApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PublisherApi(configuration);

const { status, data } = await apiInstance.getStatus();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Returns server status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

