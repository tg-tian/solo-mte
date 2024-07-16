#!/bin/sh

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# -----------------------------------------------------------------------------
# Control Script for the CAF Server
#
# For supported commands call "caf-server.sh help" or see the usage section at
# the end of this file.
#
# Environment Variable Prerequisites
#
#   Do not set the variables in this script. Instead put them into a script
#   config.sh in CAF_BASE/bin to keep your customizations separate.
#
#   CAF_HOME        May point at your CAF "build" directory.
#
#   CAF_BASE        (Optional) Base directory for resolving dynamic portions
#                   of a CAF installation.  If not present, resolves to
#                   the same directory that CAF_HOME points to.
#
#   CAF_OUT         (Optional) Full path to a file where stdout and stderr
#                   will be redirected.
#                   Default is $CAF_BASE/logs/caf.out
#
#   CAF_OUT_CMD     (Optional) Command which will be executed and receive
#                   as its stdin the stdout and stderr from the CAF java
#                   process. If CAF_OUT_CMD is set, the value of
#                   CAF_OUT will be used as a named pipe.
#                   No default.
#                   Example (all one line)
#                   CAF_OUT_CMD="/usr/bin/rotatelogs -f $CAF_BASE/logs/caf.out.%Y-%m-%d.log 86400"
#
#   CAF_OPTS        (Optional) Java runtime options used when the "start",
#                   "run" or "debug" command is executed.
#                   Include here and not in JAVA_OPTS all options, that should
#                   only be used by CAF itself, not by the stop process,
#                   the version command etc.
#                   Examples are heap size, GC logging, JMX ports etc.
#
#   CAF_TMPDIR      (Optional) Directory path location of temporary directory
#                   the JVM should use (java.io.tmpdir).  Defaults to
#                   $CAF_BASE/temp.
#
#   JAVA_HOME       Must point at your Java Development Kit installation.
#                   Required to run the with the "debug" argument.
#
#   JRE_HOME        Must point at your Java Runtime installation.
#                   Defaults to JAVA_HOME if empty. If JRE_HOME and JAVA_HOME
#                   are both set, JRE_HOME is used.
#
#   JAVA_OPTS       (Optional) Java runtime options used when any command
#                   is executed.
#                   Include here and not in CAF_OPTS all options, that
#                   should be used by CAF and also by the stop process,
#                   the version command etc.
#                   Most options should go into CAF_OPTS.
#
#   JAVA_ENDORSED_DIRS (Optional) Lists of of colon separated directories
#                   containing some jars in order to allow replacement of APIs
#                   created outside of the JCP (i.e. DOM and SAX from W3C).
#                   It can also be used to update the XML parser implementation.
#                   This is only supported for Java <= 8.
#                   Defaults to $CAF_HOME/endorsed.
#
#   JPDA_TRANSPORT  (Optional) JPDA transport used when the "debug -remote"
#                   command is executed. The default is "dt_socket".
#
#   JPDA_ADDRESS    (Optional) Java runtime options used when the "debug -remote"
#                   command is executed. The default is localhost:8000.
#
#   JPDA_SUSPEND    (Optional) Java runtime options used when the "debug -remote"
#                   command is executed. Specifies whether JVM should suspend
#                   execution immediately after startup. Default is "n".
#
#   JPDA_OPTS       (Optional) Java runtime options used when the "debug -remote"
#                   command is executed. If used, JPDA_TRANSPORT, JPDA_ADDRESS,
#                   and JPDA_SUSPEND are ignored. Thus, all required jpda
#                   options MUST be specified. The default is:
#
#                   -agentlib:jdwp=transport=$JPDA_TRANSPORT,
#                       address=$JPDA_ADDRESS,server=y,suspend=$JPDA_SUSPEND
#
#   JSSE_OPTS       (Optional) Java runtime options used to control the TLS
#                   implementation when JSSE is used. Default is:
#                   "-Djdk.tls.ephemeralDHKeySize=2048"
#
#   CAF_PID         (Optional) Path of the file which should contains the pid
#                   of the caf startup java process, when start (fork) is
#                   used
#
#   UMASK           (Optional) Override CAF's default UMASK of 0027
#
#   USE_NOHUP       (Optional) If set to the string true the start command will
#                   use nohup so that the CAF process will ignore any hangup
#                   signals. Default is "false" unless running on HP-UX in which
#                   case the default is "true"
# -----------------------------------------------------------------------------

