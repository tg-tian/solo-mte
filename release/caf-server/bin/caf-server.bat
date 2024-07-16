@echo off
rem Licensed to the Apache Software Foundation (ASF) under one or more
rem contributor license agreements.  See the NOTICE file distributed with
rem this work for additional information regarding copyright ownership.
rem The ASF licenses this file to You under the Apache License, Version 2.0
rem (the "License"); you may not use this file except in compliance with
rem the License.  You may obtain a copy of the License at
rem
rem     http://www.apache.org/licenses/LICENSE-2.0
rem
rem Unless required by applicable law or agreed to in writing, software
rem distributed under the License is distributed on an "AS IS" BASIS,
rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
rem See the License for the specific language governing permissions and
rem limitations under the License.

rem ---------------------------------------------------------------------------
rem Start/Stop Script for the CAF Server
rem
rem For supported commands call "caf-server.bat help" or see the usage section
rem towards the end of this file.
rem
rem Environment Variable Prerequisites
rem
rem   Do not set the variables in this script. Instead put them into a script
rem   config.bat in CAF_BASE/bin to keep your customizations separate.
rem
rem   WHEN RUNNING TOMCAT AS A WINDOWS SERVICE:
rem   Note that the environment variables that affect the behavior of this
rem   script will have no effect at all on Windows Services. As such, any
rem   local customizations made in a CAF_BASE/bin/config.bat script
rem   will also have no effect on Tomcat when launched as a Windows Service.
rem   The configuration that controls Windows Services is stored in the Windows
rem   Registry, and is most conveniently maintained using the "tomcat8w.exe"
rem   maintenance utility.
rem
rem   CAF_HOME   May point at your Caf "build" directory.
rem
rem   CAF_BASE   (Optional) Base directory for resolving dynamic portions
rem                   of a Caf installation.  If not present, resolves to
rem                   the same directory that CAF_HOME points to.
rem
rem   CAF_OPTS   (Optional) Java runtime options used when the "start",
rem                   "run" or "debug" command is executed.
rem                   Include here and not in JAVA_OPTS all options, that should
rem                   only be used by Tomcat itself, not by the stop process,
rem                   the version command etc.
rem                   Examples are heap size, GC logging, JMX ports etc.
rem
rem   CAF_TMPDIR (Optional) Directory path location of temporary directory
rem                   the JVM should use (java.io.tmpdir).  Defaults to
rem                   %CAF_BASE%\temp.
rem
rem   JAVA_HOME       Must point at your Java Development Kit installation.
rem                   Required to run the with the "debug" argument.
rem
rem   JRE_HOME        Must point at your Java Runtime installation.
rem                   Defaults to JAVA_HOME if empty. If JRE_HOME and JAVA_HOME
rem                   are both set, JRE_HOME is used.
rem
rem   JAVA_OPTS       (Optional) Java runtime options used when any command
rem                   is executed.
rem                   Include here and not in CAF_OPTS all options, that
rem                   should be used by Tomcat and also by the stop process,
rem                   the version command etc.
rem                   Most options should go into CAF_OPTS.
rem
rem   JAVA_ENDORSED_DIRS (Optional) Lists of of semi-colon separated directories
rem                   containing some jars in order to allow replacement of APIs
rem                   created outside of the JCP (i.e. DOM and SAX from W3C).
rem                   It can also be used to update the XML parser implementation.
rem                   This is only supported for Java <= 8.
rem                   Defaults to $CAF_HOME/endorsed.
rem
rem   JPDA_TRANSPORT  (Optional) JPDA transport used when the "jpda start"
rem                   command is executed. The default is "dt_socket".
rem
rem   JPDA_ADDRESS    (Optional) Java runtime options used when the "jpda start"
rem                   command is executed. The default is localhost:8000.
rem
rem   JPDA_SUSPEND    (Optional) Java runtime options used when the "jpda start"
rem                   command is executed. Specifies whether JVM should suspend
rem                   execution immediately after startup. Default is "n".
rem
rem   JPDA_OPTS       (Optional) Java runtime options used when the "jpda start"
rem                   command is executed. If used, JPDA_TRANSPORT, JPDA_ADDRESS,
rem                   and JPDA_SUSPEND are ignored. Thus, all required jpda
rem                   options MUST be specified. The default is:
rem
rem                   -agentlib:jdwp=transport=%JPDA_TRANSPORT%,
rem                       address=%JPDA_ADDRESS%,server=y,suspend=%JPDA_SUSPEND%
rem
rem   JSSE_OPTS       (Optional) Java runtime options used to control the TLS
rem                   implementation when JSSE is used. Default is:
rem                   "-Djdk.tls.ephemeralDHKeySize=2048"
rem
rem   CATALINA_LOGGING_CONFIG (Optional) Override Tomcat's logging config file
rem                   Example (all one line)
rem                   set CATALINA_LOGGING_CONFIG="-Djava.util.logging.config.file=%CATALINA_BASE%\conf\logging.properties"
rem
rem   LOGGING_CONFIG  Deprecated
rem                   Use CATALINA_LOGGING_CONFIG
rem                   This is only used if CATALINA_LOGGING_CONFIG is not set
rem                   and LOGGING_CONFIG starts with "-D..."
rem
rem
rem   TITLE           (Optional) Specify the title of Tomcat window. The default
rem                   TITLE is Tomcat if it's not specified.
rem                   Example (all one line)
rem                   set TITLE=Tomcat.Cluster#1.Server#1 [%DATE% %TIME%]
rem ---------------------------------------------------------------------------

