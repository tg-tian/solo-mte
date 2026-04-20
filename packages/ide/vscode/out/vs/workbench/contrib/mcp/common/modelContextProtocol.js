/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#endregion
/**
 * Schema updated from the Model Context Protocol repository at
 * https://github.com/modelcontextprotocol/specification/tree/main/schema
 *
 * ⚠️ Do not edit within `namespace` manually except to update schema versions ⚠️
 */
export var MCP;
(function (MCP) {
    /* JSON-RPC types */
    /** @internal */
    MCP.LATEST_PROTOCOL_VERSION = "2025-11-25";
    /** @internal */
    MCP.JSONRPC_VERSION = "2.0";
    // Standard JSON-RPC error codes
    MCP.PARSE_ERROR = -32700;
    MCP.INVALID_REQUEST = -32600;
    MCP.METHOD_NOT_FOUND = -32601;
    MCP.INVALID_PARAMS = -32602;
    MCP.INTERNAL_ERROR = -32603;
    // Implementation-specific JSON-RPC error codes [-32000, -32099]
    /** @internal */
    MCP.URL_ELICITATION_REQUIRED = -32042;
})(MCP || (MCP = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDb250ZXh0UHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWdpL3NvdXJjZS92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tb2RlbENvbnRleHRQcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWlCaEcsWUFBWTtBQUVaOzs7OztHQUtHO0FBQ0gsTUFBTSxLQUFXLEdBQUcsQ0F1Z0ZuQjtBQXZnRkQsV0FBaUIsR0FBRztJQUNuQixvQkFBb0I7SUFhcEIsZ0JBQWdCO0lBQ0gsMkJBQXVCLEdBQUcsWUFBWSxDQUFDO0lBQ3BELGdCQUFnQjtJQUNILG1CQUFlLEdBQUcsS0FBSyxDQUFDO0lBNElyQyxnQ0FBZ0M7SUFDbkIsZUFBVyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQ3JCLG1CQUFlLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDekIsb0JBQWdCLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFDMUIsa0JBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUN4QixrQkFBYyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBRXJDLGdFQUFnRTtJQUNoRSxnQkFBZ0I7SUFDSCw0QkFBd0IsR0FBRyxDQUFDLEtBQUssQ0FBQztBQWkyRWhELENBQUMsRUF2Z0ZnQixHQUFHLEtBQUgsR0FBRyxRQXVnRm5CIn0=