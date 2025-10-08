/**
 * 语法高亮类型
 */
export enum Languages {
    Typescript = "typescript",
    Java = "java",
    Json = "json",
    Css = "css",
    Html = "html",
    Javascript = "javascript",
    Less = "less",
    Scss = "scss",
    Yaml = "yaml",
    Xml = "xml",
    Bat = "bat",
    Shell = "shell",
};

/**
 * 语法类型与其文件后缀的对应关系
 */
export const LanguageSuffixMap = {
    [Languages.Typescript]: [".ts"],
    [Languages.Java]: [".java"],
    [Languages.Json]: [".json"],
    [Languages.Css]: [".css"],
    [Languages.Html]: [".html", ".htm"],
    [Languages.Javascript]: [".js"],
    [Languages.Less]: [".less"],
    [Languages.Scss]: [".scss"],
    [Languages.Yaml]: [".yml"],
    [Languages.Xml]: [".xml"],
    [Languages.Bat]: [".bat"],
    [Languages.Shell]: [".sh"],
};

/**
 * 钩子类型
 */
export enum HookKey {
    LoadMonaco = "loadMonaco",
    LoadTSPackages = "loadTSPackages",
    LoadTSFiles = "loadTSFiles",
    GetDtsManifest = "getDtsManifest",
};

/**
 * 事件类型
 */
export enum Events {
    /** 代码编辑器初始化完成 */
    Initialized = "initialized",
    /** 代码变化 */
    Changed = "changed",
    /** 代码大纲变化 - 类结构分析 */
    OutlineChanged = "OutlineChanged",
};
