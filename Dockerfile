FROM node:14-slim

RUN buildDeps='g++ make python' \
    && apt-get update \
    && apt-get install -y --no-install-recommends $buildDeps

ENV APP_DIR /app/
RUN mkdir -p ${APP_DIR}
WORKDIR ${APP_DIR}
COPY . ./
RUN yarn

RUN apt-get remove -y --purge --auto-remove $buildDeps

EXPOSE $HTTP_PORT

CMD [ "sh", "-c", "echo HELLO_DEV" ]
