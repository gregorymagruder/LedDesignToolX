const { app, BrowserWindow, ipcMain } = require('electron');
// const installExtension, { VUEJS_DEVTOOLS } = require('electron-devtools-installer');
// const { enableLiveReload } = require('electron-compile');

const url = require('url');
const path = require('path');


// require('./assets/css/jsplumbtoolkit.css')

// var remote = require('remote');
// var win = remote.getCurrentWindow();
// win.webContents.session.clearCache(function () {
//   //some callback.
// });

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let isDevMode = process.execPath.match(/[\\/]electron/);

if (process.env.NODE_ENV === 'production') {
  isDevMode = false;
}

// if (isDevMode) enableLiveReload();

process.setMaxListeners(Infinity);

const createWindow = async () => {
//   Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    backgroundColor: '#333',
    show: false,
  });
  // mainWindow.once('ready-to-show', () => {
  //   mainWindow.show()
  // })


  ipcMain.on('eHelper', (event, arg) => {
    mainWindow.webContents.send('exit-helper', arg);
  });
  // eslint-disable-next-line func-names
  mainWindow.on('close', function (e) {
    e.preventDefault();
    mainWindow.webContents.send('event_from_main', 0);

    const dialog = () => {
      const choice = require('electron').dialog.showMessageBox(this,
        {
          type: 'question',
          buttons: ['Save', 'Yes', 'Cancel'],
          title: 'Confirm',
          message: 'Are you sure you want to quit without saving?',
        });


      if (choice === 0) {
      // save
        mainWindow.webContents.send('save-exit', true);
      }

      if (choice === 1) {
      // yes
        app.exit(0);
      }
      if (choice === 2) {
      // cancel
        e.preventDefault();
      }
    };
    let wasClicked;
    ipcMain.on('event_from_renderer', (event, arg) => {
      wasClicked = arg;

      if (wasClicked) {
        app.exit();
      } else {
        dialog();
      }
    });
  });

  // app.use(mainWindow["vue-js-modal"].default);


  // and load the index.html of the app.
  // mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open the DevTools.
  if (isDevMode) {
    // await installExtension(VUEJS_DEVTOOLS);
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// import VModal from 'vue-js-modal';
// app.use(VModal);


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);


// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
