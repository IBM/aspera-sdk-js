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
}

export interface FolderDialogOptions {
  /** The title of the folder dialog */
  title?: string;
  /** Allow user to select multiple folders */
  multiple?: boolean;
}

/**
 * Options related to fetching the latest Aspera for Desktop installer information.
 *
 * These options allow clients to customize where the installer information is fetched from
 * (e.g. when self-hosting) as well as which installer information is returned back to the caller.
 */
export interface InstallerOptions {
  /**
   * Custom URL to fetch Aspera for Desktop installers from. Generally this is only
   * needed when self-hosting the installers rather than using the installers
   * hosted on CloudFront.
   *
   * This URL should point to the directory containing the `latest.json` file that
   * contains the installer information.
   *
   * Example: `https://example.com/aspera/desktop/downloads`
   */
  endpoint?: string;
  /**
   * If `true`, the response will contain the installer info for all platforms.
   * By default, only the installer info for the user's detected platform is returned.
   */
  all?: true;
}

export interface DesktopStyleFile {
  /** Last modified date of the file in milliseconds since the UNIX epoch */
  lastModified: number;
  /** Absolute path of the file */
  name: string;
  /** Size in bytes of the file */
  size: number;
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

export interface DesktopSpec {
  /**
   * By default, the destination of a download is relative to the user's download directory setting.
   * Setting this value to `true` overrides this behavior, using absolute paths instead. This is useful
   * if you want to allow users to download files to a specific directory.
   */
  use_absolute_destination_path?: boolean;
  /**
   * Base64 encoded preview image for the transfer. This image is displayed in the IBM Aspera Desktop transfer monitor
   * alongside the transfer.
   */
  preview_base64?: string;
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
   * Note that the download destination paths are relative to the user's Aspera Desktop download directory setting.
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
  // min_rate_kbps?: number; // FIXME: This is not a valid field in desktop
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
  tags?: any;
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

export interface DesktopTransfer {
  /** The ID of the transfer */
  uuid: string;
  /** The transferSpec that started the transfer (secrets redacted) */
  transfer_spec: TransferSpec;
  /** ISO date string when transfer was started */
  // add_time: string; // FIXME: Not yet added in desktop
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
  /** The path opened in Explorer/Finder when user clicks 'Open Containing Folder' in the desktop application */
  explorer_path: string;
  /** The status of the transfer */
  status: TransferStatus;
  /** The transfer error description if the status is error */
  error_desc: string;
  /** The transfer error code (SSH or HTTP) if the status is error */
  error_code: number;
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
  // remaining_usec: number; // FIXME: Not yet added in desktop
  /** The title of the transfer */
  title: string;
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

export interface WebsocketMessage {
  jsonrpc: '2.0';
  method: WebsocketTopics;
  params: any;
  id: number;
}
