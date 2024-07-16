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
rem Start script for the CAF Server
rem ---------------------------------------------------------------------------

@REM setlocal

@REM rem Guess CAF_HOME if not defined
@REM @REM chcp 65001 > nul
@REM set "CURRENT_DIR=%cd%"
@REM if not "%CAF_HOME%" == "" goto gotHome
@REM set "CAF_HOME=%CURRENT_DIR%"
@REM if exist "%CAF_HOME%\bin\caf-server.bat" goto okHome
@REM cd ..
@REM set "CAF_HOME=%cd%"
@REM cd "%CURRENT_DIR%"
@REM :gotHome
@REM if exist "%CAF_HOME%\bin\caf-server.bat" goto okHome
@REM echo The CAF_HOME environment variable is not defined correctly
@REM echo This environment variable is needed to run this program
@REM goto end
@REM :okHome

@REM set "EXECUTABLE=%CAF_HOME%\bin\caf-server.bat"

@REM rem Check that target executable exists
@REM if exist "%EXECUTABLE%" goto okExec
@REM echo Cannot find "%EXECUTABLE%"
@REM echo This file is needed to run this program
@REM goto end
@REM :okExec

@REM rem Get remaining unshifted command line arguments and save them in the
@REM set CMD_LINE_ARGS=
@REM :setArgs
@REM if ""%1""=="""" goto doneSetArgs
@REM set CMD_LINE_ARGS=%CMD_LINE_ARGS% %1
@REM shift
@REM goto setArgs
@REM :doneSetArgs

@REM call "%EXECUTABLE%" start %CMD_LINE_ARGS%
@REM chcp 65001 > nul
@REM call "caf-server.bat" run

set "CURRENT_DIR=%cd%"
set "EXECUTABLE=caf-server.bat"

rem Check that target executable exists
chcp 65001 > nul
if exist "%EXECUTABLE%" (
    call "caf-server.bat" run %*
) else (
    if exist "%CURRENT_DIR%\bin\%EXECUTABLE%" (
        cd ".\bin"
        call "caf-server.bat" run %*
    ) else (
        echo Cannot find "%EXECUTABLE%"
        echo This file is needed to run this program
    )
)

@REM :end
