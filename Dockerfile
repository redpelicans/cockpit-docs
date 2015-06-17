FROM node:0.10.36

RUN apt-get update && apt-get install -y git vim-tiny libgsl0ldbl

RUN ln -fs /usr/lib/libgslcblas.so.0 /usr/lib/libgslcblas.so \
&& ln -fs /usr/lib/libgsl.so.0 /usr/lib/libgsl.so

RUN npm install -g n_  \
&& npm cache clear



RUN git clone https://github.com/redpelicans/cockpit-docs.git /run
&& cd /run \
&& npm install

WORKDIR /run
CMD npm start



