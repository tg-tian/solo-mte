/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { MainThreadDocumentContentProviders } from '../../browser/mainThreadDocumentContentProviders.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadDocumentContentProviders', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('events are processed properly', function () {
        const uri = URI.parse('test:uri');
        const model = createTextModel('1', undefined, undefined, uri);
        const providers = new MainThreadDocumentContentProviders(new TestRPCProtocol(), null, null, new class extends mock() {
            getModel(_uri) {
                assert.strictEqual(uri.toString(), _uri.toString());
                return model;
            }
        }, new class extends mock() {
            computeMoreMinimalEdits(_uri, data) {
                assert.strictEqual(model.getValue(), '1');
                return Promise.resolve(data);
            }
        });
        store.add(model);
        store.add(providers);
        return new Promise((resolve, reject) => {
            let expectedEvents = 1;
            store.add(model.onDidChangeContent(e => {
                expectedEvents -= 1;
                try {
                    assert.ok(expectedEvents >= 0);
                }
                catch (err) {
                    reject(err);
                }
                if (model.getValue() === '1\n2\n3') {
                    model.dispose();
                    resolve();
                }
            }));
            providers.$onVirtualDocumentChange(uri, '1\n2');
            providers.$onVirtualDocumentChange(uri, '1\n2\n3');
        });
    });
    test('model disposed during async operation', async function () {
        const uri = URI.parse('test:disposed');
        const model = createTextModel('initial', undefined, undefined, uri);
        let disposeModelDuringEdit = false;
        const providers = new MainThreadDocumentContentProviders(new TestRPCProtocol(), null, null, new class extends mock() {
            getModel(_uri) {
                assert.strictEqual(uri.toString(), _uri.toString());
                return model;
            }
        }, new class extends mock() {
            async computeMoreMinimalEdits(_uri, data) {
                // Simulate async operation
                await new Promise(resolve => setTimeout(resolve, 10));
                // Dispose model during the async operation if flag is set
                if (disposeModelDuringEdit) {
                    model.dispose();
                }
                return data;
            }
        });
        store.add(model);
        store.add(providers);
        // First call should work normally
        await providers.$onVirtualDocumentChange(uri, 'updated');
        assert.strictEqual(model.getValue(), 'updated');
        // Second call should not throw even though model gets disposed during async operation
        disposeModelDuringEdit = true;
        await providers.$onVirtualDocumentChange(uri, 'should not apply');
        // Model should be disposed and value unchanged
        assert.ok(model.isDisposed());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWREb2N1bWVudENvbnRlbnRQcm92aWRlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRS9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRTtJQUUzQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUVyQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUU5RCxNQUFNLFNBQVMsR0FBRyxJQUFJLGtDQUFrQyxDQUFDLElBQUksZUFBZSxFQUFFLEVBQUUsSUFBSyxFQUFFLElBQUssRUFDM0YsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFpQjtZQUM3QixRQUFRLENBQUMsSUFBUztnQkFDMUIsTUFBTSxD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