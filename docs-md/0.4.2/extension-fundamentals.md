## State: `var state = {...}`

`state` is an optional parameter to parsers and outputters which is passed
to each parse/output rule. It is a plain javascript object which may be
modified by the rules as parsing or outputting is running. This allows
giving extra runtime information to rules, as well as extracting information
gained during parsing/outputting.

simple-markdown uses state to pass around some internal information, and you
can add custom information to it for powerful extensions, which is covered
under the *Advanced Extensions* section later.

The following public fields on `state` can be used to interact with
simple-markdown:

```
state.inline  // true if inside a context where block rules are not permitted

state.disableAutoBlockNewlines  // setting this to true turns off the automatic
                                // addition of '\n\n' for block parsing

state.key  // the suggested react key for the current node
           // use this for the react key when implementing a custom rule
```

simple-markdown reserves all fields beginning with `_` on `state` for future
internal use. Currently, the following are used:

```
state._defs  // used for link/image url definitions ([1]: http://example.com)
state._refs  // used for references to url definitions ([link][1])
state._list  // used for parsing tight lists
```


Extensions
==========

