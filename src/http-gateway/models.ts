export interface HttpGatewayInfo {
  version: string;
  name: string;
  upload_endpoint: string;
  download_endpoint: string;
  endpoints: string[];
}

export interface HttpGatewayDownloadLegacy {
  transfer_spec_id: string;
  url: string;
}

export type HttpGatewayDownload = ReadableStream<Uint8Array<ArrayBuffer>>;

export type HttpGatewayUpload = null

export interface HttpGatewayPresign {
  signed_url: string;
}
