
---

## Addition · 22 Sep 2026 · clauses

`ContractDocument` gains a required `clauses` array, because a finding is a note in the margin of a clause and the product previously had no document body to annotate.

    Clause {
      id           string
      number       string        "7.2"
      heading      string        "Non-compete"
      body         string        full prose, paragraphs split on a blank line
      findingIds   string[]      Finding.findingId values on this clause
      revisedAt    string|null   ISO 8601, set when an advocate revises wording
    }

`Finding.clauseReference` ("Clause 7.2") remains the join key to `Clause.number` ("7.2"). The join is maintained in both directions: `Clause.findingIds` lists the findings raised against it.

**No existing field changes shape**, so every binding described above stays valid.

Clauses are a **detail-page concern only**. List and queue endpoints must not return them, consistent with the server-side aggregation decision above — the queue needs a findings count and severity aggregate, not the contract body.
