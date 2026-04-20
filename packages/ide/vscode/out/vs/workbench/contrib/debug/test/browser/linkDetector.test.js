/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLAnchorElement } from '../../../../../base/browser/dom.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITunnelService } from '../../../../../platform/tunnel/common/tunnel.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { LinkDetector } from '../../browser/linkDetector.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('Debug - Link Detector', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let linkDetector;
    /**
     * Instantiate a {@link LinkDetector} for use by the functions being tested.
     */
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(ITunnelService, { canTunnel: () => false });
        linkDetector = instantiationService.createInstance(LinkDetector);
    });
    /**
     * Assert that a given Element is an anchor element.
     *
     * @param element The Element to verify.
     */
    function assertElementIsLink(element) {
        assert(isHTMLAnchorElement(element));
    }
    test('noLinks', () => {
        const input = 'I am a string';
        const expectedOutput = '<span>I am a string</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('trailingNewline', () => {
        const input = 'I am a string\n';
        const expectedOutput = '<span>I am a string\n</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('trailingNewlineSplit', () => {
        const input = 'I am a string\n';
        const expectedOutput = '<span>I am a string\n</span>';
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('singleLineLink', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const expectedOutput = isWindows ? '<span><a tabindex="0">C:\\foo\\bar.js:12:34<\/a><\/span>' : '<span><a tabindex="0">/Users/foo/bar.js:12:34<\/a><\/span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
        assert.strictEqual(isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34', output.firstElementChild.textContent);
    });
    test('allows links with @ (#282635)', () => {
        if (!isWindows) {
            const input = '(/home/alexey_korepov/projects/dt2/playwright/node_modules/.pnpm/playwright-core@1.57.0/node_modules/playwright-core/lib/client/errors.js:56:16)';
            const expectedOutput = '<span>(<a tabindex="0">/home/alexey_korepov/projects/dt2/playwright/node_modules/.pnpm/playwright-core@1.57.0/node_modules/playwright-core/lib/client/errors.js:56:16</a>)</span>';
            const output = linkDetector.linkify(input);
            assert.strictEqual(expectedOutput, output.outerHTML);
            assert.strictEqual(1, output.children.length);
        }
    });
    test('relativeLink', () => {
        const input = '\./foo/bar.js';
        const expectedOutput = '<span>\./foo/bar.js</span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(0, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('relativeLinkWithWorkspace', async () => {
        const input = '\./foo/bar.js';
        const output = linkDetector.linkify(input, false, new WorkspaceFolder({ uri: URI.file('/path/to/workspace'), name: 'ws', index: 0 }));
        assert.strictEqual('SPAN', output.tagName);
        assert.ok(output.outerHTML.indexOf('link') >= 0);
    });
    test('singleLineLinkAndText', function () {
        const input = isWindows ? 'The link: C:/foo/bar.js:12:34' : 'The link: /Users/foo/bar.js:12:34';
        const expectedOutput = /^<span>The link: <a tabindex="0">.*\/foo\/bar.js:12:34<\/a><\/span>$/;
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.children[0].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[0]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[0].textContent);
    });
    test('singleLineMultipleLinks', () => {
        const input = isWindows ? 'Here is a link C:/foo/bar.js:12:34 and here is another D:/boo/far.js:56:78' :
            'Here is a link /Users/foo/bar.js:12:34 and here is another /Users/boo/far.js:56:78';
        const expectedOutput = /^<span>Here is a link <a tabindex="0">.*\/foo\/bar.js:12:34<\/a> and here is another <a tabindex="0">.*\/boo\/far.js:56:78<\/a><\/span>$/;
        const output = linkDetector.linkify(input);
        assert.strictEqual(2, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.children[0].tagName);
        assert.strictEqual('A', output.children[1].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[0]);
        assertElementIsLink(output.children[1]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[0].textContent);
        assert.strictEqual(isWindows ? 'D:/boo/far.js:56:78' : '/Users/boo/far.js:56:78', output.children[1].textContent);
    });
    test('multilineNoLinks', () => {
        const input = 'Line one\nLine two\nLine three';
        const expectedOutput = /^<span><span>Line one\n<\/span><span>Line two\n<\/span><span>Line three<\/span><\/span>$/;
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(3, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual('SPAN', output.children[2].tagName);
        assert(expectedOutput.test(output.outerHTML));
    });
    test('multilineTrailingNewline', () => {
        const input = 'I am a string\nAnd I am another\n';
        const expectedOutput = '<span><span>I am a string\n<\/span><span>And I am another\n<\/span><\/span>';
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(2, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('multilineWithLinks', () => {
        const input = isWindows ? 'I have a link for you\nHere it is: C:/foo/bar.js:12:34\nCool, huh?' :
            'I have a link for you\nHere it is: /Users/foo/bar.js:12:34\nCool, huh?';
        const expectedOutput = /^<span><span>I have a link for you\n<\/span><span>Here it is: <a tabindex="0">.*\/foo\/bar.js:12:34<\/a>\n<\/span><span>Cool, huh\?<\/span><\/span>$/;
        const output = linkDetector.linkify(input, true);
        assert.strictEqual(3, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('SPAN', output.children[0].tagName);
        assert.strictEqual('SPAN', output.children[1].tagName);
        assert.strictEqual('SPAN', output.children[2].tagName);
        assert.strictEqual('A', output.children[1].children[0].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[1].children[0]);
        assert.strictEqual(isWindows ? 'C:/foo/bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[1].children[0].textContent);
    });
    test('highlightNoLinks', () => {
        const input = 'I am a string';
        const highlights = [{ start: 2, end: 5 }];
        const expectedOutput = '<span>I <span class="highlight">am </span>a string</span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
    });
    test('highlightWithLink', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 0, end: 5 }];
        const expectedOutput = isWindows ? '<span><a tabindex="0"><span class="highlight">C:\\fo</span>o\\bar.js:12:34</a></span>' : '<span><a tabindex="0"><span class="highlight">/User</span>s/foo/bar.js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkStart', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 0, end: 10 }];
        const expectedOutput = isWindows ? '<span><a tabindex="0"><span class="highlight">C:\\foo\\bar</span>.js:12:34</a></span>' : '<span><a tabindex="0"><span class="highlight">/Users/foo</span>/bar.js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkEnd', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 10, end: 20 }];
        const expectedOutput = isWindows ? '<span><a tabindex="0">C:\\foo\\bar<span class="highlight">.js:12:34</span></a></span>' : '<span><a tabindex="0">/Users/foo<span class="highlight">/bar.js:12</span>:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('highlightOverlappingLinkStartAndEnd', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34';
        const highlights = [{ start: 5, end: 15 }];
        const expectedOutput = isWindows ? '<span><a tabindex="0">C:\\fo<span class="highlight">o\\bar.js:1</span>2:34</a></span>' : '<span><a tabindex="0">/User<span class="highlight">s/foo/bar.</span>js:12:34</a></span>';
        const output = linkDetector.linkify(input, false, undefined, false, undefined, highlights);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
    });
    test('csharpStackTraceFormatWithLine', () => {
        const input = isWindows ? 'C:\\foo\\bar.cs:line 6' : '/Users/foo/bar.cs:line 6';
        const expectedOutput = isWindows ? '<span><a tabindex="0">C:\\foo\\bar.cs:line 6<\/a><\/span>' : '<span><a tabindex="0">/Users/foo/bar.cs:line 6<\/a><\/span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
        assert.strictEqual(isWindows ? 'C:\\foo\\bar.cs:line 6' : '/Users/foo/bar.cs:line 6', output.firstElementChild.textContent);
    });
    test('csharpStackTraceFormatWithLineAndColumn', () => {
        const input = isWindows ? 'C:\\foo\\bar.cs:line 6:10' : '/Users/foo/bar.cs:line 6:10';
        const expectedOutput = isWindows ? '<span><a tabindex="0">C:\\foo\\bar.cs:line 6:10<\/a><\/span>' : '<span><a tabindex="0">/Users/foo/bar.cs:line 6:10<\/a><\/span>';
        const output = linkDetector.linkify(input);
        assert.strictEqual(1, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.firstElementChild.tagName);
        assert.strictEqual(expectedOutput, output.outerHTML);
        assertElementIsLink(output.firstElementChild);
        assert.strictEqual(isWindows ? 'C:\\foo\\bar.cs:line 6:10' : '/Users/foo/bar.cs:line 6:10', output.firstElementChild.textContent);
    });
    test('mixedStackTraceFormats', () => {
        const input = isWindows ? 'C:\\foo\\bar.js:12:34 and C:\\baz\\qux.cs:line 6' :
            '/Users/foo/bar.js:12:34 and /Users/baz/qux.cs:line 6';
        // Use flexible path separator matching for cross-platform compatibility
        const expectedOutput = isWindows ?
            /^<span><a tabindex="0">.*\\foo\\bar\.js:12:34<\/a> and <a tabindex="0">.*\\baz\\qux\.cs:line 6<\/a><\/span>$/ :
            /^<span><a tabindex="0">.*\/foo\/bar\.js:12:34<\/a> and <a tabindex="0">.*\/baz\/qux\.cs:line 6<\/a><\/span>$/;
        const output = linkDetector.linkify(input);
        assert.strictEqual(2, output.children.length);
        assert.strictEqual('SPAN', output.tagName);
        assert.strictEqual('A', output.children[0].tagName);
        assert.strictEqual('A', output.children[1].tagName);
        assert(expectedOutput.test(output.outerHTML));
        assertElementIsLink(output.children[0]);
        assertElementIsLink(output.children[1]);
        assert.strictEqual(isWindows ? 'C:\\foo\\bar.js:12:34' : '/Users/foo/bar.js:12:34', output.children[0].textContent);
        assert.strictEqual(isWindows ? 'C:\\baz\\qux.cs:line 6' : '/Users/baz/qux.cs:line 6', output.children[1].textContent);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0RldGVjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2xpbmtEZXRlY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBR2xHLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFFbkMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUM5RCxJQUFJLFlBQTBCLENBQUM7SUFFL0I7O09BRUc7SUFDSCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxvQkFBb0IsR0FBdUQsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RSxZQUFZLEdBQUcsb0JBQW9CLENBQUMs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