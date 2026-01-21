import { Hooks } from "../editor-core/editor";
import { HookKey } from "../editor-core/libs/enum";
import { TSHooks } from "../editor-core/ts/editor";


declare global {
  interface Window {
    require: any;
  }
}

export const loadMonaco = async (): Promise<any> => {
  return new Promise(success => {
    window.require(['vs/editor/editor.main'], function (monaco: any) {
      success(monaco);
    });
  });
};

/** TypeScript - 代码编辑器回调函数集合 */
export const tsHooks: Partial<TSHooks> = {
  [HookKey.LoadMonaco]: loadMonaco,
  [HookKey.LoadTSPackages]: null as any,
  [HookKey.LoadTSFiles]: null as any,
  [HookKey.GetDtsManifest]: null as any,
};

/** 高亮 - 代码编辑器回调函数集合 */
export const highLightHooks: Hooks = {
  [HookKey.LoadMonaco]: loadMonaco,
};
