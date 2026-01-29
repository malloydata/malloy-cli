# ConnectionsApi

All URIs are relative to *http://localhost/api/v0*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createConnection**](#createconnection) | **POST** /projects/{projectName}/connections/{connectionName} | Create a new database connection|
|[**deleteConnection**](#deleteconnection) | **DELETE** /projects/{projectName}/connections/{connectionName} | Delete a database connection|
|[**getConnection**](#getconnection) | **GET** /projects/{projectName}/connections/{connectionName} | Get connection details|
|[**getQuerydata**](#getquerydata) | **GET** /projects/{projectName}/connections/{connectionName}/queryData | Execute SQL query (deprecated)|
|[**getSqlsource**](#getsqlsource) | **GET** /projects/{projectName}/connections/{connectionName}/sqlSource | Get SQL source (deprecated)|
|[**getTable**](#gettable) | **GET** /projects/{projectName}/connections/{connectionName}/schemas/{schemaName}/tables/{tablePath} | Get table details from database|
|[**getTablesource**](#gettablesource) | **GET** /projects/{projectName}/connections/{connectionName}/tableSource | Get table source information|
|[**getTemporarytable**](#gettemporarytable) | **GET** /projects/{projectName}/connections/{connectionName}/temporaryTable | Create temporary table (deprecated)|
|[**listConnections**](#listconnections) | **GET** /projects/{projectName}/connections | List project database connections|
|[**listSchemas**](#listschemas) | **GET** /projects/{projectName}/connections/{connectionName}/schemas | List database schemas|
|[**listTables**](#listtables) | **GET** /projects/{projectName}/connections/{connectionName}/schemas/{schemaName}/tables | List tables in database|
|[**postQuerydata**](#postquerydata) | **POST** /projects/{projectName}/connections/{connectionName}/sqlQuery | Execute SQL query|
|[**postSqlsource**](#postsqlsource) | **POST** /projects/{projectName}/connections/{connectionName}/sqlSource | Create SQL source from statement|
|[**postTemporarytable**](#posttemporarytable) | **POST** /projects/{projectName}/connections/{connectionName}/sqlTemporaryTable | Create temporary table|
|[**updateConnection**](#updateconnection) | **PATCH** /projects/{projectName}/connections/{connectionName} | Update an existing database connection|

# **createConnection**
> CreateConnection201Response createConnection(connection)

Creates a new database connection in the specified project. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration,
    Connection
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let connection: Connection; //

const { status, data } = await apiInstance.createConnection(
    projectName,
    connectionName,
    connection
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **connection** | **Connection**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|


### Return type

**CreateConnection201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Connection created successfully |  -  |
|**400** | The request was malformed or cannot be performed given the current state of the system |  -  |
|**404** | The specified resource was not found |  -  |
|**409** | Connection already exists |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteConnection**
> CreateConnection201Response deleteConnection()

Permanently deletes a database connection from the project. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection to delete (default to undefined)

const { status, data } = await apiInstance.deleteConnection(
    projectName,
    connectionName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection to delete | defaults to undefined|


### Return type

**CreateConnection201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Connection deleted successfully |  -  |
|**404** | The specified resource was not found |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getConnection**
> Connection getConnection()

Retrieves detailed information about a specific database connection within a project. This includes connection configuration, credentials (if accessible), and metadata. Useful for inspecting connection settings and troubleshooting connectivity issues. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)

const { status, data } = await apiInstance.getConnection(
    projectName,
    connectionName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|


### Return type

**Connection**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Connection details and configuration |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getQuerydata**
> QueryData getQuerydata()

**DEPRECATED**: This endpoint is deprecated and may be removed in future versions. Use the POST version instead for better security and functionality.  Executes a SQL statement against the specified database connection and returns the results. The query results include data, metadata, and execution information. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let sqlStatement: string; //SQL statement (optional) (default to undefined)
let _options: string; //Options (optional) (default to undefined)

const { status, data } = await apiInstance.getQuerydata(
    projectName,
    connectionName,
    sqlStatement,
    _options
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **sqlStatement** | [**string**] | SQL statement | (optional) defaults to undefined|
| **_options** | [**string**] | Options | (optional) defaults to undefined|


### Return type

**QueryData**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Query execution results |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSqlsource**
> SqlSource getSqlsource()

**DEPRECATED**: This endpoint is deprecated and may be removed in future versions. Use the POST version instead for better security and functionality.  Creates a Malloy source from a SQL statement using the specified connection. The SQL statement is executed to generate a source definition that can be used in Malloy models. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let sqlStatement: string; //SQL statement (optional) (default to undefined)

const { status, data } = await apiInstance.getSqlsource(
    projectName,
    connectionName,
    sqlStatement
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **sqlStatement** | [**string**] | SQL statement | (optional) defaults to undefined|


### Return type

**SqlSource**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | SQL source information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTable**
> Table getTable()

Retrieves a table from the specified database schema. This endpoint is useful for discovering available data sources and exploring the database structure. The schema must exist in the connection for this operation to succeed. The tablePath is the full path to the table, including the schema name. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let schemaName: string; //Name of the schema (default to undefined)
let tablePath: string; //Full path to the table (default to undefined)

const { status, data } = await apiInstance.getTable(
    projectName,
    connectionName,
    schemaName,
    tablePath
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **schemaName** | [**string**] | Name of the schema | defaults to undefined|
| **tablePath** | [**string**] | Full path to the table | defaults to undefined|


### Return type

**Table**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Table information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTablesource**
> TableSource getTablesource()

Retrieves information about a specific table or view from the database connection. This includes table schema, column definitions, and metadata. The table can be specified by either tableKey or tablePath parameters, depending on the database type. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let tableKey: string; //Table key (optional) (default to undefined)
let tablePath: string; //Table path (optional) (default to undefined)

const { status, data } = await apiInstance.getTablesource(
    projectName,
    connectionName,
    tableKey,
    tablePath
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **tableKey** | [**string**] | Table key | (optional) defaults to undefined|
| **tablePath** | [**string**] | Table path | (optional) defaults to undefined|


### Return type

**TableSource**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Table source information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTemporarytable**
> TemporaryTable getTemporarytable()

**DEPRECATED**: This endpoint is deprecated and may be removed in future versions. Use the POST version instead for better security and functionality.  Creates a temporary table from a SQL statement using the specified connection. Temporary tables are useful for storing intermediate results during complex queries. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let sqlStatement: string; //SQL statement (optional) (default to undefined)

const { status, data } = await apiInstance.getTemporarytable(
    projectName,
    connectionName,
    sqlStatement
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **sqlStatement** | [**string**] | SQL statement | (optional) defaults to undefined|


### Return type

**TemporaryTable**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Temporary table information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listConnections**
> Array<Connection> listConnections()

Retrieves a list of all database connections configured for the specified project. Each connection includes its configuration, type, and status information. This endpoint is useful for discovering available data sources within a project. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)

const { status, data } = await apiInstance.listConnections(
    projectName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|


### Return type

**Array<Connection>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of database connections in the project |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listSchemas**
> Array<Schema> listSchemas()

Retrieves a list of all schemas (databases) available in the specified connection. Each schema includes metadata such as name, description, and whether it\'s the default schema. This endpoint is useful for exploring the database structure and discovering available data sources. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)

const { status, data } = await apiInstance.listSchemas(
    projectName,
    connectionName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|


### Return type

**Array<Schema>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of schemas available in the connection with metadata |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listTables**
> Array<Table> listTables()

Retrieves a list of all tables and views available in the specified database schema. This endpoint is useful for discovering available data sources and exploring the database structure. The schema must exist in the connection for this operation to succeed. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let schemaName: string; //Name of the schema (default to undefined)

const { status, data } = await apiInstance.listTables(
    projectName,
    connectionName,
    schemaName
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **schemaName** | [**string**] | Name of the schema | defaults to undefined|


### Return type

**Array<Table>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | A list of table names available in the specified schema |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postQuerydata**
> QueryData postQuerydata(postSqlsourceRequest)

Executes a SQL statement against the specified database connection and returns the results. The results include data, metadata, and execution information. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration,
    PostSqlsourceRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let postSqlsourceRequest: PostSqlsourceRequest; //SQL statement to execute
let _options: string; //Options (optional) (default to undefined)

const { status, data } = await apiInstance.postQuerydata(
    projectName,
    connectionName,
    postSqlsourceRequest,
    _options
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postSqlsourceRequest** | **PostSqlsourceRequest**| SQL statement to execute | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|
| **_options** | [**string**] | Options | (optional) defaults to undefined|


### Return type

**QueryData**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Query execution results |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postSqlsource**
> SqlSource postSqlsource(postSqlsourceRequest)

Creates a Malloy source from a SQL statement using the specified database connection. The SQL statement is executed to generate a source definition that can be used in Malloy models. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration,
    PostSqlsourceRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let postSqlsourceRequest: PostSqlsourceRequest; //SQL statement to fetch the SQL source

const { status, data } = await apiInstance.postSqlsource(
    projectName,
    connectionName,
    postSqlsourceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postSqlsourceRequest** | **PostSqlsourceRequest**| SQL statement to fetch the SQL source | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|


### Return type

**SqlSource**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | SQL source information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **postTemporarytable**
> TemporaryTable postTemporarytable(postSqlsourceRequest)

Creates a temporary table from a SQL statement using the specified database connection. Temporary tables are useful for storing intermediate results during complex queries and data processing workflows. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration,
    PostSqlsourceRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection (default to undefined)
let postSqlsourceRequest: PostSqlsourceRequest; //SQL statement to create the temporary table

const { status, data } = await apiInstance.postTemporarytable(
    projectName,
    connectionName,
    postSqlsourceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postSqlsourceRequest** | **PostSqlsourceRequest**| SQL statement to create the temporary table | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection | defaults to undefined|


### Return type

**TemporaryTable**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Temporary table information |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**404** | The specified resource was not found |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateConnection**
> CreateConnection201Response updateConnection(updateConnectionRequest)

Updates the configuration of an existing database connection. 

### Example

```typescript
import {
    ConnectionsApi,
    Configuration,
    UpdateConnectionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ConnectionsApi(configuration);

let projectName: string; //Name of the project (default to undefined)
let connectionName: string; //Name of the connection to update (default to undefined)
let updateConnectionRequest: UpdateConnectionRequest; //

const { status, data } = await apiInstance.updateConnection(
    projectName,
    connectionName,
    updateConnectionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateConnectionRequest** | **UpdateConnectionRequest**|  | |
| **projectName** | [**string**] | Name of the project | defaults to undefined|
| **connectionName** | [**string**] | Name of the connection to update | defaults to undefined|


### Return type

**CreateConnection201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Connection updated successfully |  -  |
|**400** | The request was malformed or cannot be performed given the current state of the system |  -  |
|**404** | The specified resource was not found |  -  |
|**401** | Unauthorized - authentication required |  -  |
|**500** | The server encountered an internal error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

