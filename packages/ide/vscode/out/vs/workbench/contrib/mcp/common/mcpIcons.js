/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getMediaMime } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
const mcpAllowableContentTypes = [
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif'
];
var IconTheme;
(function (IconTheme) {
    IconTheme[IconTheme["Light"] = 0] = "Light";
    IconTheme[IconTheme["Dark"] = 1] = "Dark";
    IconTheme[IconTheme["Any"] = 2] = "Any";
})(IconTheme || (IconTheme = {}));
function validateIcon(icon, launch, logger) {
    const mimeType = icon.mimeType?.toLowerCase() || getMediaMime(icon.src);
    if (!mimeType || !mcpAllowableContentTypes.includes(mimeType)) {
        logger.debug(`Ignoring icon with unsupported mime type: ${icon.src} (${mimeType}), allowed: ${mcpAllowableContentTypes.join(', ')}`);
        return;
    }
    const uri = URI.parse(icon.src);
    if (uri.scheme === 'data') {
        return uri;
    }
    if (uri.scheme === 'https' || uri.scheme === 'http') {
        if (launch.type !== 2 /* McpServerTransportType.HTTP */) {
            logger.debug(`Ignoring icon with HTTP/HTTPS URL: ${icon.src} as the MCP server is not launched with HTTP transport.`);
            return;
        }
        const expectedAuthority = launch.uri.authority.toLowerCase();
        if (uri.authority.toLowerCase() !== expectedAuthority) {
            logger.debug(`Ignoring icon with untrusted authority: ${icon.src}, expected authority: ${expectedAuthority}`);
            return;
        }
        return uri;
    }
    if (uri.scheme === 'file') {
        if (launch.type !== 1 /* McpServerTransportType.Stdio */) {
            logger.debug(`Ignoring icon with file URL: ${icon.src} as the MCP server is not launched as a local process.`);
            return;
        }
        return uri;
    }
    logger.debug(`Ignoring icon with unsupported scheme: ${icon.src}. Allowed: data:, http:, https:, file:`);
    return;
}
export function parseAndValidateMcpIcon(icons, launch, logger) {
    const result = [];
    for (const icon of icons.icons || []) {
        const uri = validateIcon(icon, launch, logger);
        if (!uri) {
            continue;
        }
        // check for sizes as string for back-compat with early 2025-11-25 drafts
        const sizesArr = typeof icon.sizes === 'string' ? icon.sizes.split(' ') : Array.isArray(icon.sizes) ? icon.sizes : [];
        result.push({
            src: uri,
            theme: icon.theme === 'light' ? 0 /* IconTheme.Light */ : icon.theme === 'dark' ? 1 /* IconTheme.Dark */ : 2 /* IconTheme.Any */,
            sizes: sizesArr.map(size => {
                const [widthStr, heightStr] = size.toLowerCase().split('x');
                return { width: Number(widthStr) || 0, height: Number(heightStr) || 0 };
            }).sort((a, b) => a.width - b.width)
        });
    }
    result.sort((a, b) => a.sizes[0]?.width - b.sizes[0]?.width);
    return result;
}
export class McpIcons {
    static fromStored(icons) {
        return McpIcons.fromParsed(icons?.map(i => ({ src: URI.revive(i.src), theme: i.theme, sizes: i.sizes })));
    }
    static fromParsed(icons) {
        return new McpIcons(icons || []);
    }
    constructor(_icons) {
        this._icons = _icons;
    }
    getUrl(size) {
        const dark = this.getSizeWithTheme(size, 1 /* IconTheme.Dark */);
        if (dark?.theme === 2 /* IconTheme.Any */) {
            return { dark: dark.src };
        }
        const light = this.getSizeWithTheme(size, 0 /* IconTheme.Light */);
        if (!light && !dark) {
            return undefined;
        }
        return { dark: (dark || light).src, light: light?.src };
    }
    getSizeWithTheme(size, theme) {
        let bestOfAnySize;
        for (const icon of this._icons) {
            if (icon.theme === theme || icon.theme === 2 /* IconTheme.Any */ || icon.theme === undefined) { // undefined check for back compat
                bestOfAnySize = icon;
                const matchingSize = icon.sizes.find(s => s.width >= size);
                if (matchingSize) {
                    return { ...icon, sizes: [matchingSize] };
                }
            }
        }
        return bestOfAnySize;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwSWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BJY29ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBTXJELE1BQU0sd0JBQXdCLEdBQXNCO0lBQ25ELFlBQVk7SUFDWixXQUFXO0lBQ1gsWUFBWTtJQUNaLFdBQVc7SUFDWCxXQUFXO0NBQ1gsQ0FBQztBQUVGLElBQVcsU0FJVjtBQUpELFdBQVcsU0FBUztJQUNuQiwyQ0FBSyxDQUFBO0lBQ0wseUNBQUksQ0FBQTtJQUNKLHVDQUFHLENBQUE7QUFDSixDQUFDLEVBSlUsU0FBUyxLQUFULFNBQVMsUUFJbkI7QUFlRCxTQUFTLFlBQVksQ0FBQyxJQUFjLEVBQUUsTUFBdUIsRUFBRSxNQUFlO0lBQzdFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4RSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDL0QsTUFBTSxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsSUFBSSxDQUFDLEdBQUcsS0FBSyxRQUFRLGVBQWUsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNySSxPQUFPO0lBQ1IsQ0FBQztJQUVELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLElBQUksR0FBRyxDQUFDLE1BQU0s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