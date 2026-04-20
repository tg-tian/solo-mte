/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpSamplingLog } from '../../common/mcpSamplingLog.js';
import { asArray } from '../../../../../base/common/arrays.js';
suite('MCP - Sampling Log', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const fakeServer = {
        definition: { id: 'testServer' },
        readDefinitions: () => ({
            get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
        }),
    };
    let log;
    let storage;
    let clock;
    setup(() => {
        storage = ds.add(new TestStorageService());
        log = ds.add(new McpSamplingLog(storage));
        clock = sinon.useFakeTimers();
        clock.setSystemTime(new Date('2023-10-01T00:00:00Z').getTime());
    });
    teardown(() => {
        clock.restore();
    });
    test('logs a single request', async () => {
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'test request' } }], 'test response here', 'foobar9000');
        // storage.testEmitWillSaveState(WillSaveStateReason.NONE);
        await storage.flush();
        assert.deepStrictEqual(storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */), [
            [
                'testServer',
                {
                    head: 19631,
                    bins: [1, 0, 0, 0, 0, 0, 0],
                    lastReqs: [
                        {
                            request: [{ role: 'user', content: { type: 'text', text: 'test request' } }],
                            response: 'test response here',
                            at: 1696118400000,
                            model: 'foobar9000',
                        },
                    ],
                },
            ],
        ]);
    });
    test('logs multiple requests on the same day', async () => {
        // First request
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'first request' } }], 'first response', 'foobar9000');
        // Advance time by a few hours but stay on the same day
        clock.tick(5 * 60 * 60 * 1000); // 5 hours
        // Second request
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'second request' } }], 'second response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bin for the current day has 2 requests
        assert.strictEqual(data.bins[0], 2);
        // Verify both requests are in the lastReqs array, with the most recent first
        assert.strictEqual(data.lastReqs.length, 2);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, 'second request');
        assert.strictEqual(data.lastReqs[1].request[0].content.text, 'first request');
    });
    test('shifts bins when adding requests on different days', async () => {
        // First request on day 1
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 1 request' } }], 'day 1 response', 'foobar9000');
        // Advance time to the next day
        clock.tick(24 * 60 * 60 * 1000);
        // Second request on day 2
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 2 request' } }], 'day 2 response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins: day 2 should have 1 request, day 1 should have 1 request
        assert.strictEqual(data.bins[0], 1); // day 2
        assert.strictEqual(data.bins[1], 1); // day 1
        // Advance time by 5 more days
        clock.tick(5 * 24 * 60 * 60 * 1000);
        // Request on day 7
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'day 7 request' } }], 'day 7 response', 'foobar9000');
        await storage.flush();
        const updatedData = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins have shifted correctly
        assert.strictEqual(updatedData.bins[0], 1); // day 7
        assert.strictEqual(updatedData.bins[5], 1); // day 2
        assert.strictEqual(updatedData.bins[6], 1); // day 1
    });
    test('limits the number of stored requests', async () => {
        // Add more than the maximum number of requests (Constants.SamplingLastNMessage = 30)
        for (let i = 0; i < 35; i++) {
            log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: `request ${i}` } }], `response ${i}`, 'foobar9000');
        }
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify only the last 30 requests are kept
        assert.strictEqual(data.lastReqs.length, 30);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, 'request 34');
        assert.strictEqual(data.lastReqs[29].request[0].content.text, 'request 5');
    });
    test('handles different content types', async () => {
        // Add a request with text content
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'text request' } }], 'text response', 'foobar9000');
        // Add a request with image content
        log.add(fakeServer, [{
                role: 'user',
                content: {
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/png'
                }
            }], 'image response', 'foobar9000');
        // Add a request with mixed content
        log.add(fakeServer, [
            { role: 'user', content: { type: 'text', text: 'text and image' } },
            {
                role: 'assistant',
                content: {
                    type: 'image',
                    data: 'base64data',
                    mimeType: 'image/jpeg'
                }
            }
        ], 'mixed response', 'foobar9000');
        await storage.flush();
        const data = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify all requests are stored correctly
        assert.strictEqual(data.lastReqs.length, 3);
        assert.strictEqual(data.lastReqs[0].request.length, 2); // Mixed content request has 2 messages
        assert.strictEqual(asArray(data.lastReqs[1].request[0].content)[0].type, 'image');
        assert.strictEqual(asArray(data.lastReqs[2].request[0].content)[0].type, 'text');
    });
    test('handles multiple servers', async () => {
        const fakeServer2 = {
            definition: { id: 'testServer2' },
            readDefinitions: () => ({
                get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
            }),
        };
        log.add(fakeServer, [{ role: 'user', content: { type: 'text', text: 'server1 request' } }], 'server1 response', 'foobar9000');
        log.add(fakeServer2, [{ role: 'user', content: { type: 'text', text: 'server2 request' } }], 'server2 response', 'foobar9000');
        await storage.flush();
        const storageData = storage.getObject('mcp.sampling.logs', -1 /* StorageScope.APPLICATION */);
        // Verify both servers have their data stored
        assert.strictEqual(storageData.length, 2);
        assert.strictEqual(storageData[0][0], 'testServer');
        assert.strictEqual(storageData[1][0], 'testServer2');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdMb2cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwU2FtcGxpbmdMb2cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUluRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQXVCLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFDckQsTUFBTSxVQUFVLEdBQWU7UUFDOUIsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRTtRQUNoQyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN2QixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEtBQUssbUNBQTBCLEVBQUUsRUFBRSxDQUFDO1NBQ2hFLENBQUM7S0FDWSxDQUFDO0lBRWhCLElBQUksR0FBbUIsQ0FBQztJQUN4QixJQUFJLE9BQTJCLENBQUM7SUFDaEMsSUFBSSxLQUE0QixDQUFDO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUMzQyxHQUFH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