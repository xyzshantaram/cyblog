# cyblog

Cybernetically enhanced static site generation.

### Installing
See [doc/INSTALL.md](doc/INSTALL.md).

#### Manual install
```
$ make compile
```

This will leave you with a `cyblog` executable in the current directory.

### Usage

Cyblog operates on either single pages or entire directories, converting the
Cyblog markup into HTML.

[Read the docs](doc/) to learn more about Cyblog!

You can invoke Cyblog with:

```
cyblog {SOURCEDIR|SOURCEFILE.cyblog} [options]
```

#### Options:

- `-a`, `--apply-style` The name of a stylesheet to include into the final
  document that will be built. Functions the same as the `apply-style`
  declaration.
- `-c`, `--force-cyblog`: Force cyblog to treat Markdown files as Cyblog markup.
- `-e`, `--exclude-file`: Exclude a file from being built. Use exclude-file one time for each directory you want to exclude.
- `-E`, `--exclude-dir`: Don't process any directories or children of those directories that have the given dirname. Use exclude-dir one time for each directory you want to exclude.
- `-f`, `--force`: Overwrites the destination path if it exists.
- `-o`, `--output`: The name of the output directory or file.  
- `-r`, `--convert-readmes`: Convert files named `README.md` to `index.html`. Useful for converting GitHub repos.
  If this is not supplied, Cyblog will use a name from:
  - `SOURCEFILE-dist.html` (in case of a file)
  - `SOURCEDIR-dist` (in case of a directory)

### Features
* Fast - builds this entire repo in 0.2s
* Fully markdown-compatible, extended via comments - every Markdown file is already a valid Cyblog source file!
* Simple - Cyblog declarations are designed to be easy to read and remember
* Mustache templating support
* Builtin templates  and styles for various purposes (see [templates.md](doc/templates.md) and [the manual](doc/MANUAL.md)).
  * Presentation template, so you can write slides in markdown and extend them with Cyblog, then build it all into a self-contained HTML file when you need to present.
  * Responsive image gallery, so no matter whether you're an artist or an engineer, you can build your portfolio with Cyblog.
* Allows adding arbitrary styling and HTML through `@apply-style` and `@include`
* Front matter support via `@meta` declarations

### Contributing

Feel free to fork the repo and open a PR. Cyblog is written in TypeScript and
all documentation is written in Markdown.

### Get in touch

You can contact me by e-mailing me at [me@shantaram.xyz](mailto:me@shantaram.xyz).

There's also a Cyblog IRC channel, `#cyblog`, on [libera.chat](https://web.libera.chat/). I post updates there.

### License

```
The MIT License (MIT)

Copyright © 2021 Siddharth Singh

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:
    * The above copyright notice and this permission notice shall be included
    in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### Acknowledgements

`getConfigDir()` taken from https://github.com/justjavac/deno_data_dir under the
MIT license. Copyright © justjavac.

`Marked` markdown parser library from https://github.com/ubersl0th/markdown under
the MIT license. Copyright © 2020 Eivind Furuberg.

`swiped-events.js` from https://github.com/john-doherty/swiped-events,
Copyright © 2017 John Doherty. http://www.johndoherty.info.

Thanks to @porridgewithraisins for help testing on Windows.