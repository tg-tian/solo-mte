#!/usr/bin/env node
/**
 * 独立 Node.js 服务器 —— 为 Web 版 VS Code 的 FileSystemProvider 提供本地文件系统访问。
 *
 * 用法:
 *   node localfs-server.mjs [rootDir] [port]
 *
 * 默认:
 *   rootDir = 当前目录（可通过 /__localfs/set-root 在运行时动态切换）
 *   port    = 3456
 *
 * 示例:
 *   node localfs-server.mjs /Users/sagi/igix/workspace/projects2508/Cases/ApplicationTemplates/Contacts 3456
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

let rootDir = path.resolve(process.argv[2] || '.');
const PORT = parseInt(process.argv[3] || '3456', 10);

const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 };

function safePath(rel) {
    const abs = path.resolve(rootDir, rel.replace(/^\/+/, ''));
    if (!abs.startsWith(rootDir)) return null;
    return abs;
}

function sendJson(res, data, status = 200) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

function sendError(res, status, msg) {
    sendJson(res, { error: msg }, status);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function fileTypeFromDirent(entry) {
    if (typeof entry.isSymbolicLink === 'function' && entry.isSymbolicLink()) return FileType.SymbolicLink;
    if (typeof entry.isDirectory === 'function' && entry.isDirectory()) return FileType.Directory;
    if (typeof entry.isFile === 'function' && entry.isFile()) return FileType.File;
    return FileType.Unknown;
}

async function handleRequest(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const rawUrl = req.url ?? '';
    if (!rawUrl.startsWith('/__localfs/')) {
        sendError(res, 404, 'Not found');
        return;
    }

    const url = new URL(rawUrl, `http://localhost:${PORT}`);
    const action = rawUrl.split('?')[0].slice('/__localfs/'.length);

    if (action === 'set-root') {
        const body = await readBody(req);
        let newRoot;
        try {
            ({ rootDir: newRoot } = JSON.parse(body.toString('utf-8')));
        } catch {
            sendError(res, 400, 'Invalid JSON body');
            return;
        }
        if (!newRoot || typeof newRoot !== 'string') {
            sendError(res, 400, 'Missing or invalid "rootDir"');
            return;
        }
        const resolved = path.resolve(newRoot);
        try {
            await fs.promises.access(resolved, fs.constants.R_OK);
        } catch {
            sendError(res, 404, `Directory not accessible: ${resolved}`);
            return;
        }
        rootDir = resolved;
        console.log(`[localfs-server] ROOT_DIR changed to "${rootDir}"`);
        sendJson(res, { ok: true, rootDir });
        return;
    }

    if (action === 'get-root') {
        sendJson(res, { rootDir });
        return;
    }

    const relPath = url.searchParams.get('path') ?? '/';
    const abs = safePath(relPath);
    if (!abs) { sendError(res, 403, 'Path escapes root'); return; }

    try {
        switch (action) {
            case 'stat': {
                const st = await fs.promises.lstat(abs);
                sendJson(res, {
                    type: fileTypeFromDirent(st),
                    ctime: st.ctimeMs,
                    mtime: st.mtimeMs,
                    size: st.size,
                });
                break;
            }
            case 'readdir': {
                const entries = await fs.promises.readdir(abs, { withFileTypes: true });
                sendJson(res, entries.map(e => [e.name, fileTypeFromDirent(e)]));
                break;
            }
            case 'readfile': {
                const data = await fs.promises.readFile(abs);
                res.writeHead(200, {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': data.length,
                });
                res.end(data);
                break;
            }
            case 'writefile': {
                const body = await readBody(req);
                await fs.promises.writeFile(abs, body);
                sendJson(res, { ok: true });
                break;
            }
            case 'mkdir': {
                await fs.promises.mkdir(abs, { recursive: true });
                sendJson(res, { ok: true });
                break;
            }
            case 'delete': {
                const recursive = url.searchParams.get('recursive') === 'true';
                await fs.promises.rm(abs, { recursive, force: true });
                sendJson(res, { ok: true });
                break;
            }
            case 'rename': {
                const toRel = url.searchParams.get('to') ?? '';
                const toAbs = safePath(toRel);
                if (!toAbs) { sendError(res, 403, 'Target escapes root'); return; }
                await fs.promises.rename(abs, toAbs);
                sendJson(res, { ok: true });
                break;
            }
            default:
                sendError(res, 404, `Unknown action: ${action}`);
        }
    } catch (err) {
        if (err.code === 'ENOENT') return sendError(res, 404, 'Not found');
        if (err.code === 'EACCES') return sendError(res, 403, 'Permission denied');
        sendError(res, 500, err.message);
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`[localfs-server] Serving "${rootDir}" on http://localhost:${PORT}`);
    console.log(`[localfs-server] API prefix: /__localfs/`);
    console.log(`[localfs-server] Example: http://localhost:${PORT}/__localfs/readdir?path=/`);
});
