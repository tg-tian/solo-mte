/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Separator } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { posix as pathPosix, win32 as pathWin32 } from '../../../../../base/common/path.js';
import { escapeRegExpCharacters, removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
export function isPowerShell(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^(?:powershell|pwsh)(?:-preview)?$/i.test(pathWin32.basename(envShell).replace(/\.exe$/i, ''));
    }
    return /^(?:powershell|pwsh)(?:-preview)?$/.test(pathPosix.basename(envShell));
}
export function isWindowsPowerShell(envShell) {
    return envShell.endsWith('System32\\WindowsPowerShell\\v1.0\\powershell.exe');
}
export function isZsh(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^zsh(?:\.exe)?$/i.test(pathWin32.basename(envShell));
    }
    return /^zsh$/.test(pathPosix.basename(envShell));
}
export function isFish(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^fish(?:\.exe)?$/i.test(pathWin32.basename(envShell));
    }
    return /^fish$/.test(pathPosix.basename(envShell));
}
// Maximum output length to prevent context overflow
const MAX_OUTPUT_LENGTH = 60000; // ~60KB limit to keep context manageable
export const TRUNCATION_MESSAGE = '\n\n[... PREVIOUS OUTPUT TRUNCATED ...]\n\n';
export function truncateOutputKeepingTail(output, maxLength) {
    if (output.length <= maxLength) {
        return output;
    }
    const truncationMessageLength = TRUNCATION_MESSAGE.length;
    if (truncationMessageLength >= maxLength) {
        return TRUNCATION_MESSAGE.slice(TRUNCATION_MESSAGE.length - maxLength);
    }
    const availableLength = maxLength - truncationMessageLength;
    const endPortion = output.slice(-availableLength);
    return TRUNCATION_MESSAGE + endPortion;
}
export function sanitizeTerminalOutput(output) {
    let sanitized = removeAnsiEscapeCodes(output)
        // Trim trailing \r\n characters
        .trimEnd();
    // Truncate if output is too long to prevent context overflow
    if (sanitized.length > MAX_OUTPUT_LENGTH) {
        sanitized = truncateOutputKeepingTail(sanitized, MAX_OUTPUT_LENGTH);
    }
    return sanitized;
}
export function generateAutoApproveActions(commandLine, subCommands, autoApproveResult) {
    const actions = [];
    // We shouldn't offer configuring rules for commands that are explicitly denied since it
    // wouldn't get auto approved with a new rule
    const canCreateAutoApproval = (autoApproveResult.subCommandResults.every(e => e.result !== 'denied') &&
        autoApproveResult.commandLineResult.result !== 'denied');
    if (canCreateAutoApproval) {
        const unapprovedSubCommands = subCommands.filter((_, index) => {
            return autoApproveResult.subCommandResults[index].result !== 'approved';
        });
        // Some commands should not be recommended as they are too permissive generally. This only
        // applies to sub-commands, we still want to offer approving of the exact the command line
        // however as it's very specific.
        const neverAutoApproveCommands = new Set([
            // Shell interpreters
            'bash', 'sh', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'dash',
            'pwsh', 'powershell', 'powershell.exe', 'cmd', 'cmd.exe',
            // Script interpreters
            'python', 'python3', 'node', 'ruby', 'perl', 'php', 'lua',
            // Direct execution commands
            'eval', 'exec', 'source', 'sudo', 'su', 'doas',
            // Network tools that can download and execute code
            'curl', 'wget', 'invoke-restmethod', 'invoke-webrequest', 'irm', 'iwr',
        ]);
        // Commands where we want to suggest the sub-command (eg. `foo bar` instead of `foo`)
        const commandsWithSubcommands = new Set(['git', 'npm', 'npx', 'yarn', 'docker', 'kubectl', 'cargo', 'dotnet', 'mvn', 'gradle']);
        // Commands where we want to suggest the sub-command of a sub-command (eg. `foo bar baz`
        // instead of `foo`)
        const commandsWithSubSubCommands = new Set(['npm run', 'yarn run']);
        // For each unapproved sub-command (within the overall command line), decide whether to
        // suggest new rules for the command, a sub-command, a sub-command of a sub-command or to
        // not suggest at all.
        const subCommandsToSuggest = Array.from(new Set(coalesce(unapprovedSubCommands.map(command => {
            const parts = command.trim().split(/\s+/);
            const baseCommand = parts[0].toLowerCase();
            const baseSubCommand = parts.length > 1 ? `${parts[0]} ${parts[1]}`.toLowerCase() : '';
            // Security check: Never suggest auto-approval for dangerous interpreter commands
            if (neverAutoApproveCommands.has(baseCommand)) {
                return undefined;
            }
            if (commandsWithSubSubCommands.has(baseSubCommand)) {
                if (parts.length >= 3 && !parts[2].startsWith('-')) {
                    return `${parts[0]} ${parts[1]} ${parts[2]}`;
                }
                return undefined;
            }
            else if (commandsWithSubcommands.has(baseCommand)) {
                if (parts.length >= 2 && !parts[1].startsWith('-')) {
                    return `${parts[0]} ${parts[1]}`;
                }
                return undefined;
            }
            else {
                return parts[0];
            }
        }))));
        if (subCommandsToSuggest.length > 0) {
            let subCommandLabel;
            if (subCommandsToSuggest.length === 1) {
                subCommandLabel = localize('autoApprove.baseCommandSingle', 'Always Allow Command: {0}', subCommandsToSuggest[0]);
            }
            else {
                const commandSeparated = subCommandsToSuggest.join(', ');
                subCommandLabel = localize('autoApprove.baseCommand', 'Always Allow Commands: {0}', commandSeparated);
            }
            actions.push({
                label: subCommandLabel,
                data: {
                    type: 'newRule',
                    rule: subCommandsToSuggest.map(key => ({
                        key,
                        value: true
                    }))
                }
            });
        }
        // Allow exact command line, don't do this if it's just the first sub-command's first
        // word or if it's an exact match for special sub-commands
        const firstSubcommandFirstWord = unapprovedSubCommands.length > 0 ? unapprovedSubCommands[0].split(' ')[0] : '';
        if (firstSubcommandFirstWord !== commandLine &&
            !commandsWithSubcommands.has(commandLine) &&
            !commandsWithSubSubCommands.has(commandLine)) {
            actions.push({
                label: localize('autoApprove.exactCommand', 'Always Allow Exact Command Line'),
                data: {
                    type: 'newRule',
                    rule: {
                        key: `/^${escapeRegExpCharacters(commandLine)}$/`,
                        value: {
                            approve: true,
                            matchCommandLine: true
                        }
                    }
                }
            });
        }
    }
    if (actions.length > 0) {
        actions.push(new Separator());
    }
    // Allow all commands for this session
    actions.push({
        label: localize('allowSession', 'Allow All Commands in this Session'),
        tooltip: localize('allowSessionTooltip', 'Allow this tool to run in this session without confirmation.'),
        data: {
            type: 'sessionApproval'
        }
    });
    actions.push(new Separator());
    // Always show configure option
    actions.push({
        label: localize('autoApprove.configure', 'Configure Auto Approve...'),
        data: {
            type: 'configure'
        }
    });
    return actions;
}
export function dedupeRules(rules) {
    return rules.filter((result, index, array) => {
        return result.rule && array.findIndex(r => r.rule && r.rule.sourceText === result.rule.sourceText) === index;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbEhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvcnVuSW5UZXJtaW5hbEhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxJQUFJLFNBQVMsRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBS2pELE1BQU0sVUFBVSxZQUFZLENBQUMsUUFBZ0IsRUFBRSxFQUFtQjtJQUNqRSxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV4RyxDQUFDO0lBQ0QsT0FBTyxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ2hGLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsUUFBZ0I7SUFDbkQsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUVELE1BQU0sVUFBVSxLQUFLLENBQUMsUUFBZ0IsRUFBRSxFQUFtQjtJQUMxRCxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELE1BQU0sVUFBVSxNQUFNLENBQUMsUUFBZ0IsRUFBRSxFQUFtQjtJQUMzRCxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQztBQUVELG9EQUFvRDtBQUNwRCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxDQUFDLHlDQUF5QztBQUMxRSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyw2Q0FBNkMsQ0FBQztBQUVoRixNQUFNLFVBQVUseUJBQXlCLENBQUMsTUFBYyxFQUFFLFNBQWlCO0lBQzFFLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNoQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFDRCxNQUFNLHVCQUF1QixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztJQUMxRCxJQUFJLHVCQUF1QixJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sa0JBQWtCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBQ0QsTUFBTSxlQUFlLEdBQUcsU0FBUyxHQUFHLHVCQUF1QixDQUFDO0lBQzVELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNsRCxPQUFPLGtCQUFrQixHQUFHLFVBQVUsQ0FBQztBQUN4QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLE1BQWM7SUFDcEQsSUFBSSxTQUFTLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDO1FBQzVDLGdDQUFnQztTQUMvQixPQUFPLEVBQUUsQ0FBQztJQUVaLDZEQUE2RDtJQUM3RCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQyxTQUFTLEdBQUcseUJBQXlCLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsV0FBbUIsRUFBRSxXQUFxQixFQUFFLGlCQUFpSTtJQUN2TixNQUFNLE9BQU8sR0FBNkIsRUFBRSxDQUFDO0lBRTdDLHdGQUF3RjtJQUN4Riw2Q0FBNkM7SUFDN0MsTUFBTSxxQkFBcUIsR0FBRyxDQUM3QixpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQztRQUNyRSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUN2RCxDQUFDO0lBQ0YsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1FBQzNCLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM3RCxPQUFPLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUM7UUFDekUsQ0FBQyxDQUFDLENBQUM7UUFFSCwwRkFBMEY7UUFDMUYsMEZBQTBGO1FBQzFGLGlDQUFpQztRQUNqQyxNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxDQUFDO1lBQ3hDLHFCQUFxQjtZQUNyQixNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTTtZQUN6RCxNQUFNLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxTQUFTO1lBQ3hELHNCQUFzQjtZQUN0QixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLO1lBQ3pELDRCQUE0QjtZQUM1QixNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU07WUFDOUMsbURBQW1EO1lBQ25ELE1BQU0sRUFBRSxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLEtBQUs7U0FDdEUsQ0FBQyxDQUFDO1FBRUgscUZBQXFGO1FBQ3JGLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWhJLHdGQUF3RjtRQUN4RixvQkFBb0I7UUFDcEIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRXBFLHVGQUF1RjtRQUN2Rix5RkFBeUY7UUFDekYsc0JBQXNCO1FBQ3RCLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQzVGLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzNDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBRXZGLGlGQUFpRjtZQUNqRixJQUFJLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUMvQyxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsSUFBSSwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDcEQsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDcEQsT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztpQkFBTSxJQUFJLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNwRCxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTixJQUFJLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxJQUFJLGVBQXVCLENBQUM7WUFDNUIsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLGVBQWUsR0FBRyxRQUFRLENBQUMsK0JBQStCLEVBQUUsMkJBQTJCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuSCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pELGVBQWUsR0FBRyxRQUFRLENBQUMseUJBQXlCLEVBQUUsNEJBQTRCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN2RyxDQUFDO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixLQUFLLEVBQUUsZUFBZTtnQkFDdEIsSUFBSSxFQUFFO29CQUNMLElBQUksRUFBRSxTQUFTO29CQUNmLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUN0QyxHQUFHO3dCQUNILEtBQUssRUFBRSxJQUFJO3FCQUNYLENBQUMsQ0FBQztpQkFDd0M7YUFDNUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHFGQUFxRjtRQUNyRiwwREFBMEQ7UUFDMUQsTUFBTSx3QkFBd0IsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNoSCxJQUNDLHdCQUF3QixLQUFLLFdBQVc7WUFDeEMsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDO1lBQ3pDLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUMzQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGlDQUFpQyxDQUFDO2dCQUM5RSxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsSUFBSSxFQUFFO3dCQUNMLEdBQUcsRUFBRSxLQUFLLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxJQUFJO3dCQUNqRCxLQUFLLEVBQUU7NEJBQ04sT0FBTyxFQUFFLElBQUk7NEJBQ2IsZ0JBQWdCLEVBQUUsSUFBSTt5QkFDdEI7cUJBQ0Q7aUJBQzBDO2FBQzVDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFHRCxzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLG9DQUFvQyxDQUFDO1FBQ3JFLE9BQU8sRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsOERBQThELENBQUM7UUFDeEcsSUFBSSxFQUFFO1lBQ0wsSUFBSSxFQUFFLGlCQUFpQjtTQUNvQjtLQUM1QyxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQztJQUU5QiwrQkFBK0I7SUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsdUJBQXVCLEVBQUUsMkJBQTJCLENBQUM7UUFDckUsSUFBSSxFQUFFO1lBQ0wsSUFBSSxFQUFFLFdBQVc7U0FDMEI7S0FDNUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBeUM7SUFDcEUsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUM1QyxPQUFPLE1BQU0sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEtBQUssTUFBTSxDQUFDLElBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxLQUFLLENBQUM7SUFDL0csQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIn0=