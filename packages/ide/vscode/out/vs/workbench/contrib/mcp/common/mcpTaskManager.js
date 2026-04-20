/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { McpError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Manages in-memory task state for server-side MCP tasks (sampling and elicitation).
 * Also tracks client-side tasks to survive handler reconnections.
 * Lifecycle is tied to the McpServer instance.
 */
export class McpTaskManager extends Disposable {
    constructor() {
        super(...arguments);
        this._serverTasks = this._register(new DisposableMap());
        this._clientTasks = this._register(new DisposableMap());
        this._onDidUpdateTask = this._register(new Emitter());
        this.onDidUpdateTask = this._onDidUpdateTask.event;
    }
    /**
     * Attach a new handler to this task manager.
     * Updates all client tasks to use the new handler.
     */
    setHandler(handler) {
        for (const task of this._clientTasks.values()) {
            task.setHandler(handler);
        }
    }
    /**
     * Get a client task by ID for status notification handling.
     */
    getClientTask(taskId) {
        return this._clientTasks.get(taskId);
    }
    /**
     * Track a new client task.
     */
    adoptClientTask(task) {
        this._clientTasks.set(task.id, task);
    }
    /**
     * Untracks a client task.
     */
    abandonClientTask(taskId) {
        this._clientTasks.deleteAndDispose(taskId);
    }
    /**
     * Create a new task and execute it asynchronously.
     * Returns the task immediately while execution continues in the background.
     */
    createTask(ttl, executor) {
        const taskId = generateUuid();
        const createdAt = new Date().toISOString();
        const createdAtTime = Date.now();
        const task = {
            taskId,
            status: 'working',
            createdAt,
            ttl,
            pollInterval: 1000, // Suggest 1 second polling interval
        };
        const store = new DisposableStore();
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        const executionPromise = this._executeTask(taskId, executor, cts.token);
        // Delete the task after its TTL. Or, if no TTL is given, delete it shortly after the task completes.
        if (ttl) {
            store.add(disposableTimeout(() => this._serverTasks.deleteAndDispose(taskId), ttl));
        }
        else {
            executionPromise.finally(() => {
                const timeout = this._register(disposableTimeout(() => {
                    this._serverTasks.deleteAndDispose(taskId);
                    this._store.delete(timeout);
                }, 60_000));
            });
        }
        this._serverTasks.set(taskId, {
            task,
            cts,
            dispose: () => store.dispose(),
            createdAtTime,
            executionPromise,
        });
        return { task };
    }
    /**
     * Execute a task asynchronously and update its state.
     */
    async _executeTask(taskId, executor, token) {
        try {
            const result = await executor(token);
            this._updateTaskStatus(taskId, 'completed', undefined, result);
        }
        catch (error) {
            if (error instanceof CancellationError) {
                this._updateTaskStatus(taskId, 'cancelled', 'Task was cancelled by the client');
            }
            else if (error instanceof McpError) {
                this._updateTaskStatus(taskId, 'failed', error.message, undefined, {
                    code: error.code,
                    message: error.message,
                    data: error.data,
                });
            }
            else if (error instanceof Error) {
                this._updateTaskStatus(taskId, 'failed', error.message, undefined, {
                    code: MCP.INTERNAL_ERROR,
                    message: error.message,
                });
            }
            else {
                this._updateTaskStatus(taskId, 'failed', 'Unknown error', undefined, {
                    code: MCP.INTERNAL_ERROR,
                    message: 'Unknown error',
                });
            }
        }
    }
    /**
     * Update task status and optionally store result or error.
     */
    _updateTaskStatus(taskId, status, statusMessage, result, error) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            return;
        }
        entry.task.status = status;
        if (statusMessage !== undefined) {
            entry.task.statusMessage = statusMessage;
        }
        if (result !== undefined) {
            entry.result = result;
        }
        if (error !== undefined) {
            entry.error = error;
        }
        this._onDidUpdateTask.fire({ ...entry.task });
    }
    /**
     * Get the current state of a task.
     * Returns an error if the task doesn't exist or has expired.
     */
    getTask(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        return { ...entry.task };
    }
    /**
     * Get the result of a completed task.
     * Blocks until the task completes if it's still in progress.
     */
    async getTaskResult(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        if (entry.task.status === 'working' || entry.task.status === 'input_required') {
            await entry.executionPromise;
        }
        // Refresh entry after waiting
        const updatedEntry = this._serverTasks.get(taskId);
        if (!updatedEntry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        if (updatedEntry.error) {
            throw new McpError(updatedEntry.error.code, updatedEntry.error.message, updatedEntry.error.data);
        }
        if (!updatedEntry.result) {
            throw new McpError(MCP.INTERNAL_ERROR, 'Task completed but no result available');
        }
        return updatedEntry.result;
    }
    /**
     * Cancel a task.
     */
    cancelTask(taskId) {
        const entry = this._serverTasks.get(taskId);
        if (!entry) {
            throw new McpError(MCP.INVALID_PARAMS, `Task not found: ${taskId}`);
        }
        // Check if already in terminal status
        if (entry.task.status === 'completed' || entry.task.status === 'failed' || entry.task.status === 'cancelled') {
            throw new McpError(MCP.INVALID_PARAMS, `Cannot cancel task in ${entry.task.status} status`);
        }
        entry.task.status = 'cancelled';
        entry.task.statusMessage = 'Task was cancelled by the client';
        entry.cts.cancel();
        return { ...entry.task };
    }
    /**
     * List all tasks.
     */
    listTasks() {
        const tasks = [];
        for (const entry of this._serverTasks.values()) {
            tasks.push({ ...entry.task });
        }
        return { tasks };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVGFza01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BUYXNrTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFtQmhEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFVBQVU7SUFBOUM7O1FBQ2tCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBcUIsQ0FBQyxDQUFDO1FBQ3RFLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBNEIsQ0FBQyxDQUFDO1FBQzdFLHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVksQ0FBQyxDQUFDO1FBQzVELG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztJQThOL0QsQ0FBQztJQTVOQTs7O09BR0c7SUFDSCxVQUFVLENB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