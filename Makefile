MAKE_OPTIONS = --unstable
PERMS = --allow-env --allow-read --allow-write --allow-net=deno.land:443 # Deno permissions
ENTRYPOINT = src/main.ts
DENO_NAME ?= cyblog
# install with DENO_NAME=foo to install under a different name
INSTALL_OPTIONS = -f --global

# set DENO_MAKE_EXTRA_OPTIONS in environment to supply extra build options.
OPTIONS = $(MAKE_OPTIONS) $(DENO_MAKE_EXTRA_OPTIONS)

default: install

run:
	deno run $(PERMS) $(OPTIONS) $(ENTRYPOINT) $(DENO_RUN_OPTIONS)

bundle:
	deno run $(MAKE_OPTIONS) $(PERMS) build.ts

copyconf:
	deno run $(PERMS) $(OPTIONS) install/install.ts

compile: bundle copyconf
	deno compile $(PERMS) $(OPTIONS) $(DENO_NAME).js

install: bundle copyconf
	deno install $(INSTALL_OPTIONS) $(OPTIONS) $(PERMS) -n $(DENO_NAME) $(DENO_NAME).js

website:
	cyblog . -mo docs/ --plug --exclude-dir docs --exclude-dir .git -f --exclude-dir src --exclude-dir install --exclude-dir .vscode --exclude-file todo --exclude-file .gitignore --exclude-file LICENSE --exclude-file Makefile --exclude-file cyblog.js --convert-readmes --apply-style '@builtin-mediaquery-dark'
