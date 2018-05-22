FROM node:9

RUN apt-get -y update
RUN apt-get -y install sudo
RUN apt-get -y install bash
RUN sudo apt-get -y update
RUN apt-get install -y netcat

RUN sudo echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER node
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

RUN sudo chmod -R 777 /home/node
RUN sudo chown -R $(whoami) $(npm config get prefix)/lib
RUN sudo chown -R $(whoami) $(npm config get prefix)/lib/node_modules
RUN sudo chown -R $(whoami) $(npm config get prefix)/bin
RUN sudo chown -R $(whoami) $(npm config get prefix)/share
RUN sudo chown -R $(whoami) /usr/local/lib
RUN sudo chown -R $(whoami) /usr/local/etc

RUN npm install -g "r2g";
RUN npm install -g typescript

COPY package.json .
RUN npm install --loglevel=warn;

RUN sudo chmod -R 777 /home/node/app

ENV PATH="./node_modules/.bin:${PATH}"

COPY . .

RUN sudo chmod -R 777 /home/node/app
RUN gmx tsc || echo "fail compilation";

ENTRYPOINT ["/bin/bash", "./test/index.sh"]
