@echo off

rem Java Development Kit home path (Optional)
rem Special Notice:
rem   1. JRE is NOT supported for now, which may cause some functions to be unavailable.
rem   2. Please do NOT change the default blank value unless you need to specify a dedicated JDK.
rem set JAVA_HOME=

rem Additional Java Runtime arguments (Optional)
rem   Please clearly understand the purpose and impact of the arguments before modifying the default blank value
rem set JAVA_OPTS=

rem CAF Server console file (Optional)
rem   Full path to a file where stdout and stderr will be redirected.
rem set CAF_OUT=$CAF_BASE/logs/caf.out

rem CAF Server debugger address (Optional)
rem   Only available in debug mode.
rem set JPDA_ADDRESS=0.0.0.0:5005

rem CAF Server temp directory (Optional)
rem   Used to store temporary files generated during CAF Server runtime.
rem set CAF_TMPDIR=$CAF_BASE/temp

rem CAF Server memory options (Optional)
rem   Used to specify the running memory size of CAF Server(eg: CAF_MEM_OPTS="-Xmx2048m -Xms512m").
rem set CAF_MEM_OPTS=

rem CAF Server server path (Required)
rem   The default value of CAF_SERVER_PATH is "server".
rem   You can change it to another directory name, you should keep the following variable value matching with the actual directory name.
rem   Jstack is compatible with the old version, please ignore it.
set CAF_SERVER_PATH=server


rem CAF Server port (Required)
set CAF_PORT=5200

rem CAF Server stop grace period in Seconds (Optional)
rem   This value is the amount of time that CAF Server wait after sending a sigterm and give up waiting for the server to exit gracefully.
set CAF_STOP_GRACE_PERIOD=5

rem CAF Server parallel init (Optional)
rem   When enabled, Spring Beans will be initialized in parallel.
rem   Optional values:
rem     true          Beans will be initialized in parallel.
rem     false         Beans will be initialized in the spring default way.
set CAF_PARALLEL_INIT=true

rem CAF Server CMD Tilte init (Optional)
set TITLE=iGIX Server

for %%I in ("%~dp0..") do set "PARENT_DIR=%%~fI"
set "CLASSPATH=%PARENT_DIR%\server\runtime\3rd\;%PARENT_DIR%\server\runtime\;%PARENT_DIR%\server\runtime\libs\"
