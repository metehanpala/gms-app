import { app } from "electron";
import { EventEmitter } from 'events';

const optionsDt: any = { year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3, hour12: false };

export class MainTraceService {

  private traceEvents = new EventEmitter();

  constructor() {}

  public info(message: string, ...optionalParams: any[]): void {
    const dt = new Date(Date.now()).toLocaleString('en-US', optionsDt);
    console.info(`${dt}: INFO: ${message}`, ...optionalParams);
    console.info();
    this.traceEvents.emit('info-trace-channel', message, ...optionalParams);
  }

  public warn(message: string, ...optionalParams: any[]): void {
    const dt = new Date(Date.now()).toLocaleString('en-US', optionsDt);
    console.warn(`${dt}: WARN: ${message}`, ...optionalParams);
    console.warn();
    if (app.isPackaged) {
      // trace shall be added to stdout.log as well
      console.info(`${dt}: WARN: ${message}`, ...optionalParams);
      console.info();
    }
    this.traceEvents.emit('warn-trace-channel', message, ...optionalParams);
  }

  public debug(message: string, ...optionalParams: any[]): void {
    const dt = new Date(Date.now()).toLocaleString('en-US', optionsDt);
    console.debug(`${dt}: DEBUG: ${message}`, ...optionalParams);
    console.debug();
    this.traceEvents.emit('debug-trace-channel', message, ...optionalParams);
  }

  public error(message: string, ...optionalParams: any[]): void {
    const dt = new Date(Date.now()).toLocaleString('en-US', optionsDt);
    console.error(`${dt}: ERROR: ${message}`, ...optionalParams);
    console.error();
    if (app.isPackaged) {
      // trace shall be added to stdout.log as well
      console.info(`${dt}: ERROR: ${message}`, ...optionalParams);
      console.info();
    }
    this.traceEvents.emit('error-trace-channel', message, ...optionalParams);
  }

  public subscribeForInfoTraces(listener: ((message: string) => void)): void {
    this.traceEvents.addListener('info-trace-channel', listener);
  }

  public unSubscribeForInfoTraces(listener: ((message: string) => void)): void {
    this.traceEvents.removeListener('info-trace-channel', listener);
  }

  public subscribeForWarnTraces(listener: ((message: string) => void)): void {
    this.traceEvents.addListener('warn-trace-channel', listener);
  }

  public unSubscribeForWarnTraces(listener: ((message: string) => void)): void {
    this.traceEvents.removeListener('warn-trace-channel', listener);
  }

  public subscribeForDebugTraces(listener: ((message: string, ...optionalParams: any[]) => void)): void {
    this.traceEvents.addListener('debug-trace-channel', listener);
  }

  public unSubscribeForDebugTraces(listener: ((message: string, ...optionalParams: any[]) => void)): void {
    this.traceEvents.removeListener('debug-trace-channel', listener);
  }

  public subscribeForErrorTraces(listener: ((message: string, ...optionalParams: any[]) => void)): void {
    this.traceEvents.addListener('error-trace-channel', listener);
  }

  public unSubscribeForErrorTraces(listener: ((message: string, ...optionalParams: any[]) => void)): void {
    this.traceEvents.removeListener('error-trace-channel', listener);
  }
}
