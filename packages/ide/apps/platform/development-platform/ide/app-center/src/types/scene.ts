export interface PolygonPoint {
  x: number
  y: number
}

export interface Scene {
  id: number
  domainId: number
  name: string
  description: string
  createTime: string
  updateTime: string
  deviceCount: number
  status: '1' | '0'
  url: string
  imageUrl?: string
  location?: {
    lng?: number
    lat?: number
  }
  polygon?: PolygonPoint[] | null
}

export interface Area {
  id: number
  name: string
  image: string | null
  description: string
  polygon: PolygonPoint[] | null
  parentId: number | null
  children: Area[]
}

export interface AreaPolygonInfo {
  id: string
  name: string
  polygon: PolygonPoint[]
  color?: string
}