# OS specific support.  $var _must_ be set to either true or false.
cygwin=false
darwin=false
os400=false
hpux=false
case "`uname`" in
CYGWIN*) cygwin=true;;
Darwin*) darwin=true;;
OS400*) os400=true;;
HP-UX*) hpux=true;;
esac

# resolve links - $0 may be a softlink
PRG="$0"

while [ -h "$PRG" ]; do
  ls=`ls -ld "$PRG"`
  link=`expr "$ls" : '.*-> \(.*\)$'`
  if expr "$link" : '/.*' > /dev/null; then
    PRG="$link"
  else
    PRG=`dirname "$PRG"`/"$link"
  fi
done

# Check environment configuration
# check ulimit
OPEN_FILE=`ulimit -n`
LESS_FILE=65535
if [ not $darwin ] && [ $OPEN_FILE -lt $LESS_FILE ]; then
  echo Warning:  The num of open-files is probably less than $LESS_FILE.;
  echo You can check out with command [ulimit -a], and please restart after checking out and solving it.;
  echo Now open-files : $OPEN_FILE;
  exit;
fi

#check free mem
FREE_MEM = free | awk '{print $4}'| head -2| tail -1
LOW_MEM = 16777216
if [ $FREE_MEM -lt $LOW_MEM ]; then
  echo Warning:  The free memory is: $FREE_MEM less than $LOW_MEM.;
fi

# Get standard environment variables
PRGDIR=`dirname "$PRG"`

# Only set CAF_HOME if not already set
[ -z "$CAF_HOME" ] && CAF_HOME=`cd "$PRGDIR/.." >/dev/null; pwd`

# Copy CAF_BASE from CAF_HOME if not already set
[ -z "$CAF_BASE" ] && CAF_BASE="$CAF_HOME"

# Ensure that any user defined CLASSPATH variables are not used on startup,
# but allow them to be specified in config.sh, in rare case when it is needed.
CLASSPATH=

if [ -r "$CAF_BASE/bin/config.sh" ]; then
  . "$CAF_BASE/bin/config.sh"
elif [ -r "$CAF_HOME/bin/config.sh" ]; then
  . "$CAF_HOME/bin/config.sh"
fi

# Check if hibernate-selector.sh exists in CAF_BASE/bin directory
# HBN_TOOL="$CAF_BASE/bin/hibernate-selector.sh"
# if [ -f "$HBN_TOOL" ]; then
#     # Execute hibernate-selector.sh with passed arguments
#     . "$HBN_TOOL" "$@"
# else
#     echo "Error:    Cannot find $HBR_TOOL. This file is needed to run this program"
#     exit 1
# fi

# CAF-specific configuration
CAF_BOOTSTRAP="$CAF_HOME"/"$CAF_SERVER_PATH"/runtime/caf-bootstrap.jar
CAF_BOOTSTRAP_LANUCHER=org.springframework.boot.loader.PropertiesLauncher
CAF_MODULE_PATHS="$CAF_HOME"/"$CAF_SERVER_PATH"/runtime/3rd,"$CAF_HOME"/"$CAF_SERVER_PATH"/runtime/libs
CAF_BOOT_CONFIG_PATH="$CAF_HOME"/"$CAF_SERVER_PATH"/runtime/

# CAF PID
if [ -z "$CAF_PID" ]; then
  CAF_PID="$CAF_HOME"/bin/caf.pid
fi

# CAF parallel init
if [ "$CAF_PARALLEL_INIT" = "true" ]; then
    JAVA_OPTS="$JAVA_OPTS -Dparallel.startup=true"
fi

# Optimize the maximum available memory on servers with less than 16g of memory
mem=$(cat /proc/meminfo  | grep MemTotal | awk '{print sprintf("%.0f", $2/1024)}')
if [ ! -z "$CAF_MEM_OPTS" ] && [ "`uname`" = "Linux" ] && [ ! $mem -ge 16384 ]; then
  CAF_MEM_OPTS=-Xmx$[$mem/10*6]m
