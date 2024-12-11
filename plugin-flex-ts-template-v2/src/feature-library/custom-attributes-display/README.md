# Custom Attributes Display Component for Twilio Flex

A flexible and dynamic component for displaying custom task attributes in Twilio Flex. This component supports multiple display types including error messages, information cards, lists, and notifications with configurable layouts and behaviors.

## Features

- Multiple display types support:
  - Error messages
  - Information cards
  - Lists (ordered and unordered)
  - Notifications
- Configurable display order with errors prioritized at the top
- Auto-dismiss functionality
- Dismissible notifications
- Responsive layout
- Customizable styling using Twilio Paste Design System

## Usage

### Basic Implementation

Add the component to your TaskCanvas:

```typescript
flex.TaskCanvasHeader.Content.add(
  <CustomAttributesDisplay key="custom-attributes-display" />,
  {
    sortOrder: -1,
  }
);
```

### Configuration Structure

The component accepts display configurations through task attributes. You can configure multiple display elements using an array structure:

```json
{
  "display": [
    {
      "type": "error",
      "attributes": {
        "title": "Error Handler",
        "message": "Unexpected error occurred during the customer's IVR journey."
      },
      "options": {
        "severity": "error"
      }
    },
    {
      "type": "card",
      "attributes": {
        "title": "Customer Information",
        "Account Number": "1234504432",
        "Card Number": "XXXXXXXXXXXX1234",
        "Serial Number": "921312"
      }
    }
  ]
}
```

### Display Types

#### 1. Error Display
```json
{
  "type": "error",
  "attributes": {
    "title": "Error Title",
    "message": "Error message details"
  },
  "options": {
    "severity": "error" | "warning" | "neutral"
  }
}
```

#### 2. Information Card
```json
{
  "type": "card",
  "attributes": {
    "title": "Card Title",
    "Field1": "Value1",
    "Field2": "Value2"
  }
}
```

#### 3. List Display
```json
{
  "type": "list",
  "attributes": {
    "title": "List Title",
    "items": ["Item 1", "Item 2", "Item 3"]
  },
  "options": {
    "ordered": boolean,
    "maxVisibleItems": number,
    "expandable": boolean
  }
}
```

#### 4. Notification
```json
{
  "type": "notification",
  "attributes": {
    "title": "Notification Title",
    "message": "Notification message"
  },
  "options": {
    "severity": "error" | "warning" | "neutral",
    "dismissible": boolean,
    "autoDismiss": boolean,
    "duration": number
  }
}
```

## Component Features

### Dismissible Notifications
Make notifications dismissible by setting the `dismissible` option:

```json
{
  "options": {
    "dismissible": true
  }
}
```

### Display Order
- Error messages are automatically displayed at the top
- Other display types (cards, lists, notifications) appear below the task context
- Multiple displays are rendered in the order they appear in the array

## TypeScript Interfaces

### DisplayConfig Interface
```typescript
export interface DisplayConfig {
  type: 'error' | 'card' | 'list' | 'notification';
  attributes: {
    [key: string]: any;
    title?: string;
    message?: string;
    items?: string[];
  };
  options: {
    severity?: 'error' | 'warning' | 'neutral';
    dismissible?: boolean;
  };
}
```
