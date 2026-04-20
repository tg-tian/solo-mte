/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../../base/common/platform.js';
import { format } from '../../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TerminalLocalLinkDetector } from '../../browser/terminalLocalLinkDetector.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { timeout } from '../../../../../../base/common/async.js';
import { strictEqual } from 'assert';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestContextService } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { isString } from '../../../../../../base/common/types.js';
const unixLinks = [
    // Absolute
    '/foo',
    '/foo/bar',
    '/foo/[bar]',
    '/foo/[bar].baz',
    '/foo/[bar]/baz',
    '/foo/bar+more',
    // URI file://
    { link: 'file:///foo', resource: URI.file('/foo') },
    { link: 'file:///foo/bar', resource: URI.file('/foo/bar') },
    { link: 'file:///foo/bar%20baz', resource: URI.file('/foo/bar baz') },
    // User home
    { link: '~/foo', resource: URI.file('/home/foo') },
    // Relative
    { link: './foo', resource: URI.file('/parent/cwd/foo') },
    { link: './$foo', resource: URI.file('/parent/cwd/$foo') },
    { link: '../foo', resource: URI.file('/parent/foo') },
    { link: 'foo/bar', resource: URI.file('/parent/cwd/foo/bar') },
    { link: 'foo/bar+more', resource: URI.file('/parent/cwd/foo/bar+more') },
];
const unixLinksWithIso = [
    // ISO 8601 timestamps - tested separately to avoid line/column suffix conflicts
    { link: './test-2025-04-28T11:03:09+02:00.log', resource: URI.file('/parent/cwd/test-2025-04-28T11:03:09+02:00.log') },
];
const windowsLinks = [
    // Absolute
    'c:\\foo',
    { link: '\\\\?\\C:\\foo', resource: URI.file('C:\\foo') },
    'c:/foo',
    'c:/foo/bar',
    'c:\\foo\\bar',
    'c:\\foo\\bar+more',
    'c:\\foo/bar\\baz',
    // URI file://
    { link: 'file:///c:/foo', resource: URI.file('c:\\foo') },
    { link: 'file:///c:/foo/bar', resource: URI.file('c:\\foo\\bar') },
    { link: 'file:///c:/foo/bar%20baz', resource: URI.file('c:\\foo\\bar baz') },
    // User home
    { link: '~\\foo', resource: URI.file('C:\\Home\\foo') },
    { link: '~/foo', resource: URI.file('C:\\Home\\foo') },
    // Relative
    { link: '.\\foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './$foo', resource: URI.file('C:\\Parent\\Cwd\\$foo') },
    { link: '..\\foo', resource: URI.file('C:\\Parent\\foo') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/[bar]', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]') },
    { link: 'foo/[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo/[bar]/baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]/baz') },
    { link: 'foo\\bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo\\[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo\\[bar]\\baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]\\baz') },
    { link: 'foo\\bar+more', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar+more') },
];
const windowsLinksWithIso = [
    // ISO 8601 timestamps - tested separately to avoid line/column suffix conflicts
    { link: '.\\test-2025-04-28T11:03:09+02:00.log', resource: URI.file('C:\\Parent\\Cwd\\test-2025-04-28T11:03:09+02:00.log') },
];
const supportedLinkFormats = [
    { urlFormat: '{0}' },
    { urlFormat: '{0}" on line {1}', line: '5' },
    { urlFormat: '{0}" on line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}":line {1}', line: '5' },
    { urlFormat: '{0}":line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}": line {1}', line: '5' },
    { urlFormat: '{0}": line {1}, col {2}', line: '5', column: '3' },
    { urlFormat: '{0}({1})', line: '5' },
    { urlFormat: '{0} ({1})', line: '5' },
    { urlFormat: '{0}, {1}', line: '5' },
    { urlFormat: '{0}({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0}:{1}', line: '5' },
    { urlFormat: '{0}:{1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0} {1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0}[{1}]', line: '5' },
    { urlFormat: '{0} [{1}]', line: '5' },
    { urlFormat: '{0}[{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0}",{1}', line: '5' },
    { urlFormat: '{0}\',{1}', line: '5' },
    { urlFormat: '{0}#{1}', line: '5' },
    { urlFormat: '{0}#{1}:{2}', line: '5', column: '5' }
];
const windowsFallbackLinks = [
    'C:\\foo bar',
    'C:\\foo bar\\baz',
    'C:\\foo\\bar baz',
    'C:\\foo/bar baz'
];
const supportedFallbackLinkFormats = [
    // Python style error: File "<path>", line <line>
    { urlFormat: 'File "{0}"', linkCellStartOffset: 5 },
    { urlFormat: 'File "{0}", line {1}', line: '5', linkCellStartOffset: 5 },
    // Unknown tool #200166: FILE  <path>:<line>:<col>
    { urlFormat: ' FILE  {0}', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}', line: '5', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}:{2}', line: '5', column: '3', linkCellStartOffset: 7 },
    // Some C++ compile error formats
    { urlFormat: '{0}({1}) :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1},{2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}, {2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}):', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1},{2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1}, {2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1} :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:{2} :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1}:{2}:', line: '5', column: '3', linkCellEndOffset: -1 },
    // PowerShell prompt
    { urlFormat: 'PS {0}>', linkCellStartOffset: 3, linkCellEndOffset: -1 },
    // Cmd prompt
    { urlFormat: '{0}>', linkCellEndOffset: -1 },
    // The whole line is the path
    { urlFormat: '{0}' },
];
class TestFileService extends FileService {
    constructor() {
        super(...arguments);
        this._files = '*';
    }
    async stat(resource) {
        if (this._files === '*' || this._files.some(e => e.toString() === resource.toString())) {
            return { isFile: true, isDirectory: false, isSymbolicLink: false };
        }
        throw new Error('ENOENT');
    }
    setFiles(files) {
        this._files = files;
    }
}
suite('Workbench - TerminalLocalLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let fileService;
    let detector;
    let resolver;
    let xterm;
    let validResources;
    async function assertLinks(type, text, expected) {
        let to;
        const race = await Promise.race([
            assertLinkHelper(text, expected, detector, type).then(() => 'success'),
            (to = timeout(2)).then(() => 'timeout')
        ]);
        strictEqual(race, 'success', `Awaiting link assertion for "${text}" timed out`);
        to.cancel();
    }
    async function assertLinksWithWrapped(link, resource) {
        const uri = resource ?? URI.file(link);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, link, [{ uri, range: [[1, 1], [link.length, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, ` ${link} `, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `(${link})`, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `[${link}]`, [{ uri, range: [[2, 1], [link.length + 1, 1]] }]);
    }
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        fileService = store.add(new TestFileService(new NullLogService()));
        instantiationService.stub(IConfigurationService, configurationService);
        // Override the setFiles method to work with validResources for testing
        fileService.setFiles(validResources);
        instantiationService.set(IFileService, fileService);
        instantiationService.set(IWorkspaceContextService, new TestContextService());
        instantiationService.set(IUriIdentityService, store.add(new UriIdentityService(fileService)));
        instantiationService.stub(ITerminalLogService, new NullLogService());
        resolver = instantiationService.createInstance(TerminalLinkResolver);
        validResources = [];
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 });
    });
    suite('platform independent', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined
            }, resolver);
        });
        test('should support multiple link results', async () => {
            validResources = [
                URI.file('/parent/cwd/foo'),
                URI.file('/parent/cwd/bar')
            ];
            fileService.setFiles(validResources);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, './foo ./bar', [
                { range: [[1, 1], [5, 1]], uri: URI.file('/parent/cwd/foo') },
                { range: [[7, 1], [11, 1]], uri: URI.file('/parent/cwd/bar') }
            ]);
        });
        test('should support trimming extra quotes', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            fileService.setFiles(validResources);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo"" on line 5', [
                { range: [[1, 1], [16, 1]], uri: URI.file('/parent/cwd/foo') }
            ]);
        });
        test('should support trimming extra square brackets', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            fileService.setFiles(validResources);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo]" on line 5', [
                { range: [[1, 1], [16, 1]], uri: URI.file('/parent/cwd/foo') }
            ]);
        });
        test('should support finding links after brackets', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            fileService.setFiles(validResources);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'bar[foo:5', [
                { range: [[5, 1], [9, 1]], uri: URI.file('/parent/cwd/foo') }
            ]);
        });
    });
    suite('macOS/Linux', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined
            }, resolver);
        });
        for (const l of unixLinks) {
            const baseLink = isString(l) ? l : l.link;
            const resource = isString(l) ? URI.file(l) : l.resource;
            suite(`Link: ${baseLink}`, () => {
                for (let i = 0; i < supportedLinkFormats.length; i++) {
                    const linkFormat = supportedLinkFormats[i];
                    const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                    test(`should detect in "${formattedLink}"`, async () => {
                        validResources = [resource];
                        fileService.setFiles(validResources);
                        await assertLinksWithWrapped(formattedLink, resource);
                    });
                }
            });
        }
        test('Git diff links', async () => {
            validResources = [URI.file('/parent/cwd/foo/bar')];
            fileService.setFiles(validResources);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                { uri: validResources[0], range: [[14, 1], [20, 1]] },
                { uri: validResources[0], range: [[24, 1], [30, 1]] }
            ]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [{ uri: validResources[0], range: [[7, 1], [13, 1]] }]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [{ uri: validResources[0], range: [[7, 1], [13, 1]] }]);
        });
        // Test ISO 8601 links separately with only base format to avoid suffix conflicts
        // Note: Only test plain format as colons are excluded path characters in the regex,
        // so wrapped contexts (spaces, parentheses, brackets) won't work
        for (const l of unixLinksWithIso) {
            const baseLink = typeof l === 'string' ? l : l.link;
            const resource = typeof l === 'string' ? URI.file(l) : l.resource;
            test(`should detect ISO 8601 link: ${baseLink}`, async () => {
                validResources = [resource];
                fileService.setFiles(validResources);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, baseLink, [{ uri: resource, range: [[1, 1], [baseLink.length, 1]] }]);
            });
        }
    });
    // Only test these when on Windows because there is special behavior around replacing separators
    // in URI that cannot be changed
    if (isWindows) {
        suite('Windows', () => {
            const wslUnixToWindowsPathMap = new Map();
            setup(() => {
                detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                    initialCwd: 'C:\\Parent\\Cwd',
                    os: 1 /* OperatingSystem.Windows */,
                    remoteAuthority: undefined,
                    userHome: 'C:\\Home',
                    backend: {
                        async getWslPath(original, direction) {
                            if (direction === 'unix-to-win') {
                                return wslUnixToWindowsPathMap.get(original) ?? original;
                            }
                            return original;
                        },
                    }
                }, resolver);
                wslUnixToWindowsPathMap.clear();
            });
            for (const l of windowsLinks) {
                const baseLink = isString(l) ? l : l.link;
                const resource = isString(l) ? URI.file(l) : l.resource;
                suite(`Link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedLinkFormats.length; i++) {
                        const linkFormat = supportedLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            fileService.setFiles(validResources);
                            await assertLinksWithWrapped(formattedLink, resource);
                        });
                    }
                });
            }
            for (const l of windowsFallbackLinks) {
                const baseLink = isString(l) ? l : l.link;
                const resource = isString(l) ? URI.file(l) : l.resource;
                suite(`Fallback link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedFallbackLinkFormats.length; i++) {
                        const linkFormat = supportedFallbackLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        const linkCellStartOffset = linkFormat.linkCellStartOffset ?? 0;
                        const linkCellEndOffset = linkFormat.linkCellEndOffset ?? 0;
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            fileService.setFiles(validResources);
                            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, formattedLink, [{ uri: resource, range: [[1 + linkCellStartOffset, 1], [formattedLink.length + linkCellEndOffset, 1]] }]);
                        });
                    }
                });
            }
            test('Git diff links', async () => {
                const resource = URI.file('C:\\Parent\\Cwd\\foo\\bar');
                validResources = [resource];
                fileService.setFiles(validResources);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                    { uri: resource, range: [[14, 1], [20, 1]] },
                    { uri: resource, range: [[24, 1], [30, 1]] }
                ]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [{ uri: resource, range: [[7, 1], [13, 1]] }]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [{ uri: resource, range: [[7, 1], [13, 1]] }]);
            });
            // Test ISO 8601 links separately with only base format to avoid suffix conflicts
            // Note: Only test plain format as colons are excluded path characters in the regex,
            // so wrapped contexts (spaces, parentheses, brackets) won't work
            for (const l of windowsLinksWithIso) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                test(`should detect ISO 8601 link: ${baseLink}`, async () => {
                    validResources = [resource];
                    fileService.setFiles(validResources);
                    await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, baseLink, [{ uri: resource, range: [[1, 1], [baseLink.length, 1]] }]);
                });
            }
            suite('WSL', () => {
                test('Unix -> Windows /mnt/ style links', async () => {
                    wslUnixToWindowsPathMap.set('/mnt/c/foo/bar', 'C:\\foo\\bar');
                    validResources = [URI.file('C:\\foo\\bar')];
                    fileService.setFiles(validResources);
                    await assertLinksWithWrapped('/mnt/c/foo/bar', validResources[0]);
                });
                test('Windows -> Unix \\\\wsl$\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl$\\Debian\\home\\foo\\bar')];
                    fileService.setFiles(validResources);
                    await assertLinksWithWrapped('\\\\wsl$\\Debian\\home\\foo\\bar');
                });
                test('Windows -> Unix \\\\wsl.localhost\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl.localhost\\Debian\\home\\foo\\bar')];
                    fileService.setFiles(validResources);
                    await assertLinksWithWrapped('\\\\wsl.localhost\\Debian\\home\\foo\\bar');
                });
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQW1CLE1BQU0sMkNBQTJDLENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBRTVILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzdILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXRELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQWdDLE1BQU0sa0RBQWtELENBQUM7QUFDOUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4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