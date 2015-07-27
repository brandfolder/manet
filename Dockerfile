FROM node:latest

# System Config
ENV LC_ALL C
ENV DEBIAN_FRONTEND noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN true

# Update Apt Cache
RUN apt-get update

# Install System Dependencies
RUN apt-get install -y \
      curl \
      libc6 \
      libstdc++6 \
      libgcc1 \
      libgtk2.0-0 \
      libasound2 \
      libxrender1 \
      nodejs \
      libdbus-glib-1-2 \
      graphicsmagick \
      xvfb

# Install Runtime Dependencies
RUN curl -sSL http://download.slimerjs.org/releases/0.9.6/slimerjs-0.9.6-linux-x86_64.tar.bz2 | tar -xj

# Install Application
ADD . /app
WORKDIR /app
RUN npm install

# Configure Application
ENV PORT 5000
ENV CACHE 3600
ENV FORMAT png
ENV COMPRESS false
ENV LOG_LEVEL debug
ENV UI_ENABLED false
ENV WINDOW_WIDTH 1280
ENV WINDOW_HEIGHT 800
ENV RESIZE_TO_WIDTH $WINDOW_WIDTH
ENV WINDOW_SCROLL_X 0
ENV WINDOW_SCROLL_Y 0
EXPOSE $PORT

# Run Application
CMD PATH=/slimerjs-0.9.6:$PATH ./bin/manet \
    --port $PORT \
    --cache $CACHE \
    --options:format $FORMAT \
    --options:width $WINDOW_WIDTH \
    --options:height $WINDOW_HEIGHT \
    --options:resizeToWidth $RESIZE_TO_WIDTH \
    --options:clipRect $WINDOW_SCROLL_X,$WINDOW_SCROLL_Y,$WINDOW_WIDTH,$WINDOW_HEIGHT \
    --engine slimerjs \
    --command "xvfb-run -a slimerjs --debug=true" \
    --compress $COMPRESS \
    --level $LOG_LEVEL \
    --ui $UI_ENABLED
