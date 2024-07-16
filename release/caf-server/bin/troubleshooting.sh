#!/bin/bash
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

mach_name=$(hostname)
YYYYmmdd=`date +%Y%m%d`
hhmiss=`date +%H%M%S`
#rm -rf $(dirname "$0")/trace.log;
# 获取当前igix运行目录
IGIX_SERVER_PATH=server
IGIXBasicHome=$(dirname $(dirname $(readlink -f "$0")))

# cd ./emc/apps/perf/troubleshooting/
mkdir -p $IGIXBasicHome/logs/dump/${YYYYmmdd}
IGIX_SERVER_HOME=$IGIXBasicHome/$IGIX_SERVER_PATH
if [ ! -d $IGIX_SERVER_HOME ]; then
  IGIX_SERVER_PATH=jstack
  IGIX_SERVER_HOME=$IGIXBasicHome/jstack
fi
CAF_BOOT_ARCH=`uname -m`
CAF_BOOT_OS_KERNEL=`uname -s | tr '[:upper:]' '[:lower:]'`

# The following JAVA_HOME points to the IGIX JDK by default; If system environment variables are used, comment out the following line; For JDKs in other locations, change the following JAVA_HOME value.
JAVA_HOME=$IGIX_SERVER_HOME/runtime/java/$CAF_BOOT_ARCH-$CAF_BOOT_OS_KERNEL
CAF_BOOTSTRAP=/server/runtime/caf-bootstrap.jar
SaveHome=$IGIXBasicHome/logs/dump/${YYYYmmdd}
filename=$SaveHome/${mach_name}-${YYYYmmdd}${hhmiss}.log

#JCMD命令赋权
chmod 777 $JAVA_HOME/bin/jcmd
# echo $CAF_BOOTSTRAP
#执行命令并输出结果至文件
$JAVA_HOME/bin/jcmd $CAF_BOOTSTRAP VM.uptime >>$filename;
$JAVA_HOME/bin/jcmd $CAF_BOOTSTRAP VM.flags >>$filename;
$JAVA_HOME/bin/jcmd $CAF_BOOTSTRAP Thread.print >>$filename;
$JAVA_HOME/bin/jcmd $CAF_BOOTSTRAP GC.class_histogram -all >>$filename;
$JAVA_HOME/bin/jcmd $CAF_BOOTSTRAP GC.heap_info >>$filename;
