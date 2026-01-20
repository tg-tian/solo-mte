import { CodeEditor, Hooks } from "../editor";
import { TSFile } from "./file";
import { UtilService } from "../libs/utils";
import { FileConstructor, ICodeFile } from "../libs/interfaces/editor";
import { HookKey } from "../libs/enum";
import * as babelParser from '@babel/parser';
import { File } from "@babel/types";


/** 智能提示触发条件验证器 */
class IntelligentPromptConditionChecker {

    /**
     * 是否触发npm包名提示
     * @param model editor.ITextModel
     * @param position Position
     * @returns 是否触发
     */
    public static isImportStatement(model: any, position: any): boolean {
        const offset: number = model.getOffsetAt(position);
        const value: string = model.getValue();  // 整体的代码内容
        const content = value.substring(0, offset + 1);  // 到触发提示的引号为止的代码内容
        let startIndex = offset, success = true;
        try {
            // 在通过babel进行语法解析之前先向前读一小段，如果明显不符合条件就直接返回
            startIndex = this.scanQuotation(content, startIndex);  // 匹配一对单引号或双引号
            startIndex = this.scanBlankChar(content, startIndex);  // 匹配最少一个空白字符
            startIndex = this.scanSpecifiedWord(content, startIndex, 'from');  // 匹配一个"from"字符串
            startIndex = this.scanBlankChar(content, startIndex);  // 匹配最少一个空白字符
            // 截取疑似import的语句并对其进行语法解析，判断其是否符合格式
            const importStatementOffset = value.lastIndexOf("import", startIndex);
            if (importStatementOffset < 0) {
                return false;
            }
            // 仅截取部分句子进行解析，可能误将注释中的字符串当作import语句，误触智能提示，但这对用户的使用影响很小，所以暂时不考虑这种情况
            const statement = content.substring(importStatementOffset, offset + 1);
            const ast: babelParser.ParseResult<File> = babelParser.parse(statement, {
                sourceType: 'module',
                errorRecovery: true,
                strictMode: false,
                plugins: [
                    'typescript',
                    'jsx',
                    ['decorators', { decoratorsBeforeExport: true }],
                    'classProperties',
                    'classPrivateProperties'
                ]
            });
            const astBody = ast.program.body;
            if (astBody.length === 1 && astBody[0].type === 'ImportDeclaration') {
                return true;
            } else {
                return false;
            }
        } catch (err) { success = false; }
        return success;
    }

    /** 读一对引号，必须连在一起 */
    private static scanQuotation(value: string, startIndex: number): number {
        const char = value[startIndex];
        if (char === `'` || char === `"`) {
            --startIndex;
            if (value[startIndex] === char) {
                return --startIndex;
            }
        }
        throw new Error("匹配引号失败");
    }
    /** 读一串空白字符，贪婪匹配 */
    private static scanBlankChar(value: string, startIndex: number, optional: boolean = false): number {
        let success = false;
        const regExp = /^\s$/;
        while (startIndex >= 0) {
            const char = value[startIndex];
            if (!regExp.test(char)) {
                break;
            }
            success = true;
            --startIndex;
        }
        if (success) {
            return startIndex;
        }
        if (!optional) {
            throw new Error("匹配空白字符串失败");
        } else {
            return startIndex;
        }
    }
    /** 读一个指定的字符串 */
    private static scanSpecifiedWord(value: string, startIndex: number, word: string): number {
        if (startIndex + 1 < word.length) {
            throw new Error(`匹配指定字符串"${word}"失败`);
        }
        const subValue = value.substring(startIndex - word.length + 1, startIndex + 1);
        if (subValue === word) {
            return startIndex - word.length;
        }
        throw new Error(`匹配指定字符串"${word}"失败`);
    }

}

/**
 * dts关系清单
 */
export interface DtsManifest {
    /** 由npm包名到dts文件名的映射 */
    imports: { [key: string]: string };
    /** npm包到npm包所依赖的其它npm包名数组的映射 */
    dependencies?: { [key: string]: string };
}

export interface TSHooks extends Hooks {
    /** 加载相对路径的ts文件 */
    loadTSFiles: (files: string[]) => Promise<{ name: string, content: string }[]>;
    /** 加载npm包的类型声明文件 */
    loadTSPackages: (packages: string[]) => Promise<{ name: string, content: string }[]>;
    /** 获取dts关系清单 */
    getDtsManifest: () => Promise<DtsManifest>;
}

/** TypeScript代码编辑器 */
export class TSEditor extends CodeEditor {

    /** 已加载的外部包的名称集合 */
    private loadedLibs: Set<string> = new Set<string>();

    protected fileConstructor(): FileConstructor {
        return TSFile;
    }

