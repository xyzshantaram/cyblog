# Format

### Contents

1. [Introduction](#introduction)
2. [Meta blocks](#introduction)
  - [`title`](#syntax)
3. [Declarations](#declarations)
  - [Document declarations](#document-declarations)
  - [`apply-style`](#apply-style)
  - [`template`](#template)
  - [Metadata declarations](#metadata-declarations)
  - [Block declarations](#block-declarations)
    - [`include`](#include)
    - [`block-start`](#block-start)
    - [`block-end`](#block-end)
    - [Parenting](#parenting)

### Introduction

The Cyblog format is intended to be fully compatible with existing Markdown
implementations (specifically, GitHub-flavoured Markdown), and adds a few extra
features to make Markdown suitable as a language for static site generation.

This means bold, italics, lists, headers, links, tables, and images, along with
other standard markdown syntax, are all supported out-of-the-box.

Cyblog will also be able to parse standard `.md` files, although it will not
look for or consider cyblog metadata present in those files.

In the future, Cyblog might add support for footnotes, but this is not a goal
for the first release.

Additionally, Cyblog's first release will not apply syntax highlighting to code
blocks, or automatically convert links that don't use the link syntax.

### Meta blocks

#### Introduction

Cyblog extends Markdown through _meta blocks_, which are comments that follow a
specific format designed to be convenient to parse and human-readable.

#### Syntax

Every Cyblog document must contain at least the following meta block at the
beginning of the file:

```
<!-- cyblog-meta
@title Document Title
-->
```

The first line of the comment indicates to Cyblog that this is a meta block. The
first line of every meta block must follow the format:

```
<!--<SPACE>cyblog-meta<NEWLINE>
```

Where SPACE is a single space character.

Additionally, the closing `-->` of a meta block must appear on a line by itself,
with no other whitespace.

Meta blocks can appear anywhere in a document, but the first one is special -
Cyblog looks at it to determine the title of your page. This first meta block is
called the document meta block.

Each line in a Cyblog meta block is known as a declaration.

Declarations must adhere to the following format:

```
@<DECLARATION NAME><WHITESPACE><DECLARATION VALUE><NEWLINE>
```

where `<WHITESPACE>` is either a number of SPACE characters or a single Tab
character.

The rest of the line is considered the value for that declaration. Declaration
names must match the following regex:

```
[a-z][a-z\-]+[a-z]
```

Which is to say, they must be atleast three characters long, begin and end with
a lowercase letter, and contain only lowercase letters and hyphens. Declaration
values may, of course, contain any characters in any format, but they may not
contain newlines.

If Cyblog does not understand a declaration, a warning is generated.

#### Single-line declaration syntax

For convenience reasons, Cyblog has a special syntax for meta blocks that only
contain a single declaration.

`<!--<SPACE>@<DECLARATION NAME><WHITESPACE><VALUE><SPACE>-->`

### Declarations

#### Document declarations

##### `apply-style`

- To apply a certain stylesheet to a document, add the `apply-style` declaration
  to the document meta block. The value of this declaration must be a path
  (either relative or absolute) to a CSS file. You can have as many
  `apply-style` declarations as you like.

  ```
  <!-- cyblog-meta
  @apply-style style.css
  -->
  ```

_**Note**: Cyblog **DOES NOT** perform any linting of CSS files._

##### `template`

- To apply a specific style from Cyblog's list of built-in styles, use the
  `template` declaration in the document meta block.
  ```
  <!-- cyblog-meta
  @title Page Title
  @template article
  -->
  ```

_**Note** that template types are **NOT** final yet._

##### Metadata blocks

(**`html-meta-*`** and **`meta-*`**)

Metadata declarations are parsed dynamically, so you can store and set whatever
values you see fit.

- To add a `meta` tag to the `head` of the generated HTML document, add a
  `html-meta-*` declaration to the document meta block. The value of the
  declaration is substituted for the meta tag's content attribute.

  For example:
  ```md
  <!-- cyblog-meta
  @html-meta-author John Doe
  @html-meta-description John Doe's Cyblog
  -->
  ```
  gets transformed into:
  ```html
  <meta name="author" content="John Doe">
  <meta name="description" content="John Doe's Cyblog">
  ```
- `meta-*` declarations are are parsed dynamically and if they have the
  `display:true` directive they are turned into `span` elements with the class
  `.cyb-meta-*` applied to them, so you can style them as you like.

  They are placed below the first heading found in the document.

  The block
  ```md
  <!-- cyblog-meta
  @title John Doe's Page
  @meta-author display:true John Doe
  @meta-tags display:true abc,def,ghi
  @meta-category display:true abc,def,ghi
  @meta-internal display:false hiddenvalue
  -->

  # Welcome to my page!
  ```
  gets transformed into the following:
  
  _(Contents unrelated to `meta-*` declarations may change in the future)_
  ```html
  <!DOCTYPE html>
  <html>
    <head>
      <title>John Doe's Page</title>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel='stylesheet' href='style.css'>
    </head>
    <body>
      <h1 class='cyb-h1' id='welcome-to-my-page'> Welcome to my page! </h1>
      <span class='cyblog-meta-author'> John Doe </span>
      <span class='cyblog-meta-tags'> abc,def,ghi </span>
      <span class='cyblog-meta-category'> abc,def,ghi </span>
    </body>
  </html>
  ```

#### Block declarations

A block is a Cyblog object that gets translated to a div.

##### `include`

- To add a common block (such as a nav or a footer) to a document, use the
  `include` declaration. The value of this declaration must be a path to a
  plaintext file containing an HTML snippet. The file's contents will be added
  to the document in the correct place before it is processed, in a manner
  similar to copy-pasting.

  ```md
  <!-- cyblog-meta
  @include header.html
  -->
  ```

_**Note**: Cyblog **DOES NOT** perform any linting of `@include`d HTML
snippets._

##### `block-start`

- To mark a text block as a special block so you can apply styling to it, add a
  meta block before it, with the declaration `block-start`, with the value being
  an identifier for that block.

  Block names must follow the same constraints as declaration names, and must
  additionally be unique.

  For example:

  ```md
  <!-- cyblog-meta
  @block-start my-special-block
  -->
  ```
  `block-start` declarations are also used to apply ids and classes to elements.
  This is done in the following way:

  ```md
  <!-- @block-start block-with-id-and-class #id .class -->
  ```

  You can apply multiple classes, too.
  ```md
  <!-- @block-start block-with-two-classes .class1.class2 -->
  ```

##### `block-end`

- To close a block, simply add a meta block with the block-end declaration.

  Blocks with this declaration must only contain that declaration and nothing
  else.
  ```md
  <!-- @block-end my-special-block -->
  ```

##### Parenting

- Every standard Markdown construct between a`block-start` and a `block-end`
  declaration will be treated as a child of the block those declarations
  enclose.

---
