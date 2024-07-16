@REM @echo off
@REM rem Licensed to the Apache Software Foundation (ASF) under one or more
@REM rem contributor license agreements.  See the NOTICE file distributed with
@REM rem this work for additional information regarding copyright ownership.
@REM rem The ASF licenses this file to You under the Apache License, Version 2.0
@REM rem (the "License"); you may not use this file except in compliance with
@REM rem the License.  You may obtain a copy of the License at
@REM rem
@REM rem     http://www.apache.org/licenses/LICENSE-2.0
@REM rem
@REM rem Unless required by applicable law or agreed to in writing, software
@REM rem distributed under the License is distributed on an "AS IS" BASIS,
@REM rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@REM rem See the License for the specific language governing permissions and
@REM rem limitations under the License.

@REM rem ---------------------------------------------------------------------------
@REM rem Stop script for the CAF Server
@REM rem ---------------------------------------------------------------------------

@REM setlocal

@REM rem Guess CAF_HOME if not defined
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

call "caf-server.bat" stop -force
pause
@REM :end
