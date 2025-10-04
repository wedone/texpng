# syntax=docker/dockerfile:1

# 选择稳定的 Debian slim 基础镜像，体积与兼容性较平衡
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    # 使用系统的 Chromium，而不是在安装 puppeteer 时下载
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    # Debian/Ubuntu 上 chromium 的常见路径（bookworm 为 /usr/bin/chromium）
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 安装 Chromium 与常用字体（含数学字体），并包含 Latin Modern Math（由 texlive-fonts-extra 提供）
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-stix \
      fonts-lmodern \
      fonts-liberation \
      fonts-dejavu-core \
      texlive-fonts-extra \
      fontconfig \
      dumb-init; \
    fc-cache -f; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 仅复制 package.json 以利用 Docker 层缓存
COPY package*.json ./

# 如果没有 package-lock.json，使用 npm install --omit=dev；有锁则可改为 npm ci --omit=dev
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 使用非 root 用户运行，提升安全性
RUN chown -R node:node /app
USER node

# 通过 dumb-init 作为 PID 1，正确处理信号
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "server/index.js"]