setlocal

rem Suppress Terminate batch job on CTRL+C
::调整CMD默认格式为utf-8
chcp 65001 > nul

:: Check Eviroment
:: Check Free Memory
for /f "skip=1" %%p in ('wmic os get FreePhysicalMemory') do (
  set /a FREE_MEM=%%p
)
set /a LOW_MEM = 16777216
if %FREE_MEM% LSS %LOW_MEM% (
   echo Warning:  The free memory is: %FREE_MEM% less than %LOW_MEM%
)

@REM if not ""%1"" == ""run"" goto mainEntry
@REM if "%TEMP%" == "" goto mainEntry
@REM if exist "%TEMP%\%~nx0.run" goto mainEntry
@REM echo Y>"%TEMP%\%~nx0.run"
@REM if not exist "%TEMP%\%~nx0.run" goto mainEntry
@REM echo Y>"%TEMP%\%~nx0.Y"
@REM call "%~f0" %* <"%TEMP%\%~nx0.Y"
@REM rem Use provided errorlevel
@REM set RETVAL=%ERRORLEVEL%
@REM del /Q "%TEMP%\%~nx0.Y" >NUL 2>&1
@REM exit /B %RETVAL%

@REM :mainEntry
@REM del /Q "%TEMP%\%~nx0.run" >NUL 2>&1

rem Guess CAF_HOME if not defined
set CURRENT_DIR=%cd%
cd ..
set CAF_HOME=%cd%
cd %CURRENT_DIR%

if exist %CAF_HOME%\bin\caf-server.bat goto okHome
echo The CAF_HOME environment variable is not defined correctly
echo This environment variable is needed to run this program
goto end

:okHome
rem Copy CAF_BASE from CAF_HOME if not defined
set CAF_BASE=%CAF_HOME%
call %CAF_BASE%\bin\config.bat

@REM if not exist %CAF_BASE%\bin\config.bat goto checkConfigHome
@REM call %CAF_BASE%\bin\config.bat
@REM set CAF_SERVER_PATH=server

@REM if not exist %CAF_BASE%\bin\hibernate-selector.bat goto end
@REM if exist then execute hibernate-selector.bat
@REM set HBN_TOOL=%CAF_BASE%\bin\hibernate-selector.bat
@REM if exist %HBN_TOOL% (
@REM 	call %HBN_TOOL% %*
@REM ) else (
@REM     echo Error:    Cannot find %CAF_BASE%\bin\hibernate-selector.bat. This file is needed to run this program
@REM     goto end
@REM )

@REM CAF-specific configuration
set CLASSPATH=
set CAF_BOOTSTRAP=%CAF_HOME%\%CAF_SERVER_PATH%\runtime\caf-bootstrap.jar
set CAF_BOOTSTRAP_LANUCHER=org.springframework.boot.loader.PropertiesLauncher
set CAF_MODULE_PATHS="%CAF_HOME%\%CAF_SERVER_PATH%\runtime\3rd","%CAF_HOME%\%CAF_SERVER_PATH%\runtime\libs"
set CAF_BOOT_CONFIG_PATH=%CAF_HOME%/%CAF_SERVER_PATH%/runtime/
set JAVA_OPTS=%JAVA_OPTS% -Dparallel.startup=%CAF_PARALLEL_INIT%

