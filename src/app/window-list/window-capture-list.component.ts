import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TraceService } from '@gms-flex/services-common';
import { CaptureWindowInfo, CaptureWindowRequestInfo } from 'desktop-main/src/messaging/window-message.data';

import { trcModuleNameApp } from '../app.component';
import { DesktopMessageService } from '../desktop-renderer/messaging/desktop-message.service';

@Component({
  selector: 'gms-window-capture-list',
  templateUrl: './window-capture-list.component.html',
  styleUrl: './window-capture-list.component.scss',
  standalone: false
})
export class WindowCaptureListComponent implements OnInit {
  @Input() public heading = '';
  @Input() public message = '';
  public cwInfos: CaptureWindowInfo[] = [];
  @Output() public readonly closed = new EventEmitter<void>();
  @Output() public readonly windowClicked = new EventEmitter<number>();
  public readonly trackByIndex = (index: number): number => index;

  constructor(private readonly traceService: TraceService,
    private readonly desktopMessageService: DesktopMessageService) { }

  public ngOnInit(): void {
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

  public onClose(): void {
    this.closed.emit();
  }

  public onWindowClick(cwInfo: CaptureWindowInfo): void {
    this.windowClicked.emit(cwInfo.windowInfo.webContentsId);
    this.closed.emit();
  }

  public handleStream(stream: MediaStream, browserWindowId: number): void {
    const video: HTMLVideoElement = document.getElementById('videoManager-' + browserWindowId.toString()) as HTMLVideoElement;
    if (video != null) {
      video.srcObject = stream;
      video.onloadedmetadata = (_e: Event): Promise<void> => video.play();
    }
  }

  public handleThumbNail(thumbNail: string, browserWindowId: number): void {
    if (thumbNail != null) {
      const nail: HTMLImageElement = document.getElementById('videoManagerThumbnail-' + browserWindowId.toString()) as HTMLImageElement;
      if (nail != null) {
        nail.src = thumbNail;
      }
    }
  }

  public handleError(e: any): void {
    this.traceService.info(trcModuleNameApp, `getUserMedia failed: ${e}`);
  }
}
