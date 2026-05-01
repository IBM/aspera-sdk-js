import './Demo.scss';
import {
  initSession,
  registerStatusCallback,
  registerActivityCallback,
  startTransfer,
  stopTransfer,
  resumeTransfer,
  showDirectory,
  showSelectFileDialog,
  showSelectFolderDialog,
  showAbout,
  showPreferences,
  showTransferManager,
  createDropzone,
  getCapabilities,
  getInfo,
  getInstallerInfo,
  getTransfer,
  hasCapability,
  launch,
  removeTransfer,
  currentTransferClient,
} from '@ibm-aspera/sdk';
import type { AsperaSdkInfo, AsperaSdkTransfer, BrowserStyleFile, InstallerInfo, SdkCapabilities, SdkStatus, TransferClient, TransferSpec } from '@ibm-aspera/sdk';
import {
  Button,
  Dropdown,
  Modal,
  ProgressBar,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react';
import { CheckmarkFilled, CloseFilled, Download, Folder, FolderOpen, Document, Restart, Settings, StopFilledAlt, TrashCan, Information, ListChecked, View } from '@carbon/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type ModeId =
  | 'gateway-only'
  | 'desktop-only'
  | 'desktop+gateway'
  | 'connect+gateway'
  | 'desktop->connect-fallback+gateway';

interface ModeOption {
  id: ModeId;
  label: string;
  description: string;
  requiresGateway: boolean;
}

const MODES: ModeOption[] = [
  { id: 'desktop-only', label: 'Desktop only', description: 'Native IBM Aspera for desktop. Fastest transfers; requires the desktop app to be installed.', requiresGateway: false },
  { id: 'desktop+gateway', label: 'Desktop + HTTP Gateway', description: 'Try desktop first; fall back to HTTP Gateway if desktop is unavailable.', requiresGateway: true },
  { id: 'connect+gateway', label: 'Connect + HTTP Gateway', description: 'Use IBM Aspera Connect (browser plugin); HTTP Gateway available as a fallback.', requiresGateway: true },
  { id: 'desktop->connect-fallback+gateway', label: 'Desktop → Connect fallback + HTTP Gateway', description: 'Try desktop, fall back to Connect, with HTTP Gateway as an additional fallback.', requiresGateway: true },
  { id: 'gateway-only', label: 'HTTP Gateway only', description: 'Force HTTP Gateway; no native client detection. Works in any browser.', requiresGateway: true },
];

const DEFAULT_TRANSFER_SPEC = JSON.stringify(
  {
    direction: 'send',
    remote_host: 'demo.asperasoft.com',
    remote_user: 'aspera',
    remote_password: 'demoaspera',
    paths: [],
    target_rate_kbps: 100000,
  },
  null,
  2,
);

interface StatusEvent {
  status: SdkStatus;
  timestamp: number;
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatRate = (kbps: number): string => {
  if (!kbps || kbps < 0) return '0 Mbps';
  const mbps = kbps / 1000;
  if (mbps < 1) return `${kbps.toFixed(0)} Kbps`;
  return `${mbps.toFixed(1)} Mbps`;
};

const formatEta = (remainingUsec: number): string | null => {
  if (!remainingUsec || remainingUsec < 0) return null;
  const totalSeconds = Math.round(remainingUsec / 1_000_000);
  if (totalSeconds < 1) return null;
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
};

const transferClientLabel = (client: TransferClient | undefined): string => {
  if (client === 'desktop') return 'IBM Aspera for desktop';
  if (client === 'connect') return 'IBM Aspera Connect';
  if (client === 'http-gateway') return 'IBM Aspera HTTP Gateway';
  return 'Detecting…';
};

export default function Demo() {
  const [mode, setMode] = useState<ModeOption>(() => {
    const saved = localStorage.getItem('ASPERA-DEMO-MODE');
    return MODES.find((m) => m.id === saved) || MODES[0];
  });
  const [gatewayUrl, setGatewayUrl] = useState(localStorage.getItem('ASPERA-SDK-GATEWAY') || '');
  const [statusHistory, setStatusHistory] = useState<StatusEvent[]>([]);
  const [currentStatus, setCurrentStatus] = useState<SdkStatus | undefined>(undefined);
  const [capabilities, setCapabilities] = useState<SdkCapabilities | null>(null);
  const [activeClient, setActiveClient] = useState<TransferClient | undefined>(undefined);
  const [transfers, setTransfers] = useState<Map<string, AsperaSdkTransfer>>(new Map());
  const [transferSpec, setTransferSpec] = useState(() => localStorage.getItem('ASPERA-DEMO-TRANSFER-SPEC') || DEFAULT_TRANSFER_SPEC);
  const [installerEntries, setInstallerEntries] = useState<InstallerInfo[]>([]);
  const [sdkInfo, setSdkInfo] = useState<AsperaSdkInfo | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [infoTransfer, setInfoTransfer] = useState<AsperaSdkTransfer | null>(null);
  const dropzoneRegistered = useRef(false);
  const transferSpecRef = useRef(transferSpec);
  transferSpecRef.current = transferSpec;
  const [specError, setSpecError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);

  const showCapabilities = currentStatus === 'RUNNING' || currentStatus === 'DEGRADED';
  const showDegradedNotice = currentStatus === 'DEGRADED';
  const showFailedNotice = currentStatus === 'FAILED';
  const showDisconnectedNotice = currentStatus === 'DISCONNECTED';
  const showConnectSunsetNotice = currentStatus === 'RUNNING' && activeClient === 'connect';

  const updateTransferSpec = (value: string): void => {
    localStorage.setItem('ASPERA-DEMO-TRANSFER-SPEC', value);
    setTransferSpec(value);
  };

  const needsInstaller = showFailedNotice || showConnectSunsetNotice;

  useEffect(() => {
    if (!needsInstaller || installerEntries.length > 0) return;
    getInstallerInfo({}).then((response) => {
      setInstallerEntries(response.entries || []);
    }).catch((err) => {
      console.error('Failed to fetch installer info', err);
    });
  }, [needsInstaller, installerEntries.length]);

  useEffect(() => {
    if (!showCapabilities || !activeClient) return;
    getInfo().then((info) => setSdkInfo(info)).catch((err) => {
      console.error('Failed to fetch SDK info', err);
    });
  }, [showCapabilities, activeClient]);

  const appendDroppedPaths = (files: BrowserStyleFile[]): void => {
    if (!files.length) return;
    try {
      const spec = JSON.parse(transferSpecRef.current);
      const newPaths = files.map((f) => ({ source: f.name }));
      const next = { ...spec, paths: [...(spec.paths || []), ...newPaths] };
      updateTransferSpec(JSON.stringify(next, null, 2));
    } catch (e) {
      setSpecError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  useEffect(() => {
    if (!showCapabilities || dropzoneRegistered.current) return;
    if (!document.querySelector('#demo-dropzone')) return;
    dropzoneRegistered.current = true;
    createDropzone(
      (data) => {
        if (data.event.type === 'dragenter') setIsDraggingOver(true);
        else if (data.event.type === 'dragleave') setIsDraggingOver(false);
        else if (data.event.type === 'drop') {
          setIsDraggingOver(false);
          if (data.files?.dataTransfer?.files) {
            appendDroppedPaths(data.files.dataTransfer.files);
          }
        }
      },
      '#demo-dropzone',
      { dragEnter: true, dragLeave: true },
    );
  }, [showCapabilities]);

  useEffect(() => {
    return () => {
      // Best-effort cleanup if user navigates away
      initRef.current = false;
    };
  }, []);

  const handleStart = (): void => {
    if (initRef.current) return;
    initRef.current = true;

    if (mode.requiresGateway && !gatewayUrl) return;

    registerStatusCallback((status) => {
      setStatusHistory((prev) => [...prev, { status, timestamp: Date.now() }]);
      setCurrentStatus(status);
      if (status === 'RUNNING' || status === 'DEGRADED') {
        setCapabilities(getCapabilities());
        setActiveClient(currentTransferClient());
      }
    });

    registerActivityCallback((response) => {
      setTransfers((prev) => {
        let next = new Map(prev);
        response.transfers.forEach((t) => {
          if (t.status === 'removed') {
            next.delete(t.uuid);
          } else if (next.has(t.uuid)) {
            // Update existing — preserves position in iteration order
            next.set(t.uuid, t);
          } else {
            // New transfer — rebuild so it sits at the front
            next = new Map([[t.uuid, t], ...next]);
          }
        });
        return next;
      });
    });

    const settings = {
      appId: 'aspera-demo-app',
      httpGatewaySettings: mode.requiresGateway && gatewayUrl
        ? { url: gatewayUrl, forceGateway: mode.id === 'gateway-only' }
        : undefined,
      connectSettings: {
        useConnect: mode.id === 'connect+gateway',
        fallback: mode.id === 'desktop->connect-fallback+gateway',
        dragDropEnabled: true,
      },
    };

    initSession(settings);
    setInitialized(true);
  };

  const parseSpec = (): TransferSpec | null => {
    try {
      const parsed = JSON.parse(transferSpec);
      setSpecError(null);
      return parsed;
    } catch (e) {
      setSpecError(e instanceof Error ? e.message : 'Invalid JSON');
      return null;
    }
  };

  const handleStartTransfer = (): void => {
    const spec = parseSpec();
    if (!spec) return;

    startTransfer(spec, { use_absolute_destination_path: false, allow_dialogs: false }).catch((error) => {
      console.error('Start transfer failed', error);
      setSpecError(typeof error === 'string' ? error : (error?.message || 'Transfer failed to start'));
    });
  };

  const handleInfo = (uuid: string): void => {
    getTransfer(uuid).then((data) => {
      setInfoTransfer(data);
    }).catch((err) => {
      console.error('Get transfer failed', err);
      setInfoTransfer(transfers.get(uuid) || null);
    });
  };

  const handleRemove = (uuid: string): void => {
    removeTransfer(uuid).catch((err) => console.error('Remove transfer failed', err));
    setTransfers((prev) => {
      const next = new Map(prev);
      next.delete(uuid);
      return next;
    });
  };

  const pickFiles = async (folder: boolean): Promise<void> => {
    try {
      const dialog = folder ? showSelectFolderDialog : showSelectFileDialog;
      const response = await dialog();
      const paths = (response?.dataTransfer?.files || []).map((f: any) => ({ source: f.name }));
      const spec = parseSpec();
      if (!spec) return;
      const next = { ...spec, paths: [...(spec.paths || []), ...paths] };
      updateTransferSpec(JSON.stringify(next, null, 2));
    } catch (error) {
      console.error('File picker failed', error);
    }
  };

  const sortedTransfers = useMemo(() => Array.from(transfers.values()), [transfers]);

  const aggregate = useMemo(() => {
    const list = sortedTransfers;
    const running = list.filter((t) => t.status === 'running' || t.status === 'initiating' || t.status === 'queued');
    const completed = list.filter((t) => t.status === 'completed').length;
    const failed = list.filter((t) => t.status === 'failed').length;
    const totalExpected = running.reduce((s, t) => s + (t.bytes_expected || 0), 0);
    const totalWritten = running.reduce((s, t) => s + (t.bytes_written || 0), 0);
    const totalRate = running.reduce((s, t) => s + (t.calculated_rate_kbps || 0), 0);
    const overall = totalExpected > 0 ? totalWritten / totalExpected : 0;
    return { running: running.length, completed, failed, overall, totalRate, totalWritten, totalExpected };
  }, [sortedTransfers]);

  const enabledCaps = useMemo(() => {
    if (!capabilities) return { enabled: [] as string[], disabled: [] as string[] };
    const entries = Object.entries(capabilities) as Array<[string, boolean]>;
    return {
      enabled: entries.filter(([, v]) => v).map(([k]) => k),
      disabled: entries.filter(([, v]) => !v).map(([k]) => k),
    };
  }, [capabilities]);

  const activeClientVersion = useMemo(() => {
    if (!sdkInfo || !activeClient) return null;
    if (activeClient === 'desktop') return sdkInfo.version;
    if (activeClient === 'http-gateway') return sdkInfo.httpGateway?.info?.version;
    if (activeClient === 'connect') return sdkInfo.connect?.version;
    return null;
  }, [sdkInfo, activeClient]);

  return (
    <div className="demo-page">
      <div className="demo-col demo-col--a">
      <Tile className="demo-section demo-init">
        <h3>Initialize the SDK</h3>
        <div className="demo-init__row">
          <Dropdown
            id="demo-mode-dropdown"
            titleText="Configuration"
            label="Choose a mode"
            items={MODES}
            itemToString={(item) => (item ? item.label : '')}
            selectedItem={mode}
            onChange={({ selectedItem }) => {
              if (!selectedItem) return;
              localStorage.setItem('ASPERA-DEMO-MODE', selectedItem.id);
              setMode(selectedItem);
            }}
            disabled={initialized}
          />
          <TextInput
            id="demo-gateway-url"
            labelText="HTTP Gateway URL"
            helperText={mode.requiresGateway ? 'Required for the selected mode' : 'Not used for the selected mode'}
            value={gatewayUrl}
            onChange={(e) => {
              localStorage.setItem('ASPERA-SDK-GATEWAY', e.target.value);
              setGatewayUrl(e.target.value);
            }}
            disabled={initialized || !mode.requiresGateway}
            invalid={mode.requiresGateway && !gatewayUrl && initialized}
            invalidText="Gateway URL is required for this mode"
          />
          <Button
            onClick={handleStart}
            disabled={initialized || (mode.requiresGateway && !gatewayUrl)}
          >
            {initialized ? 'Initialized' : 'Start'}
          </Button>
        </div>
        <p className="demo-init__description">{mode.description}</p>
      </Tile>

      <Tile className="demo-section demo-status">
        <h3>Status history</h3>
        {statusHistory.length === 0 ? (
          <p className="demo-empty">No status events yet — click Start to initialize.</p>
        ) : (
          <ol className="demo-status__list">
            {statusHistory.map((evt, i) => (
              <li key={i} className={`demo-status__item demo-status__item--${evt.status.toLowerCase()}`}>
                <span className="demo-status__time">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                <Tag type={statusTagType(evt.status)} size="md">{evt.status}</Tag>
              </li>
            ))}
          </ol>
        )}
      </Tile>

      {showCapabilities && (
        <Tile className="demo-section demo-caps">
          <div className="demo-caps__header">
            <h3>Active client</h3>
            <div className="demo-caps__client">
              <Tag type="blue" size="md">{transferClientLabel(activeClient)}</Tag>
              {activeClientVersion && (
                <span className="demo-caps__version">v{activeClientVersion}</span>
              )}
            </div>
          </div>
          <div className="demo-caps__grid">
            {enabledCaps.enabled.map((c) => (
              <Tag key={c} type="green" renderIcon={CheckmarkFilled}>{c}</Tag>
            ))}
            {enabledCaps.disabled.map((c) => (
              <Tag key={c} type="gray" renderIcon={CloseFilled}>{c}</Tag>
            ))}
          </div>
          {(hasCapability('showTransferManager') || hasCapability('showAbout') || hasCapability('showPreferences')) && (
            <div className="demo-caps__shortcuts">
              {hasCapability('showTransferManager') && (
                <Button kind="ghost" size="sm" renderIcon={ListChecked} onClick={() => showTransferManager().catch(console.error)}>Transfer Manager</Button>
              )}
              {hasCapability('showPreferences') && (
                <Button kind="ghost" size="sm" renderIcon={Settings} onClick={() => showPreferences().catch(console.error)}>Preferences</Button>
              )}
              {hasCapability('showAbout') && (
                <Button kind="ghost" size="sm" renderIcon={Information} onClick={() => showAbout().catch(console.error)}>About</Button>
              )}
            </div>
          )}
        </Tile>
      )}

      {showDegradedNotice && (
        <Tile className="demo-section demo-degraded">
          <h3>Faster transfers are possible</h3>
          <p>You're transferring through HTTP Gateway. Install IBM Aspera for desktop for faster, more reliable transfers.</p>
          <p className="demo-degraded__launch">
            Already installed?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                launch();
              }}
            >
              Launch now.
            </a>
          </p>
        </Tile>
      )}

      {showDisconnectedNotice && (
        <Tile className="demo-section demo-disconnected">
          <h3>IBM Aspera for desktop has disconnected</h3>
          <p>The desktop app was running but is no longer reachable. Re-launch the app to continue.</p>
          <Button kind="primary" renderIcon={Restart} onClick={() => launch()}>Launch app</Button>
        </Tile>
      )}

      {showFailedNotice && (
        <Tile className="demo-section demo-failed">
          <h3>Download IBM Aspera for desktop</h3>
          <p>No transfer client could be reached. Install the desktop app to start transferring.</p>
          <div className="demo-failed__actions">
            {installerEntries.length === 0 ? (
              <Button kind="primary" disabled renderIcon={Download}>Loading installer…</Button>
            ) : installerEntries.map((entry) => (
              <Button
                key={`${entry.platform}-${entry.type}-${entry.url}`}
                kind="primary"
                renderIcon={Download}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for {entry.platform}{entry.type ? ` (${entry.type})` : ''}
              </Button>
            ))}
          </div>
          <p className="demo-failed__launch">
            Already installed?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                launch();
              }}
            >
              Launch now.
            </a>
          </p>
        </Tile>
      )}

      {showConnectSunsetNotice && (
        <Tile className="demo-section demo-sunset">
          <h3>IBM Aspera Connect is being sunset</h3>
          <p>You're running IBM Aspera Connect, which is being deprecated. Switch to IBM Aspera for desktop for a modern, supported transfer experience.</p>
          <div className="demo-sunset__actions">
            {installerEntries.length === 0 ? (
              <Button kind="primary" disabled renderIcon={Download}>Loading installer…</Button>
            ) : installerEntries.map((entry) => (
              <Button
                key={`${entry.platform}-${entry.type}-${entry.url}`}
                kind="primary"
                renderIcon={Download}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for {entry.platform}{entry.type ? ` (${entry.type})` : ''}
              </Button>
            ))}
          </div>
          <p className="demo-sunset__launch">
            Already installed?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                launch();
              }}
            >
              Launch now.
            </a>
          </p>
        </Tile>
      )}
      </div>

      <div className="demo-col demo-col--b">
      <Tile className="demo-section demo-transfer">
        <h3>Start a transfer</h3>
        <div
          id="demo-dropzone"
          className={`demo-transfer__dropzone${isDraggingOver ? ' demo-transfer__dropzone--active' : ''}${!showCapabilities ? ' demo-transfer__dropzone--disabled' : ''}`}
        >
          {showCapabilities ? 'Drag files here to add them to the transfer' : 'Initialize the SDK to enable drag and drop'}
        </div>
        <div className="demo-transfer__pickers">
          <Button
            kind="tertiary"
            renderIcon={Document}
            onClick={() => pickFiles(false)}
            disabled={!showCapabilities}
          >
            Select files
          </Button>
          <Button
            kind="tertiary"
            renderIcon={Folder}
            onClick={() => pickFiles(true)}
            disabled={!showCapabilities || !capabilities?.folderUpload}
          >
            Select folder
          </Button>
        </div>
        <TextArea
          id="demo-transfer-spec"
          labelText="Transfer spec (JSON)"
          rows={12}
          value={transferSpec}
          onChange={(e) => updateTransferSpec(e.target.value)}
          invalid={!!specError}
          invalidText={specError || ''}
        />
        <Button onClick={handleStartTransfer} disabled={!showCapabilities}>Start transfer</Button>
      </Tile>
      </div>

      <div className="demo-col demo-col--c">
      <Tile className="demo-section demo-monitor">
        <div className="demo-monitor__header">
          <h3>Transfer activity</h3>
          {sortedTransfers.length > 0 && (
            <div className="demo-monitor__stats">
              <span>{aggregate.running} running · {aggregate.completed} completed · {aggregate.failed} failed</span>
              {aggregate.totalExpected > 0 && (
                <span>{formatBytes(aggregate.totalWritten)} / {formatBytes(aggregate.totalExpected)}</span>
              )}
            </div>
          )}
        </div>
        {sortedTransfers.length === 0 ? (
          <p className="demo-empty">No transfers yet.</p>
        ) : (
          <ul className="demo-monitor__list">
            {sortedTransfers.map((t) => (
              <li key={t.uuid} className="demo-monitor__item">
                <div className="demo-monitor__item-head">
                  <span className="demo-monitor__name">{t.title || t.current_file || t.uuid.slice(0, 8)}</span>
                  <Tag type={transferTagType(t.status)} size="sm">{t.status}</Tag>
                </div>
                {t.status === 'failed' && t.error_desc && (
                  <div className="demo-monitor__error">
                    <span className="demo-monitor__error-label">Error{typeof t.error_code === 'number' ? ` (code ${t.error_code})` : ''}:</span>
                    {' '}{t.error_desc}
                  </div>
                )}
                {t.httpDownloadExternalHandle ? (
                  <p className="demo-monitor__external">
                    This download is being handled by your browser's download manager. Progress and controls are available there.
                  </p>
                ) : (
                  <>
                    <ProgressBar
                      label=""
                      hideLabel
                      value={Math.max(0, Math.min(1, t.percentage || 0)) * 100}
                      max={100}
                      status={progressStatus(t.status)}
                    />
                    <div className="demo-monitor__meta">
                      <span>{formatBytes(t.bytes_written || 0)} / {formatBytes(t.bytes_expected || 0)}</span>
                      <span>{formatRate(t.calculated_rate_kbps || 0)}</span>
                      <span>{t.file_counts?.completed || 0} / {t.file_counts?.attempted || 0} files</span>
                      {t.status === 'running' && formatEta(t.remaining_usec || 0) && (
                        <span>ETA {formatEta(t.remaining_usec || 0)}</span>
                      )}
                    </div>
                  </>
                )}
                <div className="demo-monitor__actions">
                  {!t.httpDownloadExternalHandle && (t.status === 'running' || t.status === 'queued' || t.status === 'initiating') && (
                    <Button kind="danger--tertiary" size="sm" renderIcon={StopFilledAlt} onClick={() => stopTransfer(t.uuid).catch(console.error)}>Stop</Button>
                  )}
                  {!t.httpDownloadExternalHandle && (t.status === 'cancelled' || t.status === 'failed') && hasCapability('resumeTransfer') && (
                    <Button kind="tertiary" size="sm" renderIcon={Restart} onClick={() => resumeTransfer(t.uuid).catch(console.error)}>{t.status === 'failed' ? 'Retry' : 'Resume'}</Button>
                  )}
                  {!t.httpDownloadExternalHandle && t.status === 'completed' && hasCapability('showDirectory') && (
                    <Button kind="ghost" size="sm" renderIcon={FolderOpen} onClick={() => showDirectory(t.uuid).catch(console.error)}>Open folder</Button>
                  )}
                  <Button kind="ghost" size="sm" renderIcon={View} onClick={() => handleInfo(t.uuid)}>Info</Button>
                  <Button kind="ghost" size="sm" renderIcon={TrashCan} onClick={() => handleRemove(t.uuid)}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tile>
      </div>

      <Modal
        open={!!infoTransfer}
        modalHeading="Transfer details"
        passiveModal
        onRequestClose={() => setInfoTransfer(null)}
        size="md"
      >
        {infoTransfer && (
          <pre className="demo-info-modal__json">{JSON.stringify(infoTransfer, null, 2)}</pre>
        )}
      </Modal>
    </div>
  );
}

function statusTagType(status: SdkStatus): 'green' | 'red' | 'magenta' | 'blue' | 'gray' | 'cyan' {
  switch (status) {
    case 'RUNNING': return 'green';
    case 'DEGRADED': return 'magenta';
    case 'FAILED': return 'red';
    case 'DISCONNECTED': return 'red';
    case 'INITIALIZING': return 'cyan';
    default: return 'gray';
  }
}

function transferTagType(status: AsperaSdkTransfer['status']): 'green' | 'red' | 'blue' | 'gray' | 'magenta' {
  switch (status) {
    case 'completed': return 'green';
    case 'failed': return 'red';
    case 'running':
    case 'initiating':
    case 'queued': return 'blue';
    case 'cancelled':
    case 'paused':
    case 'willretry': return 'magenta';
    default: return 'gray';
  }
}

function progressStatus(status: AsperaSdkTransfer['status']): 'active' | 'finished' | 'error' {
  if (status === 'completed') return 'finished';
  if (status === 'failed') return 'error';
  return 'active';
}
