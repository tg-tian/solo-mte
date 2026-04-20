/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isUUID } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { sortExtensionVersions, filterLatestExtensionVersionsForTargetPlatform } from '../../common/extensionGalleryService.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { resolveMarketplaceHeaders } from '../../../externalServices/common/marketplace.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
import { TELEMETRY_SETTING_ID } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class EnvironmentServiceMock extends mock() {
    constructor(serviceMachineIdResource) {
        super();
        this.serviceMachineIdResource = serviceMachineIdResource;
        this.isBuilt = true;
    }
}
suite('Extension Gallery Service', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let fileService, environmentService, storageService, productService, configurationService;
    setup(() => {
        const serviceMachineIdResource = joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'machineid');
        environmentService = new EnvironmentServiceMock(serviceMachineIdResource);
        fileService = disposables.add(new FileService(new NullLogService()));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(serviceMachineIdResource.scheme, fileSystemProvider));
        storageService = disposables.add(new InMemoryStorageService());
        configurationService = new TestConfigurationService({ [TELEMETRY_SETTING_ID]: "all" /* TelemetryConfiguration.ON */ });
        configurationService.updateValue(TELEMETRY_SETTING_ID, "all" /* TelemetryConfiguration.ON */);
        productService = { _serviceBrand: undefined, ...product, enableTelemetry: true };
    });
    test('marketplace machine id', async () => {
        const headers = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.ok(headers['X-Market-User-Id']);
        assert.ok(isUUID(headers['X-Market-User-Id']));
        const headers2 = await resolveMarketplaceHeaders(product.version, productService, environmentService, configurationService, fileService, storageService, NullTelemetryService);
        assert.strictEqual(headers['X-Market-User-Id'], headers2['X-Market-User-Id']);
    });
    test('sorting single extension version without target platform', async () => {
        const actual = [aExtensionVersion('1.1.2')];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with preferred target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-x64" /* TargetPlatform.DARWIN_X64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting single extension version with not compatible target platform', async () => {
        const actual = [aExtensionVersion('1.1.2', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */)];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-x64" /* TargetPlatform.WIN32_X64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions without target platforms', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [...actual];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 1', async () => {
        const actual = [aExtensionVersion('1.2.4', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.4', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.4', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.3'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[1], actual[0], actual[2], actual[3], actual[4], actual[5]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 2', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.2.3', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.2.3', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */), aExtensionVersion('1.2.3', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1')];
        const expected = [actual[0], actual[3], actual[1], actual[2], actual[4], actual[5]];
        sortExtensionVersions(actual, "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    test('sorting multiple extension versions with target platforms - 3', async () => {
        const actual = [aExtensionVersion('1.2.4'), aExtensionVersion('1.1.2'), aExtensionVersion('1.1.1'), aExtensionVersion('1.0.0', "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */), aExtensionVersion('1.0.0', "win32-arm64" /* TargetPlatform.WIN32_ARM64 */)];
        const expected = [actual[0], actual[1], actual[2], actual[4], actual[3]];
        sortExtensionVersions(actual, "win32-arm64" /* TargetPlatform.WIN32_ARM64 */);
        assert.deepStrictEqual(actual, expected);
    });
    function aExtensionVersion(version, targetPlatform) {
        return { version, targetPlatform };
    }
    function aPreReleaseExtensionVersion(version, targetPlatform) {
        return {
            version,
            targetPlatform,
            properties: [{ key: 'Microsoft.VisualStudio.Code.PreRelease', value: 'true' }]
        };
    }
    suite('filterLatestExtensionVersionsForTargetPlatform', () => {
        test('should return empty array for empty input', () => {
            const result = filterLatestExtensionVersionsForTargetPlatform([], "win32-x64" /* TargetPlatform.WIN32_X64 */, ["win32-x64" /* TargetPlatform.WIN32_X64 */]);
            assert.deepStrictEqual(result, []);
        });
        test('should return single version when only one version provided', () => {
            const versions = [aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */)];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            assert.deepStrictEqual(result, versions);
        });
        test('should include both release and pre-release versions for same platform', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aPreReleaseExtensionVersion('0.9.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Different version number
            const versions = [version1, version2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include both since they have different version numbers
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], version1);
            assert.strictEqual(result[1], version2);
        });
        test('should include one version per target platform for release versions', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const version3 = aExtensionVersion('1.0.0', "linux-x64" /* TargetPlatform.LINUX_X64 */);
            const versions = [version1, version2, version3];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include all three versions: WIN32_X64 (compatible, first of type) + DARWIN_X64 & LINUX_X64 (non-compatible)
            assert.strictEqual(result.length, 3);
            assert.ok(result.includes(version1)); // Compatible with target platform
            assert.ok(result.includes(version2)); // Non-compatible, included
            assert.ok(result.includes(version3)); // Non-compatible, included
        });
        test('should separate release and pre-release versions', () => {
            const releaseVersion = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const preReleaseVersion = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const versions = [releaseVersion, preReleaseVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include both since they are different types (release vs pre-release)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(releaseVersion));
            assert.ok(result.includes(preReleaseVersion));
        });
        test('should include both release and pre-release versions for same platform with different version numbers', () => {
            const preRelease1 = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const release2 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Different version number
            const versions = [preRelease1, release2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include both since they have different version numbers
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], preRelease1);
            assert.strictEqual(result[1], release2);
        });
        test('should handle versions without target platform (UNDEFINED)', () => {
            const version1 = aExtensionVersion('1.0.0'); // No target platform specified
            const version2 = aExtensionVersion('0.9.0'); // No target platform specified
            const versions = [version1, version2];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should only include the first version since they both have UNDEFINED platform
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], version1);
        });
        test('should handle mixed release and pre-release versions across multiple platforms', () => {
            const releaseWin = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const releaseMac = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const preReleaseWin = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const preReleaseMac = aPreReleaseExtensionVersion('1.1.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const versions = [releaseWin, releaseMac, preReleaseWin, preReleaseMac];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include: WIN32_X64 compatible (release + prerelease) + DARWIN_X64 non-compatible (all versions)
            assert.strictEqual(result.length, 4);
            assert.ok(result.includes(releaseWin)); // Compatible release
            assert.ok(result.includes(releaseMac)); // Non-compatible, included
            assert.ok(result.includes(preReleaseWin)); // Compatible pre-release
            assert.ok(result.includes(preReleaseMac)); // Non-compatible, included
        });
        test('should handle complex scenario with multiple versions and platforms', () => {
            const versions = [
                aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aExtensionVersion('2.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */),
                aPreReleaseExtensionVersion('2.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aPreReleaseExtensionVersion('2.1.0', "linux-x64" /* TargetPlatform.LINUX_X64 */),
                aExtensionVersion('2.0.0'), // No platform specified
                aPreReleaseExtensionVersion('2.1.0'), // Pre-release, no platform specified
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Expected for WIN32_X64 target platform:
            // - Compatible (WIN32_X64 + UNDEFINED): release (2.0.0 WIN32_X64) and pre-release (2.1.0 WIN32_X64)
            // - Non-compatible: DARWIN_X64 release, LINUX_X64 pre-release
            // Total: 4 versions (1 compatible release + 1 compatible pre-release + 2 non-compatible)
            assert.strictEqual(result.length, 4);
            // Check specific versions are included
            assert.ok(result.includes(versions[0])); // 2.0.0 WIN32_X64 (compatible release)
            assert.ok(result.includes(versions[1])); // 2.0.0 DARWIN_X64 (non-compatible)
            assert.ok(result.includes(versions[2])); // 2.1.0 WIN32_X64 (compatible pre-release)
            assert.ok(result.includes(versions[3])); // 2.1.0 LINUX_X64 (non-compatible)
        });
        test('should keep only first compatible version when specific platform comes before undefined', () => {
            // Test how UNDEFINED platform interacts with specific platforms
            const versions = [
                aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */),
                aExtensionVersion('1.0.0'), // UNDEFINED platform - compatible with all
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, first one should be included (specific platform preferred)
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(versions[0])); // WIN32_X64 should be included (specific platform)
        });
        test('should handle higher version with specific platform vs lower version with universal platform', () => {
            // Scenario: newer version for specific platform vs older version with universal compatibility
            const higherVersionSpecificPlatform = aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const lowerVersionUniversal = aExtensionVersion('1.5.0'); // UNDEFINED/universal platform
            const versions = [higherVersionSpecificPlatform, lowerVersionUniversal];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, but only the first release version should be included
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(higherVersionSpecificPlatform)); // First compatible release
            assert.ok(!result.includes(lowerVersionUniversal)); // Filtered (second compatible release)
        });
        test('should handle lower version with specific platform vs higher version with universal platform', () => {
            // Reverse scenario: older version for specific platform vs newer version with universal compatibility
            const lowerVersionSpecificPlatform = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const higherVersionUniversal = aExtensionVersion('2.0.0'); // UNDEFINED/universal platform
            const versions = [lowerVersionSpecificPlatform, higherVersionUniversal];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Both are compatible with WIN32_X64, but only the first release version should be included
            assert.strictEqual(result.length, 1);
            assert.ok(result.includes(lowerVersionSpecificPlatform)); // First compatible release
            assert.ok(!result.includes(higherVersionUniversal)); // Filtered (second compatible release)
        });
        test('should handle multiple specific platforms vs universal platform with version differences', () => {
            // Complex scenario with multiple platforms and universal compatibility
            const versions = [
                aExtensionVersion('2.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */), // Highest version, specific platform
                aExtensionVersion('1.9.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */), // Lower version, different specific platform
                aExtensionVersion('1.8.0'), // Lowest version, universal platform
            ];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should include:
            // - 2.0.0 WIN32_X64 (specific target platform match - replaces UNDEFINED if it came first)
            // - 1.9.0 DARWIN_X64 (non-compatible, included)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(versions[0])); // 2.0.0 WIN32_X64
            assert.ok(result.includes(versions[1])); // 1.9.0 DARWIN_X64
        });
        test('should include universal platform when no specific platforms conflict', () => {
            // Test where universal platform is included because no specific platforms conflict
            const universalVersion = aExtensionVersion('1.0.0'); // UNDEFINED/universal platform
            const specificVersion = aExtensionVersion('1.0.0', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */);
            const versions = [universalVersion, specificVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */]; // Note: LINUX_ARM64 not in target platforms
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Universal is compatible with WIN32_X64, specific version is not compatible
            // So we should get: universal (first compatible release) + specific (non-compatible)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(universalVersion)); // Compatible with WIN32_X64
            assert.ok(result.includes(specificVersion)); // Non-compatible, included
        });
        test('should include all non-compatible platform versions', () => {
            const version1 = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const version2 = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */);
            const version3 = aPreReleaseExtensionVersion('1.1.0', "linux-x64" /* TargetPlatform.LINUX_X64 */);
            const versions = [version1, version2, version3];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */, "linux-x64" /* TargetPlatform.LINUX_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            assert.ok(result.includes(version2)); // Non-compatible, included
            assert.ok(result.includes(version3)); // Non-compatible, included
        });
        test('should prefer specific target platform over undefined when same version exists for both', () => {
            const undefinedVersion = aExtensionVersion('1.0.0'); // UNDEFINED platform, appears first
            const specificVersion = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Specific platform, appears second
            const versions = [undefinedVersion, specificVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return the specific platform version (WIN32_X64), not the undefined one
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], specificVersion);
            assert.ok(!result.includes(undefinedVersion));
        });
        test('should replace undefined pre-release with specific platform pre-release', () => {
            const undefinedPreRelease = aPreReleaseExtensionVersion('1.0.0'); // UNDEFINED platform pre-release, appears first
            const specificPreRelease = aPreReleaseExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Specific platform pre-release, appears second
            const versions = [undefinedPreRelease, specificPreRelease];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return the specific platform pre-release, not the undefined one
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], specificPreRelease);
            assert.ok(!result.includes(undefinedPreRelease));
        });
        test('should handle explicit UNIVERSAL platform', () => {
            const universalVersion = aExtensionVersion('1.0.0', "universal" /* TargetPlatform.UNIVERSAL */);
            const specificVersion = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */);
            const versions = [universalVersion, specificVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return the specific platform version, not the universal one
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], specificVersion);
            assert.ok(!result.includes(universalVersion));
        });
        test('should handle both release and pre-release with replacement', () => {
            // Both release and pre-release starting with undefined and then getting specific platform
            const undefinedRelease = aExtensionVersion('1.0.0'); // UNDEFINED release
            const specificRelease = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Specific release
            const undefinedPreRelease = aPreReleaseExtensionVersion('1.1.0'); // UNDEFINED pre-release
            const specificPreRelease = aPreReleaseExtensionVersion('1.1.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Specific pre-release
            const versions = [undefinedRelease, undefinedPreRelease, specificRelease, specificPreRelease];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return both specific platform versions
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(specificRelease));
            assert.ok(result.includes(specificPreRelease));
            assert.ok(!result.includes(undefinedRelease));
            assert.ok(!result.includes(undefinedPreRelease));
        });
        test('should not replace when specific platform is for different platform', () => {
            const undefinedVersion = aExtensionVersion('1.0.0'); // UNDEFINED, compatible with WIN32_X64
            const specificVersionDarwin = aExtensionVersion('1.0.0', "darwin-x64" /* TargetPlatform.DARWIN_X64 */); // Specific for DARWIN, not compatible with WIN32_X64
            const versions = [undefinedVersion, specificVersionDarwin];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return undefined version (compatible with WIN32_X64) and specific DARWIN version (non-compatible, always included)
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(undefinedVersion));
            assert.ok(result.includes(specificVersionDarwin));
        });
        test('should handle replacement with non-compatible versions in between', () => {
            const undefinedVersion = aExtensionVersion('1.0.0'); // UNDEFINED, compatible with WIN32_X64
            const nonCompatibleVersion = aExtensionVersion('0.9.0', "linux-arm64" /* TargetPlatform.LINUX_ARM64 */); // Non-compatible platform
            const specificVersion = aExtensionVersion('1.0.0', "win32-x64" /* TargetPlatform.WIN32_X64 */); // Specific for WIN32_X64
            const versions = [undefinedVersion, nonCompatibleVersion, specificVersion];
            const allTargetPlatforms = ["win32-x64" /* TargetPlatform.WIN32_X64 */, "darwin-x64" /* TargetPlatform.DARWIN_X64 */];
            const result = filterLatestExtensionVersionsForTargetPlatform(versions, "win32-x64" /* TargetPlatform.WIN32_X64 */, allTargetPlatforms);
            // Should return specific WIN32_X64 version (replacing undefined) and non-compatible LINUX_ARM64 version
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes(specificVersion));
            assert.ok(result.includes(nonCompatibleVersion));
            assert.ok(!result.includes(undefinedVersion));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2V4dGVuc2lvbkdhbGxlcnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUUxRyxPQUFPLEVBQStCLHFCQUFxQixFQUFFLDhDQUE4QyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFN0osT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsc0JBQXNCLEVBQW1CLE1BQU0sb0NBQW9DLENBQUM7QUFDN0YsT0FBTyxFQUEwQixvQkFBb0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXRHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25GLE9BQU8sRUFB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