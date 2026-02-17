export interface PromiseObject {
  promise: Promise<any>;
  resolver: (response?: any) => void;
  rejecter: (response?: any) => void;
}

export interface ErrorResponse {
  error: boolean;
  message: string;
  debugData?: any;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileDialogOptions {
  /** The title of the file dialog */
  title?: string;
  /** Allow user to select multiple files */
  multiple?: boolean;
  /** The file types to filter by */
  filters?: FileFilter[];
  /** ID for old HTTP gateway (v2) */
  http_gateway_v2_transfer_id?: string;
}

export interface FolderDialogOptions {
  /** The title of the folder dialog */
  title?: string;
  /** Allow user to select multiple folders */
  multiple?: boolean;
}

/**
 * Options related to fetching the latest Aspera installer information.
 *
 * These options allow clients to customize where the installer information is fetched from
 * (e.g. when self-hosting) as well as which installer information is returned back to the caller.
 */
export interface InstallerOptions {
  /**
   * Custom URL to fetch Aspera installers from. Generally this is only
   * needed when self-hosting the installers rather than using the installers
   * hosted by IBM.
   *
   * This URL should point to the directory containing the `latest.json` file that
   * contains the installer information.
   *
   * Example: `https://example.com/aspera/sdk/downloads`
   */
  endpoint?: string;
  /**
   * If `true`, the response will contain the installer info for all platforms.
   * By default, only the installer info for the user's detected platform is returned.
   */
  all?: true;
}

/** Data response containing the file(s) and folder(s) selected or dropped by the user. */
export interface DataTransferResponse {
  dataTransfer: {
    files: BrowserStyleFile[];
  };
}

export interface BrowserStyleFile {
  /** Last modified date of the file in milliseconds since the UNIX epoch */
  lastModified: number;
  /** Absolute path of the file */
  name: string;
  /** Size in bytes of the file */
  size: number;
  /** Mime type of the file */
  type: string;
}

/** Request to read an entire file as a base64-encoded string */
export interface ReadAsArrayBufferRequest {
  /** Absolute path to the file */
  path: string;
}

/** Response containing file data as a base64-encoded string */
export interface ReadAsArrayBufferResponse {
  /** File bytes as base64-encoded string */
  data: string;
  /** Mime type of the file */
  type: string;
}

/** Request to read a chunk of a file as a base64-encoded string */
export interface ReadChunkAsArrayBufferRequest {
  /** Absolute path to the file */
  path: string;
  /** Offset to start reading the file, in bytes */
  offset: number;
  /** The size of the chunk, in bytes */
  chunkSize: number;
}

/** Response containing file chunk data as a base64-encoded string */
export interface ReadChunkAsArrayBufferResponse {
  /** File chunk as a base64-encoded string */
  data: string;
  /** Mime type of the file */
  type: string;
}

export interface ModifyTransferOptions {
  /**
   * @deprecated Use `lock_min_rate_kbps` instead.
   */
  lock_min_rate?: boolean;
  /**
   * If `true`, lock the minimum transfer rate to the value set for `min_rate_kbps`.
   * If `false`, users can adjust the transfer rate up to the value set for `target_rate_cap_kbps`.
   */
  lock_min_rate_kbps?: boolean;
  /**
   * Lock the rate policy to the value set for `rate_policy`.
   */
  lock_rate_policy?: boolean;
  /**
   * @deprecated Use `lock_target_rate_kbps` instead.
   */
  lock_target_rate?: boolean;
  /**
   * If `true`, lock the target transfer rate to the default value set for `target_rate_kbps`.
   * If `false`, users can adjust the transfer rate up to the value set for `target_rate_cap_kbps`.
   */
  lock_target_rate_kbps?: boolean;
  /* Minimum transfer rate, in kilobits per second */
  min_rate_kbps?: number;
  /**
   * The congestion control behavior to use when sharing bandwidth.
   *
   * - `fixed` - Transfer at the target rate regardless of actual network capacity. Do not share bandwidth. Not recommended.
   * - `high` - When sharing bandwidth, transfer at twice the rate of a transfer using "fair" policy.
   * - `fair` - Share bandwidth equally with other traffic.
   * - `low` - Use only unutilized bandwidth.
   */
  rate_policy?: 'fixed'|'fair'|'high'|'low';
  /** Ideal transfer rate, in kilobits per second. */
  target_rate_kbps?: number;
  /** Maximum target rate for incoming transfers, in kilobits per second. */
  target_rate_cap_kbps?: number;
}

export interface ResumeTransferOptions {
  remote_user?: string;
  remote_password?: string;
  token?: string;
  /**
   * @deprecated Use `content_protection_password` instead.
   */
  content_protection_passphrase?: string;
  content_protection_password?: string;
}

export interface CustomBrandingOptions {
  /** Display name for the branding template. This name is presented to the end user in the app settings when switching between different templates. */
  name: string;
  /** Custom theme template. */
  theme: CustomTheme;
}

export interface AsperaSdkSpec {
  /**
   * By default, the destination of a download is relative to the user's download directory setting.
   * Setting this value to `true` overrides this behavior, using absolute paths instead. This is useful
   * if you want to allow users to download files to a specific directory.
   */
  use_absolute_destination_path?: boolean;
  /**
   * Base64 encoded preview image for the transfer. This image is displayed in the IBM Aspera transfer monitor
   * alongside the transfer.
   */
  preview_base64?: string;

