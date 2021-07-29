MAKE_OPTIONS = --unstable
PERMS = --allow-env --allow-read --allow-write # Deno permissions
ENTRYPOINT = main.ts
DENO_NAME ?= cyblog
# install with DENO_NAME=foo to install under a different name
INSTALL_OPTIONS = -f

# set DENO_MAKE_EXTRA_OPTIONS in environment to supply extra build options.
OPTIONS = $(MAKE_OPTIONS) $(DENO_MAKE_EXTRA_OPTIONS)

run:
	deno run $(PERMS) $(OPTIONS) $(ENTRYPOINT) $(DENO_RUN_OPTIONS)

dev:
	deno run $(PERMS) $(OPTIONS) --watch $(ENTRYPOINT) $(DENO_RUN_OPTIONS)

bundle:
	deno bundle $(OPTIONS) $(ENTRYPOINT) $(DENO_NAME).js

compile:
	deno compile $(PERMS) $(OPTIONS) $(ENTRYPOINT)

install: bundle
	deno run $(PERMS) $(OPTIONS) install.ts
	deno install $(INSTALL_OPTIONS) $(OPTIONS) $(PERMS) -n $(DENO_NAME) $(DENO_NAME).js