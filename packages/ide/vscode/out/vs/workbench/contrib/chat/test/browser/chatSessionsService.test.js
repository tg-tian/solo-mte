/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatSessionsService } from '../../browser/chatSessions.contribution.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite.skip('ChatSessionsService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let chatSessionsService;
    setup(() => {
        const instantiationService = store.add(workbenchInstantiationService(undefined, store));
        chatSessionsService = store.add(instantiationService.createInstance(ChatSessionsService));
    });
    suite('extractFileNameFromLink', () => {
        function callExtractFileNameFromLink(filePath) {
            return chatSessionsService['extractFileNameFromLink'](filePath);
        }
        test('should extract filename from markdown link with link text', () => {
            const input = 'Read [README](file:///path/to/README.md) for more info';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Read README for more info');
        });
        test('should extract filename from markdown link without link text', () => {
            const input = 'Read [](file:///index.js) for instructions';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Read index.js for instructions');
        });
        test('should extract filename from markdown link with empty link text', () => {
            const input = 'Check [  ](file:///config.json) settings';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Check config.json settings');
        });
        test('should handle multiple file links in same string', () => {
            const input = 'See [main](file:///main.js) and [utils](file:///utils/helper.ts)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'See main and utils');
        });
        test('should handle file path without extension', () => {
            const input = 'Open [](file:///src/components/Button)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Open Button');
        });
        test('should handle deep file paths', () => {
            const input = 'Edit [](file:///very/deep/nested/path/to/file.tsx)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Edit file.tsx');
        });
        test('should handle file path that is just a filename', () => {
            const input = 'View [script](file:///script.py)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'View script');
        });
        test('should handle link text with special characters', () => {
            const input = 'See [App.js (main)](file:///App.js)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'See App.js (main)');
        });
        test('should return original string if no file links present', () => {
            const input = 'This is just regular text with no links';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'This is just regular text with no links');
        });
        test('should handle mixed content with file links and regular text', () => {
            const input = 'Check [config](file:///config.yml) and visit https://example.com';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Check config and visit https://example.com');
        });
        test('should handle file path with query parameters or fragments', () => {
            const input = 'Open [](file:///index.html?param=value#section)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Open index.html?param=value#section');
        });
        test('should handle Windows-style paths', () => {
            const input = 'Edit [](file:///C:/Users/user/Documents/file.txt)';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, 'Edit file.txt');
        });
        test('should preserve whitespace around replacements', () => {
            const input = '   Check [](file:///test.js)   ';
            const result = callExtractFileNameFromLink(input);
            assert.strictEqual(result, '   Check test.js   ');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRTZXNzaW9uc1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEcsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLG1CQUF3QyxDQUFDO0lBRTdDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDeEYsbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUVyQyxTQUFTLDJCQUEyQixDQUFDLFFBQWdCO1lBR3BELE9BQVEsbUJBQTJELENBQUMseUJBQXlCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRyxDQUFDO1FBRUQsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEdBQUcsRUFBRTtZQUN0RSxNQUFNLEtBQUssR0FBRyx3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