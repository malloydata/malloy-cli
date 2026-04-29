---
description: How to append a Malloy query and its interpretation to a .malloynb notebook file. Follow this when the user says "let's log this", "save this", "add this to the notebook", or similar.
---
# Logging an Analysis to a .malloynb Notebook

## When to use this skill

Trigger phrases: "let's log this", "save this to the notebook", "add this to the file", "log that", "add that to the analysis", or any request to persist a query and its results to a notebook.

## Step 1 — Identify the target file

If the user has not specified a `.malloynb` file in this conversation, ask:

> "Which `.malloynb` file should I append this to?"

Do not proceed until you have a file path.

## Step 2 — Read the file to understand its current state

Before appending, read the file so you know:
- Whether the first cell already contains the experimental flags and import (it should — don't add them again).
- The existing section structure, so your new section follows the same style.

## Step 3 — Append the new section

**Always append** to the end of the file. Never rewrite existing content.

Each logged analysis consists of these cells in order:

### 1. User question cell
The user's question, verbatim, as a blockquote. Use a backslash before `>` so it renders as a blockquote, not a Malloy cell marker:

```
>>>markdown
\> What are the top directors by total ratings?
```

### 2. Section header + description cell
A `##` heading and one sentence describing what the query does:

```
>>>markdown
## Top Directors by Total Ratings
Ranked by sum of vote counts (in thousands) across all their films.
```

### 3. Query cell
The Malloy query **without** an import statement (the first cell in the file already imports the model):

```
>>>malloy
run: movies -> top_directors
```

### 4. Interpretation cell
Bullet-pointed markdown analysis of the results. Lead with the most interesting finding. Use `**bold**` for names and key numbers:

```
>>>markdown
- **Christopher Nolan** leads with 18M total votes across 12 films.
- **Spielberg / Williams** is the most loyal partnership at 85% of films.
```

## Cell format rules

- Cell delimiters are `>>>malloy` and `>>>markdown` on their own line — no trailing spaces.
- No blank lines between the delimiter and the cell content.
- No blank lines between cells (the next `>>>` starts immediately).
- Do **not** add `>>>malloy` cells for imports or flags — only for executable queries.
- Lists and bold in markdown cells render correctly; use them freely for analysis.

## Example — what a complete logged section looks like

```
>>>markdown
\> Can you find composers that work with the top directors?
>>>markdown
## Directors and Their Composer Collaborators
For each top director, shows the composers they work with most frequently.
>>>malloy
run: movies -> {
  where: job = 'director'
  group_by: director is name
  aggregate: total_ratings, title_count
  nest: composers is {
    group_by: principals2.people.primaryName
    where: principals2.category = 'composer'
    aggregate: title_count, percent_of_titles
    limit: 5
  }
  order_by: total_ratings desc
  limit: 20
}
>>>markdown
- **Most loyal partnerships** by % of films: Zemeckis/Silvestri (91%), Coen/Burwell (89%), Spielberg/Williams (85%).
- **Hans Zimmer** is the most in-demand, appearing across six top directors.
- **Martin Scorsese** is the most eclectic — 31 films, top composer at only 16%.
```
