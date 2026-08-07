# ADR-0009: This product does not generate code and does not check application code

Status: Accepted

Out of scope, permanently unless this decision is amended: generating application code from the
Corpus, and verifying that application code conforms to the Corpus.

Model-to-code generation has a long record of failure, and the mechanism is always the same: to
generate code the model must describe everything, including the large majority that carries no
business meaning, so the model grows past the codebase and acquires its own maintenance burden. A
better generator does not fix this; it is a property of the mapping.

Code generation is also the cheap step now. Generation is abundant; agreement about what is true is
scarce. This product works on the scarce one.

Consequence: outputs stop at the boundary of describing knowledge. Any consumer wanting code is free
to build on the published index, outside this product.
