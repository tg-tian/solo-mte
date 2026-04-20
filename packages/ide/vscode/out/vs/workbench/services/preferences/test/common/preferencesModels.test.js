/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { DefaultSettings } from '../../common/preferencesModels.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { Extensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
suite('DefaultSettings', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationRegistry;
    let configurationService;
    setup(() => {
        configurationRegistry = Registry.as(Extensions.Configuration);
        configurationService = new TestConfigurationService();
    });
    test('groups settings by title when they share the same extension id', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: 'config1',
            title: 'Group 1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: 'config2',
            title: 'Group 2',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 2, 'Should have 2 groups');
        assert.strictEqual(extensionGroups[0].title, 'Group 1');
        assert.strictEqual(extensionGroups[1].title, 'Group 2');
        assert.strictEqual(extensionGroups[0].sections[0].settings.length, 1);
        assert.strictEqual(extensionGroups[0].sections[0].settings[0].key, 'test.setting1');
        assert.strictEqual(extensionGroups[1].sections[0].settings.length, 1);
        assert.strictEqual(extensionGroups[1].sections[0].settings[0].key, 'test.setting2');
    });
    test('groups settings by id when they share the same extension id and have no title', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: 'group1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: 'group1',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 1, 'Should have 1 group');
        assert.strictEqual(extensionGroups[0].id, 'group1');
        assert.strictEqual(extensionGroups[0].sections[0].settings.length, 2);
    });
    test('separates groups with same id but different titles', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: 'group1',
            title: 'Title 1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: 'group1',
            title: 'Title 2',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 2, 'Should have 2 groups');
        assert.strictEqual(extensionGroups[0].title, 'Title 1');
        assert.strictEqual(extensionGroups[1].title, 'Title 2');
    });
    test('merges untitled group into titled group if id matches', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: 'group1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: 'group1',
            title: 'Title 1',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 1, 'Should have 1 group');
        assert.strictEqual(extensionGroups[0].title, 'Title 1');
        assert.strictEqual(extensionGroups[0].sections[0].settings.length, 2);
    });
    test('separates groups with same id and title but different extension ids', () => {
        const extensionId1 = 'test.extension1';
        const extensionId2 = 'test.extension2';
        const config1 = {
            id: 'group1',
            title: 'Title 1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId1 }
        };
        const config2 = {
            id: 'group1',
            title: 'Title 1',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId2 }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const group1 = groups.find(g => g.extensionInfo?.id === extensionId1);
        const group2 = groups.find(g => g.extensionInfo?.id === extensionId2);
        assert.ok(group1);
        assert.ok(group2);
        assert.notStrictEqual(group1, group2);
        assert.strictEqual(group1.title, 'Title 1');
        assert.strictEqual(group2.title, 'Title 1');
    });
    test('separates groups with same id (no title) but different extension ids', () => {
        const extensionId1 = 'test.extension1';
        const extensionId2 = 'test.extension2';
        const config1 = {
            id: 'group1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId1 }
        };
        const config2 = {
            id: 'group1',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId2 }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const group1 = groups.find(g => g.extensionInfo?.id === extensionId1);
        const group2 = groups.find(g => g.extensionInfo?.id === extensionId2);
        assert.ok(group1);
        assert.ok(group2);
        assert.notStrictEqual(group1, group2);
    });
    test('groups settings correctly when extension id is same as group id', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: extensionId,
            title: 'Group 1',
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: extensionId,
            title: 'Group 2',
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 2, 'Should have 2 groups');
        assert.strictEqual(extensionGroups[0].title, 'Group 1');
        assert.strictEqual(extensionGroups[1].title, 'Group 2');
    });
    test('sorts groups by order', () => {
        const extensionId = 'test.extension';
        const config1 = {
            id: 'group1',
            title: 'Group 1',
            order: 2,
            type: 'object',
            properties: {
                'test.setting1': {
                    type: 'string',
                    default: 'value1',
                    description: 'Setting 1'
                }
            },
            extensionInfo: { id: extensionId }
        };
        const config2 = {
            id: 'group2',
            title: 'Group 2',
            order: 1,
            type: 'object',
            properties: {
                'test.setting2': {
                    type: 'string',
                    default: 'value2',
                    description: 'Setting 2'
                }
            },
            extensionInfo: { id: extensionId }
        };
        configurationRegistry.registerConfiguration(config1);
        configurationRegistry.registerConfiguration(config2);
        disposables.add(toDisposable(() => configurationRegistry.deregisterConfigurations([config1, config2])));
        const defaultSettings = disposables.add(new DefaultSettings([], 2 /* ConfigurationTarget.USER */, configurationService));
        const groups = defaultSettings.getRegisteredGroups();
        const extensionGroups = groups.filter(g => g.extensionInfo?.id === extensionId);
        assert.strictEqual(extensionGroups.length, 2);
        assert.strictEqual(extensionGroups[0].title, 'Group 2');
        assert.strictEqual(extensionGroups[1].title, 'Group 1');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvdGVzdC9jb21tb24vcHJlZmVyZW5jZXNNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsVUFBVSxFQUE4QyxNQUFNLHVFQUF1RSxDQUFDO0FBQy9JLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUcvRSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFDOUQsSUFBSSxxQkFBNkMsQ0FBQztJQUNsRCxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEYsb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtRQUMzRSxNQUFNLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBdUI7WUFDbkMsRUFBRSxFQUFFLFNB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