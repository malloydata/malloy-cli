# Schema

A schema name in a Connection.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Name of the schema | [optional] [default to undefined]
**description** | **string** | Description of the schema | [optional] [default to undefined]
**isDefault** | **boolean** | Whether this schema is the default schema | [optional] [default to undefined]
**isHidden** | **boolean** | Whether this schema is hidden | [optional] [default to undefined]

## Example

```typescript
import { Schema } from './api';

const instance: Schema = {
    name,
    description,
    isDefault,
    isHidden,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
