# Templates in Cyblog

Templates are bundles of HTML and CSS that make your Cyblog
document look a certain way. Templates use mustache syntax
in conjunction with the `@meta-*` declarations from your document
to change their content.

### Contents

1. [The `blog` builtin](#blog)
1. [The `presentation` builtin](#presentation)
1. [Adding your own templates](#custom-templates)

### Blog

To use the `blog` built-in template:

1. Apply the `<!-- @template blog -->` declaration.
2. Add `@meta-*` declarations for `blogname` and `blog-header`. These should be
   HTML strings.
3. Add the `@meta-blog-footer-items` declaration. This should also be an HTML
   string. This string will be placed in the document footer.

An example is provided in `/examples/templates.cyblog`.

### Presentation

_Warning:_ The `presentation` template uses JavaScript to provide its functionality.
If you have JavaScript disabled, pages remain readable, but they no longer act as 
slideshows.

To use the `presentation` built-in template:

1. Apply the `<!-- @template presentation -->` declaration to your document.
2. Add `@meta-*` declarations called `presentation-header` and `presentation-footer`.
   These will be filled into the presentation header and footer.
3. Add your slides by creating Cyblog blocks with the `.presentation-slide` class.
   Slides support all usual Cyblog features.

See `examples/presentation-demo.cyblog` for an example presentation.

### Custom templates

To add a custom template or modify an existing one, simply put a directory (named
according to cyblog's declaration rules, of course) in one of the config directories
listed in README.md.

Note that builtin templates get overwritten on updates, so make copies of default
templates if you intend to edit them.