:: Total Memory Size
set /a totalMem=16777216+1
for /f "skip=1" %%i in ('wmic os get TotalVisibleMemorySize') do (
    if %%i geq 0 set totalMem=%%i
)

set /a "memorySize=%totalMem%/1024"
::if total size less than 16G,then XmxSize=totalSize*6/10
set /a "totalMem=%memorySize%/10*6"
set XmxSize=%totalMem%M
if not defined CAF_MEM_OPTS (
  if %memorySize% leq 16384 set CAF_MEM_OPTS=-Xmx%XmxSize%
)


if exist %CAF_HOME%\bin\java-home.bat goto okjava-home
echo Cannot find %CAF_HOME%\bin\java-home.bat
echo This file is needed to run this program
goto end

:okjava-home
call %CAF_HOME%\bin\java-home.bat %1
if errorlevel 1 goto end

rem Add on extra jar file to CLASSPATH
rem Note that there are no quotes as we do not want to introduce random
rem quotes into the CLASSPATH
if "%CLASSPATH%" == """" goto emptyClasspath
@REM set "CLASSPATH=%CLASSPATH%;"

:emptyClasspath
set CLASSPATH=%CLASSPATH%;%CAF_HOME%\%CAF_SERVER_PATH%\runtime\caf-bootstrap.jar
if "%CAF_TMPDIR%" == """" goto gotTmpdir

:gotTmpdir
rem Add tomcat-juli.jar to classpath
rem tomcat-juli.jar can be over-ridden per instance
rem if not exist "%CAF_BASE%\bin\tomcat-juli.jar" goto juliClasspathHome
rem set "CLASSPATH=%CLASSPATH%;%CAF_BASE%\bin\tomcat-juli.jar"
rem goto juliClasspathDone
rem :juliClasspathHome
rem set "CLASSPATH=%CLASSPATH%;%CAF_HOME%\bin\tomcat-juli.jar"
rem :juliClasspathDone
@REM set "JSSE_OPTS=-Djdk.tls.ephemeralDHKeySize=2048"
@REM set "JSSE_OPTS=-Djdk.tls.ephemeralDHKeySize=2048"
set CAF_TMPDIR=%CAF_BASE%\temp
if not "%JSSE_OPTS%" == """" goto gotJsseOpts
set JSSE_OPTS=-Djdk.tls.ephemeralDHKeySize=2048
:gotJsseOpts
set JAVA_OPTS=%JAVA_OPTS% %JSSE_OPTS%
rem Register custom URL handlers
rem Do this here so custom URL handles (specifically 'war:...') can be used in the security policy
set JAVA_OPTS=%JAVA_OPTS% -Djava.protocol.handler.pkgs=org.apache.caf.webresources
goto noJuliManager

rem Check for the deprecated LOGGING_CONFIG
rem Only use it if CATALINA_LOGGING_CONFIG is not set and LOGGING_CONFIG starts with "-D..."
rem if not "%LOGGING_CONFIG:~0,2%"=="-D" goto noLoggingDeprecation
rem if not "%CATALINA_LOGGING_CONFIG%" == "" goto noLoggingDeprecation
rem set "CATALINA_LOGGING_CONFIG=%LOGGING_CONFIG%"
rem :noLoggingDeprecation

rem if not "%CATALINA_LOGGING_CONFIG%" == "" goto noJuliConfig
rem set CATALINA_LOGGING_CONFIG=-Dnop
rem if not exist "%CATALINA_BASE%\conf\logging.properties" goto noJuliConfig
rem set CATALINA_LOGGING_CONFIG=-Djava.util.logging.config.file="%CATALINA_BASE%\conf\logging.properties"
rem :noJuliConfig

REM if  "%LOGGING_MANAGER%" == "" goto noJuliManager
rem set LOGGING_MANAGER=-Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager

:noJuliManager
rem Configure JAVA 9 specific start-up parameters
set "JDK_JAVA_OPTIONS=%JDK_JAVA_OPTIONS% --add-opens=java.base/java.lang=ALL-UNNAMED"
set "JDK_JAVA_OPTIONS=%JDK_JAVA_OPTIONS% --add-opens=java.base/java.io=ALL-UNNAMED"
set "JDK_JAVA_OPTIONS=%JDK_JAVA_OPTIONS% --add-opens=java.base/java.util=ALL-UNNAMED"
set "JDK_JAVA_OPTIONS=%JDK_JAVA_OPTIONS% --add-opens=java.base/java.util.concurrent=ALL-UNNAMED"
set "JDK_JAVA_OPTIONS=%JDK_JAVA_OPTIONS% --add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED"

rem Java 9 no longer supports the java.endorsed.dirs
rem system property. Only try to use it if
rem JAVA_ENDORSED_DIRS was explicitly set
rem or CAF_HOME/endorsed exists.
set ENDORSED_PROP=ignore.endorsed.dirs
if "%JAVA_ENDORSED_DIRS%" == """" goto noEndorsedVar
set ENDORSED_PROP=java.endorsed.dirs
goto doneEndorsed
:noEndorsedVar
if not exist %CAF_HOME%\endorsed goto doneEndorsed
set ENDORSED_PROP=java.endorsed.dirs
:doneEndorsed
rem ----- Execute The Requested Command ---------------------------------------