fi
JVM_MEM_SIZE=$CAF_MEM_OPTS
export JVM_MEM_SIZE
JAVA_OPTS="$JAVA_OPTS $CAF_MEM_OPTS"
TotalMemorySize=`free | awk '/Mem/ {print $2}'`
export TotalMemorySize
# For Cygwin, ensure paths are in UNIX format before anything is touched
if $cygwin; then
  [ -n "$JAVA_HOME" ] && JAVA_HOME=`cygpath --unix "$JAVA_HOME"`
  [ -n "$JRE_HOME" ] && JRE_HOME=`cygpath --unix "$JRE_HOME"`
  [ -n "$CAF_HOME" ] && CAF_HOME=`cygpath --unix "$CAF_HOME"`
  [ -n "$CAF_BASE" ] && CAF_BASE=`cygpath --unix "$CAF_BASE"`
  [ -n "$CLASSPATH" ] && CLASSPATH=`cygpath --path --unix "$CLASSPATH"`
fi


# Ensure that neither CAF_HOME nor CAF_BASE contains a colon
# as this is used as the separator in the classpath and Java provides no
# mechanism for escaping if the same character appears in the path.
case $CAF_HOME in
  *:*) echo "Using CAF_HOME:   $CAF_HOME";
       echo "Unable to start as CAF_HOME contains a colon (:) character";
       exit 1;
esac
case $CAF_BASE in
  *:*) echo "Using CAF_BASE:   $CAF_BASE";
       echo "Unable to start as CAF_BASE contains a colon (:) character";
       exit 1;
esac

# For OS400
if $os400; then
  # Set job priority to standard for interactive (interactive - 6) by using
  # the interactive priority - 6, the helper threads that respond to requests
  # will be running at the same priority as interactive jobs.
  COMMAND='chgjob job('$JOBNAME') runpty(6)'
  system $COMMAND

  # Enable multi threading
  export QIBM_MULTI_THREADED=Y
fi

# Get standard Java environment variables
if $os400; then
  # -r will Only work on the os400 if the files are:
  # 1. owned by the user
  # 2. owned by the PRIMARY group of the user
  # this will not work if the user belongs in secondary groups
  . "$CAF_HOME"/bin/java-home.sh
else
  if [ -r "$CAF_HOME"/bin/java-home.sh ]; then
    . "$CAF_HOME"/bin/java-home.sh
  else
    echo "Cannot find $CAF_HOME/bin/java-home.sh"
    echo "This file is needed to run this program"
    exit 1
  fi
fi

# Add on extra jar files to CLASSPATH
if [ ! -z "$CLASSPATH" ] ; then
  CLASSPATH="$CLASSPATH":
fi
CLASSPATH="$CLASSPATH""$CAF_BOOTSTRAP"

if [ -z "$CAF_OUT" ] ; then
  CAF_OUT="$CAF_BASE"/logs/caf.out
fi

# Clear CAF_OUT history logs
if [ -a "$CAF_OUT" ] ; then
  rm -f "$CAF_OUT"
fi

if [ -z "$CAF_TMPDIR" ] ; then
  # Define the java.io.tmpdir to use for CAF
  CAF_TMPDIR="$CAF_BASE"/temp
fi

if [ ! -x "$CAF_TMPDIR" ]; then
  mkdir -p $CAF_TMPDIR
fi

# Bugzilla 37848: When no TTY is available, don't output to console
have_tty=0
if [ -t 0 ]; then
    have_tty=1
fi

# For Cygwin, switch paths to Windows format before running java
if $cygwin; then
  JAVA_HOME=`cygpath --absolute --windows "$JAVA_HOME"`
  JRE_HOME=`cygpath --absolute --windows "$JRE_HOME"`
  CAF_HOME=`cygpath --absolute --windows "$CAF_HOME"`
  CAF_BASE=`cygpath --absolute --windows "$CAF_BASE"`
  CAF_TMPDIR=`cygpath --absolute --windows "$CAF_TMPDIR"`
  CLASSPATH=`cygpath --path --windows "$CLASSPATH"`
  [ -n "$JAVA_ENDORSED_DIRS" ] && JAVA_ENDORSED_DIRS=`cygpath --path --windows "$JAVA_ENDORSED_DIRS"`
fi

if [ -z "$JSSE_OPTS" ] ; then
  JSSE_OPTS="-Djdk.tls.ephemeralDHKeySize=2048"
fi
JAVA_OPTS="$JAVA_OPTS $JSSE_OPTS"

