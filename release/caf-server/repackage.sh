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

# Build image with docker
build_docker() {
  scope=$1
  tag=$2

  if [ $# -lt 1 ]; then
    echo "Usage:"
    echo "$0 docker (SCOPE:all|api|web) [TAG]"
    echo
    echo "Examples:"
    echo "$0 docker docker.io/igix/caf-server-all:v2.0.0"
    echo "$0 docker all docker.io/igix/caf-server-all:v2.0.0"
    echo "$0 docker api registry.inspures.com/igix/caf-server-api:v0.1.0"
    echo "$0 docker web registry.mycompany.com/igix/caf-server-web:v0.1.0"
    echo
    exit 1
  elif [ $# -lt 2 ]; then
    scope=all
    tag=$1
  fi

  case $scope in
    all|api|web)
      docker build -t $tag -f docker/$scope/dockerfile .
      ;;
    *)
      echo "Invalid scope: $scope"
      echo "Usage:"
      echo "$0 docker (SCOPE:all|api|web) [TAG]"
      exit 1
      ;;
  esac
}

# Build RPM package
build_rpm() {
  echo rpmbuild -ba SPECS/caf-server.spec
}

# Check if a parameter is passed
if [ $# -lt 1 ]; then
  echo "Usage:"
  echo "$0 (SCOPE) [docker|rpm]"
  exit 1
fi

# Check if the parameter is either docker, oci-image, or rpm
case $1 in
  docker)
    # Build the Docker image
    build_docker $2 $3
    ;;
  rpm)
    # Build the RPM package
    build_rpm $2 $3
    ;;
  *)
    echo "Invalid parameter: $1"
    echo "Usage: $0 [docker|rpm]"
    exit 1
    ;;
esac