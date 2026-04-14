/* VS Code Web Extension — localfs:// FileSystemProvider (CommonJS)
 *
 * 通过 HTTP API (/__localfs/*) 将本地目录映射到 VS Code Web 的虚拟文件系统。
 * 运行在 Extension Host Web Worker 中，使用 fetch 与后端文件系统服务器通信。
 *
 * 加载方式: new Function("module", "exports", "require", source)
 */
var vscode = require('vscode');

function toVscodeFileType(serverType) {
    if (serverType === 1)  return vscode.FileType.File;
    if (serverType === 2)  return vscode.FileType.Directory;
    if (serverType === 64) return vscode.FileType.SymbolicLink;
    return vscode.FileType.Unknown;
}

var _origin = (typeof self !== 'undefined' && self.location && self.location.origin)
    || (typeof location !== 'undefined' && location.origin)
    || '';

function apiUrl(action, params) {
    var parts = [];
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
        parts.push(keys[i] + '=' + encodeURIComponent(params[keys[i]]));
    }
    return _origin + '/__localfs/' + action + '?' + parts.join('&');
}

function handleFetchError(response, uri, context) {
    if (!response.ok) {
        if (response.status === 404) throw vscode.FileSystemError.FileNotFound(uri);
        console.warn('[localfs] ' + context + ' failed:', response.status, uri.toString());
        throw vscode.FileSystemError.Unavailable(uri);
    }
    return response;
}

// ---------- FileSystemProvider ----------

function LocalFileSystemProvider() {
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeFile = this._emitter.event;
}

LocalFileSystemProvider.prototype.watch = function () {
    return new vscode.Disposable(function () {});
};

LocalFileSystemProvider.prototype.stat = function (uri) {
    return fetch(apiUrl('stat', { path: uri.path }))
        .then(function (r) { return handleFetchError(r, uri, 'stat'); })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            return { type: toVscodeFileType(d.type), ctime: Math.round(d.ctime), mtime: Math.round(d.mtime), size: d.size };
        });
};

LocalFileSystemProvider.prototype.readDirectory = function (uri) {
    return fetch(apiUrl('readdir', { path: uri.path }))
        .then(function (r) { return handleFetchError(r, uri, 'readDirectory'); })
        .then(function (r) { return r.json(); })
        .then(function (entries) {
            return entries.map(function (e) { return [e[0], toVscodeFileType(e[1])]; });
        });
};

LocalFileSystemProvider.prototype.readFile = function (uri) {
    return fetch(apiUrl('readfile', { path: uri.path }))
        .then(function (r) { return handleFetchError(r, uri, 'readFile'); })
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (buf) { return new Uint8Array(buf); });
};

LocalFileSystemProvider.prototype.writeFile = function (uri, content) {
    return fetch(apiUrl('writefile', { path: uri.path }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: content
    }).then(function (r) { return handleFetchError(r, uri, 'writeFile'); })
      .then(function () {});
};

LocalFileSystemProvider.prototype.rename = function (oldUri, newUri) {
    return fetch(apiUrl('rename', { path: oldUri.path, to: newUri.path }), { method: 'POST' })
        .then(function (r) { return handleFetchError(r, oldUri, 'rename'); })
        .then(function () {});
};

LocalFileSystemProvider.prototype.delete = function (uri, options) {
    var params = { path: uri.path };
    if (options && options.recursive) params.recursive = 'true';
    return fetch(apiUrl('delete', params), { method: 'POST' })
        .then(function (r) { return handleFetchError(r, uri, 'delete'); })
        .then(function () {});
};

LocalFileSystemProvider.prototype.createDirectory = function (uri) {
    return fetch(apiUrl('mkdir', { path: uri.path }), { method: 'POST' })
        .then(function (r) { return handleFetchError(r, uri, 'createDirectory'); })
        .then(function () {});
};

// ---------- Activation ----------

exports.activate = function (context) {
    console.log('[localfs] Extension activating...');
    var provider = new LocalFileSystemProvider();
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('localfs', provider, { isCaseSensitive: true })
    );
    console.log('[localfs] FileSystemProvider registered for scheme "localfs"');
};

exports.deactivate = function () {
    console.log('[localfs] Extension deactivated');
};
