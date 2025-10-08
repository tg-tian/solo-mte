import { cloneDeep } from "lodash-es";
import { CommandParameter, WebCommand, WebCommandMetadata } from "../class/web-command";
import { WebComponentMetadata, WebComponentOperation } from "../class/web-component";
import { CommandItem, CommandItemType } from "../class/command-item";
import { MethodReferCommandItem, MethodReferParamConfig } from "../class/method-refer";
import { BranchCollectionCommandItem } from "../class/branch-collection";
import { BranchCommandItem } from "../class/branch";
import { MetadataHandlerService } from './metadata-handler.service';

export class WebcmdMapperService {
  private metadataService;
  constructor(
  ) {
    this.metadataService = new MetadataHandlerService();
  }

  private generateCommandParam(newCommand, parameters, oldCommand) {
    for (const param of parameters) {
      // 跳过返回值类型参数，命令的返回值不回被用到
      if (param.IsRetVal) {
        continue;
      }
      const oldCmdParam = oldCommand && oldCommand.Parameters.find(p => p.Code === param.Code);
      const newCmdParam = new CommandParameter();
      newCmdParam.Id = oldCmdParam && oldCmdParam.Id || this.metadataService.uuid();  // 尽量保留命令参数的id
      newCmdParam.Code = param.Code;
      newCmdParam.Name = param.Name;
      newCmdParam.IsRetVal = false;
      newCmdParam.Description = param.Description;
      newCmdParam.ParameterType = param.ParameterType;
      newCmdParam.EditorType = oldCmdParam && oldCmdParam.EditorType || "";  // 尽量保留自定义的编辑器设置
      newCmdParam.ParentId = newCommand.Id;
      // 为了保留用户自定义信息，以参数编号为依据找到旧的参数对象         
      newCommand.Parameters.push(newCmdParam);
    }
  }
  private generateCommandItem(newCommand, oldCommand, keepAllCustomInfo, oldCmdItem, webcmp, operation, webcmpDto, methodCode): MethodReferCommandItem {
    const newCmdItem = new MethodReferCommandItem();
    // 不要忘记设置parent字段，否则运行时报错
    newCmdItem.parent = newCommand;
    const oldCommandItemId = oldCommand && oldCommand.Items && oldCommand.Items[0] && oldCommand.Items[0].Id;
    newCmdItem.Id = oldCommandItemId || this.metadataService.uuid();  // 尽量保留命令编排项的id
    newCmdItem.Code = keepAllCustomInfo && oldCmdItem && oldCmdItem.Code || methodCode;  // 由于只有一个方法，无需考虑重复的问题
    newCmdItem.Name = keepAllCustomInfo && oldCmdItem && oldCmdItem.Name || methodCode;  // 按照旧版实现，此处依旧使用编号
    newCmdItem.itemId = newCmdItem.Id;
    newCmdItem.itemType = CommandItemType.MethodRefer;
    newCmdItem.itemName = keepAllCustomInfo && oldCmdItem && oldCmdItem.itemName || operation?.Name || '';
    newCmdItem.ComponentId = webcmp.Id;
    newCmdItem.ComponentCode = webcmp.Code;
    newCmdItem.ComponentName = webcmp.name;
    newCmdItem.ComponentPath = webcmpDto.relativePath;
    newCmdItem.MethodId = operation?.Id || '';
    newCmdItem.MethodCode = operation?.Code || '';
    newCmdItem.MethodName = operation?.Name || '';
    newCmdItem.IsReplaced = false;
    newCmdItem.IsBeforeExpansion = false;
    newCmdItem.IsAfterExpansion = false;
    if (oldCmdItem) {  // 尽量保留旧命令中的扩展配置信息
      newCmdItem.IsReplaced = !!oldCmdItem.IsReplaced;
      newCmdItem.IsBeforeExpansion = !!oldCmdItem.IsBeforeExpansion;
      newCmdItem.IsAfterExpansion = !!oldCmdItem.IsAfterExpansion;
    }
    newCmdItem.ParamConfigs = [];
    return newCmdItem;
  }
  private generateParamConfig(parameters, oldCmdItem, keepAllCustomInfo, newCmdItem) {
    for (const param of parameters) {
      // 跳过返回值类型参数
      if (param.IsRetVal) {
        continue;
      }
      const oldParamConfig = oldCmdItem && oldCmdItem.ParamConfigs.find(p => p.ParamCode === param.Code);
      const newParamConfig = new MethodReferParamConfig();
      newParamConfig.ParamCode = param.Code;
      newParamConfig.ParamName = keepAllCustomInfo && oldParamConfig && oldParamConfig.ParamName || param.Name;
      newParamConfig.ParamExpress = `{COMMAND~/params/${param.Code}}`;
      if (keepAllCustomInfo) {  // 如果是单操作编排方法，则默认为空
        newParamConfig.ParamExpress = oldParamConfig && oldParamConfig.ParamExpress || '';
      }
      newCmdItem.ParamConfigs.push(newParamConfig);
    }
  }

