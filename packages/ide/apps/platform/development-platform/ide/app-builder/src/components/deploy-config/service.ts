import axios from 'axios';
import JSEncrypt from 'jsencrypt';

const PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8Uvi7YbPGxof2p7NGneZGfwGhMOhWrj/Jk6bjDS87jCQ0uEQ7PquzVbgWLMV0eyFzAOBiHMT+Gy9q5x7aPpskm7CnMwPgjlXt1xVENOM/fXtAl908dG+UadbzZvUWV68KBF14Q8JOZ3kyUo9jzsn0Ro0tzORDVH6WnasdVcPBHQIDAQAB';

export interface GitCheckResult {
    exit?: boolean;
    addr?: string;
    gitUrl?: string;
    gitConfig?: boolean;
}

export interface RemoteInfo {
    name: string;
    url: string;
    branchName: string;
}

export function checkIsGitProject(boPath: string): Promise<GitCheckResult> {
    return axios.get('/api/dev/main/v1.0/git/addr?wsPath=' + encodeURIComponent(boPath)).then(res => res.data);
}

export function gitInit(boPath: string): Promise<any> {
    return axios.post('/api/dev/main/v1.0/git/init?projectPath=' + encodeURIComponent(boPath), {}).then(res => res.data);
}

export function gitClone(boPath: string, gitUrl: string, branch: string): Promise<any> {
    const sendData = { branchToFetch: branch, remoteUrl: gitUrl, workDir: boPath };
    return axios.post('/api/dev/main/v1.0/git/clone', sendData).then(res => res.data);
}

export function gitRemoteAdd(boPath: string, gitUrl: string): Promise<any> {
    const sendData = { password: null, url: gitUrl, name: 'origin', username: null };
    return axios.post('/api/dev/main/v1.0/git/remote?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitRemoteView(boPath: string): Promise<RemoteInfo[]> {
    return axios.get('/api/dev/main/v1.0/git/remote?projectPath=' + encodeURIComponent(boPath)).then(res => res.data);
}

export function gitRemoteDelete(boPath: string, name: string): Promise<any> {
    return axios.delete('/api/dev/main/v1.0/git/remote/' + encodeURIComponent(name) + '?projectPath=' + encodeURIComponent(boPath) + '&name=' + encodeURIComponent(name)).then(res => res.data);
}

export function gitPull(boPath: string): Promise<any> {
    const sendData = { password: null, remote: 'origin', rebase: false, username: null };
    return axios.post('/api/dev/main/v1.0/git/pull?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitCommit(boPath: string, message: string): Promise<any> {
    const sendData = { message, all: true };
    return axios.post('/api/dev/main/v1.0/git/commit?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitPush(boPath: string): Promise<any> {
    const sendData = { password: null, remote: 'origin', branchname: '', username: null };
    return axios.post('/api/dev/main/v1.0/git/push?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitRevert(boPath: string): Promise<any> {
    return axios.post('/api/dev/main/v1.0/git/backout?projectPath=' + encodeURIComponent(boPath), {}).then(res => res.data);
}

export function getGitRepoConfig(): Promise<{ name: string; password: string }> {
    return axios.get('/api/dev/main/v1.0/git/repoconfig').then(res => res.data);
}

export function updateGitRepoConfig(name: string, password: string): Promise<any> {
    const sendData = { name, password: password ? rsaEncrypt(password) : '' };
    return axios.post('/api/dev/main/v1.0/git/repoconfig', sendData).then(res => res.data);
}

export function rsaEncrypt(info: string): string {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(PUBLIC_KEY);
    const encrypted = (encrypt as any).encryptLong ? (encrypt as any).encryptLong(info) : encrypt.encrypt(info);
    return encrypted as string;
}

export function extractErrorMessage(e: any, fallback: string): string {
    return e?.response?.data?.Message || e?.response?.data?.message || fallback;
}
