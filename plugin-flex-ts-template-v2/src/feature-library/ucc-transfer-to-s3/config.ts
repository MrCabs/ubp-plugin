import { getFeatureFlags } from '../../utils/configuration';
import UccTransferToS3Config from './types/ServiceConfiguration';

const getConfig = () => {
  return getFeatureFlags()?.features?.ucc_transfer_to_s3 as UccTransferToS3Config;
}


export const isFeatureEnabled = () => {
  return getConfig()?.enabled;
};

export const getLambdaLink = () => {
  return getConfig()?.configuration.lambda_link || '';
}