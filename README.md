# tome-app

A user interface for working on Tome locally, made with Electron.

Currently only Mac OS X is supported since this project is in its early stages
of development.

The purpose of this project is to provide the simplest user interface possible
that sufficiently enables users to use Tome without using the command line.

With that in mind, these primary actions are supported:

- View - View your site in a web browser.
- Login - Run `drush uli` and open a web browser.
- Install - (Re)install Tome using `composer install && drush tome:install`.
- Import - Import new content using `drush tome:import`.
- Restart - Restart the local server using `drush runserver`.

Binaries for PHP, Composer, Git, and SQLite are also provided so that the host
system does not need to install anything before using the application.

Since the goal of the project is to remain simple, pull requests to add major
features will likely be rejected. If you do want to contribute, focus on
improving existing functionality.

# Installation/Use

To use the app, download and open the `Tome.app` file from the latest release
on Github, then click "Open" and select the directory where your Tome site is
located.

The app is unsigned, so you may need to follow [this guide] to open it.

Once a directory is open, you can click any of the top buttons to perform a
common action on your site. The actions are listed in the section above.

If your site has not been installed yet you will get an error on startup - just
ignore it and click the "Install" button, then click "Restart" to try starting
the local server again.

By default, binaries are included so that users do not have to perform any
extra installation steps. If you would prefer to use your locally installed
binaries, check the "Use local binaries" checkbox.

If you use the default binaries provided by the app and want to change php.ini
settings, you can place an .ini file in `[HOME]/.tome_app/config/php`, where
`[HOME]` is your home directory.

# Installation (for Developers)

To install the project, run:

```
npm install
npm run get-bin
```

The `get-bin` script expects Homebrew and some version of `git` to be locally
available.

# Development

To develop the project locally, run:

```
npm start
```

# Packaging

To package the application run:

```
npm run get-bin
npm run package
```

The packaged `.app` should then be available in the `tome-darwin-x64`
directory.

[this guide]: https://support.apple.com/kb/ph25088
