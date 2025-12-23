// // 本地接口定义，替代 @farris 包中的接口

// export interface MetadataItem {
//     id: string;
//     code: string;
//     name: string;
//     fileName: string;
//     type: string;
//     relativePath: string;
//     fullpath?: string;
//     lastChangedBy?: string;
//     lastChangedOn?: string;
//     properties?: {
//         framework?: string;
//         [key: string]: any;
//     };
//     [key: string]: any;
// }

// export interface MetadataType {
//     typeCode: string;
//     typeName: string;
//     postfix: string;
//     isNeedGuide?: boolean;
//     [key: string]: any;
// }

// export interface IdeHttpService {
//     getAllMetadata(path: string): Promise<MetadataItem[]>;
//     getAllMetadataTypes(): Promise<MetadataType[]>;
//     reloadMetadata: {
//         subscribe: (callback: () => void) => { unsubscribe: () => void };
//     };
//     http: {
//         get: (url: string) => Promise<any>;
//     };
// }

// export interface GSPMetadataService {
//     isMetadataRefed(path: string): Promise<{ body: boolean }>;
//     DeleteMetadataOrDir(path: string): Promise<any>;
//     showInExplorer(path: string): Promise<any>;
// }

// export interface LocaleService {
//     getValue(key: string): any;
// }

// export interface MessagerService {
//     question(message: string, callback: () => void): void;
//     confirm(message: string): Promise<boolean>;
//     warning(message: string, title?: string, showHtml?: boolean, callback?: () => void): void;
//     error(message: string, title?: string, callback?: () => void): void;
//     showHtmlMsg?: (type: string, title: string, message: string, callback?: () => void) => void;
// }

// export interface NotifyService {
//     error(message: string): void;
//     info(message: string): void;
//     warning(message: string): void;
// }
