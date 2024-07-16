#!/bin/sh
# vim:sw=4:ts=4:et

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

set -e

# Java Development Kit home path (Optional)
# Special Notice:
#   1. JRE is NOT supported for now, which may cause some functions to be unavailable.
#   2. Please do NOT change the default blank value unless you need to specify a dedicated JDK.
# JAVA_HOME=

# Additional Java Runtime arguments (Optional)
#   Please clearly understand the purpose and impact of the arguments before modifying the default blank value
# JAVA_OPTS="-Xshare:off -XX:+UseAppCDS -XX:DumpLoadedClassList=hello.lst"
# JAVA_OPTS="-Xshare:dump -XX:+UseAppCDS -XX:SharedClassListFile=hello.lst -XX:SharedArchiveFile=hello.jsa"

CLASSPATH=$(cd $(dirname $0)/..; pwd)/server/runtime/3rd/:$(cd $(dirname $0)/..; pwd)/server/runtime/:$(cd $(dirname $0)/..; pwd)/server/runtime/libs/

# CAF Server console file (Optional)
#   Full path to a file where stdout and stderr will be redirected.
# CAF_OUT=$CAF_BASE/logs/caf.out

# CAF Server debugger address (Optional)
#   Only available in debug mode.
# JPDA_ADDRESS=0.0.0.0:5005

# CAF Server temp directory (Optional)
#   Used to store temporary files generated during CAF Server runtime.
# CAF_TMPDIR=$CAF_BASE/temp

# CAF Server memory options (Optional)
#   Used to specify the running memory size of CAF Server(eg: CAF_MEM_OPTS="-Xmx2048m -Xms512m").
# CAF_MEM_OPTS=

# CAF Server server path (Required)
#   The default value of CAF_SERVER_PATH is "server".
#   You can change it to another directory name, you should keep the following variable value matching with the actual directory name.
#   Jstack is compatible with the old version, please ignore it.
CAF_SERVER_PATH=server

# Enable logging to stdout (Optional)
#   Optional values:
#     true          Logs will be output to stdout.
#     false         Logs will NOT be output to stdout.
# ENABLE_CONSOLE_LOGGING=true

# CAF Server stop grace period in Seconds (Optional)
#   This value is the amount of time that CAF Server wait after sending a sigterm and give up waiting for the server to exit gracefully.
# CAF_STOP_GRACE_PERIOD=5

# CAF Server parallel init (Optional)
#   When enabled, Spring Beans will be initialized in parallel.
#   Optional values:
#     true          Beans will be initialized in parallel.
#     false         Beans will be initialized in the spring default way.
CAF_PARALLEL_INIT=true