# Register custom URL handlers
# Do this here so custom URL handles (specifically 'war:...') can be used in the security policy
JAVA_OPTS="$JAVA_OPTS -Djava.protocol.handler.pkgs=org.apache.caf.webresources"

# Set UMASK unless it has been overridden
if [ -z "$UMASK" ]; then
    UMASK="0027"
fi
umask $UMASK

# Java 9 no longer supports the java.endorsed.dirs
# system property. Only try to use it if
# JAVA_ENDORSED_DIRS was explicitly set
# or CAF_HOME/endorsed exists.
ENDORSED_PROP=ignore.endorsed.dirs
if [ -n "$JAVA_ENDORSED_DIRS" ]; then
    ENDORSED_PROP=java.endorsed.dirs
fi
if [ -d "$CAF_HOME/endorsed" ]; then
    ENDORSED_PROP=java.endorsed.dirs
fi

# Make the umask available when using the org.apache.caf.security.SecurityListener
JAVA_OPTS="$JAVA_OPTS -Dorg.apache.caf.security.SecurityListener.UMASK=`umask`"

if [ -z "$USE_NOHUP" ]; then
    if $hpux; then
        USE_NOHUP="true"
    else
        USE_NOHUP="false"
    fi
fi
unset _NOHUP
if [ "$USE_NOHUP" = "true" ]; then
    _NOHUP="nohup"
fi

# Add the JAVA 9 specific start-up parameters required by CAF
JDK_JAVA_OPTIONS="$JDK_JAVA_OPTIONS --add-opens=java.base/java.lang=ALL-UNNAMED"
JDK_JAVA_OPTIONS="$JDK_JAVA_OPTIONS --add-opens=java.base/java.io=ALL-UNNAMED"
JDK_JAVA_OPTIONS="$JDK_JAVA_OPTIONS --add-opens=java.base/java.util=ALL-UNNAMED"
JDK_JAVA_OPTIONS="$JDK_JAVA_OPTIONS --add-opens=java.base/java.util.concurrent=ALL-UNNAMED"
JDK_JAVA_OPTIONS="$JDK_JAVA_OPTIONS --add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED"
export JDK_JAVA_OPTIONS

# ----- Execute The Requested Command -----------------------------------------

# Bugzilla 37848: only output this if we have a TTY
if [ $have_tty -eq 1 ]; then
  echo "Using CAF_BASE:   $CAF_BASE"
  echo "Using CAF_HOME:   $CAF_HOME"
  echo "Using CAF_TMPDIR: $CAF_TMPDIR"
  # if [ "$1" = "debug" ] ; then
  #   echo "Using JAVA_HOME:       $JAVA_HOME"
  # else
  #   echo "Using JRE_HOME:        $JRE_HOME"
  # fi
  echo "Using JAVA_HOME:       $JAVA_HOME"
  echo "Using CLASSPATH:       $CLASSPATH"
  echo "Using CAF_OPTS:   $CAF_OPTS"
  echo "Using JVM_MEM_SIZE:    $CAF_MEM_OPTS"
  echo "TotalMemorySize:    $TotalMemorySize"
  if [ ! -z "$CAF_PID" ]; then
    echo "Using CAF_PID:    $CAF_PID"
  fi
fi

if [ "$1" = "debug" ] && [ "$2" = "-remote" ] ; then
  if [ -z "$JPDA_TRANSPORT" ]; then
    JPDA_TRANSPORT="dt_socket"
  fi
  if [ -z "$JPDA_ADDRESS" ]; then
    JPDA_ADDRESS="5005"
  fi
  if [ -z "$JPDA_SUSPEND" ]; then
    JPDA_SUSPEND="n"
  fi
  if [ -z "$JPDA_OPTS" ]; then
    JPDA_OPTS="-agentlib:jdwp=transport=$JPDA_TRANSPORT,address=$JPDA_ADDRESS,server=y,suspend=$JPDA_SUSPEND"
  fi
  CAF_OPTS="$JPDA_OPTS $CAF_OPTS"
  # shift
fi

