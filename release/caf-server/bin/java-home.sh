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
#  Set JAVA_HOME or JRE_HOME if not already set, ensure any provided settings
#  are valid and consistent with the selected start-up options and set up the
#  endorsed directory.
# -----------------------------------------------------------------------------

# Check embedded JDK
arch=`uname -m`
os=`uname -s | tr '[:upper:]' '[:lower:]'`

EMBD_JDK="$CAF_HOME"/"$CAF_SERVER_PATH"/runtime/java/$arch-$os

# if [ -z "$JAVA_HOME" ] && [ -x "$EMBD_JDK"/bin/java ]; then
#   echo "CAF embedded JDK detected (arch: $arch, os: $os), use it as default Java runtime."
#   JAVA_HOME=$EMBD_JDK
# fi
# 1.优先以config.sh里的配置来，2.用盘里的，3.环境变量自带
if [ -x "$EMBD_JDK"/bin/java ]; then
  echo "CAF embedded JDK detected (arch: $arch, os: $os), use it as default Java runtime."
  JAVA_HOME=$EMBD_JDK
fi


echo "CAF embedded JDK not detected ("$EMBD_JDK")."
echo "Trying to find installed Java runtime..."

# Make sure prerequisite environment variables are set
if [ -z "$JAVA_HOME" ] && [ -z "$JRE_HOME" ]; then
  if $darwin; then
    # Bugzilla 54390
    if [ -x '/usr/libexec/java_home' ] ; then
      EXPECTED_JAVA_VERSION="1.8"
      EXPECTED_JAVA_HOME=$(/usr/libexec/java_home -v $EXPECTED_JAVA_VERSION 2>/dev/null)

      if [ -z "$EXPECTED_JAVA_HOME" ]
      then
          # 当不存在预期版本Java时，获取默认Java home
          echo "Java $EXPECTED_JAVA_VERSION not found. Using default Java home instead."
          export JAVA_HOME=$(/usr/libexec/java_home)
      else
          # 存在预期版本Java时，使用该版本
          echo "Java $EXPECTED_JAVA_VERSION found. Using Java $EXPECTED_JAVA_VERSION."
          export JAVA_HOME=$EXPECTED_JAVA_HOME
      fi
      # export JAVA_HOME=`/usr/libexec/java_home`
    # Bugzilla 37284 (reviewed).
    elif [ -d "/System/Library/Frameworks/JavaVM.framework/Versions/CurrentJDK/Home" ]; then
      export JAVA_HOME="/System/Library/Frameworks/JavaVM.framework/Versions/CurrentJDK/Home"
    fi
  else
    JAVA_PATH=`which java 2>/dev/null`
    if [ "x$JAVA_PATH" != "x" ]; then
      JAVA_PATH=`dirname "$JAVA_PATH" 2>/dev/null`
      JRE_HOME=`dirname "$JAVA_PATH" 2>/dev/null`
    fi
    if [ "x$JRE_HOME" = "x" ]; then
      # XXX: Should we try other locations?
      if [ -x /usr/bin/java ]; then
        JRE_HOME=/usr
      fi
    fi
  fi
  if [ -z "$JAVA_HOME" ] && [ -z "$JRE_HOME" ]; then
    echo "Neither the JAVA_HOME nor the JRE_HOME environment variable is defined"
    echo "At least one of these environment variable is needed to run this program"
    exit 1
  fi
fi
if [ -z "$JAVA_HOME" ] && [ "$1" = "debug" ]; then
  echo "JAVA_HOME should point to a JDK in order to run in debug mode."
  exit 1
fi
if [ -z "$JRE_HOME" ]; then
  JRE_HOME="$JAVA_HOME"
fi

# If we're running under jdb, we need a full jdk.
if [ "$1" = "debug" ] ; then
  if [ "$os400" = "true" ]; then
    if [ ! -x "$JAVA_HOME"/bin/java ] || [ ! -x "$JAVA_HOME"/bin/javac ]; then
      echo "The JAVA_HOME environment variable is not defined correctly"
      echo "This environment variable is needed to run this program"
      echo "NB: JAVA_HOME should point to a JDK not a JRE"
      exit 1
    fi
  else
    if [ ! -x "$JAVA_HOME"/bin/java ] || [ ! -x "$JAVA_HOME"/bin/jdb ] || [ ! -x "$JAVA_HOME"/bin/javac ]; then
      echo "The JAVA_HOME environment variable is not defined correctly"
      echo "This environment variable is needed to run this program"
      echo "NB: JAVA_HOME should point to a JDK not a JRE"
      exit 1
    fi
  fi
fi

# Don't override the endorsed dir if the user has set it previously
if [ -z "$JAVA_ENDORSED_DIRS" ]; then
  # Java 9 no longer supports the java.endorsed.dirs
  # system property. Only try to use it if
  # CAF_HOME/endorsed exists.
  if [ -d "$CAF_HOME"/endorsed ]; then
    JAVA_ENDORSED_DIRS="$CAF_HOME"/endorsed
  fi
fi

# Set standard commands for invoking Java, if not already set.
if [ -z "$_RUNJAVA" ]; then
  # _RUNJAVA="$JRE_HOME"/bin/java
  _RUNJAVA="$JAVA_HOME"/bin/java
fi
if [ "$os400" != "true" ]; then
  if [ -z "$_RUNJDB" ]; then
    if [ "$2" = "-remote" ]; then
      _RUNJDB="$JAVA_HOME"/bin/java
    else
      _RUNJDB="$JAVA_HOME"/bin/jdb
    fi
  fi
fi

# export arch and JAVA_HOME and iGIX Sever Home
PROCESSOR_ARCHITECTURE=$arch
export PROCESSOR_ARCHITECTURE
JAVA_HOME=$(cd $JAVA_HOME;pwd)
export JAVA_HOME
IGIX_SERVER_HOME="$CAF_HOME"/"$CAF_SERVER_PATH"
export IGIX_SERVER_HOME