    /**
     * 为项目附加三方包
     * @param content 包内容
     * @param libName 包名
     */
    private async addExtraLib(content: string, libName: string): Promise<void> {
        const _monaco = await this.monacoPromise;
        _monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false
        });
        // compiler options
        _monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: _monaco.languages.typescript.ScriptTarget.ES2015,
            allowNonTsExtensions: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            typeRoots: ['node_modules/@farris']
        });
        // extra libraries
        const dtsManifest = await this.hook<DtsManifest>(HookKey.GetDtsManifest);
        const filename = dtsManifest.imports[libName];
        const libUri = `file:///node_modules/@farris/${filename}/${filename}.d.ts`;
        _monaco.languages.typescript.typescriptDefaults.addExtraLib(content, libUri);
        this.loadedLibs.add(libName);
    }

    private async loadPackages(packages: string[]) {
        if (!packages || !packages.length) {
            return;
        }
        const allPackages = await this.getAllDeptNpmPkgName(packages);
        // 过滤出尚未载入的包
        const libsToLoadSet = new Set<string>();
        for (const lib of allPackages) {
            if (!this.loadedLibs.has(lib)) {
                libsToLoadSet.add(lib);
            }
        }
        const libsToLoad = Array.from(libsToLoadSet);
        // 尝试载入这些未被载入过的包
        libsToLoad.length && this.hook<{ name: string, content: string }[]>(HookKey.LoadTSPackages, libsToLoad).then((data) => {
            data.filter(item => item && item.content).forEach(item => {
                this.addExtraLib(item.content, item.name);
            });
        });
    }

    /**
     * （根据依赖关系）获取全部需要加载的npm包的包名
     * @param npms npm包名数组
     * @returns 所有需要加载的包名
     */
    private async getAllDeptNpmPkgName(npms: string[]): Promise<string[]> {
        const dtsManifest = await this.hook<DtsManifest>(HookKey.GetDtsManifest);
        const dependenciesMap = dtsManifest.dependencies || {};
        const allDeptNpms = new Set<string>();
        for (const npm of npms) {
            allDeptNpms.add(npm);
            const deptNpms = dependenciesMap[npm];
            if (!deptNpms || !Array.isArray(deptNpms)) {
                continue;
            }
            for (const deptNpm of deptNpms) {
                allDeptNpms.add(deptNpm);
            }
        }
        return Array.from(allDeptNpms);
    }

    private async loadFiles(files: string[]) {
        if (!files.length) {
            return;
        }
        const _monaco = await this.monacoPromise;
        const exists = _monaco.editor.getModels().map((model: any) => model.uri.path);
        // 过滤出所有未被加载的文件，并通过加载文件的钩子进行加载
        files = files.filter(name => exists.every(
            (file: string) => {
                return file.toLowerCase() !== name.toLowerCase()
                    && file.toLowerCase() !== name.toLowerCase() + ".ts"
                    && file.toLowerCase() !== name.toLowerCase() + ".js";
            }
        )
        );
        files.length && this.hook<{ name: string, content: string }[]>(HookKey.LoadTSFiles, files).then((data) => {
            data.filter(item => item.content).forEach(item => {
                this.init(item.name, item.content);
            });
        });
    }

    /**
     * 实例化文件对象
     * @param path 文件路径
     * @param content 文件内容
     */
    protected async init(path: string, content?: string): Promise<ICodeFile> {
        let file = this.getFile(path);
        if (file) {
            return file;
        }
        const _monaco = await this.monacoPromise;
        file = await super.init(path, content);
        const uri = _monaco.Uri.parse(path);
        // 订阅加载pageage事件，来处理用户编写代码时手写的包或文件
        file.on("loadResources", (resources: string[]) => {
            const packages = resources.filter(item => item[0] !== ".");
            this.loadPackages(packages);
            const files = resources.filter(item => item[0] === ".").map(item => {
                return UtilService.toAbsolute(uri.path, item);
            });
            this.loadFiles(files);
        }, 1000);
        return file;
    }

    private async getNpmCompletionItems(): Promise<any[]> {
        const dtsManifest = await this.hook<DtsManifest>(HookKey.GetDtsManifest);
        const dtsImports = dtsManifest.imports || {};
        const items: Array<{ label: string; insertText: string; kind: number }> = [];
        for (const libName in dtsImports) {
            if (libName && !!dtsImports[libName]) {
                items.push({
                    label: libName,
                    insertText: libName,
                    kind: 8
                });
            }
        }
        return items;
    }

    constructor(element: HTMLElement, hooks: TSHooks) {
        super(element, hooks);
        this.monacoPromise.then(_monaco => {
            _monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                skipLibCheck: true,
                downlevelIteration: true,
                resolveJsonModule: true,
                allowNonTsExtensions: true
            });
            // 实现import导入npm包名时的智能提示
            _monaco.languages.registerCompletionItemProvider("typescript", {
                provideCompletionItems: async (model: any, position: any, context: any) => {
                    if (!context || !context.triggerCharacter || (context.triggerCharacter !== `'` && context.triggerCharacter !== `"`)) {
                        return { suggestions: [] };
                    }
                    const npmCompletionItems = await this.getNpmCompletionItems();
                    return {
                        suggestions: IntelligentPromptConditionChecker.isImportStatement(model, position) ? npmCompletionItems : []
                    };
                },
                triggerCharacters: [`'`, `"`]
            });
        });
    }

}
