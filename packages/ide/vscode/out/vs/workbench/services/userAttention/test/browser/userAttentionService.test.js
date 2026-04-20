/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { observableValue } from '../../../../../base/common/observable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { UserAttentionServiceEnv, UserAttentionService } from '../../browser/userAttentionBrowser.js';
suite('UserAttentionService', () => {
    let userAttentionService;
    let insta;
    let clock;
    let hostAdapterMock;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const ONE_MINUTE = 50_000;
    const ATTENTION_TIMEOUT = 60_000; // USER_ATTENTION_TIMEOUT_MS is 60 seconds
    setup(() => {
        clock = sinon.useFakeTimers();
        insta = store.add(new TestInstantiationService());
        insta.stub(ILogService, new NullLogService());
        const isVsCodeFocused = observableValue('focused', true);
        const isUserActive = observableValue('active', false);
        hostAdapterMock = {
            isVsCodeFocused,
            isUserActive,
            setFocus: (f) => isVsCodeFocused.set(f, undefined),
            setActive: (a) => isUserActive.set(a, undefined),
            dispose: () => { }
        };
        const originalCreateInstance = insta.createInstance;
        sinon.stub(insta, 'createInstance').callsFake((ctor, ...args) => {
            if (ctor === UserAttentionServiceEnv) {
                return hostAdapterMock;
            }
            return originalCreateInstance.call(insta, ctor, ...args);
        });
        userAttentionService = store.add(insta.createInstance(UserAttentionService));
        // Simulate initial activity
        hostAdapterMock.setActive(true);
        hostAdapterMock.setActive(false);
    });
    teardown(() => {
        clock.restore();
    });
    test('isVsCodeFocused reflects window focus state', () => {
        assert.strictEqual(userAttentionService.isVsCodeFocused.get(), true);
        hostAdapterMock.setFocus(false);
        assert.strictEqual(userAttentionService.isVsCodeFocused.get(), false);
        hostAdapterMock.setFocus(true);
        assert.strictEqual(userAttentionService.isVsCodeFocused.get(), true);
    });
    test('hasUserAttention is true when focused and has recent activity', () => {
        // Initially focused with activity
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
    });
    test('hasUserAttention becomes false after attention timeout without activity', () => {
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
        // Advance time past the attention timeout (5 seconds)
        clock.tick(ATTENTION_TIMEOUT + 1);
        assert.strictEqual(userAttentionService.hasUserAttention.get(), false);
    });
    test('hasUserAttention is false when window loses focus', () => {
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
        hostAdapterMock.setFocus(false);
        // Attention is not dependent on focus
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
    });
    test('hasUserAttention is restored when activity occurs', () => {
        // Wait for attention to expire
        clock.tick(ATTENTION_TIMEOUT + 1);
        assert.strictEqual(userAttentionService.hasUserAttention.get(), false);
        // Simulate activity
        hostAdapterMock.setActive(true);
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
    });
    test('activity keeps attention alive', () => {
        // Start with attention
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
        // Advance time halfway, then activity
        clock.tick(ONE_MINUTE / 2);
        hostAdapterMock.setActive(true);
        hostAdapterMock.setActive(false);
        // Advance another half minute - should still have attention
        clock.tick(ONE_MINUTE / 2);
        assert.strictEqual(userAttentionService.hasUserAttention.get(), true);
        // Now let it expire
        clock.tick(ONE_MINUTE + 1);
        assert.strictEqual(userAttentionService.hasUserAttention.get(), false);
    });
    suite('fireAfterGivenFocusTimePassed', () => {
        test('fires callback after accumulated focus time', () => {
            let callbackFired = false;
            const disposable = userAttentionService.fireAfterGivenFocusTimePassed(3 * ONE_MINUTE, () => {
                callbackFired = true;
            });
            store.add(disposable);
            // Mark activity to ensure attention is maintained, then advance 1 minute - not yet fired
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Mark activity and advance another minute - still not fired
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Mark activity and advance 3rd minute - should fire
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, true);
        });
        test('does not accumulate time when user has no attention', () => {
            let callbackFired = false;
            const disposable = userAttentionService.fireAfterGivenFocusTimePassed(2 * ONE_MINUTE, () => {
                callbackFired = true;
            });
            store.add(disposable);
            // Mark activity and accumulate 1 minute
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Lose focus - should still accumulate (even with activity)
            hostAdapterMock.setFocus(false);
            // Mark activity again to ensure attention is maintained
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, true);
        });
        test('stops accumulating time when attention expires', () => {
            let callbackFired = false;
            const disposable = userAttentionService.fireAfterGivenFocusTimePassed(2 * ONE_MINUTE, () => {
                callbackFired = true;
            });
            store.add(disposable);
            // Mark activity and accumulate 1 minute
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Let attention expire (don't mark activity before tick)
            // Advance enough time that the activity timeout expires
            clock.tick(ONE_MINUTE + 1);
            assert.strictEqual(userAttentionService.hasUserAttention.get(), false);
            assert.strictEqual(callbackFired, false);
            // This minute shouldn't count (no attention)
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Restore activity and accumulate 1 more minute
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, true);
        });
        test('can be disposed before callback fires', () => {
            let callbackFired = false;
            const disposable = userAttentionService.fireAfterGivenFocusTimePassed(2 * ONE_MINUTE, () => {
                callbackFired = true;
            });
            // Mark activity and accumulate 1 minute
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
            // Dispose before it fires
            disposable.dispose();
            // Advance past threshold - should not fire
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callbackFired, false);
        });
        test('callback fires only once', () => {
            let callCount = 0;
            const disposable = userAttentionService.fireAfterGivenFocusTimePassed(ONE_MINUTE, () => {
                callCount++;
            });
            store.add(disposable);
            // Mark activity and advance 1 minute - should fire
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callCount, 1);
            // Keep ticking, should not fire again
            hostAdapterMock.setActive(true);
            hostAdapterMock.setActive(false);
            clock.tick(ONE_MINUTE);
            assert.strictEqual(callCount, 1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckF0dGVudGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckF0dGVudGlvbi90ZXN0L2Jyb3dzZXIvdXNlckF0dGVudGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdEcsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxJQUFJLG9CQUEwQyxDQUFDO0lBQy9DLElBQUksS0FBK0IsQ0FBQztJQUNwQyxJQUFJLEtBQTRCLENBQUM7SUFDakMsSUFBSSxlQU1ILENBQUM7SUFDRixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQztJQUMxQixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxDQUFDLDBDQUEwQztJQUU1RSxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5QixLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFF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