/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { OutputMonitorState } from '../monitoring/types.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
export function toolResultDetailsFromResponse(terminalResults) {
    return Array.from(new Map(terminalResults
        .flatMap(r => r.resources?.filter(res => res.uri).map(res => {
        const range = res.range;
        const item = range !== undefined ? { uri: res.uri, range } : res.uri;
        const key = range !== undefined
            ? `${res.uri.toString()}-${range.toString()}`
            : `${res.uri.toString()}`;
        return [key, item];
    }) ?? [])).values());
}
export function toolResultMessageFromResponse(result, taskLabel, toolResultDetails, terminalResults, getOutputTool, isBackground) {
    let resultSummary = '';
    if (result?.exitCode) {
        resultSummary = localize('copilotChat.taskFailedWithExitCode', 'Task `{0}` failed with exit code {1}.', taskLabel, result.exitCode);
    }
    else {
        resultSummary += `\`${taskLabel}\` task `;
        const problemCount = toolResultDetails.length;
        if (getOutputTool) {
            return problemCount ? new MarkdownString(`Got output for ${resultSummary} with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`) : new MarkdownString(`Got output for ${resultSummary}`);
        }
        else {
            const problemCount = toolResultDetails.length;
            resultSummary += terminalResults.every(r => r.state === OutputMonitorState.Idle)
                ? (problemCount
                    ? `finished with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`
                    : 'finished')
                : (isBackground
                    ? (problemCount
                        ? `started and will continue to run in the background with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`
                        : 'started and will continue to run in the background')
                    : (problemCount
                        ? `started with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`
                        : 'started'));
        }
    }
    return new MarkdownString(resultSummary);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0hlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvdGFzay90YXNrSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWpGLE1BQU0sVUFBVSw2QkFBNkIsQ0FBQyxlQUFrRTtJQUMvRyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQ3hCLGVBQWU7U0FDYixPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDWixDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDN0MsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUN4QixNQUFNLElBQUksR0FBRyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1FBQ3JFLE1BQU0sR0FBRyxHQUFHLEtBQUssS0FBSyxTQUFTO1lBQzlCLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQzdDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUMzQixPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBNkIsQ0FBQztJQUNoRCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQ1IsQ0FDRixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLDZCQUE2QixDQUFDLE1BQWdDLEVBQUUsU0FBaUIsRUFBRSxpQkFBcUMsRUFBRSxlQUE2RixFQUFFLGFBQXVCLEVBQUUsWUFBc0I7SUFDdlIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLGFBQWEsR0FBRyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsdUNBQXVDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNySSxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsSUFBSSxLQUFLLFNBQVMsVUFBVSxDQUFDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUM5QyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsYUFBYSxXQUFXLFlBQVksYUFBYSxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLGtCQUFrQixhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ3RNLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1lBQzlDLGFBQWEsSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQy9FLENBQUMsQ0FBQyxDQUFDLFlBQVk7b0JBQ2QsQ0FBQyxDQUFDLG1CQUFtQixZQUFZLGFBQWEsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7b0JBQzdFLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUMsWUFBWTtvQkFDZCxDQUFDLENBQUMsQ0FBQyxZQUFZO3dCQUNkLENBQUMsQ0FBQyw2REFBNkQsWUFBWSxhQUFhLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO3dCQUN2SCxDQUFDLENBQUMsb0RBQW9ELENBQUM7b0JBQ3hELENBQUMsQ0FBQyxDQUFDLFlBQVk7d0JBQ2QsQ0FBQyxDQUFDLGtCQUFrQixZQUFZLGFBQWEsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7d0JBQzVFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxQyxDQUFDIn0=