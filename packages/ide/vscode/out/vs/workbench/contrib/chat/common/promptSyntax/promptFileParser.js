/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../../base/common/iterator.js';
import { dirname, joinPath } from '../../../../../base/common/resources.js';
import { splitLinesIncludeSeparators } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { parse } from '../../../../../base/common/yaml.js';
import { Range } from '../../../../../editor/common/core/range.js';
export class PromptFileParser {
    constructor() {
    }
    parse(uri, content) {
        const linesWithEOL = splitLinesIncludeSeparators(content);
        if (linesWithEOL.length === 0) {
            return new ParsedPromptFile(uri, undefined, undefined);
        }
        let header = undefined;
        let body = undefined;
        let bodyStartLine = 0;
        if (linesWithEOL[0].match(/^---[\s\r\n]*$/)) {
            let headerEndLine = linesWithEOL.findIndex((line, index) => index > 0 && line.match(/^---[\s\r\n]*$/));
            if (headerEndLine === -1) {
                headerEndLine = linesWithEOL.length;
                bodyStartLine = linesWithEOL.length;
            }
            else {
                bodyStartLine = headerEndLine + 1;
            }
            // range starts on the line after the ---, and ends at the beginning of the line that has the closing ---
            const range = new Range(2, 1, headerEndLine + 1, 1);
            header = new PromptHeader(range, linesWithEOL);
        }
        if (bodyStartLine < linesWithEOL.length) {
            // range starts  on the line after the ---, and ends at the beginning of line after the last line
            const range = new Range(bodyStartLine + 1, 1, linesWithEOL.length + 1, 1);
            body = new PromptBody(range, linesWithEOL, uri);
        }
        return new ParsedPromptFile(uri, header, body);
    }
}
export class ParsedPromptFile {
    constructor(uri, header, body) {
        this.uri = uri;
        this.header = header;
        this.body = body;
    }
}
export var PromptHeaderAttributes;
(function (PromptHeaderAttributes) {
    PromptHeaderAttributes.name = 'name';
    PromptHeaderAttributes.description = 'description';
    PromptHeaderAttributes.agent = 'agent';
    PromptHeaderAttributes.mode = 'mode';
    PromptHeaderAttributes.model = 'model';
    PromptHeaderAttributes.applyTo = 'applyTo';
    PromptHeaderAttributes.tools = 'tools';
    PromptHeaderAttributes.handOffs = 'handoffs';
    PromptHeaderAttributes.advancedOptions = 'advancedOptions';
    PromptHeaderAttributes.argumentHint = 'argument-hint';
    PromptHeaderAttributes.excludeAgent = 'excludeAgent';
    PromptHeaderAttributes.target = 'target';
    PromptHeaderAttributes.infer = 'infer';
})(PromptHeaderAttributes || (PromptHeaderAttributes = {}));
export var GithubPromptHeaderAttributes;
(function (GithubPromptHeaderAttributes) {
    GithubPromptHeaderAttributes.mcpServers = 'mcp-servers';
})(GithubPromptHeaderAttributes || (GithubPromptHeaderAttributes = {}));
export var Target;
(function (Target) {
    Target["VSCode"] = "vscode";
    Target["GitHubCopilot"] = "github-copilot";
})(Target || (Target = {}));
export class PromptHeader {
    constructor(range, linesWithEOL) {
        this.range = range;
        this.linesWithEOL = linesWithEOL;
    }
    get _parsedHeader() {
        if (this._parsed === undefined) {
            const yamlErrors = [];
            const lines = this.linesWithEOL.slice(this.range.startLineNumber - 1, this.range.endLineNumber - 1).join('');
            const node = parse(lines, yamlErrors);
            const attributes = [];
            const errors = yamlErrors.map(err => ({ message: err.message, range: this.asRange(err), code: err.code }));
            if (node) {
                if (node.type !== 'object') {
                    errors.push({ message: 'Invalid header, expecting <key: value> pairs', range: this.range, code: 'INVALID_YAML' });
                }
                else {
                    for (const property of node.properties) {
                        attributes.push({
                            key: property.key.value,
                            range: this.asRange({ start: property.key.start, end: property.value.end }),
                            value: this.asValue(property.value)
                        });
                    }
                }
            }
            this._parsed = { node, attributes, errors };
        }
        return this._parsed;
    }
    asRange({ start, end }) {
        return new Range(this.range.startLineNumber + start.line, start.character + 1, this.range.startLineNumber + end.line, end.character + 1);
    }
    asValue(node) {
        switch (node.type) {
            case 'string':
                return { type: 'string', value: node.value, range: this.asRange(node) };
            case 'number':
                return { type: 'number', value: node.value, range: this.asRange(node) };
            case 'boolean':
                return { type: 'boolean', value: node.value, range: this.asRange(node) };
            case 'null':
                return { type: 'null', value: node.value, range: this.asRange(node) };
            case 'array':
                return { type: 'array', items: node.items.map(item => this.asValue(item)), range: this.asRange(node) };
            case 'object': {
                const properties = node.properties.map(property => ({ key: this.asValue(property.key), value: this.asValue(property.value) }));
                return { type: 'object', properties, range: this.asRange(node) };
            }
        }
    }
    get attributes() {
        return this._parsedHeader.attributes;
    }
    getAttribute(key) {
        return this._parsedHeader.attributes.find(attr => attr.key === key);
    }
    get errors() {
        return this._parsedHeader.errors;
    }
    getStringAttribute(key) {
        const attribute = this._parsedHeader.attributes.find(attr => attr.key === key);
        if (attribute?.value.type === 'string') {
            return attribute.value.value;
        }
        return undefined;
    }
    getBooleanAttribute(key) {
        const attribute = this._parsedHeader.attributes.find(attr => attr.key === key);
        if (attribute?.value.type === 'boolean') {
            return attribute.value.value;
        }
        return undefined;
    }
    get name() {
        return this.getStringAttribute(PromptHeaderAttributes.name);
    }
    get description() {
        return this.getStringAttribute(PromptHeaderAttributes.description);
    }
    get agent() {
        return this.getStringAttribute(PromptHeaderAttributes.agent) ?? this.getStringAttribute(PromptHeaderAttributes.mode);
    }
    get model() {
        return this.getStringAttribute(PromptHeaderAttributes.model);
    }
    get applyTo() {
        return this.getStringAttribute(PromptHeaderAttributes.applyTo);
    }
    get argumentHint() {
        return this.getStringAttribute(PromptHeaderAttributes.argumentHint);
    }
    get target() {
        return this.getStringAttribute(PromptHeaderAttributes.target);
    }
    get infer() {
        return this.getBooleanAttribute(PromptHeaderAttributes.infer);
    }
    get tools() {
        const toolsAttribute = this._parsedHeader.attributes.find(attr => attr.key === PromptHeaderAttributes.tools);
        if (!toolsAttribute) {
            return undefined;
        }
        if (toolsAttribute.value.type === 'array') {
            const tools = [];
            for (const item of toolsAttribute.value.items) {
                if (item.type === 'string' && item.value) {
                    tools.push(item.value);
                }
            }
            return tools;
        }
        else if (toolsAttribute.value.type === 'object') {
            const tools = [];
            const collectLeafs = ({ key, value }) => {
                if (value.type === 'boolean') {
                    tools.push(key.value);
                }
                else if (value.type === 'object') {
                    value.properties.forEach(collectLeafs);
                }
            };
            toolsAttribute.value.properties.forEach(collectLeafs);
            return tools;
        }
        return undefined;
    }
    get handOffs() {
        const handoffsAttribute = this._parsedHeader.attributes.find(attr => attr.key === PromptHeaderAttributes.handOffs);
        if (!handoffsAttribute) {
            return undefined;
        }
        if (handoffsAttribute.value.type === 'array') {
            // Array format: list of objects: { agent, label, prompt, send?, showContinueOn? }
            const handoffs = [];
            for (const item of handoffsAttribute.value.items) {
                if (item.type === 'object') {
                    let agent;
                    let label;
                    let prompt;
                    let send;
                    let showContinueOn;
                    for (const prop of item.properties) {
                        if (prop.key.value === 'agent' && prop.value.type === 'string') {
                            agent = prop.value.value;
                        }
                        else if (prop.key.value === 'label' && prop.value.type === 'string') {
                            label = prop.value.value;
                        }
                        else if (prop.key.value === 'prompt' && prop.value.type === 'string') {
                            prompt = prop.value.value;
                        }
                        else if (prop.key.value === 'send' && prop.value.type === 'boolean') {
                            send = prop.value.value;
                        }
                        else if (prop.key.value === 'showContinueOn' && prop.value.type === 'boolean') {
                            showContinueOn = prop.value.value;
                        }
                    }
                    if (agent && label && prompt !== undefined) {
                        const handoff = {
                            agent,
                            label,
                            prompt,
                            ...(send !== undefined ? { send } : {}),
                            ...(showContinueOn !== undefined ? { showContinueOn } : {})
                        };
                        handoffs.push(handoff);
                    }
                }
            }
            return handoffs;
        }
        return undefined;
    }
}
export class PromptBody {
    constructor(range, linesWithEOL, uri) {
        this.range = range;
        this.linesWithEOL = linesWithEOL;
        this.uri = uri;
    }
    get fileReferences() {
        return this.getParsedBody().fileReferences;
    }
    get variableReferences() {
        return this.getParsedBody().variableReferences;
    }
    get offset() {
        return this.getParsedBody().bodyOffset;
    }
    getParsedBody() {
        if (this._parsed === undefined) {
            const markdownLinkRanges = [];
            const fileReferences = [];
            const variableReferences = [];
            const bodyOffset = Iterable.reduce(Iterable.slice(this.linesWithEOL, 0, this.range.startLineNumber - 1), (len, line) => line.length + len, 0);
            for (let i = this.range.startLineNumber - 1, lineStartOffset = bodyOffset; i < this.range.endLineNumber - 1; i++) {
                const line = this.linesWithEOL[i];
                // Match markdown links: [text](link)
                const linkMatch = line.matchAll(/\[(.*?)\]\((.+?)\)/g);
                for (const match of linkMatch) {
                    const linkEndOffset = match.index + match[0].length - 1; // before the parenthesis
                    const linkStartOffset = match.index + match[0].length - match[2].length - 1;
                    const range = new Range(i + 1, linkStartOffset + 1, i + 1, linkEndOffset + 1);
                    fileReferences.push({ content: match[2], range, isMarkdownLink: true });
                    markdownLinkRanges.push(new Range(i + 1, match.index + 1, i + 1, match.index + match[0].length + 1));
                }
                // Match #file:<filePath> and #tool:<toolName>
                // Regarding the <toolName> pattern below, see also the variableReg regex in chatRequestParser.ts.
                const reg = /#file:(?<filePath>[^\s#]+)|#tool:(?<toolName>[\w_\-\.\/]+)/gi;
                const matches = line.matchAll(reg);
                for (const match of matches) {
                    const fullMatch = match[0];
                    const fullRange = new Range(i + 1, match.index + 1, i + 1, match.index + fullMatch.length + 1);
                    if (markdownLinkRanges.some(mdRange => Range.areIntersectingOrTouching(mdRange, fullRange))) {
                        continue;
                    }
                    const contentMatch = match.groups?.['filePath'] || match.groups?.['toolName'];
                    if (!contentMatch) {
                        continue;
                    }
                    const startOffset = match.index + fullMatch.length - contentMatch.length;
                    const endOffset = match.index + fullMatch.length;
                    const range = new Range(i + 1, startOffset + 1, i + 1, endOffset + 1);
                    if (match.groups?.['filePath']) {
                        fileReferences.push({ content: match.groups?.['filePath'], range, isMarkdownLink: false });
                    }
                    else if (match.groups?.['toolName']) {
                        variableReferences.push({ name: match.groups?.['toolName'], range, offset: lineStartOffset + match.index });
                    }
                }
                lineStartOffset += line.length;
            }
            this._parsed = { fileReferences: fileReferences.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range)), variableReferences, bodyOffset };
        }
        return this._parsed;
    }
    getContent() {
        return this.linesWithEOL.slice(this.range.startLineNumber - 1, this.range.endLineNumber - 1).join('');
    }
    resolveFilePath(path) {
        try {
            if (path.startsWith('/')) {
                return this.uri.with({ path });
            }
            else if (path.match(/^[a-zA-Z]+:\//)) {
                return URI.parse(path);
            }
            else {
                const dirName = dirname(this.uri);
                return joinPath(dirName, path);
            }
        }
        catch {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhZ2kvc291cmNlL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZVBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBc0QsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkUsTUFBTSxPQUFPLGdCQUFnQjtJQUM1QjtJQUNBLENBQUM7SUFFTSxLQUFLLENBQUMsR0FBUSxFQUFFLE9BQWU7UUFDckMsTUFBTSxZQUFZLEdBQUcsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUQsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxJQUFJLE1BQU0sR0FBNkIsU0FBUyxDQUFDO1FBQ2pELElBQUksSUFBSSxHQUEyQixTQUFTLENBQUM7UUFDN0MsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDN0MsSUFBSSxhQUFhLEdB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