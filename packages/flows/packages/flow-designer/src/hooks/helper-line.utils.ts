import type { GraphNode, NodePositionChange, XYPosition } from '@vue-flow/core';

interface GetHelperLinesResult {
    horizontal?: number;
    vertical?: number;
    snapPosition: Partial<XYPosition>;
}

export function getHelperLines(change: NodePositionChange, nodes: GraphNode[], distance = 5): GetHelperLinesResult {
    const defaultResult = {
        horizontal: undefined,
        vertical: undefined,
        snapPosition: { x: undefined, y: undefined },
    };
    const nodeA = nodes.find((node) => node.id === change.id);

    if (!nodeA || !change.position) {
        return defaultResult;
    }

    const parentNode = nodeA.parentNode
        ? nodes.find(n => n.id === nodeA.parentNode)
        : null;
    const parentNodePosition: XYPosition = parentNode?.computedPosition ?? { x: 0, y: 0 };
    const nodeABounds = {
        left: change.position.x,
        right: change.position.x + ((nodeA.dimensions.width as number) ?? 0),
        top: change.position.y,
        bottom: change.position.y + ((nodeA.dimensions.height as number) ?? 0),
        xMiddle: 0,
        yMiddle: 0,
        absoluteLeft: 0,
        absoluteRight: 0,
        absoluteTop: 0,
        absoluteBottom: 0,
        width: nodeA.dimensions.width ?? 0,
        height: nodeA.dimensions.height ?? 0,
    };
    nodeABounds.absoluteLeft = nodeABounds.left + parentNodePosition.x;
    nodeABounds.absoluteRight = nodeABounds.right + parentNodePosition.x;
    nodeABounds.absoluteTop = nodeABounds.top + parentNodePosition.y;
    nodeABounds.absoluteBottom = nodeABounds.bottom + parentNodePosition.y;
    nodeABounds.xMiddle = nodeABounds.left + nodeABounds.width / 2;
    nodeABounds.yMiddle = nodeABounds.top + nodeABounds.height / 2;

    let horizontalDistance = distance;
    let verticalDistance = distance;

    return nodes
        .filter((nodeB) => {
            if (nodeB.id === nodeA.id) {
                return false;
            }
            return (!nodeB.parentNode && !nodeA.parentNode) || (nodeB.parentNode === nodeA.parentNode);
        })
        .reduce<GetHelperLinesResult>((result, nodeB) => {
            const nodeBBounds = {
                left: nodeB.position.x,
                right: nodeB.position.x + ((nodeB.dimensions.width as number) ?? 0),
                top: nodeB.position.y,
                bottom: nodeB.position.y + ((nodeB.dimensions.height as number) ?? 0),
                xMiddle: 0,
                yMiddle: 0,
                absoluteLeft: 0,
                absoluteRight: 0,
                absoluteTop: 0,
                absoluteBottom: 0,
                width: nodeB.dimensions.width ?? 0,
                height: nodeB.dimensions.height ?? 0,
            };
            nodeBBounds.absoluteLeft = nodeBBounds.left + parentNodePosition.x;
            nodeBBounds.absoluteRight = nodeBBounds.right + parentNodePosition.x;
            nodeBBounds.absoluteTop = nodeBBounds.top + parentNodePosition.y;
            nodeBBounds.absoluteBottom = nodeBBounds.bottom + parentNodePosition.y;
            nodeBBounds.xMiddle = nodeBBounds.left + nodeBBounds.width / 2;
            nodeBBounds.yMiddle = nodeBBounds.top + nodeBBounds.height / 2;

            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |
            //  |___________|
            //        |
            //        |
            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     B     |
            //  |___________|
            const distanceMiddleMiddleX = Math.abs(nodeABounds.xMiddle - nodeBBounds.xMiddle);

            if (distanceMiddleMiddleX < verticalDistance) {
                result.snapPosition.x = nodeABounds.left + nodeBBounds.xMiddle - nodeABounds.xMiddle;
                result.vertical = nodeBBounds.xMiddle + parentNodePosition.x;
                verticalDistance = distanceMiddleMiddleX;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|     |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |-----|     B     |
            //  |___________|     |___________|
            const distanceMiddleMiddleY = Math.abs(nodeABounds.yMiddle - nodeBBounds.yMiddle);

            if (distanceMiddleMiddleY < horizontalDistance) {
                result.snapPosition.y = nodeABounds.top + nodeBBounds.yMiddle - nodeABounds.yMiddle;
                result.horizontal = nodeBBounds.yMiddle + parentNodePosition.y;
                horizontalDistance = distanceMiddleMiddleY;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |
            //  |___________|
            //  |
            //  |
            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     B     |
            //  |___________|
            const distanceLeftLeft = Math.abs(nodeABounds.left - nodeBBounds.left);

            if (distanceLeftLeft < verticalDistance) {
                result.snapPosition.x = nodeBBounds.left;
                result.vertical = nodeBBounds.absoluteLeft;
                verticalDistance = distanceLeftLeft;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |
            //  |___________|
            //              |
            //              |
            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     B     |
            //  |___________|
            const distanceRightRight = Math.abs(nodeABounds.right - nodeBBounds.right);

            if (distanceRightRight < verticalDistance) {
                result.snapPosition.x = nodeBBounds.right - nodeABounds.width;
                result.vertical = nodeBBounds.absoluteRight;
                verticalDistance = distanceRightRight;
            }

            //              |‾‾‾‾‾‾‾‾‾‾‾|
            //              |     A     |
            //              |___________|
            //              |
            //              |
            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     B     |
            //  |___________|
            const distanceLeftRight = Math.abs(nodeABounds.left - nodeBBounds.right);

            if (distanceLeftRight < verticalDistance) {
                result.snapPosition.x = nodeBBounds.right;
                result.vertical = nodeBBounds.absoluteRight;
                verticalDistance = distanceLeftRight;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |
            //  |___________|
            //              |
            //              |
            //              |‾‾‾‾‾‾‾‾‾‾‾|
            //              |     B     |
            //              |___________|
            const distanceRightLeft = Math.abs(nodeABounds.right - nodeBBounds.left);

            if (distanceRightLeft < verticalDistance) {
                result.snapPosition.x = nodeBBounds.left - nodeABounds.width;
                result.vertical = nodeBBounds.absoluteLeft;
                verticalDistance = distanceRightLeft;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |     |     B     |
            //  |___________|     |___________|
            const distanceTopTop = Math.abs(nodeABounds.top - nodeBBounds.top);

            if (distanceTopTop < horizontalDistance) {
                result.snapPosition.y = nodeBBounds.top;
                result.horizontal = nodeBBounds.absoluteTop;
                horizontalDistance = distanceTopTop;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |
            //  |___________|_________________
            //                    |           |
            //                    |     B     |
            //                    |___________|
            const distanceBottomTop = Math.abs(nodeABounds.bottom - nodeBBounds.top);

            if (distanceBottomTop < horizontalDistance) {
                result.snapPosition.y = nodeBBounds.top - nodeABounds.height;
                result.horizontal = nodeBBounds.absoluteTop;
                horizontalDistance = distanceBottomTop;
            }

            //  |‾‾‾‾‾‾‾‾‾‾‾|     |‾‾‾‾‾‾‾‾‾‾‾|
            //  |     A     |     |     B     |
            //  |___________|_____|___________|
            const distanceBottomBottom = Math.abs(nodeABounds.bottom - nodeBBounds.bottom);

            if (distanceBottomBottom < horizontalDistance) {
                result.snapPosition.y = nodeBBounds.bottom - nodeABounds.height;
                result.horizontal = nodeBBounds.absoluteBottom;
                horizontalDistance = distanceBottomBottom;
            }

            //                    |‾‾‾‾‾‾‾‾‾‾‾|
            //                    |     B     |
            //                    |           |
            //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
            //  |     A     |
            //  |___________|
            const distanceTopBottom = Math.abs(nodeABounds.top - nodeBBounds.bottom);

            if (distanceTopBottom < horizontalDistance) {
                result.snapPosition.y = nodeBBounds.bottom;
                result.horizontal = nodeBBounds.absoluteBottom;
                horizontalDistance = distanceTopBottom;
            }

            return result;
        }, defaultResult);
}
