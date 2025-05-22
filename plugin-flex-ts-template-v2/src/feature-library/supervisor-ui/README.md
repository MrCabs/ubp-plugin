# Supervisor UI Feature

This feature enhances the supervisor experience in Flex by providing a graphical interface to manage various Flex configurations without needing to modify JSON files directly.

## Overview

The Supervisor UI feature adds custom components and functionality specifically designed for supervisors in the Flex interface. Currently, it provides a user interface for managing agent automation settings that were previously only configurable through configuration files.

### Current Features

#### Agent Automation Settings Panel
- **Auto Accept**: Configure automatic task acceptance for agents
- **Auto Select**: Configure automatic task selection in the agent UI
- **Auto Wrapup**: Set automatic task completion behavior
  - Configurable wrapup timing
  - Custom default outcome settings
- **Role-based access control**: Only accessible to users with admin, supervisor role

## Configuration

The feature requires two configuration parts:

1. Enable the Supervisor UI feature:
```typescript
{
  ui_attributes: {
    custom_data: {
      features: {
        supervisor_ui: {
          enabled: true
        }
      }
    }
  }
}
```

2. Configure Agent Automation settings:
```typescript
{
  ui_attributes: {
    custom_data: {
      features: {
        agent_automation: {
          enabled: true,
          configuration: [
            {
              channel: "voice",
              auto_accept: true,
              auto_select: true,
              auto_wrapup: true,
              wrapup_time: 30000,
              allow_extended_wrapup: false,
              extended_wrapup_time: 0,
              default_outcome: "Automatically completed",
              required_attributes: [],
              required_worker_attributes: []
            }
          ]
        }
      }
    }
  }
}
```

## Technical Details

- Uses the existing admin-ui serverless functions for configuration management:
  - `/admin-ui/flex/fetch-config`: Retrieves current configuration
  - `/admin-ui/flex/update-config`: Updates configuration

- Component Structure:
  - `SupervisorSettings`: Main component container
  - `AgentAutomation`: Tab component for agent automation settings
  - Uses Twilio Paste components for UI elements

- Configuration is stored under `ui_attributes.custom_data.features` to maintain consistency with other Flex template features


## Usage

1. Navigate to "Supervisor Settings" in the side navigation menu (requires admin role)
2. Access the Agent Automation tab
3. Configure settings:
   - Toggle Auto Accept for automatic task acceptance
   - Toggle Auto Select for automatic task selection
   - Toggle Auto Wrapup and set timing for automatic completion
   - Set default outcome for auto-completed tasks
4. Save changes for immediate effect