echo Using CAF_BASE:            %CAF_BASE%
echo Using CAF_HOME:            %CAF_HOME%
echo Using CAF_TMPDIR:          %CAF_TMPDIR%
echo Using CLASSPATH:           %CLASSPATH%
rem if ""%1"" == ""debug"" goto use_jdk
rem goto java_dir_displayed
rem :use_jdk
rem echo Using JAVA_HOME:           %JAVA_HOME%
rem :java_dir_displayed
rem echo Using JVM_MEM_SIZE:    "%CAF_MEM_OPTS%"

@REM set _EXECJAVA=%_RUNJAVA%

set MAINCLASS=%CAF_BOOTSTRAP_LANUCHER% --spring.config.location=%CAF_BOOT_CONFIG_PATH%
set ACTION=start
set SECURITY_POLICY_FILE=
set DEBUG_OPTS=
set JPDA=
set DEBUG_PORT="5005"

@REM if not ""%1"" == ""jpda"" goto noJpda
@REM set JPDA=jpda
@REM if not %JPDA_TRANSPORT% == "" goto gotJpdaTransport
@REM set JPDA_TRANSPORT=dt_socket
@REM :gotJpdaTransport
@REM if not %JPDA_ADDRESS% == "" goto gotJpdaAddress
@REM set JPDA_ADDRESS=5005
@REM :gotJpdaAddress
@REM if not %JPDA_SUSPEND% == "" goto gotJpdaSuspend
@REM set JPDA_SUSPEND=n
@REM :gotJpdaSuspend
@REM if not %JPDA_OPTS% == "" goto gotJpdaOpts
@REM set JPDA_OPTS=-agentlib:jdwp=transport=%JPDA_TRANSPORT%,address=%JPDA_ADDRESS%,server=y,suspend=%JPDA_SUSPEND%
@REM :gotJpdaOpts
@REM shift
@REM :noJpda
if ""%1"" == ""debug"" goto doDebug
if ""%1"" == ""run"" goto doRun
if ""%1"" == ""start"" goto doStart
if ""%1"" == ""stop"" goto doStop
rem if ""%1"" == ""configtest"" goto doConfigTest
rem if ""%1"" == ""version"" goto doVersion

echo Usage:  caf ( commands ... )
echo commands:
echo   debug             Start CAF in a debugger
echo   debug -remote     Start CAF Server with a remote debugger
rem echo   jpda start        Start Caf under JPDA debugger
echo   run               Start CAF in the current window
rem echo   run -security     Start in the current window with security manager
echo   start             Start CAF in a separate window
rem echo   start -security   Start in a separate window with security manager
echo   stop              Stop CAF Server, waiting up to 5 (by default) seconds for the process to end
echo   stop n            Stop CAF Server, waiting up to n seconds for the process to end
echo   stop -force       Stop CAF Server, wait up to 5 (by default) seconds and then use taskkill if still running
echo   stop n -force     Stop CAF Server, wait up to n seconds and then use taskkill if still running
REM echo   version           What version of tomcat are you running?
goto end


