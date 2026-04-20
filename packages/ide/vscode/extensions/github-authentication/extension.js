'use strict';
const vscode = require('vscode');

/**
 * 占位实现：满足 workbench 对 `github` authentication provider 的注册与 getSessions，
 * 避免 tryActivateProvider 5s 超时。不提供真实 GitHub OAuth。
 */
function activate(context) {
    const emitter = new vscode.EventEmitter();
    const provider = {
        onDidChangeSessions: emitter.event,
        getSessions: async () => [],
        createSession: async () => {
            throw new Error('GitHub sign-in is not available in this embedded workbench.');
        },
        removeSession: async () => {}
    };
    context.subscriptions.push(
        vscode.authentication.registerAuthenticationProvider(
            'github',
            'GitHub',
            provider,
            { supportsMultipleAccounts: true }
        )
    );
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;
