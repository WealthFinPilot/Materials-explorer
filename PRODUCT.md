# Product

## Register

product

## Users

Metallurgical laboratory technicians running OES (optical-emission spectrometry)
analyses. They sit in front of a spectrometer that returns raw relative
intensities for ~20 chemical elements and need to know, quickly and objectively,
which reference grade the sample most likely matches. They are domain experts in
metallurgy, not in software; the tool is one step inside an analysis workflow,
not a destination.

## Product Purpose

Turn a multi-element OES reading into a ranked, quantified shortlist of probable
alloy grades, replacing subjective visual comparison against printed reference
tables. The user enters measured values, picks the relevant database (carbon
steel or stainless), and gets the top candidates with a similarity score. Success
is: the right grade lands at the top, the technician trusts it at a glance, and
the whole interaction takes seconds.

## Brand Personality

Precise, instrument-grade, quietly confident. The voice of a well-made
measurement device: it states results, it does not sell. Three words: exact,
sober, trustworthy.

## Anti-references

- The "industrial dashboard" cliché: dark charcoal, foundry-orange accents,
  hazard stripes, gauge widgets. It is the first-order category reflex and reads
  as decoration, not instrument.
- SaaS template grammar: per-section uppercase eyebrows, identical card grids,
  hero-metric blocks, gradient accents.
- Terminal-cosplay: green-on-black monospace everywhere for "technical" flavor.
- Warm SaaS-cream backgrounds.

## Design Principles

1. **The tool disappears into the task.** Earned familiarity over novelty;
   standard affordances for standard actions.
2. **The number is the product.** Data (scores, compositions, weights) gets the
   most legible treatment; chrome stays out of the way.
3. **Show certainty honestly.** A weak match must look weak; never dress up a low
   score as a confident answer.
4. **Density without clutter.** 18 inputs and 10 results on one screen, readable
   at a glance, no scrolling gymnastics.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body and placeholder text ≥4.5:1, UI/large text ≥3:1.
Full keyboard operation, visible focus rings, semantic labels on every input.
Respect `prefers-reduced-motion`. Score is never conveyed by color alone: every
result shows rank number, numeric percentage, and bar length together.
