# Upstream source and Arts patches

The readable files in `src/js/upstream/` began with the `src/` directory of
`scroll-timeline-polyfill` version **1.1.0** published on npm. The package's
recorded `gitHead` is `b12de7813379379709602ac9bad2c100effe963e`; the
tarball's SHA-512 integrity is
`sha512-BpL3gk3Ynt/5VYaDFUNUP/FTkDldwKQnWcA07g/mDHkMVS9pQUyUXBpsy4RZYAgsfFeI1tWcnPNrEFtCpQoO9Q==`.
The exact tarball and its integrity are the source baseline. Its copyright
headers remain on the source files, and the Apache-2.0 license is delivered
as `src/php/libraries/scroll-timeline/LICENSE`.

Arts changes are maintained in the readable source. The `src/js/arts/` modules
contain CSS value parsing, stylesheet ownership, and binding refresh logic;
the upstream modules expose named internal hooks and carry these focused fixes:

1. Ignore hostile sheets without aborting initialization; respect
   `data-aphrodite` on links as well as inline styles, and leave sheets with no
   timeline declarations untouched.
2. Keep both native-support guards. A browser must support named and anonymous
   timeline syntax and animation ranges before bypassing the bundle.
3. Avoid measuring a detached source and dividing by a zero-length animation
   range. Release observers when an unused timeline is discarded, and reject
   unsupported timeline objects without calling an absent upstream helper.
4. Bootstrap `auto` and omitted CSS animation durations without changing
   explicit durations, fill modes, or unrelated animation-list slots. Split
   CSS lists around nested functions, strings, escapes, and comments.
5. Resolve view-timeline inset variables against the subject, including
   fallbacks, inheritance changes, and geometry refreshes.
6. Replace stylesheet registrations in DOM order after HMR, including repeated
   identical authored text. Rebind existing animation proxies, release removed
   bindings, and bound mutation processing to changed nodes.

To update upstream, obtain its **source** tarball at an exact version and
verify the integrity from npm metadata. Extract it outside the repository;
diff its `src/` against `src/js/upstream/` to see the current Arts edits.
Rebase those edits onto the new modules, keeping the named exports used by
`src/js/arts/`. Update this file's version, integrity, revision, and patch
inventory. Do not copy an upstream `dist` file over the delivery asset or edit
generated JavaScript. Run the full verification in the README, inspect the
generated diff, then commit the readable source and generated asset together.
