"use strict";

(() => {
  const util = require("util");
  const { spawn } = require("child_process");
  const find = require("find-process");
  const { shell, ipcRenderer, remote } = require("electron");
  const settings = require("electron-settings");
  const fixPath = require("fix-path");
  const homedir = require("os").homedir();

  fixPath();

  const originalPath = process.env.PATH;

  function getEnv() {
    if (settings.get("useLocal")) {
      process.env.PATH = originalPath;
    } else {
      process.env.PATH = `${__dirname}/bin:${process.env.PATH}`;
      process.env.PHP_INI_SCAN_DIR = `${__dirname}/config/php:${homedir}/.tome_app/config/php`;
    }
    return process.env;
  }

  function registerChild(child) {
    ipcRenderer.send("registerChild", child.pid);
    child.on("exit", () => {
      ipcRenderer.send("unRegisterChild", child.pid);
    });
  }

  function showLoading(message) {
    document.getElementById("loadingScreen").classList.add("visible");
    document.getElementById("loadingScreen").innerText = message;
  }

  function hideLoading() {
    document.getElementById("loadingScreen").classList.remove("visible");
  }

  function disableAll() {
    for (let actionButton of document.querySelectorAll("button,input")) {
      actionButton.setAttribute("disabled", "disabled");
    }
  }

  function enableAll() {
    for (let actionButton of document.querySelectorAll("button,input")) {
      actionButton.removeAttribute("disabled");
    }
  }

  async function spawnPromise(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, options);
      registerChild(child);
      child.on("error", error => {
        reject(new Error(error.message));
      });
      child.on("close", code => {
        if (code !== 0) {
          reject(new Error("Failed to execute command."));
        }
        resolve();
      });
    });
  }

  function showError(message) {
    remote.dialog.showErrorBox("Whoops", message);
  }

  async function changeDirectory(path) {
    settings.set("path", path);
    document.getElementById("directoryLabel").innerText = path;
    document.getElementById("directoryLabel").setAttribute("title", path);
    document.getElementById("directoryButton").innerText = "Change";
    disableAll();
    try {
      await startServer(path);
    } catch (error) {
      showError(error.message);
      enableAll();
      return;
    }
    enableAll();
  }

  async function killServer() {
    const results = await find("port", 8888);
    if (results.length) {
      results.forEach(({ pid, name }) => {
        if (name.match(/php/)) {
          process.kill(pid);
        }
      });
    }
    if ((await find("port", 8888)).length) {
      throw new Error("Unable to stop existing local server.");
    }
    return true;
  }

  async function startServer(path) {
    await killServer();
    return new Promise((resolve, reject) => {
      const child = spawn("php", ["./vendor/bin/drush", "runserver"], {
        detached: true,
        cwd: path,
        env: getEnv()
      });
      registerChild(child);
      child.on("error", error => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });
      child.on("exit", (code, signal) => {
        reject(new Error(`Failed to start server: Error code ${code}`));
      });
      child.stderr.on("data", data => {
        if (data.toString().match(/HTTP server listening on 127.0.0.1/)) {
          resolve();
        } else {
          reject(new Error(`Failed to start server: ${data.toString()}`));
        }
      });
      child.unref();
    });
  }

  function useLocalOnChange() {
    settings.set("useLocal", this.checked);
    restartButtonOnClick();
  }

  function directoryInputOnChange() {
    changeDirectory(this.files[0].path);
  }

  function viewButtonOnClick() {
    shell.openExternal("http://127.0.0.1:8888");
  }

  function loginButtonOnClick() {
    const path = settings.get("path");
    if (!path) {
      showError("Failed to login: No path is set.");
      return;
    }
    const child = spawn(
      "php",
      [
        "./vendor/bin/drush",
        "uli",
        '--uri="http://127.0.0.1:8888"',
        "--simulate"
      ],
      {
        cwd: path,
        shell: true,
        env: getEnv()
      }
    );
    registerChild(child);
    child.stdout.on("data", data => {
      shell.openExternal(data.toString());
    });
    child.stderr.on("data", data => {
      if (!data.toString().match(/success/)) {
        showError(`Failed to login: ${data.toString()}`);
      }
    });
    child.on("error", error => {
      showError(`Failed to login: ${error.message}`);
    });
  }

  function restartButtonOnClick() {
    if (settings.get("path")) {
      changeDirectory(settings.get("path"));
    }
  }

  async function installButtonOnClick() {
    const path = settings.get("path");
    if (!path) {
      return;
    }
    showLoading("Installing site...");
    disableAll();
    try {
      await spawnPromise("composer", ["install"], {
        cwd: path,
        shell: true,
        env: getEnv()
      });
      await spawnPromise("php", ["./vendor/bin/drush", "tome:install", "-y"], {
        cwd: path,
        shell: true,
        env: getEnv()
      });
    } catch (error) {
      showError(`Failed to install Tome: ${error.message}`);
    }
    enableAll();
    hideLoading();
  }

  async function importButtonOnClick() {
    const path = settings.get("path");
    if (!path) {
      return;
    }
    showLoading("Importing content...");
    disableAll();
    try {
      await spawnPromise("php", ["./vendor/bin/drush", "tome:import", "-y"], {
        cwd: path,
        shell: true,
        env: getEnv()
      });
    } catch (error) {
      showError(`Failed to import new content: ${error.message}`);
    }
    enableAll();
    hideLoading();
  }

  window.addEventListener("load", function() {
    if (settings.get("path")) {
      changeDirectory(settings.get("path"));
    }
    if (settings.get("useLocal")) {
      document.getElementById("useLocal").checked = true;
    }
    document.getElementById("viewButton").onclick = viewButtonOnClick;
    document.getElementById("loginButton").onclick = loginButtonOnClick;
    document.getElementById("installButton").onclick = installButtonOnClick;
    document.getElementById("importButton").onclick = importButtonOnClick;
    document.getElementById("restartButton").onclick = restartButtonOnClick;
    document.getElementById("directoryInput").onchange = directoryInputOnChange;
    document.getElementById("useLocalInput").onchange = useLocalOnChange;
  });

  window.addEventListener("error", function(event) {
    showError(event.error.message);
  });
})();
