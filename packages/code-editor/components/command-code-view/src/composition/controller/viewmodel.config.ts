import { OpenWithConfig } from "../../type/open-with";

/**
 * 视图模型代码对应的ts文件
 * @remarks 为了与前端构件对应的ts文件相互区别，视图模型的代码文件以“.viewmodel.ts”作为后缀
 */
export class VMTSConfig implements OpenWithConfig {

  suffix = ".viewmodel.ts";

};