  /**
   * When `false`, IBM Aspera for desktop disables automatic UI prompts, except when the user must authorize
   * transfers to untrusted hosts.
   */
  allow_dialogs?: boolean;
  /**
   * HTTP Gateway Server override. This will not verify server but switch a transfer to use
   * this server instead of the default one that initiated the SDK.
   */
  http_gateway_override_server_url?: string;
  /**
   * HTTP Gateway Server authentication data.
   * This will be added to transfer calls to authenticate against servers when required.
   * Auth flows are only added when these are present here.
   */
  http_gateway_authentication?: {
    /** Aspera Access Key */
    access_key: string;
    /** Aspera Bearer Token (do not include type, only the token itself) */
    token: string;
  }
  /**
   * HTTP Gateway v2 transferID. This is not required for v3 gateways.
   * This is for backwards compatibility with the old SDK.
   */
  http_gateway_v2_transfer_id?: string;
}

export interface Path {
  /** Source path for the transfer */
  source: string;
  /** Destination path for the transfer */
  destination?: string;
}

export interface FaspProxy {
  /** URL of proxy server */
  url?: string;
  /** Username for the proxy user */
  usename?: string;
  /** assword for the proxy user */
  password?: string;
}

export type OverwritePolicy = 'none'|'always'|'diff'|'older'|'diff+older';
export type ResumePolicy = 'none'|'attributes'|'sparse_checksum'|'full_checksum';

export interface TransferSpec {
  /**
   * The type of authentication to use.
   * @deprecated Either set the `token` or `remote_password` fields instead.
   */
  authentication?: 'token'|'password';
  /**
   * The algorithm used to encrypt data sent during a transfer.
   * @default "aes-128"
   */
  cipher?: 'aes128'|'aes192'|'aes256'|'aes128cfb'|'aes192cfb'|'aes256cfb'|'aes128gcm'|'aes192gcm'|'aes256gcm'|'none';
  /**
   * Enable content protection (encryption-at-rest). For uploads, set to `encrypt` to transfer
   * files and store them on the server with the extension “.aspera-env”. To download and decrypt
   * encrypted files, set to `decrypt`. `content_protection_password` must be specified if this option is set.
   */
  content_protection?: 'encrypt'|'decrypt';
  /**
   * @deprecated Use `content_protection_password` instead.
   */
  content_protection_passphrase?: string;
  /** Password to encrypt or decrypt files when using `content_protection`. */
  content_protection_password?: string;
  /**
   * Data to associate with the transfer. The cookie is reported to both client and server-side applications monitoring transfers.
   * It is often used by applications to identify associated transfers.
   */
  cookie?: string;
  /**
   * Creates the destination directory if it does not already exist.
   * When enabling this option, the destination path is assumed to be a directory path.
   * @default false
   */
  create_dir?: boolean;
  /**
   * Before transfer, delete files that exist at the destination but not at the source.
   * The source and destination arguments must be directories that have matching names.
   * Objects on the destination that have the same name but different type or size as objects
   * on the source are not deleted.
   */
  delete_before_transfer?: boolean;
  /**
   * The transfer destination file path. If destinations are specified in `paths`, this value is prepended to each destination.
   * Note that the download destination paths are relative to the user's Aspera SDK download directory setting.
   */
  destination_root?: string;
  /** Root ID at the destination */
  destination_root_id?: string;
  /** Delete the source directory after the assets are transferred */
  delete_source?: boolean;
  /** Directon of transfer, whether send (upload) or receive (download) */
  direction?: 'send'|'receive';
  /**
   * Exclude files (but not directories) that are newer than a specific time from the transfer, based on when the file was last modified.
   * Express in ISO 8601 format (for exanple, 2006-01-02T15:04:05Z) or as number of seconds elapsed since 00:00:00 UTC on 1 January 1970.
   */
  exclude_newer_than?: string;
  /**
   * Exclude files (but not directories) that are older than a specific time from the transfer, based on when the file was last modified.
   * Express in ISO 8601 format (for exanple, 2006-01-02T15:04:05Z) or as number of seconds elapsed since 00:00:00 UTC on 1 January 1970.
   */
  exclude_older_than?: string;
  /**
   * The UDP port for the transfer. The default value is satisfactory for most situations. However, it can be changed to satisfy firewall requirements.
   * @default 33001
   */
  fasp_port?: number;
  /** Proxy for communications between the remote server and the (local) client */
  fasp_proxy?: string;
  /**
   * Attempts to perform an HTTP transfer if a fasp™ transfer cannot be performed.
   * @default false
   */
  http_fallback?: boolean;
  /** Port used for HTTP fallback server */
  http_fallback_port?: number;
  /** Port used for HTTPS fallback server */
  https_fallback_port?: number;
  /**
   * @deprecated Use `lock_min_rate_kbps` instead.
   */
  lock_min_rate?: boolean;
  /**
   * If `true`, lock the minimum transfer rate to the value set for `min_rate_kbps`.
   * If `false`, users can adjust the transfer rate up to the value set for `target_rate_cap_kbps`.
   * @default false
   */
  lock_min_rate_kbps?: boolean;
  /**
   * If true, lock the rate policy to the default value
   * @default false
   */
  lock_rate_policy?: boolean;
  /**
   * @deprecated Use `lock_target_rate_kbps` instead.
   */
  lock_target_rate?: boolean;
  /**
   * If `true`, lock the target transfer rate to the default value set for `target_rate_kbps`.
   * If `false`, users can adjust the transfer rate up to the value set for `target_rate_cap_kbps`.
   * @default false
   */
  lock_target_rate_kbps?: boolean;
  /** Moves source files to directory after they are transferred correctly */
  move_after_transfer?: string;
  /** Split files across multiple ascp sessions to enable faster transfers. */
  multi_session?: number;
  /**
   * Split files across multiple ascp sessions if their size is greater than or equal to the specified value.
   * @default 0 (no files are split)
   */
  multi_session_threshold?: number;
  // min_rate_kbps?: number; // FIXME: This is not a valid field in SDK
  /**
   * Overwrite destination files with the source files of the same name.
   *
   * - `none` - Never overwrite the file. However, if the parent folder is not empty, its access, modify, and change times may still be updated.
   * - `always` - Always overwrite the file. The destination file will be overwritten even if it is identical to the source.
   * - `diff` - Overwrite the file if it is different from the source, depending on the `resume_policy` property.
   * - `older` - Overwrite the file if its timestamp is older than the source timestamp.
   * - `diff+older` - Overwrite the file if it is older and different than the source, depending on the `resume_policy` property.
   *
   * If the overwrite_policy is `diff` or `diff+older`, difference is determined by `resume_policy`. If `resume_policy` is empty or none is specified,
   * the source and destination files are always considered different and the destination file is always overwritten. If `resume_policy` is `attributes`,
   * the source and destination files are compared based on file attributes (currently file size). If `sparse_checksum`, the source and destination files
   * are compared based on sparse checksum. If `full_checksum`, the source and destination files are compared based on full checksum.
   * @default diff
   */
  overwrite?: OverwritePolicy;
  /**
   * @deprecated Use `overwrite` instead.
   */
  overwrite_policy?: OverwritePolicy;
  /**
   * A list of the file and directory paths to transfer. Use `destination_root` to specify the destination directory.
   * It is recommended to always specify both the `source` and `destination` properties for each path.
   */
  paths?: Path[];
  /** Calculate total size before transfer */
  precalculate_job_size?: boolean;
  /** Preserve the time the file was last accessed (read or write access) on the source. */
  preserve_access_time?: boolean;
  /** Preserve timestamp for when a file is created */
  preserve_creation_time?: boolean;
  /** Preserve the time the object was last modified (write access) on the source. */
  preserve_modification_time?: boolean;
  /** Preserve file timestamps */
  preserve_times?: boolean;
  /**
   * The congestion control behavior to use when sharing bandwidth.
   *
   * - `fixed` - Transfer at the target rate regardless of actual network capacity. Do not share bandwidth. Not recommended.
   * - `high` - When sharing bandwidth, transfer at twice the rate of a transfer using "fair" policy.
   * - `fair` - Share bandwidth equally with other traffic.
   * - `low` - Use only unutilized bandwidth.
   * @default fair
   */
  rate_policy?: 'fixed'|'fair'|'high'|'low';
  /** Access key for the remote server */
  remote_access_key?: string;
  /** The fully qualified domain name or IP address of the transfer server. */
  remote_host?: string;
  /** Password for the remote user */
  remote_password?: string;
  /** Remote user’s username */
  remote_user?: string;
  /** Remove files at the source of the transfer after the transfer completes successfully */
  remove_after_transfer?: boolean;
  /** Remove empty subdirectories at the source of the transfer */
  remove_empty_directories?: boolean;
  /** Remove empty source subdirectories and remove the source directory itself, if empty */
  remove_empty_source_dir?: boolean;
  /**
   * @deprecated Use `resume_policy` instead.
   */
  resume?: ResumePolicy;
  /**
   * If a transfer is interrupted or fails to finish, this policy directs the transfer to resume without retransferring the files.
   *
   * - `none` – always re-transfer the entire file.
   * - `attributes` – compare file attributes and resume if they match, and re-transfer if they do not.
   * - `sparse_checksum` – compare file attributes and the sparse file checksums; resume if they match, and re-transfer if they do not.
   * - `full_checksum` – compare file attributes and the full file checksums; resume if they match, and re-transfer if they do not.
   * @default 2
   */
  resume_policy?: ResumePolicy;
  /** Total time committed to retrying the transfer */
  retry_duration?: number;
  /**
   * @deprecated Use `save_before_overwrite` instead.
   */
  'save-before-overwrite'?: boolean;
  /** Rename the file instead of overwriting it. `resume_policy` must be set to `none` for this to take effect. */
  save_before_overwrite?: boolean;
  /** Don’t check for duplicate files at the destination. */
  skip_duplicate_check?: boolean;
  /** All assets other than files, directories and symbolic links are considered special. A transfer will fail if the user attempts to transfer special assets.
   * If `true`, ascp skips special assets and proceeds with the transfer of all other assets.
   */
  skip_special_files?: boolean;
  /** A path to prepend to the source paths specified in `paths`. If this is not specified, then `paths` should contain absolute paths. */
  source_root?: string;
  source_root_id?: string;
  /** The folder name below which the directory structure is preserved (base64 encoded) */
  src_base64?: string;
  /**
   * TCP port that initiates the transfer session
   * @default 33001
   */
  ssh_port?: number;
  /** Private key for SSH */
  ssh_private_key?: string;
  /** Private key passphrase for SSH */
  ssh_private_key_passphrase?: string;
  /** The method for processing symbolic links. */
  symlink_policy?: 'follow'|'copy'|'copy+force'|'skip';
  /** Tags to include in the transfer */
  tags?: any&{
    /** IBM Aspera specific tags for IBM Aspera apps. */
    aspera: {
      /** HTTP Gateway tags set by the server */
      'http-gateway': {
        /** Expected size of the transfer for HTTP Gateway. If this is set and passes requirements in browser transfers may be used. */
        expected_size: number;
      };
    };
  };
  /** Tags to include in the transfer (base64 encoded) */
  tags64?: string;
  /** Maximum target rate for incoming transfers, in kilobits per second. */
  target_rate_cap_kbps?: number;
  /** Ideal transfer rate, in kilobits per second. There is no default value. */
  target_rate_kbps?: number;
  /** Title of the transfer */
  title?: string;
  /** Used for token-based authorization, which involves the server-side application generating a token that gives the client rights to transfer a predetermined set of files. */
  token?: string;
  /** Use ascp4 as the transfer engine. */
  use_ascp4?: boolean;
}

export type TransferStatus = 'failed'|'completed'|'running'|'queued'|'removed'|'canceled'|'orphaned'|'paused';

/** Pagination options for paginated API requests. */
export interface Pagination {
  /** Maximum number of entries to return. (Default: 1000) */
  limit?: number;
  /** Number of entries to skip from the beginning. (Default: 0) */
  offset?: number;
}

/** Paginated response containing file-level transfer progress. */
export interface PaginatedFilesResponse {
  /** The file entries for this page. */
  entries: FileStat[];
  /** Total number of files in the transfer. */
  total_count: number;
  /** The limit used for the request. */
  limit: number;
  /** The offset used for the request. */
  offset: number;
}

/** Status of an individual file within a transfer. */
export type FileStatus = 'failed'|'skipped'|'finished'|'running';

/** Error information for a file that failed to transfer. */
export interface FileError {
  /** Error code */
  code: number;
  /** Human-readable error description */
  description: string;
}

/** Progress information for an individual file within a transfer. */
export interface FileStat {
  /** The file path */
  file: string;
  /** Number of bytes written for this file */
  bytes_written: number;
  /** Number of bytes expected for this file */
  bytes_expected: number;
  /** Time elapsed in microseconds for this file */
  elapsed_usec: number;
  /** Error information if the file failed */
  error?: FileError;
  /** Status of this file */
  status: FileStatus;
}

export interface AsperaSdkTransfer {
  /** The ID of the transfer */
  uuid: string;
  /** The transferSpec that started the transfer (secrets redacted) */
  transfer_spec: TransferSpec;
  /** ISO date string when transfer was started */
  add_time: string;
  /** The name of the current file being transferred */
  current_file: string;
  /** The count of files being transferred */
  file_counts: {
    /** Number of files attempted */
    attempted: number;
    /** Number of files completed */
    completed: number;
    /** Number of files failed */
    failed: number;
    /** Number of files skipped */
    skipped: number;
  };
  /** ISO date string when transfer finished (empty string if not finished) */
  end_time: string;
  /** The path opened in Explorer/Finder when user clicks 'Open Containing Folder' in the application */
  explorer_path: string;
  /** The status of the transfer */
  status: TransferStatus;
  /** The transfer error description if the status is error */
  error_desc?: string;
  /** The transfer error code (SSH or HTTP) if the status is error */
  error_code?: number;
  /** The number of bytes written to storage for this transfer */
  bytes_written: number;
  /** The number of bytes expected to be written to storage for this transfer */
  bytes_expected: number;
  /** The current calculated rate of the fasp transfer */
  calculated_rate_kbps: number;
  /** The time the transfer has been running in microseconds */
  elapsed_usec: number;
  /** The percentage of the transfer 0 - 1 (0.6 = 60%) */
  percentage: number;
  /** Remaining time in microseconds */
  remaining_usec: number;
  /** The title of the transfer */
  title: string;
  /** Indicate if HTTP Gateway transfer */
  httpGatewayTransfer?: boolean;
  /** Indicate the request id of the HTTP Gateway transfer */
  httpRequestId?: string;
  /** Indicate if the HTTP Gateway transfer is being done via browser download manager. (No progress updates) */
  httpDownloadExternalHandle?: boolean;
}

export interface InstallerInfo {
  /** Platform  */
  platform: 'macos'|'windows'|'linux';
  /** Architecture */
  arch: string;
  /** Installer type e.g. dmg, msi, etc. */
  type: string;
  /** Download URL */
  url: string;
  /** Version */
  version: string;
}

export interface InstallerInfoResponse {
  /** List of installers */
  entries: InstallerInfo[];
}

export type WebsocketTopics = 'subscribe_transfer_activity' | 'transfer_activity';
export type WebsocketEvent = 'CLOSED' | 'RECONNECT';
export type SafariExtensionEvent = 'ENABLED' | 'DISABLED';

export interface WebsocketMessage {
  jsonrpc: '2.0';
  method: WebsocketTopics;
  params: any;
  id: number;
}

export interface CustomThemeItems {
  /** Font family for typography */
  typographyFontFamily?: string;
  /** Header Background color */
  headerBackground?: string;
  /** Header text and icon color */
  headerTextIcon?: string;
  /** Header clickable items background color while active */
  headerActiveItemBackground?: string;
  /** Header clickable item icon color while active */
  headerActiveItemColor?: string;
  /** Header hover item icon background */
  headerHoverItemBackground?: string;
  /* Header accent borders */
  headerAccentBorders?: string;
  /** Left nav background */
  leftNavBackground?: string;
  /** Left nav text color */
  leftNavTextColor?: string;
  /** Left nav active background */
  leftNavActiveItemBackground?: string;
  /** Left nav active accent (left color) */
  leftNavActiveItemAccent?: string;
  /** Left nav hover background */
  leftNavActiveItemHover?: string;
  /** Login panel background color */
  loginPanelBackgroundColor?: string;
  /** Login panel text color */
  loginPanelTextColor?: string;
  /** Login in panel announcement background color */
  loginInPanelAnnouncementBackgroundColor?: string;
  /** Login in panel announcement text color */
  loginInPanelAnnouncementTextColor?: string;
  /** Login floating announcement background color  */
  loginAnnouncementBackgroundColor?: string;
  /** Login floating announcement text color */
  loginAnnouncementBackgroundTextColor?: string;
  /** Button primary background */
  buttonPrimaryBackground?: string;
  /** Button primary text */
  buttonPrimaryText?: string;
  /** Button primary hover background */
  buttonPrimaryBackgroundHover?: string;
  /** Button primary active background */
  buttonPrimaryBackgroundActive?: string;
  /** Button secondary background */
  buttonSecondaryBackground?: string;
  /** Button secondary text */
  buttonSecondaryText?: string;
  /** Button secondary hover background */
  buttonSecondaryBackgroundHover?: string;
  /** Button secondary active background */
  buttonSecondaryBackgroundActive?: string;
  /** Button tertiary border */
  buttonTertiaryBorder?: string;
  /** Button tertiary text */
  buttonTertiaryText?: string;
  /** Button tertiary text for active and hover states */
  buttonTertiaryTextHoverActive?: string;
  /** Button tertiary hover background */
  buttonTertiaryBackgroundHover?: string;
  /** Button tertiary active background */
  buttonTertiaryBackgroundActive?: string;
  '$background'?: string;
  '$background-hover'?: string;
  '$background-active'?: string;
  '$background-selected'?: string;
  '$background-selected-hover'?: string;
  '$background-inverse'?: string;
  '$background-inverse-hover'?: string;
  '$background-brand'?: string;
  '$layer-01'?: string;
  '$layer-02'?: string;
  '$layer-03'?: string;
  '$layer-hover-01'?: string;
  '$layer-hover-02'?: string;
  '$layer-hover-03'?: string;
  '$layer-active-01'?: string;
  '$layer-active-02'?: string;
  '$layer-active-03'?: string;
  '$layer-selected-01'?: string;
  '$layer-selected-02'?: string;
  '$layer-selected-03'?: string;
  '$layer-selected-hover-01'?: string;
  '$layer-selected-hover-02'?: string;
  '$layer-selected-hover-03'?: string;
  '$layer-selected-inverse'?: string;
  '$layer-selected-disabled'?: string;
  '$layer-accent-01'?: string;
  '$layer-accent-02'?: string;
  '$layer-accent-03'?: string;
  '$layer-accent-hover-01'?: string;
  '$layer-accent-hover-02'?: string;
  '$layer-accent-hover-03'?: string;
  '$layer-accent-active-01'?: string;
  '$layer-accent-active-02'?: string;
  '$layer-accent-active-03'?: string;
  '$field-01'?: string;
  '$field-02'?: string;
  '$field-03'?: string;
  '$field-hover-01'?: string;
  '$field-hover-02'?: string;
  '$field-hover-03'?: string;
  '$border-interactive'?: string;
  '$border-subtle-00'?: string;
  '$border-subtle-01'?: string;
  '$border-subtle-02'?: string;
  '$border-subtle-03'?: string;
  '$border-subtle-selected-01'?: string;
  '$border-subtle-selected-02'?: string;
  '$border-subtle-selected-03'?: string;
  '$border-strong-01'?: string;
  '$border-strong-02'?: string;
  '$border-strong-03'?: string;
  '$border-tile-01'?: string;
  '$border-tile-02'?: string;
  '$border-tile-03'?: string;
  '$border-inverse'?: string;
  '$border-disabled'?: string;
  '$text-primary'?: string;
  '$text-secondary'?: string;
  '$text-placeholder'?: string;
  '$text-on-color'?: string;
  '$text-on-color-disabled'?: string;
  '$text-helper'?: string;
  '$text-error'?: string;
  '$text-inverse'?: string;
  '$text-disabled'?: string;
  '$link-primary'?: string;
  '$link-primary-hover'?: string;
  '$link-secondary'?: string;
  '$link-inverse'?: string;
  '$link-visited'?: string;
  '$icon-primary'?: string;
  '$icon-secondary'?: string;
  '$icon-on-color'?: string;
  '$icon-on-color-disabled'?: string;
  '$icon-interactive'?: string;
  '$icon-inverse'?: string;
  '$icon-disabled'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-primary'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-primary-hover'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-primary-active'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-secondary'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-secondary-hover'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-secondary-active'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-tertiary'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-tertiary-hover'?: string;
  /** These are ignored if core buttons are set for similar values */
  '$button-tertiary-active'?: string;
  '$button-danger-primary'?: string;
  '$button-danger-secondary'?: string;
  '$button-danger-hover'?: string;
  '$button-danger-active'?: string;
  '$button-separator'?: string;
  '$button-disabled'?: string;
  '$support-error'?: string;
  '$support-success'?: string;
  '$support-warning'?: string;
  '$support-info'?: string;
  '$support-error-inverse'?: string;
  '$support-success-inverse'?: string;
  '$support-warning-inverse'?: string;
  '$support-info-inverse'?: string;
  '$focus'?: string;
  '$focus-inset'?: string;
  '$focus-inverse'?: string;
  '$interactive'?: string;
  '$highlight'?: string;
  '$toggle-off'?: string;
  '$overlay'?: string;
  '$skeleton-element'?: string;
  '$skeleton-background'?: string;
}

export interface CustomTheme {
  g10: CustomThemeItems;
  g100: CustomThemeItems;
  disableLightDarkMode?: boolean;
}

export interface InitOptions {
  /** The application ID to link to. This should be unique for each use app/user. */
  appId?: string;
  /** Indicate if the computer is running multiple users possibly (avoid port crossing). */
  supportMultipleUsers?: boolean;
  /** HTTP Gateway Settings */
  httpGatewaySettings?: {
    /** Aspera HTTP Gateway URL to use if desktop is not available. Include gateway route but not versions (example: https://example.com/aspera/http-gwy). */
    url: string;
    /** Indicate if HTTP Gateway should be forced. This will not start desktop if httpGatewayUrl is valid. */
    forceGateway: boolean;
  };
  /** Connect Settings */
  connectSettings?: {
    /** Use connect. Indicate if Connect should be used instead of Desktop. */
    useConnect: boolean;
    /** Minimum version of Connect to allow */
    minVersion?: string;
    /** Indicate if Drag and Drop is enabled */
    dragDropEnabled?: boolean;
    /** Method for Connect communication. Default is extension */
    method?: 'http'|'extension';
    /** Location of SDK for downloads */
    sdkLocation?: string;
    /** Correlation ID for connecting to IBMid users */
    correlationId?: string;
    /** Indicate if default Connect installer window should not be shown */
    hideIncludedInstaller?: boolean;
  }
}

export interface InstallerUrlInfo {
  /** Base URL of the Desktop download server */
  base: string;
  /** URL to the latest installers (GA release) */
  latest: string;
}

export interface OpenRpcSpec {
  /** List of RPC methods supported by the application */
  methods: RpcMethod[]
}

export interface RpcMethod {
  /** The RPC method name */
  name: string;
}

/**
 * Describes the high-level capabilities supported by the SDK.
 */
export interface SdkCapabilities {
  /**
   * Whether the SDK can read file contents for generating image previews.
   *
   * Image preview is supported if the SDK is using HTTP Gateway, Connect, or IBM Aspera for desktop
   * with the required RPC methods.
  */
  imagePreview: boolean,
}
