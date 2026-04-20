/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { exec } from 'child_process';
import { totalmem } from 'os';
import { FileAccess } from '../common/network.js';
import { isWindows } from '../common/platform.js';
export const JS_FILENAME_PATTERN = /[a-zA-Z-]+\.js\b/g;
export function listProcesses(rootPid) {
    return new Promise((resolve, reject) => {
        let rootItem;
        const map = new Map();
        const totalMemory = totalmem();
        function addToTree(pid, ppid, cmd, load, mem) {
            const parent = map.get(ppid);
            if (pid === rootPid || parent) {
                const item = {
                    name: findName(cmd),
                    cmd,
                    pid,
                    ppid,
                    load,
                    mem: isWindows ? mem : (totalMemory * (mem / 100))
                };
                map.set(pid, item);
                if (pid === rootPid) {
                    rootItem = item;
                }
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(item);
                    if (parent.children.length > 1) {
                        parent.children = parent.children.sort((a, b) => a.pid - b.pid);
                    }
                }
            }
        }
        function findName(cmd) {
            const UTILITY_NETWORK_HINT = /--utility-sub-type=network/i;
            const WINDOWS_CRASH_REPORTER = /--crashes-directory/i;
            const WINPTY = /\\pipe\\winpty-control/i;
            const CONPTY = /conhost\.exe.+--headless/i;
            const TYPE = /--type=([a-zA-Z-]+)/;
            // find windows crash reporter
            if (WINDOWS_CRASH_REPORTER.exec(cmd)) {
                return 'electron-crash-reporter';
            }
            // find winpty process
            if (WINPTY.exec(cmd)) {
                return 'winpty-agent';
            }
            // find conpty process
            if (CONPTY.exec(cmd)) {
                return 'conpty-agent';
            }
            // find "--type=xxxx"
            let matches = TYPE.exec(cmd);
            if (matches && matches.length === 2) {
                if (matches[1] === 'renderer') {
                    return `window`;
                }
                else if (matches[1] === 'utility') {
                    if (UTILITY_NETWORK_HINT.exec(cmd)) {
                        return 'utility-network-service';
                    }
                    return 'utility-process';
                }
                else if (matches[1] === 'extensionHost') {
                    return 'extension-host'; // normalize remote extension host type
                }
                return matches[1];
            }
            if (cmd.indexOf('node ') < 0 && cmd.indexOf('node.exe') < 0) {
                let result = ''; // find all xyz.js
                do {
                    matches = JS_FILENAME_PATTERN.exec(cmd);
                    if (matches) {
                        result += matches + ' ';
                    }
                } while (matches);
                if (result) {
                    return `electron-nodejs (${result.trim()})`;
                }
            }
            return cmd;
        }
        if (process.platform === 'win32') {
            const cleanUNCPrefix = (value) => {
                if (value.indexOf('\\\\?\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('\\??\\') === 0) {
                    return value.substring(4);
                }
                else if (value.indexOf('"\\\\?\\') === 0) {
                    return '"' + value.substring(5);
                }
                else if (value.indexOf('"\\??\\') === 0) {
                    return '"' + value.substring(5);
                }
                else {
                    return value;
                }
            };
            (import('@vscode/windows-process-tree')).then(windowsProcessTree => {
                windowsProcessTree.getProcessList(rootPid, (processList) => {
                    if (!processList) {
                        reject(new Error(`Root process ${rootPid} not found`));
                        return;
                    }
                    windowsProcessTree.getProcessCpuUsage(processList, (completeProcessList) => {
                        const processItems = new Map();
                        completeProcessList.forEach(process => {
                            const commandLine = cleanUNCPrefix(process.commandLine || '');
                            processItems.set(process.pid, {
                                name: findName(commandLine),
                                cmd: commandLine,
                                pid: process.pid,
                                ppid: process.ppid,
                                load: process.cpu || 0,
                                mem: process.memory || 0
                            });
                        });
                        rootItem = processItems.get(rootPid);
                        if (rootItem) {
                            processItems.forEach(item => {
                                const parent = processItems.get(item.ppid);
                                if (parent) {
                                    if (!parent.children) {
                                        parent.children = [];
                                    }
                                    parent.children.push(item);
                                }
                            });
                            processItems.forEach(item => {
                                if (item.children) {
                                    item.children = item.children.sort((a, b) => a.pid - b.pid);
                                }
                            });
                            resolve(rootItem);
                        }
                        else {
                            reject(new Error(`Root process ${rootPid} not found`));
                        }
                    });
                }, windowsProcessTree.ProcessDataFlag.CommandLine | windowsProcessTree.ProcessDataFlag.Memory);
            });
        }
        // OS X & Linux
        else {
            function calculateLinuxCpuUsage() {
                // Flatten rootItem to get a list of all VSCode processes
                let processes = [rootItem];
                const pids = [];
                while (processes.length) {
                    const process = processes.shift();
                    if (process) {
                        pids.push(process.pid);
                        if (process.children) {
                            processes = processes.concat(process.children);
                        }
                    }
                }
                // The cpu usage value reported on Linux is the average over the process lifetime,
                // recalculate the usage over a one second interval
                // JSON.stringify is needed to escape spaces, https://github.com/nodejs/node/issues/6803
                let cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/cpuUsage.sh').fsPath);
                cmd += ' ' + pids.join(' ');
                exec(cmd, {}, (err, stdout, stderr) => {
                    if (err || stderr) {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cpuUsage = stdout.toString().split('\n');
                        for (let i = 0; i < pids.length; i++) {
                            const processInfo = map.get(pids[i]);
                            processInfo.load = parseFloat(cpuUsage[i]);
                        }
                        if (!rootItem) {
                            reject(new Error(`Root process ${rootPid} not found`));
                            return;
                        }
                        resolve(rootItem);
                    }
                });
            }
            exec('which ps', {}, (err, stdout, stderr) => {
                if (err || stderr) {
                    if (process.platform !== 'linux') {
                        reject(err || new Error(stderr.toString()));
                    }
                    else {
                        const cmd = JSON.stringify(FileAccess.asFileUri('vs/base/node/ps.sh').fsPath);
                        exec(cmd, {}, (err, stdout, stderr) => {
                            if (err || stderr) {
                                reject(err || new Error(stderr.toString()));
                            }
                            else {
                                parsePsOutput(stdout, addToTree);
                                calculateLinuxCpuUsage();
                            }
                        });
                    }
                }
                else {
                    const ps = stdout.toString().trim();
                    const args = '-ax -o pid=,ppid=,pcpu=,pmem=,command=';
                    // Set numeric locale to ensure '.' is used as the decimal separator
                    exec(`${ps} ${args}`, { maxBuffer: 1000 * 1024, env: { LC_NUMERIC: 'en_US.UTF-8' } }, (err, stdout, stderr) => {
                        // Silently ignoring the screen size is bogus error. See https://github.com/microsoft/vscode/issues/98590
                        if (err || (stderr && !stderr.includes('screen size is bogus'))) {
                            reject(err || new Error(stderr.toString()));
                        }
                        else {
                            parsePsOutput(stdout, addToTree);
                            if (process.platform === 'linux') {
                                calculateLinuxCpuUsage();
                            }
                            else {
                                if (!rootItem) {
                                    reject(new Error(`Root process ${rootPid} not found`));
                                }
                                else {
                                    resolve(rootItem);
                                }
                            }
                        }
                    });
                }
            });
        }
    });
}
function parsePsOutput(stdout, addToTree) {
    const PID_CMD = /^\s*([0-9]+)\s+([0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+(.+)$/;
    const lines = stdout.toString().split('\n');
    for (const line of lines) {
        const matches = PID_CMD.exec(line.trim());
        if (matches && matches.length === 6) {
            addToTree(parseInt(matches[1]), parseInt(matches[2]), matches[5], parseFloat(matches[3]), parseFloat(matches[4]));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3BzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUM5QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFbEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWxELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO0FBRXZELE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBZTtJQUM1QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLElBQUksUUFBaUMsQ0FBQztRQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxRQUFRLEVBQUUsQ0FBQztRQUUvQixTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLEdBQVcsRUFBRSxJQUFZLEVBQUUsR0FBVztZQUNuRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLElBQUksR0FBRyxLQUFLLE9BQU8sSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxJQUFJLEdBQWdCO29CQUN6QixJQUFJLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQztvQkFDbkIsR0FBRztvQkFDSCxHQUFHO29CQUNILElBQUk7b0JBQ0osSUFBSTtvQkFDSixHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMs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