/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Token } from '../../../common/languages.js';
import { TokenTheme } from '../../../common/languages/supports/tokenization.js';
import { LanguageService } from '../../../common/services/languageService.js';
import { TokenizationSupportAdapter } from '../../browser/standaloneLanguages.js';
import { UnthemedProductIconTheme } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
suite('TokenizationSupport2Adapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const languageId = 'tttt';
    // const tokenMetadata = (LanguageId.PlainText << MetadataConsts.LANGUAGEID_OFFSET);
    class MockTokenTheme extends TokenTheme {
        constructor() {
            super(null, null);
            this.counter = 0;
        }
        match(languageId, token) {
            return (((this.counter++) << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)) >>> 0;
        }
    }
    class MockThemeService {
        constructor() {
            this._builtInProductIconTheme = new UnthemedProductIconTheme();
            this.onDidColorThemeChange = new Emitter().event;
            this.onDidFileIconThemeChange = new Emitter().event;
            this.onDidProductIconThemeChange = new Emitter().event;
        }
        setTheme(themeName) {
            throw new Error('Not implemented');
        }
        setAutoDetectHighContrast(autoDetectHighContrast) {
            throw new Error('Not implemented');
        }
        defineTheme(themeName, themeData) {
            throw new Error('Not implemented');
        }
        getColorTheme() {
            return {
                label: 'mock',
                tokenTheme: new MockTokenTheme(),
                themeName: ColorScheme.LIGHT,
                type: ColorScheme.LIGHT,
                getColor: (color, useDefault) => {
                    throw new Error('Not implemented');
                },
                defines: (color) => {
                    throw new Error('Not implemented');
                },
                getTokenStyleMetadata: (type, modifiers, modelLanguage) => {
                    return undefined;
                },
                semanticHighlighting: false,
                tokenColorMap: [],
                tokenFontMap: []
            };
        }
        setColorMapOverride(colorMapOverride) {
        }
        getFileIconTheme() {
            return {
                hasFileIcons: false,
                hasFolderIcons: false,
                hidesExplorerArrows: false
            };
        }
        getProductIconTheme() {
            return this._builtInProductIconTheme;
        }
    }
    class MockState {
        static { this.INSTANCE = new MockState(); }
        constructor() { }
        clone() {
            return this;
        }
        equals(other) {
            return this === other;
        }
    }
    function testBadTokensProvider(providerTokens, expectedClassicTokens, expectedModernTokens) {
        class BadTokensProvider {
            getInitialState() {
                return MockState.INSTANCE;
            }
            tokenize(line, state) {
                return {
                    tokens: providerTokens,
                    endState: MockState.INSTANCE
                };
            }
        }
        const disposables = new DisposableStore();
        const languageService = disposables.add(new LanguageService());
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const adapter = new TokenizationSupportAdapter(languageId, new BadTokensProvider(), languageService, new MockThemeService());
        const actualClassicTokens = adapter.tokenize('whatever', true, MockState.INSTANCE);
        assert.deepStrictEqual(actualClassicTokens.tokens, expectedClassicTokens);
        const actualModernTokens = adapter.tokenizeEncoded('whatever', true, MockState.INSTANCE);
        const modernTokens = [];
        for (let i = 0; i < actualModernTokens.tokens.length; i++) {
            modernTokens[i] = actualModernTokens.tokens[i];
        }
        // Add the encoded language id to the expected tokens
        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
        const tokenLanguageMetadata = (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
        for (let i = 1; i < expectedModernTokens.length; i += 2) {
            expectedModernTokens[i] |= tokenLanguageMetadata;
        }
        assert.deepStrictEqual(modernTokens, expectedModernTokens);
        disposables.dispose();
    }
    test('tokens always start at index 0', () => {
        testBadTokensProvider([
            { startIndex: 7, scopes: 'foo' },
            { startIndex: 0, scopes: 'bar' }
        ], [
            new Token(0, 'foo', languageId),
            new Token(0, 'bar', languageId),
        ], [
            0, (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            0, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */
        ]);
    });
    test('tokens always start after each other', () => {
        testBadTokensProvider([
            { startIndex: 0, scopes: 'foo' },
            { startIndex: 5, scopes: 'bar' },
            { startIndex: 3, scopes: 'foo' },
        ], [
            new Token(0, 'foo', languageId),
            new Token(5, 'bar', languageId),
            new Token(5, 'foo', languageId),
        ], [
            0, (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5, (2 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL3Rlc3QvYnJvd3Nlci9zdGFuZGFsb25lTGFuZ3VhZ2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUF1QiwwQkFBMEIsRUFBa0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHekUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUV6Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQztJQUMxQixvRkFBb0Y7SUFFcEYsTUFBTSxjQUFlLFNBQVEsVUFBVTtRQUV0QztZQUNDLEtBQUssQ0FBQyxJQUFLLEVBQUUsSUFBSyxDQUFDLENBQUM7WUFGYixZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBR3BCLENBQUM7UUFDZSxLQUFLLENBQUMsVUFBc0IsRUFBRSxLQUFhO1lBQzFELE9BQU8sQ0FD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