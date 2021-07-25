# Format

### Introduction

The Cyblog format is intended to be fully compatible with existing Markdown
implementations (specifically, GitHub-flavoured Markdown), and adds a few extra
features to make Markdown suitable as a language for static site generation.

This means bold, italics, lists, headers, links, tables, and images, along with
other standard markdown syntax, are all supported out-of-the-box.

In the future, Cyblog might add support for footnotes, but this is not a goal
for the first release.

Additionally, Cyblog's first release will not apply syntax highlighting to code
blocks.

### Meta blocks

Cyblog extends Markdown through _meta blocks_, which are comments that follow a
specific format designed to be convenient to parse and human-readable.

Every Cyblog document must contain at least the following meta block at the
beginning of the file:

```md
<!-- cyblog-meta
@title Document Title
-->
```

The first line of the comment indicates to Cyblog that this is a meta block. The
first line of every meta block must follow the format:

```md
<!--<SPACE>cyblog-meta<NEWLINE>
```

Where SPACE is a single space character.\
Additionally, the closing `-->` of a meta block must appear on a line by itself,
with no other whitespace.

Meta blocks can appear anywhere in a document, but the first one is special -
Cyblog looks at it to determine the title of your page. This first meta block is
called the document meta block.

Each line in a Cyblog meta block is known as a declaration.\
Declarations must adhere to the following format:

```
@<DECLARATION NAME><WHITESPACE><DECLARATION VALUE><NEWLINE>
```

where `<WHITESPACE>` is either a number of SPACE characters or a single Tab
character.\
The rest of the line is considered the value for that declaration. Declaration
names must match the following regex:

```re
[a-z][a-z\-]+[a-z]
```

Which is to say, they must be atleast three characters long, begin and end with
a lowercase letter, and contain only lowercase letters and hyphens. Declaration
values may, of course, contain any characters in any format, but they may not
contain newlines.

### Declarations

#### Document declarations

- To apply a certain stylesheet to a document, add the `apply-style` declaration
  to the document meta block. The value of this declaration must be a path
  (either relative or absolute) to a CSS file. You can have as many
  `apply-style` declarations as you like.

  ```md
  <!-- cyblog-meta
  @apply-style style.css
  -->
  ```

_**Note**: Cyblog **DOES NOT** perform any linting of CSS files._

- To add a `meta` tag to the `head` of the generated HTML document, add a
  `meta-*` declaration to the document meta block. The value of the declaration
  is substituted for the meta tag's content attribute.\
  For example:
  ```md
  <!-- cyblog-meta
  @meta-author John Doe
  @meta-description John Doe's Cyblog
  -->
  ```
  gets transformed into:
  ```html
  <meta name="author" content="John Doe">
  <meta name="description" content="John Doe's Cyblog">
  ```

#### Block declarations

A block is a Cyblog object that gets translated to a div.

- To add a common block (such as a nav or a footer) to a document, use the
  `include` declaration. The value of this declaration must be a path to a
  Cyblog document or a plaintext file containing an HTML snippet. The file's
  contents will be added to the document in the correct place before it is
  processed, in a manner similar to copy-pasting.

  ```md
  <!-- cyblog-meta
  @include header.cyb
  -->
  ```

_**Note**: Cyblog **DOES NOT** perform any linting of `@include`d HTML
snippets._

- To mark a text block as a special block so you can apply styling to it, add a
  meta block before it, with a declaration `@block-start`, with the value being
  an identifier for that block.

  Block names must follow the same constraints as declaration names, and must
  additionally be unique.

  For example:

  ```md
  <!-- cyblog-meta
  @block-start my-special-block
  -->
  ```

- To apply a specific HTML class or id to a block, add it to the declaration as
  follows:
  ```md
  <!-- cyblog-meta
  @block-class class-name
  @block-id 
  -->
  ```

  You can have as many `block-class` declarations as you like, but each block
  must only contain either one or no `block-id` declarations.

- To mark a block as a child of another block, (ie, that block will be included
  as a child of the parent block in the generated HTML) add the `block-parent`
  declaration with the value equal to an identifier that has been previously
  declared in the document.
  ```md
  <!-- cyblog-meta
  @block-parent my-special-block
  @block-class child
  -->
  ```
- To close a block, simply add a meta block with the block-end declaration.\
  Blocks with this declaration must only contain that declaration and nothing
  else.\
  Every standard Markdown construct between a`block-start`and
  a`block-end`declaration will be treated as a child of that block.\
  Finally, blocks within these boundaries that don't specify the`block-parent`
  declaration will also be treated as a child of this block.

---
