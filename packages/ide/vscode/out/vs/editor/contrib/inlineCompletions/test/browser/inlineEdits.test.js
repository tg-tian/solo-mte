/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AnnotatedText, InlineEditContext, MockSearchReplaceCompletionsProvider, withAsyncTestCodeEditorAndInlineCompletionsModel } from './utils.js';
suite('Inline Edits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const val = new AnnotatedText(`
class Point {
	constructor(public x: number, public y: number) {}

	getLength2D(): number {
		return↓ Math.sqrt(this.x * this.x + this.y * this.y↓);
	}

	getJson(): string {
		return ↓Ü;
	}
}
`);
    async function runTest(cb) {
        const provider = new MockSearchReplaceCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel(val.value, { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async (ctx) => {
            const view = new InlineEditContext(ctx.model, ctx.editor);
            ctx.store.add(view);
            await cb(ctx, provider, view);
        });
    }
    test('Can Accept Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                '\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n'
            ]));
            model.accept();
            assert.deepStrictEqual(editor.getValue(), `
class Point {
	constructor(public x: number, public y: number) {}

	getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	getJson(): string {
		return Ü;
	}
}
`);
        });
    });
    test('Can Type Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                '\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n'
            ]));
            editor.setPosition(val.getMarkerPosition(1));
            editorViewModel.type(' + t');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                '\n\tget❰Length2↦Length3❱D(): numbe...\n...this.y + t❰his.z...his.z❱);\n'
            ]));
            editorViewModel.type('his.z * this.z');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                '\n\tget❰Length2↦Length3❱D(): numbe...'
            ]));
        });
    });
    test('Inline Edit Is Correctly Shifted When Typing', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add('Ü', '{x: this.x, y: this.y}');
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                '...\n\t\treturn ❰Ü↦{x: t...is.y}❱;\n'
            ]));
            editor.setPosition(val.getMarkerPosition(2));
            editorViewModel.type('{');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                '...\t\treturn {❰Ü↦x: th...is.y}❱;\n'
            ]));
        });
    });
    test('Inline Edit Stays On Unrelated Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                '\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n'
            ]));
            editor.setPosition(val.getMarkerPosition(0));
            editorViewModel.type('/* */');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                '\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n'
            ]));
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined
            ]));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy90ZXN0L2Jyb3dzZXIvaW5saW5lRWRpdHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQXFELG9DQUFvQyxFQUFFLGdEQUFnRCxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXpNLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxhQUFhLENBQUM7Ozs7Ozs7Ozs7OztDQVk5QixDQUFDLENBQUM7SUFFRixLQUFLLFVBQVUsT0FBTyxDQUFDLEVBQXNKO1FBQzVLLE1BQU0sUUFBUSxHQUFHLElBQUksb0NBQW9DLEVBQUUsQ0FBQztRQUM1RCxNQUFNLGdEQUFnRCxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQy9ELEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQy9ELEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNiLE1BQU0sSUFBSSxHQUFHLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUQsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEIsTUFB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