if [ "$1" = "debug" ] ; then
  if $os400; then
    echo "Debug command not available on OS400"
    exit 1
  else
    shift
    if [ "$1" = "-security" ] ; then
      if [ $have_tty -eq 1 ]; then
        echo "Using Security Manager"
      fi
      shift
      eval exec "\"$_RUNJDB\"" "$JAVA_OPTS" "$CAF_OPTS" \
        -D$ENDORSED_PROP="$JAVA_ENDORSED_DIRS" \
        -classpath "$CLASSPATH" \
        -sourcepath "$CAF_HOME"/../../java \
        -Djava.security.manager \
        -Djava.security.policy=="$CAF_BASE"/conf/caf.policy \
        -Dcaf.base="$CAF_BASE" \
        -Dcaf.home="$CAF_HOME" \
        -Djava.io.tmpdir="$CAF_TMPDIR" \
        -Dloader.path="\"$CAF_MODULE_PATHS"\" \
        -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
        -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
        -Dfile.encoding=UTF-8 \
        "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start
    elif [ "$1" = "-remote" ] ; then
      eval exec "\"$_RUNJAVA\"" "$JAVA_OPTS" "$CAF_OPTS" \
        -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
        -classpath "\"$CLASSPATH\"" \
        -Dcaf.base="\"$CAF_BASE\"" \
        -Dcaf.home="\"$CAF_HOME\"" \
        -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
        -Dloader.path="\"$CAF_MODULE_PATHS"\" \
        -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
        -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
        -Dfile.encoding=UTF-8 \
        "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start
    else
      eval exec "\"$_RUNJDB\"" "$JAVA_OPTS" "$CAF_OPTS" \
        -D$ENDORSED_PROP="$JAVA_ENDORSED_DIRS" \
        -classpath "$CLASSPATH" \
        -sourcepath "$CAF_HOME"/../../java \
        -Dcaf.base="$CAF_BASE" \
        -Dcaf.home="$CAF_HOME" \
        -Djava.io.tmpdir="$CAF_TMPDIR" \
        -Dloader.path="\"$CAF_MODULE_PATHS"\" \
        -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
        -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
        -Dfile.encoding=UTF-8 \
        "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start
    fi
  fi

elif [ "$1" = "run" ]; then

  shift
  if [ "$1" = "-security" ] ; then
    if [ $have_tty -eq 1 ]; then
      echo "Using Security Manager"
    fi
    shift
    eval exec "\"$_RUNJAVA\"" "$JAVA_OPTS" "$CAF_OPTS" \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Djava.security.manager \
      -Djava.security.policy=="\"$CAF_BASE/conf/caf.policy\"" \
      -Dcaf.base="\"$CAF_BASE\"" \
      -Dcaf.home="\"$CAF_HOME\"" \
      -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
      -Dloader.path="\"$CAF_MODULE_PATHS"\" \
      -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
      -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
      -Dfile.encoding=UTF-8 \
      "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start
  else
    eval exec "\"$_RUNJAVA\"" "$JAVA_OPTS" "$CAF_OPTS" \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Dcaf.base="\"$CAF_BASE\"" \
      -Dcaf.home="\"$CAF_HOME\"" \
      -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
      -Dloader.path="\"$CAF_MODULE_PATHS"\" \
      -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
      -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
      -Dfile.encoding=UTF-8 \
      "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start
  fi