  /**
  * 生成一个新的简单命令
  * @remarks
  * 如果是新命令则直接使用ts方法名作为其命令的编号
  * 为了防止页面中的选中状态消失，尽量保证id不变，即，如果存在旧的命令则保留其id
  * @param methodCode - 服务方法的编号
  * @param webcmp - 服务构件，用于获取对应的服务方法以及服务构件Id等
  * @param webcmpDto - 服务构件元数据传输对象，用于获取相对路径等信息
  * @param oldCommand - 旧的简单命令，可选，如果该服务方法已经被引用过，则需要保留其中的某些信息
  * @param keepAllCustomInfo - 是否尽量保留全部自定义信息，否则只保留“各种id”、“参数编辑器设置”和“操作的扩展配置信息”
  * @returns 基于指定服务方法编号生成的新的简单命令
  */
  private generateSimpleMethod(
    methodCode: string,
    webcmp: WebComponentMetadata,
    webcmpDto: any,
    oldCommand?: WebCommand,
    keepAllCustomInfo: boolean = true
  ): WebCommand {
    // 找到对应的服务方法
    const operation = webcmp.Operations.find(opt => opt.Code === methodCode);
    // 新建一个命令实例
    const newCommand = new WebCommand();
    // 设置命令基本信息
    newCommand.Id = oldCommand && oldCommand.Id || this.metadataService.uuid();  // 尽量保留命令的id
    newCommand.Code = keepAllCustomInfo && oldCommand && oldCommand.Code || methodCode;
    newCommand.Name = keepAllCustomInfo && oldCommand && oldCommand.Name || operation?.Name || '';
    newCommand.Description = keepAllCustomInfo && oldCommand && oldCommand.Description || operation?.Description || '';
    newCommand.Items = [];
    if (!keepAllCustomInfo) {  // 对于代码方法，重新生成参数列表，只保留参数id和编辑器设置
      newCommand.Parameters = [];
      // 使用与服务方法相同的参数
      if (operation) {
        this.generateCommandParam(newCommand, operation.Parameters, oldCommand);
      }
    } else {
      newCommand.Parameters = cloneDeep(oldCommand && oldCommand.Parameters) || [];
    }
    // 将服务方法作为命令编排项
    const oldCmdItem = (oldCommand && oldCommand.Items[0]) as MethodReferCommandItem;
    const newCmdItem = this.generateCommandItem(newCommand, oldCommand, keepAllCustomInfo, oldCmdItem, webcmp, operation, webcmpDto, methodCode);
    newCommand.Items.push(newCmdItem);
    // 为操作项增加参数配置
    if (operation) {
      this.generateParamConfig(operation.Parameters, oldCmdItem, keepAllCustomInfo, newCmdItem);
    }
    return newCommand;
  }