:doDebug
shift
set _EXECJAVA=%_RUNJDB%
set DEBUG_OPTS=-sourcepath "%CAF_HOME%\..\..\java"
goto execDebugCmd

:execDebugCmd
rem Get remaining unshifted command line arguments and save them in the
set CMD_LINE_ARGS=
:setDebugArgs
if ""%1""=="""" ( 
    goto doneDebugSetArgs
)^
else if ""%1""==""-remote"" ( 
    goto doneRemote 
) 


rem set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
shift
goto setDebugArgs


:doneDebugSetArgs
"%JAVA_HOME%/bin/java" %CAF_OPTS% 9 -Djava.io.tmpdir=%CAF_TMPDIR% -Dloader.path=%CAF_MODULE_PATHS% -Dfile.encoding=UTF-8 %JAVA_OPTS% -Dserver.runtime.path.name=%CAF_SERVER_PATH% %CAF_MEM_OPTS% -Dspring.profiles.active=dev -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=%DEBUG_PORT% -classpath %CLASSPATH% %MAINCLASS%
@REM %CMD_LINE_ARGS%
goto end


:doneRemote
"%JAVA_HOME%/bin/java" %CAF_OPTS% -server -Djava.io.tmpdir=%CAF_TMPDIR% -Dloader.path=%CAF_MODULE_PATHS% -Dfile.encoding=UTF-8 %JAVA_OPTS% -Dserver.runtime.path.name=%CAF_SERVER_PATH% %CAF_MEM_OPTS% -Dspring.profiles.active=dev -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=%DEBUG_PORT% -classpath %CLASSPATH% %MAINCLASS%
@REM %CMD_LINE_ARGS% %ACTION% 
goto end


:doRun
shift
if not ""%1"" == ""-security"" goto execRunCmd
shift
echo Using Security Manager
set "SECURITY_POLICY_FILE=%CAF_BASE%\conf\caf.policy"
goto execRunCmd


:execRunCmd
rem Get remaining unshifted command line arguments and save them in the
set CMD_LINE_ARGS=

:setRunArgs
if ""%1""=="""" goto doneRunSetArgs
set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
shift
goto setRunArgs


:doneRunSetArgs
rem Execute Java with the applicable properties
"%JAVA_HOME%/bin/java" %CAF_OPTS% -server -Djava.io.tmpdir=%CAF_TMPDIR% -Dloader.path=%CAF_MODULE_PATHS% -Dfile.encoding=UTF-8 %JAVA_OPTS% -Dserver.runtime.path.name=%CAF_SERVER_PATH% %CAF_MEM_OPTS% -Dspring.profiles.active=prod -classpath %CLASSPATH% %MAINCLASS%
@REM  %CMD_LINE_ARGS% %ACTION% 
goto end

:doStart
shift
if "%TITLE%" == """" set TITLE=iGIX Server
set _EXECJAVA=start "%TITLE%" cmd /k
if not ""%1"" == ""-security"" goto execStartCmd
shift
echo Using Security Manager
set "SECURITY_POLICY_FILE=%CAF_BASE%\conf\caf.policy"
goto execStartCmd

:execStartCmd
rem Get remaining unshifted command line arguments and save them in the
set CMD_LINE_ARGS=
:setStartArgs
if ""%1""=="""" goto doneSetStartArgs
set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
shift
goto setStartArgs


:doneSetStartArgs
REM start "Caf" %JAVA_HOME%/bin/java
%_EXECJAVA% "chcp 65001 > nul && %_RUNJAVA% %CAF_OPTS% -server -Djava.io.tmpdir=%CAF_TMPDIR% -Dloader.path=%CAF_MODULE_PATHS% -Dfile.encoding=UTF-8 %JAVA_OPTS% -Dserver.runtime.path.name=%CAF_SERVER_PATH% %CAF_MEM_OPTS% -Dspring.profiles.active=prod -classpath %CLASSPATH% %MAINCLASS% %CMD_LINE_ARGS%"
goto end

