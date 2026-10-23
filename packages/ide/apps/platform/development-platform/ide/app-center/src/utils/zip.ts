/**
 * 极简 ZIP 写入器（仅使用 stored 方式，不压缩）。
 *
 * 说明：本工程所在环境无法通过包管理器安装依赖（pnpm 虚拟存储目录配置冲突），
 * 而配置包只有少量体积很小的 JSON/文本，因此这里自实现 zip 打包，避免引入 jszip。
 */

export interface ZipEntry {
    /** 包内文件名 */
    name: string;
    /** 文本内容 */
    content: string;
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index++) {
        let value = index;
        for (let bit = 0; bit < 8; bit++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index++) {
        crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: number[], value: number): void {
    target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number): void {
    target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

/**
 * 生成 zip 文件
 */
export function createZip(entries: ZipEntry[]): Blob {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const centralDirectory: number[] = [];
    let offset = 0;

    entries.forEach((entry) => {
        const nameBytes = encoder.encode(entry.name);
        const dataBytes = encoder.encode(entry.content);
        const crc = crc32(dataBytes);

        // 本地文件头
        const localHeader: number[] = [];
        writeUint32(localHeader, 0x04034b50);
        writeUint16(localHeader, 20); // version needed
        writeUint16(localHeader, 0x0800); // flags: UTF-8 文件名
        writeUint16(localHeader, 0); // method: stored
        writeUint16(localHeader, 0); // mod time
        writeUint16(localHeader, 0); // mod date
        writeUint32(localHeader, crc);
        writeUint32(localHeader, dataBytes.length);
        writeUint32(localHeader, dataBytes.length);
        writeUint16(localHeader, nameBytes.length);
        writeUint16(localHeader, 0); // extra length

        const localHeaderBytes = new Uint8Array(localHeader);
        chunks.push(localHeaderBytes, nameBytes, dataBytes);

        // 中央目录记录
        writeUint32(centralDirectory, 0x02014b50);
        writeUint16(centralDirectory, 20); // version made by
        writeUint16(centralDirectory, 20); // version needed
        writeUint16(centralDirectory, 0x0800);
        writeUint16(centralDirectory, 0);
        writeUint16(centralDirectory, 0);
        writeUint16(centralDirectory, 0);
        writeUint32(centralDirectory, crc);
        writeUint32(centralDirectory, dataBytes.length);
        writeUint32(centralDirectory, dataBytes.length);
        writeUint16(centralDirectory, nameBytes.length);
        writeUint16(centralDirectory, 0); // extra
        writeUint16(centralDirectory, 0); // comment
        writeUint16(centralDirectory, 0); // disk number
        writeUint16(centralDirectory, 0); // internal attrs
        writeUint32(centralDirectory, 0); // external attrs
        writeUint32(centralDirectory, offset);
        centralDirectory.push(...Array.from(nameBytes), ...Array.from(new Uint8Array([])));

        offset += localHeaderBytes.length + nameBytes.length + dataBytes.length;
    });

    const centralDirectoryBytes = new Uint8Array(centralDirectory);

    // 中央目录结束记录
    const endRecord: number[] = [];
    writeUint32(endRecord, 0x06054b50);
    writeUint16(endRecord, 0);
    writeUint16(endRecord, 0);
    writeUint16(endRecord, entries.length);
    writeUint16(endRecord, entries.length);
    writeUint32(endRecord, centralDirectoryBytes.length);
    writeUint32(endRecord, offset);
    writeUint16(endRecord, 0);

    return new Blob([...chunks, centralDirectoryBytes, new Uint8Array(endRecord)] as BlobPart[], {
        type: 'application/zip'
    });
}

/**
 * 触发浏览器下载
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
