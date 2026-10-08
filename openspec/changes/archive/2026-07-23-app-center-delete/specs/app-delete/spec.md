## ADDED Requirements

### Requirement: Delete App Domain

The system SHALL allow users to delete an app domain (应用域) when it has no child modules.

#### Scenario: Delete empty app domain with confirmation

- **WHEN** user hovers over an app domain that has no modules, clicks the delete icon, and confirms the deletion dialog
- **THEN** the system sends `DELETE /api/runtime/sys/v1.0/business-objects/{boId}` and refreshes the app domain tree upon success or failure

#### Scenario: App domain with children shows disabled delete icon

- **WHEN** user hovers over an app domain that has one or more modules
- **THEN** the delete icon is displayed with a disabled style (reduced opacity, no pointer events) and a tooltip indicating "请先删除所有子模块后再删除应用域"

#### Scenario: Delete app domain confirmation dialog

- **WHEN** user clicks the delete icon on an empty app domain
- **THEN** a modal dialog is displayed with a warning icon, message "您即将删除应用域「{name}」。这是永久性操作且不可撤销。", a cancel button, and a red confirm button labeled "确认删除"

#### Scenario: Delete app domain fails

- **WHEN** the delete API returns an error (e.g., 500 with a Message field)
- **THEN** the system displays an error notification with the API's Message content and refreshes the data

### Requirement: Delete Module

The system SHALL allow users to delete a module (模块) when it has no child apps.

#### Scenario: Delete empty module with confirmation

- **WHEN** user hovers over a module that has no apps, clicks the delete icon, and confirms the deletion dialog
- **THEN** the system sends `DELETE /api/runtime/sys/v1.0/business-objects/{boId}` and refreshes the app domain tree upon success or failure

#### Scenario: Module with children shows disabled delete icon

- **WHEN** user hovers over a module that has one or more apps
- **THEN** the delete icon is displayed with a disabled style (reduced opacity, no pointer events) and a tooltip indicating "请先删除所有应用后再删除模块"

#### Scenario: Delete module confirmation dialog

- **WHEN** user clicks the delete icon on an empty module
- **THEN** a modal dialog is displayed with a warning icon, message "您即将删除模块「{name}」。这是永久性操作且不可撤销。", a cancel button, and a red confirm button labeled "确认删除"

#### Scenario: Delete module fails

- **WHEN** the delete API returns an error
- **THEN** the system displays an error notification and refreshes the data

### Requirement: Delete App

The system SHALL allow users to delete an app (应用) with name-input confirmation.

#### Scenario: Delete app entry point in popover

- **WHEN** user clicks the "..." button on an app card
- **THEN** a popover is displayed with a "GIT操作" group (dynamic git operations), a divider, and a "危险操作" group containing a red "删除应用" item with `f-icon-delete` icon

#### Scenario: Delete app confirmation dialog requires name input

- **WHEN** user clicks "删除应用" in the popover
- **THEN** a modal dialog is displayed with a warning icon, message "您即将删除应用「{name}」。这是永久性操作，所有工程文件、菜单数据和部署产物都将被删除。", a text input labeled "请输入应用名称以确认", a cancel button, and a red confirm button labeled "确认删除"

#### Scenario: Delete app confirm button disabled without matching name

- **WHEN** the delete app confirmation dialog is open AND the text input value does not match the app name exactly
- **THEN** the "确认删除" button is disabled

#### Scenario: Delete app confirm button enabled with matching name

- **WHEN** the delete app confirmation dialog is open AND the text input value matches the app name exactly
- **THEN** the "确认删除" button is enabled

#### Scenario: Delete app executes on confirm

- **WHEN** user enters the correct app name and clicks "确认删除"
- **THEN** the system calls `POST /solo-mte-publish/delete-app { path, boId }` and refreshes both the app list and publish status upon success or failure

#### Scenario: Delete app fails

- **WHEN** the delete-app API returns an error
- **THEN** the system displays an error notification with the API's error message and refreshes the data

### Requirement: Tree Node Hover Delete Icon

The system SHALL display delete icons on app domain and module tree nodes on hover.

#### Scenario: Delete icon appears on app domain hover

- **WHEN** user hovers the mouse over an app domain header in the accordion
- **THEN** a delete icon (`f-icon-delete`) appears in the header toolbar area

#### Scenario: Delete icon appears on module hover

- **WHEN** user hovers the mouse over a module item in the module list
- **THEN** a delete icon (`f-icon-delete`) appears within the module item

#### Scenario: Delete icon hidden when not hovering

- **WHEN** user moves the mouse away from an app domain header or module item
- **THEN** the delete icon disappears (returns to opacity 0)

### Requirement: Independent Delete Service

All delete API calls SHALL be encapsulated in an independent service module separate from GitService.

#### Scenario: Delete service module

- **WHEN** a delete operation is triggered
- **THEN** the delete logic is handled by `app-delete.service.tsx`, not by `git.service.tsx`