  /**
  * 将服务构件元数据映射为命令构件元数据
  * @remarks
  * 名词解释：
  * 代码方法、简单命令：指一个命令，这个命令只包含一个操作编排项，且这个操作编排项引用的是本构件所属ts文件中的一个方法
  * 编排方法、编排命令：指一个命令，这个命令包含多个命令编排项，或者其包含的操作编排项引用的是其它webcmp构件中的服务方法
  * @param webcmp - 服务构件元数据
  * @param oldWebcmd - 旧的命令构件元数据
  * @param webcmpDto - 服务构件元数据传输对象，用于获取相对路径等信息
  * @returns 新的命令构件元数据
  */
  public mapWebcmp2Webcmd(webcmp: WebComponentMetadata, oldWebcmd: WebCommandMetadata, webcmpDto: any): WebCommandMetadata {
    // 初始化新命令构件元数据，置isCodeMethod为false
    const newWebcmd: WebCommandMetadata = cloneDeep(oldWebcmd);
    for (const command of newWebcmd.Commands) {
      command.isCodeMethod = false;
    }
    // 遍历服务构件中的每一个方法，进行向webcmd映射的处理
    for (const operation of webcmp.Operations) {
      const methodCode = operation.Code;
      let alreadyReferenced = false;  // 该服务方法是否已经被某个命令所引用
      let firstSimpleMethodIndex: number = -1;  // 该服务方法初次被简单命令所引用的下标位置
      // 遍历旧命令构件中的每一个命令，查看其是否引用了这个服务方法
      for (let idx = 0; idx < oldWebcmd.Commands.length; ++idx) {
        const command = oldWebcmd.Commands[idx];
        if (this.containServiceMethod(command, methodCode, webcmp)) {
          alreadyReferenced = true;
          if (command.isSimpleMethod(webcmp)) {
            // 如果该命令是一个简单命令，使用新提取的信息覆盖这个命令
            if (command.Code === methodCode || firstSimpleMethodIndex === -1) {
              firstSimpleMethodIndex = idx;
            }
            const newCommand = this.generateSimpleMethod(methodCode, webcmp, webcmpDto, command, true);
            newWebcmd.Commands[idx] = newCommand;
          } else {
            // 如果该命令是一个编排方法，则仅更新其中的服务方法的引用信息和参数配置（删除已经失效的参数，新增的参数默认为空）
            this.updateMethodRefer(newWebcmd.Commands[idx], webcmp, operation);
          }
        }
      }
      if (!alreadyReferenced || firstSimpleMethodIndex >= 0) {
        const oldCommand = firstSimpleMethodIndex >= 0 ? oldWebcmd.Commands[firstSimpleMethodIndex] : undefined;
        const brandNewCommand = this.generateSimpleMethod(methodCode, webcmp, webcmpDto, oldCommand, false);
        brandNewCommand.isCodeMethod = true;
        // 代码方法的编号必须与ts代码中的函数名相同，如果与其它方法的编号重复了，则重命名其它方法的编号（增加数字后缀）
        const except = alreadyReferenced ? firstSimpleMethodIndex : -1;
        this.recode(newWebcmd.Commands, methodCode, except);
        if (!alreadyReferenced) {
          newWebcmd.Commands.push(brandNewCommand);  // 如果该服务方法从未被引用过，则追加一个新的代码方法
        } else {
          newWebcmd.Commands[firstSimpleMethodIndex] = brandNewCommand;  // 如果该服务方法被一个简单命令所引用过，则更新这个简单命令
        }
      }
    }
    // 遍历命令构件中的每一个命令，如果该命令只引用了一个方法，且该方法已被删除，（则视该命令已经失效）删除该命令
    const validCommands: WebCommand[] = [];
    for (const command of newWebcmd.Commands) {
      if (command.isSimpleMethod(webcmp)) {
        const methodItem = command.Items[0] as MethodReferCommandItem;
        const methodCode = methodItem.MethodCode;
        const invalid = webcmp.Operations.findIndex(opt => opt.Code === methodCode) < 0;
        if (invalid) {
          continue;
        }
      }
      validCommands.push(command);
    }
    newWebcmd.Commands = validCommands;
    return newWebcmd;
  }

