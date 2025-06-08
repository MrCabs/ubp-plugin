import { getFeatureFlags } from '../../utils/configuration';

const { enabled = false, sync_map_name = 'AuditLogs' } = getFeatureFlags()?.features?.audit_logging || {};

export const isFeatureEnabled = () => enabled;
export const getSyncMapName = () => sync_map_name;
