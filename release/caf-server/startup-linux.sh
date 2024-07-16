#!/bin/bash

# Optional values: prod|dev. 
# prod:Production Environment; dev:Development Environment, Remote debugging is enabled. See the SERVER_MODE parameter
SERVER_MODE=dev

# Optional values: true|false. true:logs are printed on the console; false:Logs are not printed at the console.
ENABLE_CONSOLE_LOGGING=true

# The default value of IGIX_SERVER_PATH is SERVER. You can change it to another directory name,you should keep the following variable value matching with the actual directory name. Jstack is compatible with the old version, please ignore it.
IGIX_SERVER_PATH=server

# The defult value of remote debug port
if [ -z $DEBUG_PORT ]; then
  DEBUG_PORT=5005
fi

IGIX_SERVER_HOME=`dirname $0`/$IGIX_SERVER_PATH
if [ ! -d "$IGIX_SERVER_HOME" ]; then
  IGIX_SERVER_PATH=jstack
  IGIX_SERVER_HOME=`dirname $0`/jstack
fi

# Processor architecture and OS Kernel
CAF_BOOT_ARCH=`uname -m`
CAF_BOOT_OS_KERNEL=`uname -s | tr '[:upper:]' '[:lower:]'`

# The following JAVA_HOME points to the IGIX JDK by default; If system environment variables are used, comment out the following line; For JDKs in other locations, change the following JAVA_HOME value.
JAVA_HOME=$IGIX_SERVER_HOME/runtime/java/$CAF_BOOT_ARCH-$CAF_BOOT_OS_KERNEL
# JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home

# JVM_MEMORY_OPTS is used to specify the memory parameters that the Java virtual machine can use. By default, the appropriate memory is automatically calculated based on the physical machine environment. If you need to specify a fixed value, uncomment the downward comment and change the corresponding value
# set JVM_MEMORY_OPTS=-Xmx3350M

# Change the following line to adjust the JVM debugging parameters
JVM_DEBUG_OPTS="-Dspring.profiles.active=dev -Xdebug -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=$DEBUG_PORT"

if [ ! -d "$JAVA_HOME" ]; then
  echo Invalid JAVA_HOME Path: $JAVA_HOME
  exit
fi

# echo JAVA_HOME: $JAVA_HOME
# echo IGIX_SERVER_HOME: $IGIX_SERVER_HOME

CAF_BOOTSTRAP=$IGIX_SERVER_HOME/runtime/caf-bootstrap*.jar

#CAF_RUNTIME
CAF_MODULE_PATHS=$IGIX_SERVER_HOME/runtime/3rd,$IGIX_SERVER_HOME/runtime/libs

# Export the environment properties
export ENABLE_CONSOLE_LOGGING
export IGIX_SERVER_HOME
PROCESSOR_ARCHITECTURE=$CAF_BOOT_ARCH
export PROCESSOR_ARCHITECTURE
JAVA_HOME=$(cd $JAVA_HOME;pwd)
export JAVA_HOME

# Memory Size Part: if total size less than 16G,then XmxSize=totalSize*6/10
if [ ! -z $JVM_MEMORY_OPTS ]; then {
  JVM_MEM_OPTS=$JVM_MEMORY_OPTS
}
else {
  TotalMem=`awk '($1 == "MemTotal:"){print sprintf("%.0f", $2/1024)}' /proc/meminfo`
  if [ $TotalMem -ge 16384 ]; then {
    JVM_MEM_OPTS=""
  } else {
    JVM_MEM_OPTS=-Xmx$[$TotalMem/10*6]M
  }
  fi
}
fi

if [ "$SERVER_MODE" = prod ]; then {
  JVM_DEBUG_OPTS=-Dspring.profiles.active=prod
}
fi

$JAVA_HOME/bin/java $CAF_OPS -server -Dspring.security.enabled=false -Dloader.path=$CAF_MODULE_PATHS -Dserver.runtime.path.name=$IGIX_SERVER_PATH $JVM_MEM_OPTS $JVM_DEBUG_OPTS -jar $CAF_BOOTSTRAP --spring.config.location=$IGIX_SERVER_HOME/runtime/