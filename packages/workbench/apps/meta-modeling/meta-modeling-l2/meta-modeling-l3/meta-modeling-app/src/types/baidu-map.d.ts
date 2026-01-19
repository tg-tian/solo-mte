/**
 * Type definitions for Baidu Maps API
 */
declare namespace BMap {
    class Map {
        constructor(container: string | HTMLElement);
        centerAndZoom(center: Point, zoom: number): void;
        enableScrollWheelZoom(): void;
        disableScrollWheelZoom(): void;
        addOverlay(overlay: Overlay): void;
        removeOverlay(overlay: Overlay): void;
        clearOverlays(): void;
        panTo(center: Point, opts?: PanOptions): void;
        setMapType(mapType: MapType): void;
        setCenter(center: Point): void;
        getContainer(): HTMLElement;
        getZoom(): number;
        setZoom(zoom: number): void;
        setViewport(points: Point[]): void;
        getCenter(): Point;
    }

    class Point {
        constructor(lng: number, lat: number);
        lng: number;
        lat: number;
    }

    class Marker implements Overlay {
        constructor(point: Point, opts?: MarkerOptions);
        openInfoWindow(infoWindow: InfoWindow): void;
        setIcon(icon: Icon): void;
        getPosition(): Point;
        setPosition(point: Point): void;
        addEventListener(event: string, handler: Function): void;
        removeEventListener(event: string, handler: Function): void;
    }

    interface Overlay {
    }

    interface MarkerOptions {
        offset?: Size;
        icon?: Icon;
        enableMassClear?: boolean;
        enableDragging?: boolean;
        enableClicking?: boolean;
        raiseOnDrag?: boolean;
        draggingCursor?: string;
        rotation?: number;
        title?: string;
    }

    class Size {
        constructor(width: number, height: number);
        width: number;
        height: number;
    }

    class Icon {
        constructor(url: string, size: Size, opts?: IconOptions);
        setImageUrl(imageUrl: string): void;
        setSize(size: Size): void;
        setImageOffset(offset: Size): void;
        setImageSize(size: Size): void;
    }

    interface IconOptions {
        anchor?: Size;
        imageOffset?: Size;
        imageSize?: Size;
        infoWindowAnchor?: Size;
        printImageUrl?: string;
    }

    class InfoWindow {
        constructor(content: string | HTMLElement, opts?: InfoWindowOptions);
        setWidth(width: number): void;
        setHeight(height: number): void;
        redraw(): void;
        setTitle(title: string | HTMLElement): void;
        getContent(): string | HTMLElement;
        getPosition(): Point;
        enableMaximize(): void;
        disableMaximize(): void;
        isOpen(): boolean;
        setMaxContent(content: string): void;
        enableAutoPan(): void;
        disableAutoPan(): void;
        enableCloseOnClick(): void;
        disableCloseOnClick(): void;
    }

    interface InfoWindowOptions {
        width?: number;
        height?: number;
        maxWidth?: number;
        offset?: Size;
        title?: string;
        enableAutoPan?: boolean;
        enableCloseOnClick?: boolean;
        enableMessage?: boolean;
        message?: string;
    }

    interface PanOptions {
        noAnimation?: boolean;
    }

    class MapType {
        static NORMAL: any;
        static EARTH: any;
        static SATELLITE: any;
        static HYBRID: any;
    }

    class Control {
        constructor();
    }

    class NavigationControl extends Control {
        constructor(opts?: NavigationControlOptions);
    }

    interface NavigationControlOptions {
        anchor?: ControlAnchor;
        offset?: Size;
        type?: NavigationControlType;
        showZoomInfo?: boolean;
        enableGeolocation?: boolean;
    }

    enum ControlAnchor {
        BMAP_ANCHOR_TOP_LEFT,
        BMAP_ANCHOR_TOP_RIGHT,
        BMAP_ANCHOR_BOTTOM_LEFT,
        BMAP_ANCHOR_BOTTOM_RIGHT
    }

    enum NavigationControlType {
        BMAP_NAVIGATION_CONTROL_LARGE,
        BMAP_NAVIGATION_CONTROL_SMALL,
        BMAP_NAVIGATION_CONTROL_PAN,
        BMAP_NAVIGATION_CONTROL_ZOOM
    }

    class ScaleControl extends Control {
        constructor(opts?: ScaleControlOptions);
    }

    interface ScaleControlOptions {
        anchor?: ControlAnchor;
        offset?: Size;
    }

    class OverviewMapControl extends Control {
        constructor(opts?: OverviewMapControlOptions);
    }

    interface OverviewMapControlOptions {
        anchor?: ControlAnchor;
        offset?: Size;
        size?: Size;
        isOpen?: boolean;
    }

    class MapTypeControl extends Control {
        constructor(opts?: MapTypeControlOptions);
    }

    interface MapTypeControlOptions {
        type?: MapTypeControlType;
        mapTypes?: MapType[];
    }

    enum MapTypeControlType {
        BMAP_MAPTYPE_CONTROL_HORIZONTAL,
        BMAP_MAPTYPE_CONTROL_DROPDOWN,
        BMAP_MAPTYPE_CONTROL_MAP
    }
}

declare const BMAP_ANCHOR_TOP_LEFT: BMap.ControlAnchor.BMAP_ANCHOR_TOP_LEFT;
declare const BMAP_ANCHOR_TOP_RIGHT: BMap.ControlAnchor.BMAP_ANCHOR_TOP_RIGHT;
declare const BMAP_ANCHOR_BOTTOM_LEFT: BMap.ControlAnchor.BMAP_ANCHOR_BOTTOM_LEFT;
declare const BMAP_ANCHOR_BOTTOM_RIGHT: BMap.ControlAnchor.BMAP_ANCHOR_BOTTOM_RIGHT;

declare const BMAP_NAVIGATION_CONTROL_LARGE: BMap.NavigationControlType.BMAP_NAVIGATION_CONTROL_LARGE;
declare const BMAP_NAVIGATION_CONTROL_SMALL: BMap.NavigationControlType.BMAP_NAVIGATION_CONTROL_SMALL;
declare const BMAP_NAVIGATION_CONTROL_PAN: BMap.NavigationControlType.BMAP_NAVIGATION_CONTROL_PAN;
declare const BMAP_NAVIGATION_CONTROL_ZOOM: BMap.NavigationControlType.BMAP_NAVIGATION_CONTROL_ZOOM;

declare const BMAP_MAPTYPE_CONTROL_HORIZONTAL: BMap.MapTypeControlType.BMAP_MAPTYPE_CONTROL_HORIZONTAL;
declare const BMAP_MAPTYPE_CONTROL_DROPDOWN: BMap.MapTypeControlType.BMAP_MAPTYPE_CONTROL_DROPDOWN;
declare const BMAP_MAPTYPE_CONTROL_MAP: BMap.MapTypeControlType.BMAP_MAPTYPE_CONTROL_MAP;
