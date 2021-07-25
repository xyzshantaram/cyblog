MAKE_OPTIONS = --unstable
PERMS = --allow-net --allow-env --allow-read --allow-write # Deno permissions
ENTRYPOINT = main.ts
DENO_NAME ?= main # install with DENO_NAME=foo to install under a different name

# set DENO_MAKE_EXTRA_OPTIONS in environment to supply extra build options.
OPTIONS = $(MAKE_OPTIONS) $(DENO_MAKE_EXTRA_OPTIONS)

default: compile

dev:
    deno run $(PERMS) $(OPTIONS) --watch $(ENTRYPOINT)

bundle:
    deno bundle $(OPTIONS) $(ENTRYPOINT) $(DENO_NAME)

compile:
    deno compile $(PERMS) $(OPTIONS) $(ENTRYPOINT)

install:
    deno install $(PERMS) $(OPTIONS) -n $(DENO_NAME)

run:
    deno run $(PERMS) $(OPTIONS) $(ENTRYPOINT)
