# ConnectionsTestApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**testConnectionConfiguration**](#testconnectionconfiguration) | **POST** /connections/test | Test database connection configuration|

# **testConnectionConfiguration**
> ConnectionStatus testConnectionConfiguration(connection)

Validates a database connection configuration without adding it to any project. This endpoint allows you to test connection parameters, credentials, and network connectivity before committing the connection to a project. Useful for troubleshooting connection issues and validating configurations during setup. 

### Example

```typescript
import {
    ConnectionsTestApi,
    Configuration,
    Connection
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsTestApi(configuration);

let connection: Connection; //

const { status, data } = await apiInstance.testConnectionConfiguration(
    connection
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **connection** | **Connection**|  | |


### Return type

**ConnectionStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Connection test result |  -  |
|**400** | The request was malformed or cannot be performed given the current state of the system |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