  /**
   * 判断命令中是否包含对某一服务方法的引用
   * @param command - 命令
   * @param methodCode - 服务方法的编号
   * @param webcmp - 服务构件
   * @returns 是否包含
   */
  private containServiceMethod(command: WebCommand, methodCode: string, webcmp: WebComponentMetadata): boolean {
    // 采用迭代的方式遍历命令中的每一个方法引用编排项
    const branchStack = [command.Items];
    while (branchStack.length > 0) {
      const branch = branchStack.pop() as CommandItem[];
      for (const commandItem of branch) {
        if (commandItem instanceof MethodReferCommandItem) {
          // 判断该方法引用编排项是否引用了目标服务方法
          if (commandItem.ComponentId === webcmp.Id && commandItem.MethodCode === methodCode) {
            return true;
          }
        } else if (commandItem instanceof BranchCollectionCommandItem) {
          // 分支集合里只有分支
          for (const newBranch of commandItem.Items) {
            if (newBranch instanceof BranchCommandItem) {
              branchStack.push(newBranch.Items);
            }
          }
        }
      }
    }
    return false;
  }


  /** 更新操作编排项的引用信息和参数配置 */
  private updateMethodRefer(command: WebCommand, webcmp: WebComponentMetadata, operation: WebComponentOperation): void {
    // 通过迭代的方式找到command中所有的对operation引用的操作编排项，记作targetItems
    const methodCode = operation.Code;
    const branchStack = [command.Items];
    const targetItems: MethodReferCommandItem[] = [];
    while (branchStack.length > 0) {
      const branch = branchStack.pop() as CommandItem[];
      for (const commandItem of branch) {
        if (commandItem instanceof MethodReferCommandItem) {
          // 判断该方法引用编排项是否引用了目标服务方法
          if (commandItem.ComponentId === webcmp.Id && commandItem.MethodCode === methodCode) {
            targetItems.push(commandItem);
          }
        } else if (commandItem instanceof BranchCollectionCommandItem) {
          // 分支集合里只有分支
          for (const newBranch of commandItem.Items) {
            if (newBranch instanceof BranchCommandItem) {
              branchStack.push(newBranch.Items);
            }
          }
        }
      }
    }
    // 按照最新的操作信息，更新这些操作编排项
    for (const item of targetItems) {
      // 更新参数配置信息
      const newParamConfigs: MethodReferParamConfig[] = [];
      for (const param of operation.Parameters) {
        if (param.IsRetVal) {
          continue;
        }
        const oldParamConfig = item.ParamConfigs.find(p => p.ParamCode === param.Code);
        const newParamConfig = new MethodReferParamConfig();
        newParamConfig.ParamCode = param.Code;
        newParamConfig.ParamName = oldParamConfig && oldParamConfig.ParamName || param.Name;
        newParamConfig.ParamExpress = oldParamConfig && oldParamConfig.ParamExpress || '';  // 默认为空
        newParamConfigs.push(newParamConfig);
      }
      item.ParamConfigs = newParamConfigs;
      // 更新引用信息
      item.ComponentId = webcmp.Id;
      item.ComponentCode = webcmp.Code;
      item.ComponentName = webcmp.name;
      item.MethodId = operation.Id;
      item.MethodCode = operation.Code;
      item.MethodName = operation.Name;
    }
  }

  /** 重新生成与methodCode编号重复的命令的编号，下标为except的元素无需重新生成 */
  private recode(commands: WebCommand[], methodCode: string, except: number) {
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (i === except || command.Code !== methodCode) {
        continue;
      }
      // 重新生成这个命令的编号
      let newCommandCode: string;
      let numberSuffix = 1;
      do {
        newCommandCode = `${methodCode}_${numberSuffix}`;
        ++numberSuffix;
      } while (commands.find(cmd => cmd.Code === newCommandCode));
      command.Code = newCommandCode;
    }
  }

}
