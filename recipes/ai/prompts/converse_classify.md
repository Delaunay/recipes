Given the latest conversation turn, identify which (if any) of these
events occurred.  Return a JSON array — empty if nothing significant.

Possible event kinds:
  new_requirement   — a new requirement was stated
  clarification     — an existing requirement was refined
  decision          — a design decision was made
  contradiction     — something contradicts the current spec
  task_request      — the human is asking for work to be done

Conversation turn
-----------------
Human: {human}
Assistant: {assistant}

Current spec
------------
{spec}

Respond ONLY with a JSON array, e.g.
[{{"kind": "new_requirement", "summary": "..."}}]