elif [ "$1" = "start" ] ; then

  if [ ! -z "$CAF_PID" ]; then
    if [ -f "$CAF_PID" ]; then
      if [ -s "$CAF_PID" ]; then
        echo "Existing PID file found during start."
        if [ -r "$CAF_PID" ]; then
          PID=`cat "$CAF_PID"`
          ps -p $PID >/dev/null 2>&1
          if [ $? -eq 0 ] ; then
            echo "CAF appears to still be running with PID $PID. Start aborted."
            echo "If the following process is not a CAF process, remove the PID file and try again:"
            ps -f -p $PID
            exit 1
          else
            echo "Removing/clearing stale PID file."
            rm -f "$CAF_PID" >/dev/null 2>&1
            if [ $? != 0 ]; then
              if [ -w "$CAF_PID" ]; then
                cat /dev/null > "$CAF_PID"
              else
                echo "Unable to remove or clear stale PID file. Start aborted."
                exit 1
              fi
            fi
          fi
        else
          echo "Unable to read PID file. Start aborted."
          exit 1
        fi
      else
        rm -f "$CAF_PID" >/dev/null 2>&1
        if [ $? != 0 ]; then
          if [ ! -w "$CAF_PID" ]; then
            echo "Unable to remove or write to empty PID file. Start aborted."
            exit 1
          fi
        fi
      fi
    fi
  fi

  shift
  if [ -z "$CAF_OUT_CMD" ] ; then
    if [ ! -x $(dirname "$CAF_OUT") ]; then
      mkdir -p $(dirname "$CAF_OUT")
    fi
    touch "$CAF_OUT"
  else
    if [ ! -e "$CAF_OUT" ]; then
      if ! mkfifo "$CAF_OUT"; then
        echo "cannot create named pipe $CAF_OUT. Start aborted."
        exit 1
      fi
    elif [ ! -p "$CAF_OUT" ]; then
      echo "$CAF_OUT exists and is not a named pipe. Start aborted."
      exit 1
    fi
    $CAF_OUT_CMD <"$CAF_OUT" &
  fi
  if [ "$1" = "-security" ] ; then
    if [ $have_tty -eq 1 ]; then
      echo "Using Security Manager"
    fi
    shift
    eval $_NOHUP "\"$_RUNJAVA\"" "$JAVA_OPTS" "$CAF_OPTS" \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Djava.security.manager \
      -Djava.security.policy=="\"$CAF_BASE/conf/caf.policy\"" \
      -Dcaf.base="\"$CAF_BASE\"" \
      -Dcaf.home="\"$CAF_HOME\"" \
      -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
      -Dloader.path="\"$CAF_MODULE_PATHS"\" \
      -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
      -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
      -Dfile.encoding=UTF-8 \
      "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start \
      >> "$CAF_OUT" 2>&1 "&"

  else
    eval $_NOHUP "\"$_RUNJAVA\"" "$JAVA_OPTS" "$CAF_OPTS" \
      -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
      -classpath "\"$CLASSPATH\"" \
      -Dcaf.base="\"$CAF_BASE\"" \
      -Dcaf.home="\"$CAF_HOME\"" \
      -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
      -Dloader.path="\"$CAF_MODULE_PATHS"\" \
      -Dserver.runtime.path.name="\"$CAF_SERVER_PATH\"" \
      -Dcaf.server.full-path="\"$CAF_HOME/$CAF_SERVER_PATH\"" \
      -Dfile.encoding=UTF-8 \
      "$CAF_BOOTSTRAP_LANUCHER" --spring.config.location="\"$CAF_BOOT_CONFIG_PATH\"" "$@" start \
      >> "$CAF_OUT" 2>&1 "&"

  fi

  if [ ! -z "$CAF_PID" ]; then
    echo $! > "$CAF_PID"
  fi

  echo "CAF started."

