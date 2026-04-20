/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { extname, join } from '../../../../../base/common/path.js';
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { getReindentEditOperations } from '../../../../../editor/contrib/indentation/common/indentation.js';
import { createModelServices, instantiateTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { LanguageConfigurationFileHandler } from '../../common/languageConfigurationExtensionPoint.js';
import { parse } from '../../../../../base/common/json.js';
import { trimTrailingWhitespace } from '../../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { execSync } from 'child_process';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../../editor/common/languages.js';
import { NullState } from '../../../../../editor/common/languages/nullTokenize.js';
import { FileAccess } from '../../../../../base/common/network.js';
function getIRange(range) {
    return {
        startLineNumber: range.startLineNumber,
        startColumn: range.startColumn,
        endLineNumber: range.endLineNumber,
        endColumn: range.endColumn
    };
}
var LanguageId;
(function (LanguageId) {
    LanguageId["TypeScript"] = "ts-test";
})(LanguageId || (LanguageId = {}));
function forceTokenizationFromLineToLine(model, startLine, endLine) {
    for (let line = startLine; line <= endLine; line++) {
        model.tokenization.forceTokenization(line);
    }
}
function registerLanguage(instantiationService, languageId) {
    const disposables = new DisposableStore();
    const languageService = instantiationService.get(ILanguageService);
    disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    disposables.add(languageService.registerLanguage({ id: languageId }));
    return disposables;
}
function registerLanguageConfiguration(instantiationService, languageId) {
    const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
    let configPath;
    switch (languageId) {
        case "ts-test" /* LanguageId.TypeScript */:
            configPath = FileAccess.asFileUri('vs/workbench/contrib/codeEditor/test/node/language-configuration.json').fsPath;
            break;
        default:
            throw new Error('Unknown languageId');
    }
    const configContent = fs.readFileSync(configPath, { encoding: 'utf-8' });
    const parsedConfig = parse(configContent, []);
    const languageConfig = LanguageConfigurationFileHandler.extractValidConfig(languageId, parsedConfig);
    return languageConfigurationService.register(languageId, languageConfig);
}
function registerTokenizationSupport(instantiationService, tokens, languageId) {
    let lineIndex = 0;
    const languageService = instantiationService.get(ILanguageService);
    const tokenizationSupport = {
        getInitialState: () => NullState,
        tokenize: undefined,
        tokenizeEncoded: (line, hasEOL, state) => {
            const tokensOnLine = tokens[lineIndex++];
            const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
            const result = new Uint32Array(2 * tokensOnLine.length);
            for (let i = 0; i < tokensOnLine.length; i++) {
                result[2 * i] = tokensOnLine[i].startIndex;
                result[2 * i + 1] =
                    ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
                        | (tokensOnLine[i].standardTokenType << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */));
            }
            return new EncodedTokenizationResult(result, [], state);
        }
    };
    return TokenizationRegistry.register(languageId, tokenizationSupport);
}
suite('Auto-Reindentation - TypeScript/JavaScript', () => {
    const languageId = "ts-test" /* LanguageId.TypeScript */;
    const options = {};
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        disposables.add(instantiationService);
        disposables.add(registerLanguage(instantiationService, languageId));
        disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // Test which can be ran to find cases of incorrect indentation...
    test.skip('Find Cases of Incorrect Indentation with the Reindent Lines Command', () => {
        // ./scripts/test.sh --inspect --grep='Find Cases of Incorrect Indentation with the Reindent Lines Command' --timeout=15000
        function walkDirectoryAndReindent(directory, languageId) {
            const files = fs.readdirSync(directory, { withFileTypes: true });
            const directoriesToRecurseOn = [];
            for (const file of files) {
                if (file.isDirectory()) {
                    directoriesToRecurseOn.push(join(directory, file.name));
                }
                else {
                    const filePathName = join(directory, file.name);
                    const fileExtension = extname(filePathName);
                    if (fileExtension !== '.ts') {
                        continue;
                    }
                    const fileContents = fs.readFileSync(filePathName, { encoding: 'utf-8' });
                    const modelOptions = {
                        tabSize: 4,
                        insertSpaces: false
                    };
                    const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, modelOptions));
                    const lineCount = model.getLineCount();
                    const editOperations = [];
                    for (let line = 1; line <= lineCount - 1; line++) {
                        /*
                        NOTE: Uncomment in order to ignore incorrect JS DOC indentation
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0 || trimmedLineContent.startsWith('*') || trimmedLineContent.startsWith('/*')) {
                            continue;
                        }
                        */
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0) {
                            continue;
                        }
                        const editOperation = getReindentEditOperations(model, languageConfigurationService, line, line + 1);
                        /*
                        NOTE: Uncomment in order to see actual incorrect indentation diff
                        model.applyEdits(editOperation);
                        */
                        editOperations.push(...editOperation);
                    }
                    model.applyEdits(editOperations);
                    model.applyEdits(trimTrailingWhitespace(model, [], true));
                    fs.writeFileSync(filePathName, model.getValue());
                }
            }
            for (const directory of directoriesToRecurseOn) {
                walkDirectoryAndReindent(directory, languageId);
            }
        }
        walkDirectoryAndReindent('/Users/aiday/Desktop/Test/vscode-test', 'ts-test');
        const output = execSync('cd /Users/aiday/Desktop/Test/vscode-test && git diff --shortstat', { encoding: 'utf-8' });
        console.log('\ngit diff --shortstat:\n', output);
    });
    // Unit tests for increase and decrease indent patterns...
    /**
     * First increase indent and decrease indent patterns:
     *
     * - decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/
     *  - In (https://macromates.com/manual/en/appendix)
     * 	  Either we have white space before the closing bracket, or we have a multi line comment ending on that line followed by whitespaces
     *    This is followed by any character.
     *    Textmate decrease indent pattern is as follows: /^(.*\*\/)?\s*\}[;\s]*$/
     *    Presumably allowing multi line comments ending on that line implies that } is itself not part of a multi line comment
     *
     * - increaseIndentPattern: /^.*\{[^}"']*$/
     *  - In (https://macromates.com/manual/en/appendix)
     *    This regex means that we increase the indent when we have any characters followed by the opening brace, followed by characters
     *    except for closing brace }, double quotes " or single quote '.
     *    The } is checked in order to avoid the indentation in the following case `int arr[] = { 1, 2, 3 };`
     *    The double quote and single quote are checked in order to avoid the indentation in the following case: str = "foo {";
     */
    test('Issue #25437', () => {
        // issue: https://github.com/microsoft/vscode/issues/25437
        // fix: https://github.com/microsoft/vscode/commit/8c82a6c6158574e098561c28d470711f1b484fc8
        // explanation: var foo = `{`; should not increase indentation
        // increaseIndentPattern: /^.*\{[^}"']*$/ -> /^.*\{[^}"'`]*$/
        const fileContents = [
            'const foo = `{`;',
            '    ',
        ].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 13, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 14, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ }
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ }
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            'startLineNumber': 2,
            'startColumn': 1,
            'endLineNumber': 2,
            'endColumn': 5,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Enriching the hover', () => {
        // issue: -
        // fix: https://github.com/microsoft/vscode/commit/19ae0932c45b1096443a8c1335cf1e02eb99e16d
        // explanation:
        //  - decrease indent on ) and ] also
        //  - increase indent on ( and [ also
        // decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/ -> /^(.*\*\/)?\s*[\}\]\)].*$/
        // increaseIndentPattern: /^.*\{[^}"'`]*$/ -> /^.*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/
        let fileContents = [
            'function foo(',
            '    bar: string',
            '    ){}',
        ].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        let operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            'startLineNumber': 3,
            'startColumn': 1,
            'endLineNumber': 3,
            'endColumn': 5,
        });
        assert.deepStrictEqual(operation.text, '');
        fileContents = [
            'function foo(',
            'bar: string',
            '){}',
        ].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            'startLineNumber': 2,
            'startColumn': 1,
            'endLineNumber': 2,
            'endColumn': 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #86176', () => {
        // issue: https://github.com/microsoft/vscode/issues/86176
        // fix: https://github.com/microsoft/vscode/commit/d89e2e17a5d1ba37c99b1d3929eb6180a5bfc7a8
        // explanation: When quotation marks are present on the first line of an if statement or for loop, following line should not be indented
        // increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/
        // explanation: after open brace, do not decrease indent if it is followed on the same line by "<whitespace characters> // <any characters>"
        // todo@aiday-mar: should also apply for when it follows ( and [
        const fileContents = [
            `if () { // '`,
            `x = 4`,
            `}`
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            'startLineNumber': 2,
            'startColumn': 1,
            'endLineNumber': 2,
            'endColumn': 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #141816', () => {
        // issue: https://github.com/microsoft/vscode/issues/141816
        // fix: https://github.com/microsoft/vscode/pull/141997/files
        // explanation: if (, [, {, is followed by a forward slash then assume we are in a regex pattern, and do not indent
        // increaseIndentPattern: /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`/]*|(\t|[ ])*\/\/.*)|\([^)"'`/]*|\[[^\]"'`/]*)$/
        // -> Final current increase indent pattern at of writing
        const fileContents = [
            'const r = /{/;',
            '   ',
        ].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 7, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 10, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 11, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 12, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ }
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ }
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            'startLineNumber': 2,
            'startColumn': 1,
            'endLineNumber': 2,
            'endColumn': 4,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Issue #29886', () => {
        // issue: https://github.com/microsoft/vscode/issues/29886
        // fix: https://github.com/microsoft/vscode/commit/7910b3d7bab8a721aae98dc05af0b5e1ea9d9782
        // decreaseIndentPattern: /^(.*\*\/)?\s*[\}\]\)].*$/ -> /^((?!.*?\/\*).*\*\/)?\s*[\}\]\)].*$/
        // -> Final current decrease indent pattern at the time of writing
        // explanation: Positive lookahead: (?= «pattern») matches if pattern matches what comes after the current location in the input string.
        // Negative lookahead: (?! «pattern») matches if pattern does not match what comes after the current location in the input string
        // The change proposed is to not decrease the indent if there is a multi-line comment ending on the same line before the closing parentheses
        const fileContents = [
            'function foo() {',
            '    bar(/*  */)',
            '};',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test('Issue #209859: do not do reindentation for tokens inside of a string', () => {
        // issue: https://github.com/microsoft/vscode/issues/209859
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
            ],
            [
                { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
            ],
            [
                { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
            ],
            [
                { startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ },
            ]
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const fileContents = [
            'const foo = `some text',
            '         which is strangely',
            '    indented. It should',
            '   not be reindented.`'
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 4);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests inferred from the current regexes...
    test.skip('Incorrect deindentation after `*/}` string', () => {
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        const fileContents = [
            `const obj = {`,
            `    obj1: {`,
            `        brace : '*/}'`,
            `    }`,
            `}`,
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests from issues...
    test.skip('Issue #56275', () => {
        // issue: https://github.com/microsoft/vscode/issues/56275
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        let fileContents = [
            'function foo() {',
            '    var bar = (/b*/);',
            '}',
        ].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
        fileContents = [
            'function foo() {',
            '    var bar = "/b*/)";',
            '}',
        ].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #116843', () => {
        // issue: https://github.com/microsoft/vscode/issues/116843
        // related: https://github.com/microsoft/vscode/issues/43244
        // explanation: When you have an arrow function, you don't have { or }, but you would expect indentation to still be done in that way
        // TODO: requires exploring indent/outdent pairs instead
        const fileContents = [
            'const add1 = (n) =>',
            '	n + 1;',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #185252', () => {
        // issue: https://github.com/microsoft/vscode/issues/185252
        // explanation: Reindenting the comment correctly
        const fileContents = [
            '/*',
            ' * This is a comment.',
            ' */',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue 43244: incorrect indentation when signature of function call spans several lines', () => {
        // issue: https://github.com/microsoft/vscode/issues/43244
        const fileContents = [
            'function callSomeOtherFunction(one: number, two: number) { }',
            'function someFunction() {',
            '    callSomeOtherFunction(4,',
            '        5)',
            '}',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2luZGVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvdGVzdC9ub2RlL2F1dG9pbmRlbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDeEgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDNUcsT0FBTyxFQUFvQyxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRWpKLE9BQU8sRUFBMEIsZ0NBQWdDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUseUJBQXlCLEVBQWdDLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUksT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBR25GLE9BQU8sRUFBRSxV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