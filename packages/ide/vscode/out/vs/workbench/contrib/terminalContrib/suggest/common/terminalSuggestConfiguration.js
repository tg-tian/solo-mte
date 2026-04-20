/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
    TerminalSuggestSettingId["SelectionMode"] = "terminal.integrated.suggest.selectionMode";
    TerminalSuggestSettingId["InsertTrailingSpace"] = "terminal.integrated.suggest.insertTrailingSpace";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', "Enables terminal IntelliSense suggestions (also known as autocomplete) for supported shells ({0}). This requires {1} to be enabled and working or [manually installed](https://code.visualstudio.com/docs/terminal/shell-integration#_manual-installation-install).", 'Windows PowerShell, PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
        type: 'object',
        properties: {},
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', "Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', 'Enable quick suggestions when it\'s unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback.'),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', "Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result."),
        enum: ['never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.never', "Never run on `Enter`."),
            localize('runOnEnter.exactMatch', "Run on `Enter` when the suggestion is typed in its entirety."),
            localize('runOnEnter.exactMatchIgnoreExtension', "Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included."),
            localize('runOnEnter.always', "Always run on `Enter`.")
        ],
        default: 'never',
    },
    ["terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */]: {
        markdownDescription: localize('terminal.integrated.selectionMode', "Controls how suggestion selection works in the integrated terminal."),
        type: 'string',
        enum: ['partial', 'always', 'never'],
        markdownEnumDescriptions: [
            localize('terminal.integrated.selectionMode.partial', "Partially select a suggestion when automatically triggering IntelliSense. `Tab` can be used to accept the first suggestion, only after navigating the suggestions via `Down` will `Enter` also accept the active suggestion."),
            localize('terminal.integrated.selectionMode.always', "Always select a suggestion when automatically triggering IntelliSense. `Enter` or `Tab` can be used to accept the first suggestion."),
            localize('terminal.integrated.selectionMode.never', "Never select a suggestion when automatically triggering IntelliSense. The list must be navigated via `Down` before `Enter` or `Tab` can be used to accept the active suggestion."),
        ],
        default: 'partial',
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize("terminalWindowsExecutableSuggestionSetting", "A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.", windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', "Controls whether the terminal suggestions status bar should be shown."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', "Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms."),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', "Disable the feature."),
            localize('suggest.cdPath.relative', "Enable the feature and use relative paths."),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', "Disable the feature."),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', "Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be above the inline suggestion."),
            localize('suggest.inlineSuggestion.alwaysOnTop', "Enable the feature and always put the inline suggestion on top."),
        ],
        default: 'alwaysOnTop',
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', "Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead."),
        type: 'boolean',
        default: true,
    },
    ["terminal.integrated.suggest.insertTrailingSpace" /* TerminalSuggestSettingId.InsertTrailingSpace */]: {
        restricted: true,
        markdownDescription: localize('suggest.insertTrailingSpace', "Controls whether a space is automatically inserted after accepting a suggestion and re-trigger suggestions. Folders and symbolic link folders will never have a trailing space added."),
        type: 'boolean',
        default: false,
    },
};
let terminalSuggestProvidersConfiguration;
export function registerTerminalSuggestProvidersConfiguration(providers) {
    const oldProvidersConfiguration = terminalSuggestProvidersConfiguration;
    providers ??= new Map();
    if (!providers.has('lsp')) {
        providers.set('lsp', {
            id: 'lsp',
            description: localize('suggest.provider.lsp.description', 'Show suggestions from language servers.')
        });
    }
    const providersProperties = {};
    for (const id of Array.from(providers.keys()).sort()) {
        providersProperties[id] = {
            type: 'boolean',
            default: id === 'lsp' ? false : true,
            description: providers.get(id)?.description ??
                localize('suggest.provider.title', "Show suggestions from {0}.", id)
        };
    }
    const defaultValue = {};
    for (const key in providersProperties) {
        defaultValue[key] = providersProperties[key].default;
    }
    terminalSuggestProvidersConfiguration = {
        id: 'terminalSuggestProviders',
        order: 100,
        title: localize('terminalSuggestProvidersConfigurationTitle', "Terminal Suggest Providers"),
        type: 'object',
        properties: {
            ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
                restricted: true,
                markdownDescription: localize('suggest.providersEnabledByDefault', "Controls which suggestions automatically show up while typing. Suggestion providers are enabled by default."),
                type: 'object',
                properties: providersProperties,
                default: defaultValue,
                tags: ['preview'],
                additionalProperties: false
            }
        }
    };
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    registry.updateConfigurations({
        add: [terminalSuggestProvidersConfiguration],
        remove: oldProvidersConfiguration ? [oldProvidersConfiguration] : []
    });
}
registerTerminalSuggestProvidersConfiguration();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9jb21tb24vdGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFvRCxVQUFVLElBQUksdUJBQXVCLEVBQTBCLE1BQU0sdUVBQXVFLENBQUM7QUFDeE0sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRy9FLE1BQU0sQ0FBTixJQUFrQix3QkFhakI7QUFiRCxXQUFrQix3QkFBd0I7SUFDekMsMkVBQStDLENBQUE7SUFDL0MsNkZBQWlFLENBQUE7SUFDakUsaUhBQXFGLENBQUE7SUFDckYsaUZBQXFELENBQUE7SUFDckQsbUhBQXVGLENBQUE7SUFDdkYsK0VBQW1ELENBQUE7SUFDbkQsdUZBQTJELENBQUE7SUFDM0QseUVBQTZDLENBQUE7SUFDN0MsNkZBQWlFLENBQUE7SUFDakUsMkdBQStFLENBQUE7SUFDL0UsdUZBQTJELENBQUE7SUFDM0QsbUdBQXVFLENBQUE7QUFDeEUsQ0FBQyxFQWJpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBYXpDO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQWE7SUFDM0QsS0FBSyxFQUFJLGtCQUFrQjtJQUMzQixLQUFLLEVBQUksYUFBYTtJQUN0QixLQUFLLEVBQUksaUJBQWlCO0lBQzFCLEtBQUssRUFBSSxlQUFlO0lBRXhCLEtBQUssRUFBSSw0QkFBNEI7SUFFckMsS0FBSyxFQUFJLG9CQUFvQjtJQUU3QixLQUFLLEVBQUksZ0JBQWdCO0lBQ3pCLElBQUksRUFBSyxlQUFl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