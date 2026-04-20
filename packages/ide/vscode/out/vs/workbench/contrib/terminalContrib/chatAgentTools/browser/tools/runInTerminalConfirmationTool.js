/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource, ToolInvocationPresentation } from '../../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const ConfirmTerminalCommandToolData = {
    id: 'vscode_get_terminal_confirmation',
    displayName: localize('confirmTerminalCommandTool.displayName', 'Confirm Terminal Command'),
    modelDescription: [
        'This tool allows you to get explicit user confirmation for a terminal command without executing it.',
        '',
        'When to use:',
        '- When you need to verify user approval before executing a command',
        '- When you want to show command details, auto-approval status, and simplified versions to the user',
        '- When you need the user to review a potentially risky command',
        '',
        'The tool will:',
        '- Show the command with syntax highlighting',
        '- Display auto-approval status if enabled',
        '- Show simplified version of the command if applicable',
        '- Provide custom actions for creating auto-approval rules',
        '- Return approval/rejection status',
        '',
        'After confirmation, use a tool to actually execute the command.'
    ].join('\n'),
    userDescription: localize('confirmTerminalCommandTool.userDescription', 'Tool for confirming terminal commands'),
    source: ToolDataSource.Internal,
    icon: Codicon.shield,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The command to confirm with the user.'
            },
            explanation: {
                type: 'string',
                description: 'A one-sentence description of what the command does. This will be shown to the user in the confirmation dialog.'
            },
            isBackground: {
                type: 'boolean',
                description: 'Whether the command would start a background process. This provides context for the confirmation.'
            },
        },
        required: [
            'command',
            'explanation',
            'isBackground',
        ]
    }
};
export class ConfirmTerminalCommandTool extends RunInTerminalTool {
    async prepareToolInvocation(context, token) {
        // Safe-guard: If session is the chat provider specific id
        // then convert it to the session id understood by chat service
        try {
            const sessionUri = context.chatSessionId ? URI.parse(context.chatSessionId) : undefined;
            const sessionId = sessionUri ? this._chatService.getSession(sessionUri)?.sessionId : undefined;
            if (sessionId) {
                context.chatSessionId = sessionId;
            }
        }
        catch {
            // Ignore parse errors or session lookup failures; fallback to using the original chatSessionId.
        }
        const preparedInvocation = await super.prepareToolInvocation(context, token);
        if (preparedInvocation) {
            preparedInvocation.presentation = ToolInvocationPresentation.HiddenAfterComplete;
        }
        return preparedInvocation;
    }
    async invoke(invocation, countTokens, progress, token) {
        // This is a confirmation-only tool - just return success
        return {
            content: [{
                    kind: 'text',
                    value: 'yes'
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbENvbmZpcm1hdGlvblRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvcnVuSW5UZXJtaW5hbENvbmZpcm1hdGlvblRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUE0SCxjQUFjLEVBQUUsMEJBQTBCLEVBQWdCLE1BQU0sc0RBQXNELENBQUM7QUFDMVAsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFM0QsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQWM7SUFDeEQsRUFBRSxFQUFFLGtDQUFrQztJQUN0QyxXQUFXLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDBCQUEwQixDQUFDO0lBQzNGLGdCQUFnQixFQUFFO1FBQ2pCLHFHQUFxRztRQUNyRyxFQUFFO1FBQ0YsY0FBYztRQUNkLG9FQUFvRTtRQUNwRSxvR0FBb0c7UUFDcEcsZ0VBQWdFO1FBQ2hFLEVBQUU7UUFDRixnQkFBZ0I7UUFDaEIsNkNBQTZDO1FBQzdDLDJDQUEyQztRQUMzQyx3REFBd0Q7UUFDeEQsMkRBQTJEO1FBQzNELG9DQUFvQztRQUNwQyxFQUFFO1FBQ0YsaUVBQWlFO0tBQ2pFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNaLGVBQWUsRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUsdUNBQXVDLENBQUM7SUFDaEgsTUFBTSxFQUFFLGNBQWMsQ0FBQyxRQUFRO0lBQy9CLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtJQUNwQixXQUFXLEVBQUU7UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsdUNBQXVDO2FBQ3BEO1lBQ0QsV0FBVyxFQUFFO2dCQUNaLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxpSEFBaUg7YUFDOUg7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLG1HQUFtRzthQUNoSDtTQUNEO1FBQ0QsUUFBUSxFQUFFO1lBQ1QsU0FBUztZQUNULGFBQWE7WUFDYixjQUFjO1NBQ2Q7S0FDRDtDQUNELENBQUM7QUFFRixNQUFNLE9BQU8sMEJBQTJCLFNBQVEsaUJBQWlCO0lBQ3ZELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQ3hHLDBEQUEwRDtRQUMxRCwrREFBK0Q7UUFDL0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUN4RixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQy9GLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLENBQUM7WUFDTixnR0FBZ0c7UUFDakcsQ0FBQztRQUNELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdFLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixrQkFBa0IsQ0FBQyxZQUFZLEdBQUcsMEJBQTBCLENBQUMsbUJBQW1CLENBQUM7UUFDbEYsQ0FBQztRQUNELE9BQU8sa0JBQWtCLENBQUM7SUFDM0IsQ0FBQztJQUNRLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxXQUFnQyxFQUFFLFFBQXNCLEVBQUUsS0FBd0I7UUFDcEkseURBQXlEO1FBQ3pELE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQztvQkFDVCxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsS0FBSztpQkFDWixDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7Q0FDRCJ9