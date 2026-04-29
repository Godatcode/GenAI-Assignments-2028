# Reflection

## What worked

The single biggest unlock was treating the system prompt like a **product spec** instead of a one-liner. My first cut at "You are Anshuman Singh, helpful and encouraging" produced exactly what the assignment warns about — a polite, bland, interchangeable assistant. Replacing that with a structured prompt — persona description, communication style, chain-of-thought instruction, three concrete few-shot examples, output format, and hard constraints — instantly made the responses feel like distinct people. Anshuman became concise and Facebook-grounded; Abhimanyu became strategic and big-picture; Kshitij became patient and pedagogical. The biggest individual lever was the **few-shot examples**: even three short user→persona pairs in the system block anchored tone, length, ending style, and characteristic phrasing more reliably than any amount of descriptive text. The second biggest was forcing **first-person voice** ("you ARE Anshuman, not an AI pretending to be him") — without it the model defaults to the AI-hedge voice the moment a personal question shows up.

On the engineering side, **streaming responses** were worth the small extra effort: the typing indicator hides the cold start, and once tokens arrive the UI feels instant. Resetting the conversation on persona switch also prevents one persona's history from leaking into another's reasoning.

## What GIGO taught me

GIGO (garbage in, garbage out) showed up in two specific ways. First, **vague descriptions produce vague output.** "Anshuman is a successful founder who cares about education" gives the model nothing to anchor to — the response could describe any of a thousand founders. Adding concrete, verifiable facts ("ICPC World Finals twice", "founding team for Facebook Messenger", "Facebook London 2013", "left late 2014") gave the model real material. The same question — "how do I get into FAANG?" — went from generic LinkedIn-speak to "when I was hiring at Facebook…" because the prompt now contained the *evidence* the model could draw on.

Second, **lazy constraints invite hallucination.** Without "never make up quotes or placement stats," the model happily invents specific salaries, fake placement company names, and quotes Anshuman never said. The constraints aren't decorative — they actively shape the output by removing the easy-but-wrong path. The same is true of "never break character": without it, the moment a user asks "as an AI, what do you think?", the persona collapses.

The deeper lesson: prompt engineering is **information density work**. Every sentence in the system prompt either gives the model something to reason from or removes a failure mode. Sentences that do neither are costing tokens and adding nothing.

## What I'd improve

Three things, in priority order. **One:** add long-conversation memory — replay the full history every turn gets expensive and drifts off-character; a summary-of-older-turns plus last-N-messages window fixes both. **Two:** ground each persona with retrieval over a small corpus of talks, blog posts, and podcast transcripts so quotes come from real source material instead of paraphrase. **Three:** add per-persona evals — a fixed set of test questions with hand-written ideal responses, scored on tone, length, and constraint compliance — so prompt edits can be validated instead of judged by vibes.
