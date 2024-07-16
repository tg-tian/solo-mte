@echo off
title iGIX Server

::Optional values: prod|dev. 
::prod:Production Environment; dev:Development Environment, Remote debugging is enabled. See the SERVER_MODE parameter
set SERVER_MODE=prod
::Optional values: true|false. true:logs are printed on the console; false:Logs are not printed at the console.
if {%SERVER_MODE%}=={prod} (
  set ENABLE_CONSOLE_LOGGING=false
) else (
  set ENABLE_CONSOLE_LOGGING=true
)

::The default value of IGIX_SERVER_PATH is SERVER. You can change it to another directory name, you should keep the following variable value matching with the actual directory name. Jstack is compatible with the old version, please ignore it.
set IGIX_SERVER_PATH=server
set IGIX_SERVER_HOME=%~dp0%IGIX_SERVER_PATH%
REM if not exist "%IGIX_SERVER_HOME%" (
REM   set IGIX_SERVER_PATH=jstack
REM   set IGIX_SERVER_HOME=%~dp0jstack
REM )

::The following JAVA_HOME points to the IGIX JDK by default; If system environment variables are used, comment out the following line; For JDKs in other locations, change the following JAVA_HOME value.
set JAVA_HOME=%IGIX_SERVER_HOME%\runtime\java\%PROCESSOR_ARCHITECTURE%-win

::JVM_MEMORY_OPTS is used to specify the memory parameters that the Java virtual machine can use. By default, the appropriate memory is automatically calculated based on the physical machine environment. If you need to specify a fixed value, uncomment the downward comment and change the corresponding value
REM set JVM_MEMORY_OPTS=-Xmx3350M

::Change the following line to adjust the JVM debugging parameters
if not defined DEBUG_PORT (
  set DEBUG_PORT=5005
)
REM set JVM_DEBUG_OPTS=-Dspring.profiles.active=dev -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=%DEBUG_PORT%
set JVM_DEBUG_OPTS=-Dspring.profiles.active=prod

if not exist "%JAVA_HOME%" (
    echo Invalid JAVA_HOME Path: "%JAVA_HOME%"
	pause
	exit
)
REM echo JAVA_HOME: %JAVA_HOME%
REM echo IGIX_SERVER_HOME: %IGIX_SERVER_HOME%

@setlocal enabledelayedexpansion
for /r "%IGIX_SERVER_HOME%\runtime\" %%k in (caf-bootstrap*.jar) do  (
    @set CAF_BOOTSTRAP="%%k"
)

::CAF_Runtime
@set CAF_MODULE_PATHS="%IGIX_SERVER_HOME%\runtime\3rd","%IGIX_SERVER_HOME%\runtime\libs"

:: Total Memory Size
set /a totalMem=16777216+1
for /f "skip=1" %%i in ('wmic os get TotalVisibleMemorySize') do (
    if %%i geq 0 set totalMem=%%i
)

set /a memorySize=%totalMem%/1024
::if total size less than 16G,then XmxSize=totalSize*6/10
set /a totalMem=%memorySize%/10*6
set XmxSize=%totalMem%M
if not defined JVM_MEM_OPTS (
  if %memorySize% leq 16384 set JVM_MEM_OPTS=-Xmx%XmxSize%
)

if {%SERVER_MODE%}=={dev} (
  set JVM_DEBUG_OPTS=-Dspring.profiles.active=dev -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=%DEBUG_PORT%
)

"%JAVA_HOME%\bin\java" %CAF_OPS% -server -Dspring.security.enabled=false -Dcom.bes.enterprise.licenseDir="%IGIX_SERVER_HOME%/runtime/" -Dloader.path=%CAF_MODULE_PATHS% -Dparallel.startup=true -Dserver.runtime.path.name=%IGIX_SERVER_PATH% %JVM_MEM_OPTS% %JVM_DEBUG_OPTS% -jar %CAF_BOOTSTRAP% --spring.config.location="%IGIX_SERVER_HOME%/runtime/" %serverport%
pause