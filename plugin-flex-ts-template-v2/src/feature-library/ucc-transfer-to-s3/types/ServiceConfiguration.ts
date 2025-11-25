export default interface UccTransferToS3Config {
  enabled: boolean;
  configuration: {
    lambda_link: string;
  };
}
