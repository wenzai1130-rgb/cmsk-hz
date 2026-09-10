#!/bin/sh
set -eu

LABEL="com.kw.cmsk-hz.vite.dev"
PORT=5173
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_PLIST="$ROOT_DIR/scripts/${LABEL}.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
GUI_DOMAIN="gui/$(id -u)"
LOG_FILE="/tmp/cmsk-hz-vite-${PORT}.log"

service_loaded() {
  launchctl print "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1
}

install_service() {
  mkdir -p "$(dirname "$TARGET_PLIST")"
  cp "$SOURCE_PLIST" "$TARGET_PLIST"
  launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
  launchctl bootstrap "$GUI_DOMAIN" "$TARGET_PLIST"
  launchctl kickstart -k "$GUI_DOMAIN/$LABEL"
  sleep 2

  if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "预览服务已安装并启动：http://127.0.0.1:${PORT}"
    echo "日志：$LOG_FILE"
  else
    echo "服务已注册，但端口尚未就绪，请查看：$LOG_FILE" >&2
    tail -40 "$LOG_FILE" >&2 || true
    launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
    rm -f "$TARGET_PLIST"
    exit 1
  fi
}

uninstall_service() {
  launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
  rm -f "$TARGET_PLIST"
  echo "预览服务已停止并移除开机启动"
}

case "${1:-start}" in
  start|install)
    install_service
    ;;
  stop|uninstall)
    uninstall_service
    ;;
  restart)
    launchctl kickstart -k "$GUI_DOMAIN/$LABEL"
    echo "预览服务已重启"
    ;;
  status)
    if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      if service_loaded; then
        echo "预览服务运行中（launchd）：http://127.0.0.1:${PORT}"
      else
        echo "预览服务运行中（手动模式）：http://127.0.0.1:${PORT}"
      fi
    elif service_loaded; then
      echo "launchd 服务已注册，但端口未就绪，请查看：$LOG_FILE"
      exit 1
    else
      echo "预览服务未运行"
      exit 1
    fi
    ;;
  logs)
    tail -f "$LOG_FILE"
    ;;
  *)
    echo "用法：$0 {start|stop|restart|status|logs}" >&2
    exit 2
    ;;
esac
