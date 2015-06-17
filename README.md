#### RUN IT

Build docker image
pull it on RTH server
run it:

```
  # docker run -it --name docs -v /mnt/folder:/data -v /apps/cockpit/cockpitdocker/prod/cockpit:/config redpelicans/cockpit-docs bash
```

inside container

```
  # cd /docs
  # cp /config/params.js .
  # DEBUG=main:* node main.js --path /data
```

