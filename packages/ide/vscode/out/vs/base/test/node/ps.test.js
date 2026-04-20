/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { JS_FILENAME_PATTERN } from '../../node/ps.js';
suite('Process Utils', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('JS file regex', () => {
        function findJsFiles(cmd) {
            const matches = [];
            let match;
            while ((match = JS_FILENAME_PATTERN.exec(cmd)) !== null) {
                matches.push(match[0]);
            }
            return matches;
        }
        test('should match simple .js files', () => {
            deepStrictEqual(findJsFiles('node bootstrap.js'), ['bootstrap.js']);
        });
        test('should match multiple .js files', () => {
            deepStrictEqual(findJsFiles('node server.js --require helper.js'), ['server.js', 'helper.js']);
        });
        test('should match .js files with hyphens', () => {
            deepStrictEqual(findJsFiles('node my-script.js'), ['my-script.js']);
        });
        test('should not match .json files', () => {
            deepStrictEqual(findJsFiles('cat package.json'), []);
        });
        test('should not match .js prefix in .json extension (regression test for \\b fix)', () => {
            // Without the \b word boundary, the regex would incorrectly match "package.js" from "package.json"
            deepStrictEqual(findJsFiles('node --config tsconfig.json'), []);
            deepStrictEqual(findJsFiles('eslint.json'), []);
        });
        test('should not match .jsx files', () => {
            deepStrictEqual(findJsFiles('node component.jsx'), []);
        });
        test('should match .js but not .json in same command', () => {
            deepStrictEqual(findJsFiles('node app.js --config settings.json'), ['app.js']);
        });
        test('should not match partial matches inside other extensions', () => {
            deepStrictEqual(findJsFiles('file.jsmith'), []);
        });
        test('should match .js at end of command', () => {
            deepStrictEqual(findJsFiles('/path/to/script.js'), ['script.js']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFdkQsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFFM0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUUzQixTQUFTLFdBQVcsQ0FBQyxHQUFXO1lBQy9CLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztZQUM3QixJQUFJLEtBQUssQ0FBQztZQUNWLE9BQU8sQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsQ0FBQztZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1lBQzVDLGVBQWUsQ0FBQyxXQUFXLENBQUMsb0NBQW9DLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxlQUFlLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtZQUN6QyxlQUFlLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsOEVBQThFLEVBQUUsR0FBRyxFQUFFO1lBQ3pGLG1HQUFtRztZQUNuRyxlQUFlLENBQUMsV0FBVyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7WUFDeEMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtZQUMzRCxlQUFlLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEdBQUcsRUFBRTtZQUNyRSxlQUFlLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxlQUFlLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9