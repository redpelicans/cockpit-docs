FROM node:0.10.36

RUN apt-get update && apt-get install -y git vim-tiny libgsl0ldbl tree

RUN ln -fs /usr/lib/libgslcblas.so.0 /usr/lib/libgslcblas.so \
&& ln -fs /usr/lib/libgsl.so.0 /usr/lib/libgsl.so

RUN mkdir -p ~/.ssh

RUN ssh-keyscan -H github.com >> ~/.ssh/known_hosts \
&&  echo 'host github.com' >> ~/.ssh/config \
&&  echo '     identityfile /root/.ssh/github.key' >> ~/.ssh/config 
ADD ./keys/github.key/ /root/.ssh/

RUN chmod 600 /root/.ssh/*


RUN git clone -v https://github.com/redpelicans/cockpit-docs.git /docs \
&& cd /docs \
&& npm install

WORKDIR /docs
CMD npm start



