MAKE_OPTIONS = --unstable
PERMS = --allow-env --allow-read --allow-write # Deno permissions
ENTRYPOINT = src/main.ts
DENO_NAME ?= cyblog
# install with DENO_NAME=foo to install under a different name
INSTALL_OPTIONS = -f

# set DENO_MAKE_EXTRA_OPTIONS in environment to supply extra build options.
OPTIONS = $(MAKE_OPTIONS) $(DENO_MAKE_EXTRA_OPTIONS)

default: install

run:
	deno run $(PERMS) $(OPTIONS) $(ENTRYPOINT) $(DENO_RUN_OPTIONS)

bundle:
	deno bundle $(OPTIONS) $(ENTRYPOINT) $(DENO_NAME).js

copyconf:
	deno run $(PERMS) $(OPTIONS) install/install.ts

compile: bundle copyconf
	deno compile $(PERMS) $(OPTIONS) $(DENO_NAME).js

install: bundle copyconf
	deno install $(INSTALL_OPTIONS) $(OPTIONS) $(PERMS) -n $(DENO_NAME) $(DENO_NAME).js

website:
	cyblog . -o site --exclude-dir site-dist --exclude-dir .git -f