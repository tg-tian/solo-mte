import type { Device as BaseDevice } from '@tgapk/lowcode-common/device'
import type { ProviderConfig } from '@tgapk/lowcode-common/provider-config'
import type { DeviceCommand } from '@tgapk/lowcode-common/device-command'
import type { WsMessage } from '@tgapk/lowcode-common/ws-message'
import type { Area } from './scene'

export type Device = BaseDevice & {
  area?: Area | null
}

export type { ProviderConfig, DeviceCommand, WsMessage }
