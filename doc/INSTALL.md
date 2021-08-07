# Installing Cyblog

First, you'll need [`deno`](https://deno.land/#installation) installed. Make
sure it's on your `$PATH`!

You'll also need `make`. On Linux and WSL, `make` can be installed from all major
distributions' package managers, and may even come preinstalled.

On macOS, `make` can be installed by running:
```
xcode-select --install
```
Alternatively, you can install it from [Homebrew](https://brew.sh/) by running:
```
brew install make
```
in a terminal.

On Windows, you can install `make` via [Chocolatey](https://chocolatey.org/install) 
using PowerShell. After installing Chocolatey, type:
```
choco install make
```
Alternatively, you can use [GNUWin32](http://gnuwin32.sourceforge.net/) (untested) 
or use WSL/WSL2 if you have them installed.

Then:

```
$ git clone https://github.com/shantaram3013/cyblog
$ cd cyblog
$ make
```
Cyblog uses `deno install` to install itself. Therefore, it's installed
to one of the following locations in order of preference:

* `DENO_INSTALL_ROOT` environment variable
* `$HOME/.deno`

Thus, to change where Cyblog is installed, set the DENO_INSTALL_ROOT variable.
If you'd prefer to install an executable to a different paths, see [manual install](#manual-install) below.

Cyblog also copies its config files to one of `$XDG_DATA_HOME`,
`${home}/.local/share`, `${home}/Library/Application Support`, or 
`%APPDATA%`, depending on your platform. This location
can be changed/overriden by setting the `CYBLOG_DATA_DIR` environment 
variable, and Cyblog also falls back to it if you're on an operating
system other than Windows, macOS, or Linux. Note that you'll need to
set this environment variable every time you run Cyblog.