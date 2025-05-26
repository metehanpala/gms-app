import { app } from 'electron';

export const closedMode = (): boolean => {
  return app.commandLine.hasSwitch('closed-mode');
}
