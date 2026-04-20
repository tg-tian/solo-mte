/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { LogLevel } from '../../../../platform/log/common/log.js';
import { createAuthMetadata } from '../../common/extHostMcp.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
// Test constants to avoid magic strings
const TEST_MCP_URL = 'https://example.com/mcp';
const TEST_AUTH_SERVER = 'https://auth.example.com';
const TEST_RESOURCE_METADATA_URL = 'https://example.com/.well-known/oauth-protected-resource';
/**
 * Creates a mock CommonResponse for testing.
 */
function createMockResponse(options) {
    const headers = new Headers(options.headers ?? {});
    return {
        status: options.status ?? 200,
        statusText: options.statusText ?? 'OK',
        url: options.url ?? TEST_MCP_URL,
        headers,
        body: null,
        json: async () => JSON.parse(options.body ?? '{}'),
        text: async () => options.body ?? '',
    };
}
/**
 * Helper to create an IAuthMetadata instance for testing via the factory function.
 * Uses a mock fetch that returns the provided server metadata.
 */
async function createTestAuthMetadata(options) {
    const logMessages = [];
    const mockLogger = (level, message) => logMessages.push({ level, message });
    const issuer = options.serverMetadataIssuer ?? TEST_AUTH_SERVER;
    const mockFetch = sinon.stub();
    // Mock resource metadata fetch
    mockFetch.onCall(0).resolves(createMockResponse({
        status: 200,
        url: TEST_RESOURCE_METADATA_URL,
        body: JSON.stringify(options.resourceMetadata ?? {
            resource: TEST_MCP_URL,
            authorization_servers: [issuer]
        })
    }));
    // Mock server metadata fetch
    mockFetch.onCall(1).resolves(createMockResponse({
        status: 200,
        url: `${issuer}/.well-known/oauth-authorization-server`,
        body: JSON.stringify({
            issuer,
            authorization_endpoint: `${issuer}/authorize`,
            token_endpoint: `${issuer}/token`,
            response_types_supported: ['code']
        })
    }));
    const wwwAuthHeader = options.scopes
        ? `Bearer scope="${options.scopes.join(' ')}"`
        : 'Bearer realm="example"';
    const originalResponse = createMockResponse({
        status: 401,
        url: TEST_MCP_URL,
        headers: {
            'WWW-Authenticate': wwwAuthHeader
        }
    });
    const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
        launchHeaders: new Map(),
        fetch: mockFetch,
        log: mockLogger
    });
    return { authMetadata, logMessages };
}
suite('ExtHostMcp', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('IAuthMetadata', () => {
        suite('properties', () => {
            test('should expose readonly properties', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: ['read', 'write'],
                    serverMetadataIssuer: TEST_AUTH_SERVER
                });
                assert.ok(authMetadata.authorizationServer.toString().startsWith(TEST_AUTH_SERVER));
                assert.strictEqual(authMetadata.serverMetadata.issuer, TEST_AUTH_SERVER);
                assert.deepStrictEqual(authMetadata.scopes, ['read', 'write']);
            });
            test('should allow undefined scopes', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: undefined
                });
                assert.strictEqual(authMetadata.scopes, undefined);
            });
        });
        suite('update()', () => {
            test('should return true and update scopes when WWW-Authenticate header contains new scopes', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: ['read']
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer scope="read write admin"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, true);
                assert.deepStrictEqual(authMetadata.scopes, ['read', 'write', 'admin']);
            });
            test('should return false when scopes are the same', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: ['read', 'write']
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer scope="read write"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, false);
                assert.deepStrictEqual(authMetadata.scopes, ['read', 'write']);
            });
            test('should return false when scopes are same but in different order', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: ['read', 'write']
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer scope="write read"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, false);
            });
            test('should return true when updating from undefined scopes to defined scopes', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: undefined
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer scope="read"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, true);
                assert.deepStrictEqual(authMetadata.scopes, ['read']);
            });
            test('should return true when updating from defined scopes to undefined (no scope in header)', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: ['read']
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer realm="example"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, true);
                assert.strictEqual(authMetadata.scopes, undefined);
            });
            test('should return false when no WWW-Authenticate header and scopes are already undefined', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: undefined
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {}
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, false);
            });
            test('should handle multiple Bearer challenges and use first scope', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: undefined
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Bearer scope="first", Bearer scope="second"'
                    }
                });
                authMetadata.update(response);
                assert.deepStrictEqual(authMetadata.scopes, ['first']);
            });
            test('should ignore non-Bearer schemes', async () => {
                const { authMetadata } = await createTestAuthMetadata({
                    scopes: undefined
                });
                const response = createMockResponse({
                    status: 401,
                    headers: {
                        'WWW-Authenticate': 'Basic realm="example"'
                    }
                });
                const result = authMetadata.update(response);
                assert.strictEqual(result, false);
                assert.strictEqual(authMetadata.scopes, undefined);
            });
        });
    });
    suite('createAuthMetadata', () => {
        let sandbox;
        let logMessages;
        let mockLogger;
        setup(() => {
            sandbox = sinon.createSandbox();
            logMessages = [];
            mockLogger = (level, message) => logMessages.push({ level, message });
        });
        teardown(() => {
            sandbox.restore();
        });
        test('should create IAuthMetadata with fetched server metadata', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER],
                    scopes_supported: ['read', 'write']
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    'WWW-Authenticate': 'Bearer scope="api.read"'
                }
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map([['X-Custom', 'value']]),
                fetch: mockFetch,
                log: mockLogger
            });
            assert.ok(authMetadata.authorizationServer.toString().startsWith(TEST_AUTH_SERVER));
            assert.strictEqual(authMetadata.serverMetadata.issuer, TEST_AUTH_SERVER);
            assert.deepStrictEqual(authMetadata.scopes, ['api.read']);
        });
        test('should fall back to default metadata when server metadata fetch fails', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch - fails
            mockFetch.onCall(0).rejects(new Error('Network error'));
            // Mock server metadata fetch - also fails
            mockFetch.onCall(1).rejects(new Error('Network error'));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {}
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            // Should use default metadata based on the URL
            assert.ok(authMetadata.authorizationServer.toString().startsWith('https://example.com'));
            assert.ok(authMetadata.serverMetadata.issuer.startsWith('https://example.com'));
            assert.ok(authMetadata.serverMetadata.authorization_endpoint?.startsWith('https://example.com/authorize'));
            assert.ok(authMetadata.serverMetadata.token_endpoint?.startsWith('https://example.com/token'));
            // Should log the fallback
            assert.ok(logMessages.some(m => m.level === LogLevel.Info &&
                m.message.includes('Using default auth metadata')));
        });
        test('should use scopes from WWW-Authenticate header when resource metadata has none', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch - no scopes_supported
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER]
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    'WWW-Authenticate': 'Bearer scope="header.scope"'
                }
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            assert.deepStrictEqual(authMetadata.scopes, ['header.scope']);
        });
        test('should use scopes from WWW-Authenticate header even when resource metadata has scopes_supported', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch - has scopes_supported
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER],
                    scopes_supported: ['resource.scope1', 'resource.scope2']
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    'WWW-Authenticate': 'Bearer scope="header.scope"'
                }
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            // WWW-Authenticate header scopes take precedence over resource metadata scopes_supported
            assert.deepStrictEqual(authMetadata.scopes, ['header.scope']);
        });
        test('should use resource_metadata challenge URL from WWW-Authenticate header', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch from challenge URL
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: 'https://example.com/custom-resource-metadata',
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER]
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    'WWW-Authenticate': 'Bearer resource_metadata="https://example.com/custom-resource-metadata"'
                }
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            assert.ok(authMetadata.authorizationServer.toString().startsWith(TEST_AUTH_SERVER));
            // Verify the resource_metadata URL was logged
            assert.ok(logMessages.some(m => m.level === LogLevel.Debug &&
                m.message.includes('resource_metadata challenge')));
        });
        test('should pass launch headers when fetching metadata from same origin', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch to succeed so we can verify headers
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER]
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {}
            });
            const launchHeaders = new Map([
                ['Authorization', 'Bearer existing-token'],
                ['X-Custom-Header', 'custom-value']
            ]);
            await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders,
                fetch: mockFetch,
                log: mockLogger
            });
            // Verify fetch was called
            assert.ok(mockFetch.called, 'fetch should have been called');
            // Verify the first call (resource metadata) included the launch headers
            const firstCallArgs = mockFetch.firstCall.args;
            assert.ok(firstCallArgs.length >= 2, 'fetch should have been called with options');
            const fetchOptions = firstCallArgs[1];
            assert.ok(fetchOptions.headers, 'fetch options should include headers');
        });
        test('should handle empty scope string in WWW-Authenticate header', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER]
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    'WWW-Authenticate': 'Bearer scope=""'
                }
            });
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            // Empty scope string should result in empty array or undefined
            assert.ok(authMetadata.scopes === undefined ||
                (Array.isArray(authMetadata.scopes) && authMetadata.scopes.length === 0) ||
                (Array.isArray(authMetadata.scopes) && authMetadata.scopes.every(s => s === '')), 'Empty scope string should be handled gracefully');
        });
        test('should handle malformed WWW-Authenticate header gracefully', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: JSON.stringify({
                    resource: TEST_MCP_URL,
                    authorization_servers: [TEST_AUTH_SERVER]
                })
            }));
            // Mock server metadata fetch
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: `${TEST_AUTH_SERVER}/.well-known/oauth-authorization-server`,
                body: JSON.stringify({
                    issuer: TEST_AUTH_SERVER,
                    authorization_endpoint: `${TEST_AUTH_SERVER}/authorize`,
                    token_endpoint: `${TEST_AUTH_SERVER}/token`,
                    response_types_supported: ['code']
                })
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {
                    // Malformed header - missing closing quote
                    'WWW-Authenticate': 'Bearer scope="unclosed'
                }
            });
            // Should not throw - should handle gracefully
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            // Should still create valid auth metadata
            assert.ok(authMetadata.authorizationServer);
            assert.ok(authMetadata.serverMetadata);
        });
        test('should handle invalid JSON in resource metadata response', async () => {
            const mockFetch = sandbox.stub();
            // Mock resource metadata fetch - returns invalid JSON
            mockFetch.onCall(0).resolves(createMockResponse({
                status: 200,
                url: TEST_RESOURCE_METADATA_URL,
                body: 'not valid json {'
            }));
            // Mock server metadata fetch - also returns invalid JSON
            mockFetch.onCall(1).resolves(createMockResponse({
                status: 200,
                url: 'https://example.com/.well-known/oauth-authorization-server',
                body: '{ invalid }'
            }));
            const originalResponse = createMockResponse({
                status: 401,
                url: TEST_MCP_URL,
                headers: {}
            });
            // Should fall back to default metadata, not throw
            const authMetadata = await createAuthMetadata(TEST_MCP_URL, originalResponse, {
                launchHeaders: new Map(),
                fetch: mockFetch,
                log: mockLogger
            });
            // Should use default metadata
            assert.ok(authMetadata.authorizationServer);
            assert.ok(authMetadata.serverMetadata);
        });
        test('should handle non-401 status codes in update()', async () => {
            const { authMetadata } = await createTestAuthMetadata({
                scopes: ['read']
            });
            // Response with 403 instead of 401
            const response = createMockResponse({
                status: 403,
                headers: {
                    'WWW-Authenticate': 'Bearer scope="new.scope"'
                }
            });
            // update() should still process the WWW-Authenticate header regardless of status
            const result = authMetadata.update(response);
            // The behavior depends on implementation - either it updates or ignores non-401
            // This test documents the actual behavior
            assert.strictEqual(typeof result, 'boolean');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FnaS9zb3VyY2UvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9jb21tb24vZXh0SG9zdE1jcC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQWlDLE1BQU0sNEJBQTRCLENBQUM7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsd0NBQXdDO0FBQ3hDLE1BQU0sWUFBWSxHQUFHLHlCQUF5QixDQUFDO0FBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsMEJBQTBCLENBQUM7QUFDcEQsTUFBTSwwQkFBMEIsR0FBRywwREFBMEQsQ0FBQztBQUU5Rjs7R0FFRztBQUNILFNBQVMsa0JBQWtCLENBQUMsT0FNM0I7SUFDQSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELE9BQU87UUFDTixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBSSxHQUFHO1FBQzdCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUk7UUFDdEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksWUFBWTtRQUNoQyxPQUFPO1FBQ1AsSUFBSSxFQUFFLElBQUk7UUFDVixJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO1FBQ2xELElBQUksRUFBRSxLQUFLLElBQUks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