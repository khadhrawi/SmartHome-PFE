// Re-use the single shared socket instance from permissionsSocket
// so there is only ONE connection per user for all real-time events.
import {
  connectPermissionsSocket,
  disconnectPermissionsSocket,
} from './permissionsSocket';

export const connectDashboardSocket    = connectPermissionsSocket;
export const disconnectDashboardSocket = disconnectPermissionsSocket;
