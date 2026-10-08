## 1. Service Layer

- [x] 1.1 Create `src/services/app-delete.service.tsx` with `deleteBusinessObject(boId: string): Promise<boolean>` method (calls `DELETE /api/runtime/sys/v1.0/business-objects/{boId}`)
- [x] 1.2 Add `deleteApp(path: string, boId: string): Promise<boolean>` method to `app-delete.service.tsx` (calls `POST /solo-mte-publish/delete-app`)

## 2. Styles

- [x] 2.1 Add CSS for app domain hover delete icon (`.f-admin-app-domain .panel-item-tool .f-delete-icon` with `opacity: 0`, `:hover` → `opacity: 1`)
- [x] 2.2 Add CSS for module hover delete icon (`.f-admin-app-module-list-item .f-module-delete-icon` with `opacity: 0`, `:hover` → `opacity: 1`)
- [x] 2.3 Add CSS for disabled delete icon state (reduced opacity, `cursor: not-allowed`, `pointer-events: none`)
- [x] 2.4 Add CSS for popover group section header (bold, 12px, padding) and divider (light gray, 1px)
- [x] 2.5 Add CSS for danger menu item (red color `#f56c6c`, red hover background)

## 3. Popover & App Card Changes

- [x] 3.1 Change `...` button aria-label from "GIT 操作" to "更多操作"
- [x] 3.2 Restructure `renderGitPopover` to render two groups: "GIT操作" (dynamic git operations) and "危险操作" (static "删除应用")
- [x] 3.3 Add group section headers (bold text) and dividers (light gray `<hr>`) between groups
- [x] 3.4 Implement `handleAppDeleteClick` to close popover and show delete-confirmation dialog
- [x] 3.5 Render confirmation dialog with name-input validation (input must match `appObject.name`)
- [x] 3.6 Wire "确认删除" button to call `app-delete.service.tsx.deleteApp()`, then refresh app list and publish status on completion

## 4. Tree Node Delete Icons (Left Panel)

- [x] 4.1 Add `toolbar` slot to `FAccordionItem` in `renderAppDomainNavigation` rendering `f-icon-delete` with hover visibility via CSS
- [x] 4.2 Set delete icon disabled state when app domain has modules (`appDomain.modules.length > 0`) with `title` tooltip
- [x] 4.3 Handle click on enabled delete icon: show confirmation dialog for app domain deletion
- [x] 4.4 Add `f-icon-delete` to each module item in `renderAppModule`, with hover visibility via CSS
- [x] 4.5 Set delete icon disabled state when module has apps (`item.apps.length > 0`) with `title` tooltip
- [x] 4.6 Handle click on enabled module delete icon: show confirmation dialog for module deletion
- [x] 4.7 Implement confirmation dialog for app domain / module (plain cancel/confirm, no name input)
- [x] 4.8 Wire confirm to call `app-delete.service.tsx.deleteBusinessObject()`, then refresh app domain tree

## 5. Verification

- [x] 5.1 Verify delete app domain: hover icon appears, disabled with tooltip when has modules, confirmation dialog works, API called correctly, data refreshes
- [x] 5.2 Verify delete module: hover icon appears, disabled with tooltip when has apps, confirmation dialog works, API called correctly, data refreshes
- [x] 5.3 Verify delete app: popover grouping renders correctly, confirmation requires name match, name validation works in handler, API called with correct path/boId, data refreshes
