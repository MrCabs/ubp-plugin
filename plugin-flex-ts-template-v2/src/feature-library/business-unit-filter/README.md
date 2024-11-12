# Business Unit Filter

This feature allows filtering of Teams View, Queue Stats, and Worker Skills based on business units. It helps organize and manage large contact centers by segmenting views according to business unit assignments.

## Overview

The Business Unit Filter feature provides the following functionality:
- Filters Teams View to only show workers within the same business unit
- Filters Queue Stats to only show queues associated with the business unit
- Filters available Worker Skills based on the business unit's task queues
- Special handling for admin users who can see all teams, queues, and skills

## Configuration

### Enable Feature

The feature can be enabled via the `flex-config` attributes:

```json
{
  "custom_data": {
    "features": {
      "business_unit_filter": {
        "enabled": true,
        "tech_lead_view": false,
        "business_units": {
          "UNIT_NAME": [
            "Queue Name 1",
            "Queue Name 2"
          ]
        }
      }
    }
  }
}
```

### Configuration Parameters

- `enabled`: (boolean) Controls whether the feature is enabled
- `tech_lead_view`: (boolean) Enables additional view options for tech leads
- `business_units`: (object) Maps business unit names to arrays of associated queue names

### Worker Setup

Workers must have a `business_unit` attribute in their Worker attributes. This attribute should match one of the business unit names configured in the feature settings.

Example Worker attributes:
```json
{
  "business_unit": "UNIT_NAME"
}
```

Special case: Setting `business_unit` to "admin" gives the worker access to all teams, queues, and skills.

## How it Works

1. When a worker logs in, the system checks their `business_unit` attribute
2. If the worker has a business unit assigned:
   - Teams View is filtered to only show workers in the same business unit
   - Queue Stats only shows queues configured for that business unit
   - Available Worker Skills are filtered to match the business unit's queues
3. If the worker's business unit is set to "admin":
   - All teams, queues, and skills are visible
4. If no business unit is assigned:
   - No teams or queues are visible
   - No skills are available for selection

## Technical Details

The feature uses several components to implement the filtering:

- `TeamsView.tsx`: Filters the Teams View based on business unit
- `QueueStats.tsx`: Filters queue statistics to show only relevant queues
- `WorkerSkills.tsx`: Filters available skills based on business unit queues
- `UnitHelper.ts`: Contains helper functions for business unit operations
