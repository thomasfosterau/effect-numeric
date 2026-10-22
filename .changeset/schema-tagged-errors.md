---
"effect-numeric": patch
---

The arithmetic errors (`OverflowError`, `DivisionByZeroError`, `OutOfRangeError`, `DomainError`, `ParseError`) are now `Schema.TaggedError` classes instead of `Data.TaggedError`, so they can be encoded and decoded with `Schema`. Their `_tag`, fields, `message` text, `Effect` yieldability and structural equality are unchanged. `Ratio` and `Complex` also export type aliases for their schemas (`Ratio.schema`, `Ratio.schemaFromString`, `Complex.schema`, `Complex.schemaFromStruct`); no runtime behaviour changes.
