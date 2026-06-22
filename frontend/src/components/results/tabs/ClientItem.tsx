import type { ClientEntry } from '../../../api/types';
import { DeviceIcon } from '../../common/DeviceIcon';

interface ClientItemProps {
  client: ClientEntry;
}

export function ClientItem({ client }: ClientItemProps) {
  const isDvr = client.device_type === 'DVR/Camera';

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2">
      <DeviceIcon deviceType={client.device_type} className="text-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xs text-text">{client.mac}</div>
        <div className="truncate text-xs text-text-muted">{client.vendor}</div>
        <div className={`truncate text-[11px] ${isDvr ? 'font-semibold text-red-400' : 'text-text-muted'}`}>
          {client.device_type}
        </div>
      </div>
    </div>
  );
}
