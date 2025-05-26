import * as fs from 'fs';

export interface ProductSettings {
  flexClientAddress: string;
}

export class ProductSettingsFile {
  public read(): ProductSettings | undefined {
    try {
      const latestFile = 'config/desktop/product-settings.json';
      let rawdata = fs.readFileSync(latestFile, { encoding: 'utf8'});
      const pSettings = JSON.parse(rawdata);
      return pSettings;
    }
    catch {
      return undefined;
    }
  }

  // private getLatestFile(): string | undefined {
  //   try {
  //     let latestFile = undefined;
  //     let latestModtime = 0;
  //     let files = fs.readdirSync('config/desktop', { encoding: 'utf8'});
  //     files.forEach(file => {
  //       if (file.startsWith('siemens-gms-flexclient-product-settings')) {
  //         const currentFile = `config/desktop/${file}`;
  //         const stats = fs.statSync(currentFile);
  //         // Note: Creation time cannot be used for comparion as the copy step of the installer creates new time stamps.
  //         if (stats.mtimeMs > latestModtime) {
  //           latestModtime = stats.mtimeMs;
  //           latestFile = currentFile;
  //         }
  //       }
  //     });
  //     return latestFile;
  //   }
  //   catch {
  //     return undefined;
  //   }
  // }

}
