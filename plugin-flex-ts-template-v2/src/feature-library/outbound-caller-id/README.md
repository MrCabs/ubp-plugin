# Outbound Caller ID

This feature enables dynamic caller ID selection for outbound calls based on the agent's business unit and the destination phone number type. It supports configurable number types, carrier prefixes, and SIP parameters.

## Configuration

Add the following to your `ui_attributes` to enable the feature:

```json
{
  "features": {
    "outbound_caller_id": {
      "enabled": true,
      "sip_address": "your-sip-address.com",
      "sip_config": {
        "edge": "singapore",
        "secure": true,
        "additional_params": {
          "custom_param": "value",
          "transport": "tcp"
        }
      },
      "default_caller_id": "+63XXXXXXXXXX",
      "number_types": [
        {
          "name": "landline",
          "prefix": "+632",
          "callerIdGroup": "landlineCallerIds",
          "priority": 1
        },
        {
          "name": "landlineCebu",
          "prefix": "+6332",
          "callerIdGroup": "landlineCebuCallerIds",
          "priority": 1
        },
        {
          "name": "globe",
          "callerIdGroup": "globeCallerIds",
          "priority": 2
        }
      ],
      "carrier_prefixes": {
        "globe": ["+63817", "+63905", "+63906"],
        "smart": ["+63960", "+63963", "+63968"],
        "dito": ["+63895", "+63896", "+63897"]
      },
      "business_unit_caller_ids": {
        "BUSINESS_UNIT_NAME": {
          "globeCallerIds": ["+63XXXXXXXXXX"],
          "smartCallerIds": ["+63XXXXXXXXXX"],
          "landlineCallerIds": ["+63XXXXXXXXXX"],
          "landlineCebuCallerIds": ["+63XXXXXXXXXX"],
          "ditoCallerIds": ["+63XXXXXXXXXX"],
          "internationalCallerIds": ["+63XXXXXXXXXX"],
          "customCallerIds": ["+63XXXXXXXXXX"]  // You can add custom caller ID groups
        }
      },
    }
  }
}
```

### Configuration Parameters

#### Basic Settings
- `enabled`: (boolean) Whether the feature is enabled
- `sip_address`: (string) The SIP address for outbound calls
- `default_caller_id`: (string) A fallback caller ID if no specific caller ID is found

#### SIP Configuration
The `sip_config` object allows you to customize SIP URI parameters:
- `edge`: (string, optional) The edge location for SIP calls (e.g., "singapore")
- `secure`: (boolean, optional) Whether to use secure SIP (adds ;secure=true/false)
- `additional_params`: (object, optional) Any additional SIP URI parameters
  ```json
  {
    "transport": "tcp",
    "custom_param": "value"
  }
  ```
This will generate SIP URIs like: `sip:number@address;edge=singapore;secure=true;transport=tcp;custom_param=value`


#### Number Types and Carrier Prefixes
- `number_types`: (array) Configurable phone number types
  - `name`: Type identifier (e.g., "landline", "globe", etc.)
  - `prefix`: Number prefix to match (optional if using carrier_prefixes)
  - `callerIdGroup`: Which caller ID group to use from business unit configuration
  - `priority`: Order to check prefixes (higher numbers checked first)
- `carrier_prefixes`: (object) Mapping of carrier names to their number prefixes
- `business_unit_caller_ids`: (object) Mapping of business units to their caller ID configurations
  - Each business unit can have any number of caller ID groups
  - Groups are referenced by the `callerIdGroup` in number_types

## Dynamic Number Types

The feature supports fully dynamic number types and caller ID groups:

1. **Add New Number Types**:
```json
{
  "number_types": [
    {
      "name": "newCarrier",
      "prefix": "+63999",
      "callerIdGroup": "newCarrierCallerIds",
      "priority": 3
    }
  ]
}
```

2. **Add Corresponding Caller IDs**:
```json
{
  "business_unit_caller_ids": {
    "BUSINESS_UNIT": {
      "newCarrierCallerIds": ["+63XXXXXXXXXX"]
    }
  }
}
```

3. **Add Carrier Prefixes** (optional):
```json
{
  "carrier_prefixes": {
    "newCarrier": ["+63999", "+63998"]
  }
}
```

## How it Works

1. When an outbound call is initiated, the feature checks the agent's business unit
2. It analyzes the destination number against configured number types in priority order:
   - First checks exact prefix matches
   - Then checks carrier prefixes if defined
3. Once a match is found, it uses the corresponding caller ID group from the business unit configuration
4. A random caller ID is selected from the matching group
5. The destination number is formatted as a SIP URI with configured parameters
6. If no match is found, falls back to international caller IDs

## Code Structure

- `config.ts`: Feature configuration and carrier prefix retrieval
- `types/ServiceConfiguration.ts`: TypeScript interfaces for configuration
- `helpers/OutboundCallerIdHelper.ts`: Core logic for caller ID selection and SIP URI formatting
- `flex-hooks/actions/StartOutboundCall.ts`: Integration with Flex's outbound call action
