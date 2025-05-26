import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TraceService } from '@gms-flex/services-common';
import { CaptureWindowInfo, CaptureWindowRequestInfo, WindowInfo } from 'desktop-main/src/messaging/window-message.data';
import { Observable } from 'rxjs';

import { trcModuleNameApp } from '../app.component';
import { DesktopMessageService } from '../desktop-renderer/messaging/desktop-message.service';

@Component({
  selector: 'gms-window-list',
  templateUrl: './window-list.component.html',
  styleUrl: './window-list.component.scss',
  standalone: false
})
export class WindowListComponent implements OnInit {
  @Input() public heading = '';
  @Input() public message = '';
  @Input() public componentId = '';
  @Input() public initWindows = new Observable<boolean>();
  @Input() public selectedManagerWindowId: string;
  public cwInfos: CaptureWindowInfo[] = [];
  @Output() public readonly closed = new EventEmitter<void>();
  @Output() public readonly windowClicked = new EventEmitter<WindowInfo>();
  public readonly trackByIndex = (index: number): number => index;

  constructor(private readonly traceService: TraceService,
    private readonly desktopMessageService: DesktopMessageService) { }

  public ngOnInit(): void {
    this.initWindows.subscribe(value => {
      this.captureWindows();
    });
  }

  public onClose(): void {
    this.closed.emit();
  }

  public onWindowClick(cwInfo: CaptureWindowInfo): void {
    this.windowClicked.emit(cwInfo.windowInfo);
    this.closed.emit();
  }

  public isWindowSelected(cwInfo: CaptureWindowInfo): boolean {
    if (this.selectedManagerWindowId === undefined) {
      return false;
    } else {
      return (cwInfo.windowInfo.managerWindowId === this.selectedManagerWindowId) ? true : false;
    }
  }

  public handleStream(stream: MediaStream, browserWindowId: number): void {
    const video: HTMLVideoElement = document.getElementById('videoManager-' + this.componentId + browserWindowId.toString()) as HTMLVideoElement;
    if (video != null) {
      video.srcObject = stream;
      video.onloadedmetadata = (_e: Event): Promise<void> => video.play();
    }
  }

  public handleThumbNail(thumbNail: string, browserWindowId: number): void {
    if (thumbNail != null) {
      const nail: HTMLImageElement = document.getElementById('videoManagerThumbnail-' + this.componentId + browserWindowId.toString()) as HTMLImageElement;
      if (nail != null) {
        nail.src = thumbNail;
      }
    }
  }

  public handleError(e: any): void {
    this.traceService.info(trcModuleNameApp, `getUserMedia failed: ${e}`);
  }

  private captureWindows(): void {
    if (this.desktopMessageService.runsInElectron) {
      const requestInfo: CaptureWindowRequestInfo = { includeOwnWindow: false, includeThumbnail: false, includeDetachedEvent: false };
      this.desktopMessageService.captureWindows(requestInfo).then(info => {
        this.cwInfos = info;
        this.cwInfos.forEach(cwInfo => {
          const contraints: any = {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: cwInfo.sourceId,
                maxWidth: 200,
                maxHeight: 133
              }
            }
          };
          navigator.mediaDevices.getUserMedia(contraints).then(stream => {
            this.handleStream(stream, cwInfo.windowInfo.browserWindowId);
          }).catch(error => {
            this.handleError(error);
          });
          setTimeout(() => { this.handleThumbNail(cwInfo.thumbNailDataUrl, cwInfo.windowInfo.browserWindowId); }, 100);
        });
      });
    }
  }
}
