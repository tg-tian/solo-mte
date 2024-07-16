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
rem Set JAVA_HOME or JRE_HOME if not already set, ensure any provided settings
rem are valid and consistent with the selected start-up options and set up the
rem endorsed directory.
rem ---------------------------------------------------------------------------

rem Make sure prerequisite environment variables are set

set "CURRENT_DIR=%cd%"
cd ..
set "CURRENT_DIR=%cd%"

set EMBD_JDK=%CAF_HOME%/%CAF_SERVER_PATH%/runtime/java/%PROCESSOR_ARCHITECTURE%-win

@REM 优先以config.sh里的配置来，2.用盘里的，3.环境变量自带
if exist %EMBD_JDK%\bin\java goto useEmbdJDK
:useEmbdJDK
set JAVA_HOME=%EMBD_JDK%
echo CAF embedded JDK(%JAVA_HOME%) detected (arch: %PROCESSOR_ARCHITECTURE%), use it as default Java runtime.

rem In debug mode we need a real JDK (JAVA_HOME)
if ""%1"" == ""debug"" goto needJavaHome

rem Otherwise either JRE or JDK are fine
if not "%JRE_HOME%" == "" goto gotJreHome
if not "%JAVA_HOME%" == "" goto gotJavaHome
echo Neither the JAVA_HOME nor the JRE_HOME environment variable is defined
echo At least one of these environment variable is needed to run this program
goto exit

:needJavaHome
rem Check if we have a usable JDK
if "%JAVA_HOME%" == "" goto noJavaHome
if not exist "%JAVA_HOME%\bin\java.exe" goto noJavaHome
if not exist "%JAVA_HOME%\bin\jdb.exe" goto noJavaHome
if not exist "%JAVA_HOME%\bin\javac.exe" goto noJavaHome
set "JRE_HOME=%JAVA_HOME%"
goto okJava

:noJavaHome
echo The JAVA_HOME environment variable is not defined correctly.
echo It is needed to run this program in debug mode.
echo NB: JAVA_HOME should point to a JDK not a JRE.
goto exit

:gotJavaHome
rem No JRE given, use JAVA_HOME as JRE_HOME
set "JRE_HOME=%JAVA_HOME%"

:gotJreHome
rem Check if we have a usable JRE
if not exist "%JRE_HOME%\bin\java.exe" goto noJreHome
goto okJava

:noJreHome
rem Needed at least a JRE
echo The JRE_HOME environment variable is not defined correctly
echo This environment variable is needed to run this program
goto exit

:okJava
rem Don't override the endorsed dir if the user has set it previously
if not "%JAVA_ENDORSED_DIRS%" == "" goto gotEndorseddir
rem Java 9 no longer supports the java.endorsed.dirs
rem system property. Only try to use it if
rem CAF_HOME/endorsed exists.
if not exist "%CAF_HOME%\endorsed" goto gotEndorseddir
set "JAVA_ENDORSED_DIRS=%CAF_HOME%\endorsed"
:gotEndorseddir

rem Don't override _RUNJAVA if the user has set it previously
if not "%_RUNJAVA%" == "" goto gotRunJava
rem Set standard command for invoking Java.
rem Also note the quoting as JRE_HOME may contain spaces.
set _RUNJAVA=%JRE_HOME%\bin\java.exe
:gotRunJava

rem Don't override _RUNJDB if the user has set it previously
rem Also note the quoting as JAVA_HOME may contain spaces.
if not "%_RUNJDB%" == "" goto gotRunJdb
shift
if ""%1"" == ""-remote"" ( 
    set _RUNJDB="%JAVA_HOME%\bin\java.exe" 
) ^
else (
    set _RUNJDB="%JAVA_HOME%\bin\jdb.exe"
)
goto setServerHome
:setServerHome

rem export arch and JAVA_HOME and iGIX Sever Home
set PROCESSOR_ARCHITECTURE=%PROCESSOR_ARCHITECTURE%
rem echo PROCESSOR_ARCHITECTURE:  "%PROCESSOR_ARCHITECTURE%"
set JAVA_HOME=%JAVA_HOME%
rem echo JAVA_HOME:   "%JAVA_HOME%
set IGIX_SERVER_HOME=%CAF_HOME%\%CAF_SERVER_PATH%
rem echo IGIX_SERVER_HOME:   "%IGIX_SERVER_HOME%"
goto end 
:gotRunJdb

goto end

:exit
exit /b 1

:end
exit /b 0
