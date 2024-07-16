一、启动方式
Windows系统：点击根目录startup.bat运行
Linux系统：打开命令窗口运行：./startup.sh

二、启动脚本自定义参数说明
Windows系统：
配置文件为/bin/config.bat，若需配置可以放开如下变量的注释进行设置
1.JAVA_HOME路径
脚本中默认将JAVA_HOME指向iGIX自带的JDK路径；如需使用系统环境变量，请将下面一行注释掉；如需使用其它位置的JDK，请修改语句中JAVA_HOME值。示例如下：
set JAVA_HOME=自定义jdk的绝对路径

2.JAVA_OPTS Java虚拟机启动参数设置
用于指定Java虚拟机一些参数，比如输出gc日志，性能追踪等等。
set JAVA_OPTS=

3.CAF_TMPDIR 启动后临时文件目录
用于指定系统启动后的生成的临时文件的目录绝对路劲，默认是安装盘根目录的temp文件夹
set CAF_TMPDIR=$CAF_BASE/temp

4.CAF_MEM_OPTS JVM内存参数
用于指定Java虚拟机堆、栈、方法区等内存分配
set CAF_MEM_OPTS=-Xmx3350M

5.IGIX_SERVER_PATH运行时目录
脚本中默认值为server。如果安装目录下已将运行时目录修改为其它目录名，需要保持以下变量值与实际目录名匹配；jstack为旧版本兼容处理，请忽略。
IGIX_SERVER_PATH=server

6.CAF_PORT 当前应用的端口
Windows下应用优雅停机时需要访问的应用端口，注意该值必须和application.yaml里配置的应用端口保持一致
set CAF_PORT=5200

7.CAF_STOP_GRACE_PERIOD 优雅停机时系统的等待时间
Windows下应有优雅停机时需要等待的时间，默认时5秒，可自行放开注释配置
set CAF_STOP_GRACE_PERIOD=5

8.CAF_PARALLEL_INIT 并行启动
是否启用应用的并行启动模式，模式是true，若项目二开碰到因并行启动不适配导致应用起不来，可临时修改为false
set CAF_PARALLEL_INIT=true

9.TITLE Windows启动控制台标题,默认是iGIX Server
set TITLE=iGIX Server

///////////////////////////////////////////分割线///////////////////////////////////////////////////
Linux系统：
配置文件为/bin/config.sh，若需配置可以放开如下变量的注释进行设置
1.JAVA_HOME路径
脚本中默认将JAVA_HOME指向iGIX自带的JDK路径；如需使用系统环境变量，请将下面一行注释掉；如需使用其它位置的JDK，请修改语句中JAVA_HOME值。示例如下：
JAVA_HOME=%IGIX_SERVER_HOME%\runtime\java\%PROCESSOR_ARCHITECTURE%-win

2.IGIX_SERVER_PATH运行时目录
脚本中默认值为server。如果安装目录下已将运行时目录修改为其它目录名，需要保持以下变量值与实际目录名匹配；jstack为旧版本兼容处理，请忽略。
IGIX_SERVER_PATH=server

3.JVM_MEMORY_OPTS Java虚拟机内存参数设置
用于指定Java虚拟机堆、栈、方法区等内存分配。默认会根据运行环境自动计算合适的最大可用内存；如果需要指定固定值，请取消下行注释并修改对应数值。
CAF_MEM_OPTS=-Xmx3350M

4.JAVA_OPTS Java虚拟机启动参数设置
如想修改JVM调试参数，可修改下行内容
JAVA_OPTS=-Dspring.profiles.active=dev -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005

5.CAF_OUT启动控制台日志路径
CAF_OUT=$CAF_BASE/logs/caf.out

6.CAF_STOP_GRACE_PERIOD 优雅停机时系统的等待时间
Windows下应有优雅停机时需要等待的时间，默认时5秒，可自行放开注释配置
CAF_STOP_GRACE_PERIOD=5

7.CAF_PARALLEL_INIT 并行启动
是否启用应用的并行启动模式，模式是true，若项目二开碰到因并行启动不适配导致应用起不来，可临时修改为false
CAF_PARALLEL_INIT=true