:doStop
shift
set ACTION=stop
set CAF_OPTS=
@REM goto execStopCmd
@REM :execStopCmd
set CMD_LINE_ARGS=
:setStopArgs
if ""%1""=="""" ( 
    goto doneStopSetArgs
)^
else if ""%1""==""-force"" ( 
    set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
    goto doneStopNow 
) ^
else (
    set CAF_STOP_GRACE_PERIOD=%1
    set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
    
    if ""%2""=="""" (
        set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
        goto doneStopSetArgs
    )   
    if ""%2""==""-force""  (
        set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
        goto doneStopNow 
    ) 
)

@REM shift
@REM goto setStopArgs


:doneStopSetArgs
@REM 先拿进程号，优雅停机完毕后，杀掉进程
for /f "tokens=5" %%i in ('netstat -ano^|findstr ":%CAF_PORT%"') do ( set pid1=%%i )
if %CAF_STOP_GRACE_PERIOD% GEQ 0 (
curl -H "Content-Type:application/json" -X POST http://localhost:%CAF_PORT%/api/runtime/sys/v1.0/bootstrap/cafshutdown
)
:doneStop
@REM if "%pid1%" == "" (
@REM     echo "CAF stopped."
@REM     goto end
@REM )^
@REM else if %pid1% EQU 0 (
@REM     echo "CAF stopped."
@REM     goto end
@REM )^
@REM else (
    TIMEOUT /T 1 > NUL
@REM )
set /a CAF_STOP_GRACE_PERIOD=%CAF_STOP_GRACE_PERIOD% - 1
if %CAF_STOP_GRACE_PERIOD% GTR 0 (
    goto doneStop
)

if %CAF_STOP_GRACE_PERIOD% == 0 (
    @REM 关闭后通过端口校验pid是否还存在，不存在标识关闭成功
    for /f "tokens=5" %%i in ('netstat -ano^|findstr ":%CAF_PORT%"') do ( set checkpid1=%%i )
    if "%checkpid1%" == "" (
        @REM taskkill /PID %pid1%
        echo %TITLE%" stopped graceful"
        goto end
    )
    else if %checkpid1% EQU 0 (
        @REM taskkill /PID %pid1%
        echo %TITLE%" stopped graceful"
        goto end
    )
    else (
        echo %TITLE%" did not stop in time"
        echo "yan can kill the process id:"%checkpid1% "to stop it"
        goto end
    )
)
goto end

:doneStopNow
echo doneStopNow
for /f "tokens=5" %%i in ('netstat -ano^|findstr ":%CAF_PORT%"') do ( set pid2=%%i )
if %CAF_STOP_GRACE_PERIOD% GEQ 0 (
curl -H "Content-Type:application/json" -X POST http://localhost:%CAF_PORT%/api/runtime/sys/v1.0/bootstrap/cafshutdown
)

:doneStop2
@REM if "%pid2%" == "" (
@REM     echo %TITLE%" stopped"
@REM     goto end
@REM )^
@REM else if %pid2% EQU 0 (
@REM     echo %TITLE%" stopped"
@REM     goto end
@REM )^
@REM else (
    TIMEOUT /T 1 > NUL
@REM )
echo "系统%CAF_STOP_GRACE_PERIOD%s后关闭"
set /a CAF_STOP_GRACE_PERIOD=%CAF_STOP_GRACE_PERIOD%-1
if %CAF_STOP_GRACE_PERIOD% GTR 0 (
    goto doneStop2
)

if %CAF_STOP_GRACE_PERIOD% == 0 (
    @REM 关闭后通过端口校验pid是否还存在，不存在标识关闭成功
    for /f "tokens=5" %%i in ('netstat -ano^|findstr ":%CAF_PORT%"') do ( set checkpid2=%%i )
    
    if "%checkpid2%" == "" (
        taskkill /t /f /pid %pid2%
        echo %TITLE%" stopped graceful and force"
        goto end
    )
    else if %checkpid2% == 0 (
        taskkill /t /f /pid %pid2%
        echo %TITLE%" stopped graceful and force"
        goto end
    )
    else (
        taskkill /t /f /pid %pid2%
        echo %TITLE%" did not stop in time."
        echo %TITLE%" stopped by force"
        goto end
    )
)
goto end

:end
