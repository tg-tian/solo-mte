/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as matchers from '../../common/problemMatcher.js';
import assert from 'assert';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this._messages = [];
    }
    info(message) {
        this._messages.push(message);
        this._validationStatus.state = 1 /* ValidationState.Info */;
    }
    warn(message) {
        this._messages.push(message);
        this._validationStatus.state = 2 /* ValidationState.Warning */;
    }
    error(message) {
        this._messages.push(message);
        this._validationStatus.state = 3 /* ValidationState.Error */;
    }
    fatal(message) {
        this._messages.push(message);
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
    }
    hasMessage(message) {
        return this._messages.indexOf(message) !== null;
    }
    get messages() {
        return this._messages;
    }
    get state() {
        return this._validationStatus.state;
    }
    isOK() {
        return this._validationStatus.isOK();
    }
    get status() {
        return this._validationStatus;
    }
}
suite('ProblemPatternParser', () => {
    let reporter;
    let parser;
    const testRegexp = new RegExp('test');
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        reporter = new ProblemReporter();
        parser = new matchers.ProblemPatternParser(reporter);
    });
    suite('single-pattern definitions', () => {
        test('parses a pattern defined by only a regexp', () => {
            const problemPattern = {
                regexp: 'test'
            };
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.Location,
                file: 1,
                line: 2,
                character: 3,
                message: 0
            });
        });
        test('does not sets defaults for line and character if kind is File', () => {
            const problemPattern = {
                regexp: 'test',
                kind: 'file'
            };
            const parsed = parser.parse(problemPattern);
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.File,
                file: 1,
                message: 0
            });
        });
    });
    suite('multi-pattern definitions', () => {
        test('defines a pattern based on regexp and property fields, with file/line location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, line: 4, column: 5, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    line: 4,
                    character: 5,
                    message: 6
                }]);
        });
        test('defines a pattern bsaed on regexp and property fields, with location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, location: 4, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    location: 4,
                    message: 6
                }]);
        });
        test('accepts a pattern that provides the fields from multiple entries', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                { regexp: testRegexp, kind: matchers.ProblemLocationKind.Location, file: 3 },
                { regexp: new RegExp('test1'), line: 4 },
                { regexp: new RegExp('test2'), character: 5 },
                { regexp: new RegExp('test3'), message: 6 }
            ]);
        });
        test('forbids setting the loop flag outside of the last element in the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, loop: true },
                { regexp: 'test1', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The loop property is only supported on the last line matcher.'));
        });
        test('forbids setting the kind outside of the first element of the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', kind: 'file', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. The kind property must be provided only in the first element'));
        });
        test('kind: Location requires a regexp', () => {
            const problemPattern = [
                { file: 0, line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a regexp on every entry', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a message', () => {
            const problemPattern = [
                { regexp: 'test', file: 0, line: 1, column: 20 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: Location requires a file', () => {
            const problemPattern = [
                { regexp: 'test', line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: Location requires either a line or location', () => {
            const problemPattern = [
                { regexp: 'test', file: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: File accepts a regexp, file and message', () => {
            const problemPattern = [
                { regexp: 'test', file: 2, kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.File,
                    file: 2,
                    message: 6
                }]);
        });
        test('kind: File requires a file', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: File requires a message', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', file: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('empty pattern array should be handled gracefully', () => {
            const problemPattern = [];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must contain at least one pattern.'));
        });
    });
});
suite('ProblemPatternRegistry - msCompile', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('matches lines with leading whitespace', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = '    /workspace/app.cs(5,10): error CS1001: Sample message';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'CS1001');
        assert.strictEqual(marker.message, 'Sample message');
    });
    test('matches lines without diagnostic code', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = '/workspace/app.cs(3,7): warning : Message without code';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, undefined);
        assert.strictEqual(marker.message, 'Message without code');
    });
    test('matches lines without location information', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = 'Main.cs: warning CS0168: The variable \'x\' is declared but never used';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'CS0168');
        assert.strictEqual(marker.message, 'The variable \'x\' is declared but never used');
        assert.strictEqual(marker.severity, MarkerSeverity.Warning);
    });
    test('matches lines with build prefixes and fatal errors', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = '  1>c:/workspace/app.cs(12): fatal error C1002: Fatal diagnostics';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'C1002');
        assert.strictEqual(marker.message, 'Fatal diagnostics');
        assert.strictEqual(marker.severity, MarkerSeverity.Error);
    });
    test('matches info diagnostics with codes', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = '2>/workspace/app.cs(20,5): info INF1001: Informational diagnostics';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'INF1001');
        assert.strictEqual(marker.message, 'Informational diagnostics');
        assert.strictEqual(marker.severity, MarkerSeverity.Info);
    });
    test('matches lines with subcategory prefixes', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = 'Main.cs(17,20): subcategory warning CS0168: The variable \'x\' is declared but never used';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'CS0168');
        assert.strictEqual(marker.message, 'The variable \'x\' is declared but never used');
        assert.strictEqual(marker.severity, MarkerSeverity.Warning);
    });
    test('matches complex diagnostics with all qualifiers', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = '  12>c:/workspace/Main.cs(42,7,43,2): subcategory fatal error CS9999: Complex diagnostics';
        const result = matcher.handle([line]);
        assert.ok(result.match);
        const marker = result.match.marker;
        assert.strictEqual(marker.code, 'CS9999');
        assert.strictEqual(marker.message, 'Complex diagnostics');
        assert.strictEqual(marker.severity, MarkerSeverity.Error);
        assert.strictEqual(marker.startLineNumber, 42);
        assert.strictEqual(marker.startColumn, 7);
        assert.strictEqual(marker.endLineNumber, 43);
        assert.strictEqual(marker.endColumn, 2);
    });
    test('ignores diagnostics without origin', () => {
        const matcher = matchers.createLineMatcher({
            owner: 'msCompile',
            applyTo: matchers.ApplyToKind.allDocuments,
            fileLocation: matchers.FileLocationKind.Absolute,
            pattern: matchers.ProblemPatternRegistry.get('msCompile')
        });
        const line = 'warning: The variable \'x\' is declared but never used';
        const result = matcher.handle([line]);
        assert.strictEqual(result.match, null);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy90ZXN0L2NvbW1vbi9wcm9ibGVtTWF0Y2hlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0sZ0NBQWdDLENBQUM7QUFFM0QsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBcUMsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsTUFBTSxlQUFlO0lBSXBCO1FBQ0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU0sSUFBSSxDQUFDLE9BQWU7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssK0JBQXVCLENBQUM7SUFDckQsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLGtDQUEwQixDQUFDO0lBQ3hELENBQUM7SUFFTSxLQUFLLENBQUMsT0FBZTtRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxnQ0FBd0IsQ0FB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