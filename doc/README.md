# Cyblog Docs

### Index
1. [The spec](MANUAL.md) - Read the spec and familiarise yourself with Cyblog!
2. [Templates](templates.md) - Read about templates.
3. [Basics of Cyblog](#basics-of-cyblog) - A basic intro to Cyblog.

### Basics of Cyblog
1) Install Cyblog using the instructions in the README.
2) Put the following into a file and save it as `hello.cyblog`.
  ```
  <!-- cyblog-meta
  @title Hello, world!
  -->

  Hello, world!
  ```
3) Run Cyblog with `cyblog hello.cyblog`.
4) Congrats! You just wrote your first Cyblog document. The result should be
saved as `hello-dist.html`, which you can now open with your favourite browser.
5) To learn more about Cyblog syntax, read the [manual](MANUAL.md) and `examples/demo.cyblog`.

### Building directories
1) Run Cyblog with `cyblog dirname` to build an entire directory. Cyblog
recursively walks the directory tree and builds all the `.md` and `.cyblog`
files it finds, preserving nested folders, etc.
2) The result should be stored in `dirname-dist`. Cyblog will simply copy over
any files it doesn't understand.