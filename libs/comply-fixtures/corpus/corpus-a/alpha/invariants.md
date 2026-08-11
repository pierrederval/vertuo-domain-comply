---
area: alpha
kind: invariants
state: Guess - From System X
stewart: avery
---

## I-1 A Widget belongs to exactly one Crate

*Invariant.*

A Widget is in one Crate or in none. It is never in two.

## I-2 A Crate is never emptied twice

*Invariant.*

Emptying a Crate that is already empty changes nothing and is not an error.
