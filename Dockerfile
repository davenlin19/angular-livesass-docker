FROM node:6.10

RUN npm install -g gulp lite-server
RUN mkdir -p /code/livesass
WORKDIR /code/livesass
COPY . /code/livesass
RUN npm install
RUN npm install gulp
