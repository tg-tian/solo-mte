import {
    DocBlock, DocCodeSpan, DocDeclarationReference, DocLinkTag, DocParagraph,
    DocParamBlock, DocPlainText, DocSection, TSDocParser
} from "@microsoft/tsdoc";
import { IClass, IMethod, IParam } from '../libs/interfaces/declaration';

const tsDocParser = new TSDocParser();

function packageDoc(codeDestination: DocDeclarationReference | undefined): string | undefined {
    if (!codeDestination) {
        return "";
    }
    return `${codeDestination.packageName}#${codeDestination.memberReferences.map(item => item.memberIdentifier && item.memberIdentifier.identifier || "")}`;
}

function link(docLink: DocLinkTag): string | undefined {
    return `{${docLink.tagName} ${packageDoc(docLink.codeDestination)} | ${docLink.linkText}}`;
}

function section(section: DocSection | undefined): string {
    if (!section) {
        return "";
    }
    const node = section.nodes.find(node => node.kind === "Paragraph");
    if (!node) {
        return "";
    }
    const result = (<DocParagraph>node).nodes.reduce((data, item) => {
        if (item.kind === "PlainText") {
            return { nextRow: true, content: data.content + (data.nextRow ? "\n" : "") + ((<DocPlainText>item).text || "") };
        }
        else if (item.kind === "CodeSpan") {
            return { nextRow: false, content: data.content + `\`${(<DocCodeSpan>item).code}\`` };
        }
        else if (item.kind === "LinkTag") {
            return { nextRow: false, content: data.content + link(<DocLinkTag>item) };
        }
        return data;
    }, { content: "", nextRow: false });
    return result.content.trim();
}

function block(block: DocBlock | undefined): string {
    if (!block) {
        return "";
    }
    return section(block.content);
}

/**
 * 通过空格分离参数名和参数描述
 * @param desc - 整体的参数描述字符串
 * @returns 参数描述
 */
function splitParamDescriptionBySpace(desc: string): {
    paramName: string,
    paramDesc: string
} |null{
    desc = desc.trim();
    if (!desc) {
        return null;
    }
    const firstSpaceIdx = desc.indexOf(" ");
    if (firstSpaceIdx < 0) {
        return null;
    }
    const paramName = desc.substring(0, firstSpaceIdx).trim();
    const paramDesc = desc.substring(firstSpaceIdx, desc.length).trim();
    if (!paramName || !paramDesc) {
        return null;
    }
    return { paramName, paramDesc };
}
function param(docParam: DocParamBlock): IParam {
    let code = "", description = "";
    const commentText = block(docParam);
    if (docParam.parameterName) {
        // 如果用户在参数名和参数描述之间添加了横杠“-”，则tsDoc可以自动识别出参数名称
        code = docParam.parameterName;
        description = commentText;
    } else {
        // 如果用户未按照规范填写，猜测用户可能使用空格作为分隔符
        const paramDescription = splitParamDescriptionBySpace(commentText);
        if (paramDescription) {
            code = paramDescription.paramName;
            description = paramDescription.paramDesc;
        }
    }
    return { code, description, type: "" };
}


export function MethodComment(comment: string, isBlock = true): IMethod {
    if (!comment) {
        return {
            code: "",
            name: "",
            description: "",
            params: [],
            type: "",
            returns: ""
        };
    }
    comment = isBlock ? `/**
    ${comment}
    */`: `//${comment}`;
    const context = tsDocParser.parseString(comment);
    const { paramBlocks, remarksBlock, returnsBlock, summarySection } = context.docComment;
    return {
        code: "",
        name: section(summarySection) || "",
        description: block(remarksBlock),
        params: paramBlocks.map(item => param(item)),
        type: "",
        returns: block(returnsBlock)
    };
}

export function ClassComment(comment: string, isBlock = true): IClass {
    comment = isBlock ? `/**
    ${comment}
    */`: `//${comment}`;
    const context = tsDocParser.parseString(comment);
    const { remarksBlock, summarySection } = context.docComment;
    const _class = {
        code: "",
        name: section(summarySection) || "",
        description: block(remarksBlock),
        methods: []
    };
    if (!isBlock) {
        _class.name = comment.replace(/^[/\s*]+|[/\s*]+$/g, "") || "";
    }
    return _class;
}
