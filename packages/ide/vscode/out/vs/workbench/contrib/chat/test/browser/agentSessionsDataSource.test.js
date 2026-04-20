/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentSessionsDataSource } from '../../browser/agentSessions/agentSessionsViewer.js';
import { isAgentSessionSection } from '../../browser/agentSessions/agentSessionsModel.js';
import { isSessionInProgressStatus } from '../../common/chatSessionsService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
suite('AgentSessionsDataSource', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const WEEK_THRESHOLD = 7 * ONE_DAY; // 7 days
    function createMockSession(overrides = {}) {
        const now = Date.now();
        return {
            providerType: 'test',
            providerLabel: 'Test',
            resource: URI.parse(`test://session/${overrides.id ?? 'default'}`),
            status: overrides.status ?? 1 /* ChatSessionStatus.Completed */,
            label: `Session ${overrides.id ?? 'default'}`,
            icon: Codicon.terminal,
            timing: {
                startTime: overrides.startTime ?? now,
                endTime: overrides.endTime ?? now,
            },
            isArchived: () => overrides.isArchived ?? false,
            setArchived: () => { },
            isRead: () => true,
            setRead: () => { },
        };
    }
    function createMockModel(sessions) {
        return {
            sessions,
            getSession: () => undefined,
            onWillResolve: Event.None,
            onDidResolve: Event.None,
            onDidChangeSessions: Event.None,
            resolve: async () => { },
        };
    }
    function createMockFilter(options) {
        return {
            onDidChange: Event.None,
            groupResults: () => options.groupResults,
            exclude: options.exclude ?? (() => false),
        };
    }
    function createMockSorter() {
        return {
            compare: (a, b) => {
                // Sort by end time, most recent first
                const aTime = a.timing.endTime || a.timing.startTime;
                const bTime = b.timing.endTime || b.timing.startTime;
                return bTime - aTime;
            }
        };
    }
    function getSectionsFromResult(result) {
        return Array.from(result).filter((item) => isAgentSessionSection(item));
    }
    suite('groupSessionsIntoSections', () => {
        test('returns flat list when groupResults is false', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', startTime: now, endTime: now }),
                createMockSession({ id: '2', startTime: now - ONE_DAY, endTime: now - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: false });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            // Should be a flat list without sections
            assert.strictEqual(result.length, 2);
            assert.strictEqual(getSectionsFromResult(result).length, 0);
        });
        test('groups active sessions first with header', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 2 /* ChatSessionStatus.InProgress */, startTime: now - ONE_DAY }),
                createMockSession({ id: '3', status: 3 /* ChatSessionStatus.NeedsInput */, startTime: now - 2 * ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            // First item should be the In Progress section header
            const firstItem = result[0];
            assert.ok(isAgentSessionSection(firstItem), 'First item should be a section header');
            assert.strictEqual(firstItem.section, "inProgress" /* AgentSessionSection.InProgress */);
            // Verify the sessions in the section have active status
            const activeSessions = firstItem.sessions;
            assert.ok(activeSessions.every(s => isSessionInProgressStatus(s.status) || s.status === 3 /* ChatSessionStatus.NeedsInput */));
        });
        test('adds Today header when there are active sessions', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 2 /* ChatSessionStatus.InProgress */, startTime: now - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const sections = getSectionsFromResult(result);
            // Now all sections have headers, so we expect In Progress and Today sections
            assert.strictEqual(sections.length, 2);
            assert.strictEqual(sections[0].section, "inProgress" /* AgentSessionSection.InProgress */);
            assert.strictEqual(sections[1].section, "today" /* AgentSessionSection.Today */);
        });
        test('adds Today header when there are no active sessions', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - ONE_DAY, endTime: now - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const sections = getSectionsFromResult(result);
            // Now all sections have headers, so Today section should be present
            assert.strictEqual(sections.filter(s => s.section === "today" /* AgentSessionSection.Today */).length, 1);
        });
        test('adds Older header for sessions older than week threshold', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - WEEK_THRESHOLD - ONE_DAY, endTime: now - WEEK_THRESHOLD - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const sections = getSectionsFromResult(result);
            assert.strictEqual(sections.filter(s => s.section === "older" /* AgentSessionSection.Older */).length, 1);
        });
        test('adds Archived header for archived sessions', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 1 /* ChatSessionStatus.Completed */, isArchived: true, startTime: now - ONE_DAY, endTime: now - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const sections = getSectionsFromResult(result);
            assert.strictEqual(sections.filter(s => s.section === "archived" /* AgentSessionSection.Archived */).length, 1);
        });
        test('archived sessions come after older sessions', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, isArchived: true, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - WEEK_THRESHOLD - ONE_DAY, endTime: now - WEEK_THRESHOLD - ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const olderIndex = result.findIndex(item => isAgentSessionSection(item) && item.section === "older" /* AgentSessionSection.Older */);
            const archivedIndex = result.findIndex(item => isAgentSessionSection(item) && item.section === "archived" /* AgentSessionSection.Archived */);
            assert.ok(olderIndex < archivedIndex, 'Older section should come before Archived section');
        });
        test('correct order: active, today, week, older, archived', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: 'archived', status: 1 /* ChatSessionStatus.Completed */, isArchived: true, startTime: now, endTime: now }),
                createMockSession({ id: 'today', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: 'week', status: 1 /* ChatSessionStatus.Completed */, startTime: now - 3 * ONE_DAY, endTime: now - 3 * ONE_DAY }),
                createMockSession({ id: 'old', status: 1 /* ChatSessionStatus.Completed */, startTime: now - WEEK_THRESHOLD - ONE_DAY, endTime: now - WEEK_THRESHOLD - ONE_DAY }),
                createMockSession({ id: 'active', status: 2 /* ChatSessionStatus.InProgress */, startTime: now }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            // All sections now have headers
            // In Progress section
            assert.ok(isAgentSessionSection(result[0]));
            assert.strictEqual(result[0].section, "inProgress" /* AgentSessionSection.InProgress */);
            assert.strictEqual(result[0].sessions[0].label, 'Session active');
            // Today section
            assert.ok(isAgentSessionSection(result[1]));
            assert.strictEqual(result[1].section, "today" /* AgentSessionSection.Today */);
            assert.strictEqual(result[1].sessions[0].label, 'Session today');
            // Week section
            assert.ok(isAgentSessionSection(result[2]));
            assert.strictEqual(result[2].section, "week" /* AgentSessionSection.Week */);
            assert.strictEqual(result[2].sessions[0].label, 'Session week');
            // Older section
            assert.ok(isAgentSessionSection(result[3]));
            assert.strictEqual(result[3].section, "older" /* AgentSessionSection.Older */);
            assert.strictEqual(result[3].sessions[0].label, 'Session old');
            // Archived section
            assert.ok(isAgentSessionSection(result[4]));
            assert.strictEqual(result[4].section, "archived" /* AgentSessionSection.Archived */);
            assert.strictEqual(result[4].sessions[0].label, 'Session archived');
        });
        test('empty sessions returns empty result', () => {
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel([]);
            const result = Array.from(dataSource.getChildren(mockModel));
            assert.strictEqual(result.length, 0);
        });
        test('only today sessions produces a Today section header', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: '1', status: 1 /* ChatSessionStatus.Completed */, startTime: now, endTime: now }),
                createMockSession({ id: '2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - 1000, endTime: now - 1000 }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            const sections = getSectionsFromResult(result);
            // All sections now have headers, so a Today section should be present
            assert.strictEqual(sections.length, 1);
            assert.strictEqual(sections[0].section, "today" /* AgentSessionSection.Today */);
            assert.strictEqual(sections[0].sessions.length, 2);
        });
        test('sessions are sorted within each group', () => {
            const now = Date.now();
            const sessions = [
                createMockSession({ id: 'old1', status: 1 /* ChatSessionStatus.Completed */, startTime: now - WEEK_THRESHOLD - 2 * ONE_DAY, endTime: now - WEEK_THRESHOLD - 2 * ONE_DAY }),
                createMockSession({ id: 'old2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - WEEK_THRESHOLD - ONE_DAY, endTime: now - WEEK_THRESHOLD - ONE_DAY }),
                createMockSession({ id: 'week1', status: 1 /* ChatSessionStatus.Completed */, startTime: now - 3 * ONE_DAY, endTime: now - 3 * ONE_DAY }),
                createMockSession({ id: 'week2', status: 1 /* ChatSessionStatus.Completed */, startTime: now - 2 * ONE_DAY, endTime: now - 2 * ONE_DAY }),
            ];
            const filter = createMockFilter({ groupResults: true });
            const sorter = createMockSorter();
            const dataSource = new AgentSessionsDataSource(filter, sorter);
            const mockModel = createMockModel(sessions);
            const result = Array.from(dataSource.getChildren(mockModel));
            // All sections now have headers
            // Week section should be first and contain sorted sessions
            const weekSection = result.find((item) => isAgentSessionSection(item) && item.section === "week" /* AgentSessionSection.Week */);
            assert.ok(weekSection);
            assert.strictEqual(weekSection.sessions[0].label, 'Session week2');
            assert.strictEqual(weekSection.sessions[1].label, 'Session week1');
            // Older section with sorted sessions
            const olderSection = result.find((item) => isAgentSessionSection(item) && item.section === "older" /* AgentSessionSection.Older */);
            assert.ok(olderSection);
            assert.strictEqual(olderSection.sessions[0].label, 'Session old2');
            assert.strictEqual(olderSection.sessions[1].label, 'Session old1');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc0RhdGFTb3VyY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9hZ2VudFNlc3Npb25zRGF0YVNvdXJjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUE4QyxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pJLE9BQU8sRUFBaUYscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6SyxPQUFPLEVBQXFCLHlCQUF5QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBRXJDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxPQUFPLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3BDLE1BQU0sY0FBYyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxTQUFTO0lBRTdDLFNBQVMsaUJBQWlCLENBQUMsWUFNdEIsRUFBRTtRQUNOLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixPQUFPO1lBQ04sWUFBWSxFQUFFLE1BQU07WUFDcEIsYUFBYSxFQUFFLE1BQU07WUFDckIsUUFBUSxFQUFFLEdBQUcsQ0FB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