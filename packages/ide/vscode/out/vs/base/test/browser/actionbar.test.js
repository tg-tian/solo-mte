/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ActionBar, prepareActions } from '../../browser/ui/actionbar/actionbar.js';
import { Action, Separator } from '../../common/actions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { createToggleActionViewItemProvider, ToggleActionViewItem, unthemedToggleStyles } from '../../browser/ui/toggle/toggle.js';
import { ActionViewItem } from '../../browser/ui/actionbar/actionViewItems.js';
suite('Actionbar', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('prepareActions()', function () {
        const a1 = new Separator();
        const a2 = new Separator();
        const a3 = store.add(new Action('a3'));
        const a4 = new Separator();
        const a5 = new Separator();
        const a6 = store.add(new Action('a6'));
        const a7 = new Separator();
        const actions = prepareActions([a1, a2, a3, a4, a5, a6, a7]);
        assert.strictEqual(actions.length, 3); // duplicate separators get removed
        assert(actions[0] === a3);
        assert(actions[1] === a5);
        assert(actions[2] === a6);
    });
    test('hasAction()', function () {
        const container = document.createElement('div');
        const actionbar = store.add(new ActionBar(container));
        const a1 = store.add(new Action('a1'));
        const a2 = store.add(new Action('a2'));
        actionbar.push(a1);
        assert.strictEqual(actionbar.hasAction(a1), true);
        assert.strictEqual(actionbar.hasAction(a2), false);
        actionbar.pull(0);
        assert.strictEqual(actionbar.hasAction(a1), false);
        actionbar.push(a1, { index: 1 });
        actionbar.push(a2, { index: 0 });
        assert.strictEqual(actionbar.hasAction(a1), true);
        assert.strictEqual(actionbar.hasAction(a2), true);
        actionbar.pull(0);
        assert.strictEqual(actionbar.hasAction(a1), true);
        assert.strictEqual(actionbar.hasAction(a2), false);
        actionbar.pull(0);
        assert.strictEqual(actionbar.hasAction(a1), false);
        assert.strictEqual(actionbar.hasAction(a2), false);
        actionbar.push(a1);
        assert.strictEqual(actionbar.hasAction(a1), true);
        actionbar.clear();
        assert.strictEqual(actionbar.hasAction(a1), false);
    });
    suite('ToggleActionViewItemProvider', () => {
        test('renders toggle for actions with checked state', function () {
            const container = document.createElement('div');
            const provider = createToggleActionViewItemProvider(unthemedToggleStyles);
            const actionbar = store.add(new ActionBar(container, {
                actionViewItemProvider: provider
            }));
            const toggleAction = store.add(new Action('toggle', 'Toggle', undefined, true, undefined));
            toggleAction.checked = true;
            actionbar.push(toggleAction);
            // Verify that the action was rendered as a toggle
            assert.strictEqual(actionbar.viewItems.length, 1);
            assert(actionbar.viewItems[0] instanceof ToggleActionViewItem, 'Action with checked state should render as ToggleActionViewItem');
        });
        test('renders button for actions without checked state', function () {
            const container = document.createElement('div');
            const provider = createToggleActionViewItemProvider(unthemedToggleStyles);
            const actionbar = store.add(new ActionBar(container, {
                actionViewItemProvider: provider
            }));
            const buttonAction = store.add(new Action('button', 'Button'));
            actionbar.push(buttonAction);
            // Verify that the action was rendered as a regular button (ActionViewItem)
            assert.strictEqual(actionbar.viewItems.length, 1);
            assert(actionbar.viewItems[0] instanceof ActionViewItem, 'Action without checked state should render as ActionViewItem');
            assert(!(actionbar.viewItems[0] instanceof ToggleActionViewItem), 'Action without checked state should not render as ToggleActionViewItem');
        });
        test('handles mixed actions (toggles and buttons)', function () {
            const container = document.createElement('div');
            const provider = createToggleActionViewItemProvider(unthemedToggleStyles);
            const actionbar = store.add(new ActionBar(container, {
                actionViewItemProvider: provider
            }));
            const toggleAction = store.add(new Action('toggle', 'Toggle'));
            toggleAction.checked = false;
            const buttonAction = store.add(new Action('button', 'Button'));
            actionbar.push([toggleAction, buttonAction]);
            // Verify that we have both types of items
            assert.strictEqual(actionbar.viewItems.length, 2);
            assert(actionbar.viewItems[0] instanceof ToggleActionViewItem, 'First action should be a toggle');
            assert(actionbar.viewItems[1] instanceof ActionViewItem, 'Second action should be a button');
            assert(!(actionbar.viewItems[1] instanceof ToggleActionViewItem), 'Second action should not be a toggle');
        });
        test('toggle state changes when action checked changes', function () {
            const container = document.createElement('div');
            const provider = createToggleActionViewItemProvider(unthemedToggleStyles);
            const actionbar = store.add(new ActionBar(container, {
                actionViewItemProvider: provider
            }));
            const toggleAction = store.add(new Action('toggle', 'Toggle'));
            toggleAction.checked = false;
            actionbar.push(toggleAction);
            // Verify the toggle view item was created
            const toggleViewItem = actionbar.viewItems[0];
            assert(toggleViewItem instanceof ToggleActionViewItem, 'Toggle view item should exist');
            // Change the action's checked state
            toggleAction.checked = true;
            // The view item should reflect the updated checked state
            assert.strictEqual(toggleAction.checked, true, 'Toggle action should update checked state');
        });
        test('quick input button with toggle property creates action with checked state', async function () {
            const { quickInputButtonToAction } = await import('../../../platform/quickinput/browser/quickInputUtils.js');
            // Create a button with toggle property
            const toggleButton = {
                iconClass: 'test-icon',
                tooltip: 'Toggle Button',
                toggle: { checked: true }
            };
            const action = quickInputButtonToAction(toggleButton, 'test-id', () => { });
            // Verify the action has checked property set
            assert.strictEqual(action.checked, true, 'Action should have checked property set to true');
            // Create a button without toggle property
            const regularButton = {
                iconClass: 'test-icon',
                tooltip: 'Regular Button'
            };
            const regularAction = quickInputButtonToAction(regularButton, 'test-id-2', () => { });
            // Verify the action doesn't have checked property
            assert.strictEqual(regularAction.checked, undefined, 'Regular action should not have checked property');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uYmFyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvYWN0aW9uYmFyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFL0UsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFFdkIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUV4RCxJQUFJLENBQUMsa0JBQWtCLEVBQUU7UUFDeEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUMzQixNQUFNLEVBQUUsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLEVBQUUsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDM0IsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sRUFBRSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFFM0IsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7UUFDMUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUMxQixNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRXRELE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFdkMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5ELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5ELFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWxELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuRCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMs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