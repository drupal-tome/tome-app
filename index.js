"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");

let children = [];

let mainWindow;

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
  return;
}

app.on("second-instance", (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 175,
    webPreferences: {
      nodeIntegration: true
    },
    resizable: false
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", function() {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function() {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("registerChild", (event, pid) => {
  children.push(pid);
});

ipcMain.on("unRegisterChild", (event, pid) => {
  const index = children.indexOf(pid);
  if (index > -1) {
    children.splice(index, 1);
  }
});

app.on("before-quit", function() {
  children.forEach(pid => {
    try {
      process.kill(-pid);
    } catch (e) {}
  });
});
