import { MonacoCodeEditorConfig } from '../types/config';
import { DEFAULT_LIBS_URL, DEFAULT_DTS_MAP_MANIFEST } from './constants';
import axios from 'axios';
import { DtsManifest } from '../editor-core/ts/editor';

export class TsPackageLoaderService {

  private dtsManifest: DtsManifest | null = null;

  constructor(private config?: MonacoCodeEditorConfig) { 
    
  }

  /** 获取第三方npm包声明文件的文件夹的地址 */
  private getLibsUrl(): string {
    if (this.config && this.config.tsConfig && this.config.tsConfig.libsUrl) {
      return this.config.tsConfig.libsUrl;
    }
    return DEFAULT_LIBS_URL;
  }

  /**
   * 获取全局设置中的dts包名映射
   * @remarks 全局设置中的dts映射的优先级高于清单文件中的优先级
   * @param imports 从清单文件中读取到的dts包名映射
   */
  private setLibsMap(imports: any): any {
    if (!this.config || !this.config.tsConfig || !this.config.tsConfig.libsMap) {
      return;
    }
    const map = this.config.tsConfig.libsMap;
    for (const key in map) {
      const value = map[key];
      if (!!value && typeof value === 'string') {
        imports[key] = value;
      }
    }
    return imports;
  }

  public async getDtsManifest(): Promise<DtsManifest> {
    if (this.dtsManifest) {
      return this.dtsManifest;
    }
    const basicUrl = this.getLibsUrl();
    const dtsMapFileName = this.config && this.config.tsConfig && this.config.tsConfig.dtsMapManifestFileName || DEFAULT_DTS_MAP_MANIFEST;
    const url = `${basicUrl}/${dtsMapFileName}?version=${new Date().getTime()}`;
    const response = await axios.get(url);
    const manifest = response.data;
    if (!manifest) {
      this.dtsManifest = {
        imports: this.setLibsMap({}),
        dependencies: {}
      };
      return this.dtsManifest;
    }
    const imports = manifest.imports || {};
    const dependencies = manifest.dependencies || {};
    this.setLibsMap(imports);
    this.dtsManifest = { imports, dependencies };
    return this.dtsManifest;
  }

  /**
   * 加载外部npm定义包
   * @param packages 待加载的包名数组
   * @returns 加载结果
   */
  public async load(packages: string[]): Promise<{ name: string, content: string }[]> {
    if (!packages || packages.length === 0) {
      return Promise.resolve([]);
    }
    const dtsImports = (await this.getDtsManifest()).imports;
    const hasPkgNamePackages = packages.filter(pkgName => {
      const filename = dtsImports[pkgName];
      return filename ? true : false;
    });
    const promises = hasPkgNamePackages.map(pkgName => {
      const filename = dtsImports[pkgName];
      const basicUrl = this.getLibsUrl();
      const url = `${basicUrl}/${filename}.d.ts?version=${new Date().getTime()}`;
      const headers = {
        'Content-Type': 'text/plain;charset=UTF-8'
      };
      const options = { headers, responseType: 'text' as 'json' };

      return axios.get(url, options)
        .then(response => {
          const content = response.data;
          return { name: pkgName, content };
        })
        .catch(error => {
          console.error(error);
          // handle error - 返回空内容而不是 null
          return { name: pkgName, content: '' };
        });
    });

    return Promise.all(promises);
  }

}
