export interface PromiseObject {
  promise: Promise<any>;
  resolver: (response?: any) => void;
  rejecter: (response?: any) => void;
}

export type TransferStatus = 'failed'|'completed'|'running'|'initiating'|'queued'|'cancelled';

export type FeatureFlags = 'noBase64Encoding';

export interface ErrorResponse {
  error: boolean;
  message: string;
  debugData?: any;
}

export interface HttpTransferOptions {
  /** Indicate custom Server URL */
  serverUrlOverride?: string;
}

export class HttpTransfer {

  constructor(id: string, spec: TransferSpec, files: File[], status?: TransferStatus, options?: HttpTransferOptions) {
    this.uuid = id;
    this.status = status || 'initiating';
    this.add_time = new Date().toISOString();
    this.transfer_spec = spec;
    this.transport = 'http_gateway';

    if (options && typeof options === 'object' && options.serverUrlOverride) {
      this.serverUrlOverride = options.serverUrlOverride;
    }

    this.files = files.map(file => {
      return {
        lastModified: file.lastModified,
        name: file.name,
        size: file.size,
        type: file.type
      };
    });
    this.current_file = this.files[0] ? this.files[0].name : '';
  }

  setEndTime() {
    this.end_time = new Date().toISOString();
  }

  uuid: string;
  httpGatewayTransfer = true;
  serverUrlOverride?: string;
  transfer_spec: TransferSpec;
  add_time: string;
  current_file: string;
  end_time: string;
  transport: string;
  status: TransferStatus;
  error_desc: string;
  error_code: number;
  bytes_written: number;
  bytes_expected: number;
  files: any[];
  private recentPackets: { timeStamp: number; bytes: number }[] = [];

  get calculated_rate_kbps(): number {
    if (this.recentPackets.length) {
      const timeBetweenLastPackets: number = this.recentPackets[this.recentPackets.length - 1].timeStamp - this.recentPackets[0].timeStamp;
      let bytesWrittenInLastPackets = 0;
      this.recentPackets.forEach(packet => {
        bytesWrittenInLastPackets += packet.bytes;
      });
      if (timeBetweenLastPackets && bytesWrittenInLastPackets) {
        return (((bytesWrittenInLastPackets * 8) / (timeBetweenLastPackets / 1000000)) / 1000);
      }
    }
    return 0;
  }

  recentPacketTransfer(bytes: number): void {
    if (this.recentPackets.length >= 5) {
      this.recentPackets.shift();
    }
    this.recentPackets.push({
      timeStamp: new Date().getTime() * 1000,
      bytes
    });
  }

  get elapsed_usec(): number {
    const endTime = this.end_time ? new Date(this.end_time).getTime() : new Date().getTime();
    return (endTime - new Date(this.add_time).getTime()) * 1000;
  }

  get percentage(): number {
    if (this.bytes_written > 0 && this.bytes_written <= this.bytes_expected) {
      return ((this.bytes_written / this.bytes_expected));
    } else if (this.bytes_written > this.bytes_expected) {
      return 1;
    }
    return 0;
  }
}

export interface TransferSpecPath {
  source: string;
  destination?: string;
}

export interface FolderData {
  path: string;
  files: File[];
}

export class FileSelected {

  constructor(file: any) {
    this.name = file.name;
    this.size = file.size;
    this.type = file.type;
  }

  name: string;
  size: number;
  type: string;
}

export interface DownloadOptions {
  /** Require all files to be zipped when downloaded (even if one file) */
  zipRequire?: boolean;
  /** Do not auto download. Return link to consumer */
  disableAutoDownload?: boolean;
  /** Indicate custom Server URL */
  serverUrlOverride?: string;
}

export interface UploadOptions {
  /** Indicate custom Server URL */
  serverUrlOverride?: string;
}

export interface ConnectStyleFile {
  lastModified: number;
  name: string;
  size: number;
  type: string;
}

export interface TransferSpec {
  authentication?: string;
  cipher?: string;
  content_protection?: string;
  content_protection_passphrase?: string;
  cookie?: string;
  create_dir?: boolean;
  destination_root?: string;
  dgram_size?: number;
  direction?: string;
  fasp_port?: number;
  http_fallback?: boolean;
  http_fallback_port?: number;
  lock_min_rate?: boolean;
  lock_rate_policy?: boolean;
  lock_target_rate?: boolean;
  min_rate_kbps?: number;
  paths?: TransferSpecPath[];
  preserve_times?: boolean;
  rate_policy?: string;
  remote_host?: string;
  remote_password?: string;
  remote_user?: string;
  resume?: string;
  source_root?: string;
  ssh_port?: number;
  tags?: any;
  target_rate_cap_kbps?: number;
  target_rate_kbps?: number;
  token?: string;
  /** GATEWAY SPECIFIC */
  zip_required?: boolean;
}

export interface DataTransferResponse {
  dataTransfer: {
    files: FileSelected[];
  };
}

export interface VideoPlayerOptions {
  /** Specifies that the video will start playing as soon as it is ready (default is false) */
  autoplay?: boolean;
  /** Specifies that video controls should be displayed (such as a play/pause button etc). (default is true) */
  controls?: boolean;
  /** Specifies that the video will start over again, every time it is finished (default is false) */
  loop?: boolean;
  /** Specifies that the audio output of the video should be muted (default is false) */
  muted?: boolean;
  /** URL of an image to be shown while the video is downloading, or until the user hits the play button (default is unset) */
  poster?: string;
  /** Sets the height of the video player (default is auto) */
  height?: number;
  /** Sets the width of the video player (default is 100% of DOM element) */
  width?: number;
  /** Indicate custom Server URL */
  serverUrlOverride?: string;
}
