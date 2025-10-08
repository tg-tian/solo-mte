import { AyalysisTask } from "./type";

export const mockAnalysisTasks = [
    { id: 'RW1', name: '泵房控制程序', creationTime: new Date('2025-05-12 00:00:00'), completedTime: new Date('2025-5-12 00:01:00'), targetApp: 'ProgramA', version: 'v1.0.0', options: ['Java8', '持久化框架'], status: 100, description: '' },
    { id: 'RW2', name: '泵房控制程序', creationTime: new Date('2025-05-12 00:00:00'), completedTime: new Date('2025-5-12 00:01:00'), targetApp: 'ProgramA', version: 'v1.0.0', options: ['Java8', '持久化框架'], status: 80, description: '' },
    { id: 'RW3', name: '泵房控制程序', creationTime: new Date('2025-05-12 00:00:00'), completedTime: new Date('2025-5-12 00:01:00'), targetApp: 'ProgramA', version: 'v1.0.0', options: ['Java8', '持久化框架'], status: 0, description: '' }
] as AyalysisTask[];
