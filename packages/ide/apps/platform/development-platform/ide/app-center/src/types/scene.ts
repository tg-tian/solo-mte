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
}

export interface Area {
  id: number
  name: string
  image: string | null
  description: string
  position: string
  parentId: number | null
  children: Area[]
}
