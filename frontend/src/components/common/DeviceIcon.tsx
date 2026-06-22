import { deviceIcon } from '../../utils/deviceIcons';

interface DeviceIconProps {
  deviceType: string | null | undefined;
  className?: string;
}

export function DeviceIcon({ deviceType, className = '' }: DeviceIconProps) {
  return (
    <span className={className} title={deviceType ?? undefined}>
      {deviceIcon(deviceType)}
    </span>
  );
}
