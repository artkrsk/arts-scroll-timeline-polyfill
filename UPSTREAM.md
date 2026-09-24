# Upstream source and Arts patches

The readable files in `src/ts/upstream/` began with the `src/` directory of
`scroll-timeline-polyfill` version **1.1.0** published on npm. The package's
recorded `gitHead` is `b12de7813379379709602ac9bad2c100effe963e`; the
tarball's SHA-512 integrity is
`sha512-BpL3gk3Ynt/5VYaDFUNUP/FTkDldwKQnWcA07g/mDHkMVS9pQUyUXBpsy4RZYAgsfFeI1tWcnPNrEFtCpQoO9Q==`.
The exact tarball and its integrity are the source baseline. Its copyright
headers remain on the source files, and the Apache-2.0 license is delivered
as `src/php/libraries/scroll-timeline/LICENSE`.

Arts changes are maintained in the readable source. The `src/ts/arts/` modules
contain CSS value parsing, stylesheet ownership, and binding refresh logic;
the upstream modules expose named internal hooks and carry these focused fixes:

1. Ignore hostile sheets without aborting initialization; respect
   `data-aphrodite` on links as well as inline styles, and leave sheets with no
   timeline declarations untouched.
2. Keep both native-support guards. A browser must support named and anonymous
   timeline syntax and animation ranges before bypassing the bundle.
3. Avoid measuring a detached source and dividing by a zero-length animation
   range. Release a timeline's weak reference and observers when its source
   changes or it is discarded; sample the source that owns each observer.
   Keep the no-inset programmatic range distinct from CSS `auto` insets, and
   reject unsupported timeline objects without calling an absent upstream helper.
4. Bootstrap `auto` and omitted CSS animation durations without changing
   explicit durations, fill modes, or unrelated animation-list slots. Split
   CSS lists around nested functions, strings, escapes, and comments.
5. Resolve view-timeline inset variables against the subject, including
   fallbacks, inheritance changes, and geometry refreshes. Repeat inset and
   axis lists by their own lengths when a rule declares multiple timelines.
6. Replace stylesheet registrations in DOM order after HMR, including repeated
   identical authored text. Rebind existing animation proxies, release removed
   bindings, and bound mutation processing to changed nodes.
7. Follow css-syntax-3 in the tokenizer: the `+`, `-`, `.` and `\` decisions
   include the current code point, escapes consume up to six hex digits and
   map zero and surrogates to U+FFFD, TAB is whitespace, `url(` matches the
   whole ident only, and escaped url code points are appended as text.
   `min()`/`max()` partial simplification unwraps a single remaining child.

## TypeScript fork

The original JavaScript modules now correspond to `.ts` modules under the same
upstream/Arts split. Private timeline, animation, parser, and numeric state is
explicitly typed. Platform adapters describe the partial Typed OM surface and
native method boundaries. Shared probes and constants drive both entrypoints;
public declarations contain only supported consumer contracts.

Migration fixes additionally cover omitted/numeric/frozen animation options,
keyword insets, canonical CSS factory units and `CSS.rem`, replacement state,
`commitStyles` and event dispatch forwarding, persisted page lifecycle, parser
operand validation, and nullable geometry. The stylesheet skip comparison now
has explicit membership precedence. Numeric zero is a number; converting a unit
to itself is valid. The unused duplicate inset parser was removed. The effect
adapter intercepts timing methods while retaining native receivers and source
methods. Existing no-inset defaults and provider ownership remain covered. A
unitless zero is accepted as a `view-timeline-inset` length, and `!important`
survives the animation shorthand rewrite.

## Updating upstream

1. Obtain the **source** tarball at an exact version and verify its npm integrity.
   Extract it outside the repository. Keep the original baseline identified
   above available for comparison; do not add a second maintained JavaScript tree.
2. Compare the new upstream JavaScript against that original JavaScript baseline
   to identify semantic upstream changes. Map source filenames from `.js` to
   `.ts`, then port those changes into the typed modules while retaining Arts
   patches, type contracts, and copyright headers.
3. Update the version, integrity, revision, patch inventory, and browser API audit.
   Preserve the named hooks consumed by the Arts modules. Avoid replacing a
   delivery asset with upstream `dist` output.
4. Run the README verification, including consumer types, all browser projects,
   PHP integration, and deterministic generation. Commit readable source, both
   generated script assets, and generated declarations together.