elif [ "$1" = "stop" ] ; then

  shift

  SLEEP=5
  if [ ! -z "$CAF_STOP_GRACE_PERIOD" ]; then
    SLEEP=$CAF_STOP_GRACE_PERIOD
  elif [ ! -z "$1" ]; then
    echo $1 | grep "[^0-9]" >/dev/null 2>&1
    if [ $? -gt 0 ]; then
      SLEEP=$1
      shift
    fi
  fi

  FORCE=0
  if [ "$1" = "-force" ]; then
    shift
    FORCE=1
  fi

  if [ ! -z "$CAF_PID" ]; then
    if [ -f "$CAF_PID" ]; then
      if [ -s "$CAF_PID" ]; then
        kill -0 `cat "$CAF_PID"` >/dev/null 2>&1
        if [ $? -gt 0 ]; then
          echo "PID file found but either no matching process was found or the current user does not have permission to stop the process. Stop aborted."
          exit 1
        fi
      else
        echo "PID file is empty and has been ignored."
      fi
    else
      echo "\$CAF_PID was set but the specified file does not exist. Is CAF running? Stop aborted."
      exit 1
    fi
  fi

  # eval "\"$_RUNJAVA\"" "$JAVA_OPTS" \
  #   -D$ENDORSED_PROP="\"$JAVA_ENDORSED_DIRS\"" \
  #   -classpath "\"$CLASSPATH\"" \
  #   -Dcaf.base="\"$CAF_BASE\"" \
  #   -Dcaf.home="\"$CAF_HOME\"" \
  #   -Djava.io.tmpdir="\"$CAF_TMPDIR\"" \
  #   "$CAF_BOOTSTRAP_LANUCHER" "$@" stop

  # stop failed. Shutdown port disabled? Try a normal kill.
  # if [ $? != 0 ]; then
    if [ ! -z "$CAF_PID" ]; then
      echo "The stop command failed. Attempting to signal the process to stop through OS signal."
      kill -15 `cat "$CAF_PID"` >/dev/null 2>&1
    fi
  # fi

  if [ ! -z "$CAF_PID" ]; then
    if [ -f "$CAF_PID" ]; then
      while [ $SLEEP -ge 0 ]; do
        kill -0 `cat "$CAF_PID"` >/dev/null 2>&1
        if [ $? -gt 0 ]; then
          rm -f "$CAF_PID" >/dev/null 2>&1
          if [ $? != 0 ]; then
            if [ -w "$CAF_PID" ]; then
              cat /dev/null > "$CAF_PID"
              # If CAF has stopped don't try and force a stop with an empty PID file
              FORCE=0
            else
              echo "The PID file could not be removed or cleared."
            fi
          fi
          echo "CAF stopped."
          break
        fi
        if [ $SLEEP -gt 0 ]; then
          sleep 1
        fi
        if [ $SLEEP -eq 0 ]; then
          echo "CAF did not stop in time."
          if [ $FORCE -eq 0 ]; then
            echo "PID file was not removed."
          fi
          echo "To aid diagnostics a thread dump has been written to standard out."
          kill -3 `cat "$CAF_PID"`
        fi
        SLEEP=`expr $SLEEP - 1 `
      done
    fi
  fi

  KILL_SLEEP_INTERVAL=5
  if [ $FORCE -eq 1 ]; then
    if [ -z "$CAF_PID" ]; then
      echo "Kill failed: \$CAF_PID not set"
    else
      if [ -f "$CAF_PID" ]; then
        PID=`cat "$CAF_PID"`
        echo "Killing CAF with the PID: $PID"
        kill -9 $PID
        while [ $KILL_SLEEP_INTERVAL -ge 0 ]; do
            kill -0 `cat "$CAF_PID"` >/dev/null 2>&1
            if [ $? -gt 0 ]; then
                rm -f "$CAF_PID" >/dev/null 2>&1
                if [ $? != 0 ]; then
                    if [ -w "$CAF_PID" ]; then
                        cat /dev/null > "$CAF_PID"
                    else
                        echo "The PID file could not be removed."
                    fi
                fi
                echo "The CAF process has been killed."
                break
            fi
            if [ $KILL_SLEEP_INTERVAL -gt 0 ]; then
                sleep 1
            fi
            KILL_SLEEP_INTERVAL=`expr $KILL_SLEEP_INTERVAL - 1 `
        done
        if [ $KILL_SLEEP_INTERVAL -lt 0 ]; then
            echo "CAF has not been killed completely yet. The process might be waiting on some system call or might be UNINTERRUPTIBLE."
        fi
      fi
    fi
  fi

elif [ "$1" = "version" ] ; then

    "$_RUNJAVA"   \
      -classpath "$CAF_HOME/lib/caf.jar" \
      org.apache.caf.util.ServerInfo

else

  echo "Usage: caf-server.sh ( commands ... )"
  echo "commands:"
  if $os400; then
    echo "  debug             Start CAF Server in a debugger (not available on OS400)"
    # echo "  debug -security   Debug CAF Server with a security manager (not available on OS400)"
  else
    echo "  debug             Start CAF Server in a debugger"
    # echo "  debug -security   Debug CAF Server with a security manager"
  fi
  echo "  debug -remote     Start CAF Server with a remote debugger"
  echo "  run               Start CAF Server in the current window"
  # echo "  run -security     Start in the current window with security manager"
  echo "  start             Start CAF Server in a separate window"
  # echo "  start -security   Start in a separate window with security manager"
  echo "  stop              Stop CAF Server, waiting up to 5 (by default) seconds for the process to end"
  echo "  stop n            Stop CAF Server, waiting up to n seconds for the process to end"
  echo "  stop -force       Stop CAF Server, wait up to 5 (by default) seconds and then use kill -KILL if still running"
  echo "  stop n -force     Stop CAF Server, wait up to n seconds and then use kill -KILL if still running"
  # echo "  version           What version of CAF Server are you running?"
  echo "Note: Waiting for the process to end and use of the -force option require that \$CAF_PID is defined"
  exit 1

fi
