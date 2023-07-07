# malloy-cli

Run Malloy or MalloySQL from the command line!

## Installation

Download the latest release here:

The folder contains a binary named `malloy-cli`. Try running it in the terminal via `{path to malloy-cli}/malloy-cli --help`

### NPM

If you have NPM installed, you can run the Malloy CLI with `npx malloy-cli {command}`, or install it globally with `npm install -g malloy-cli` and run it with `malloy-cli {command}`

## Setup

A database connection is required to run or compile Malloy. Add a database connection with:

```
malloy-cli connections create-bigquery <name>
```

(Or, `create-postgres` or `create-duckdb`). The connection name should be the same connection name you reference in `.malloy` and `.malloysql` files.

#### Setting up BigQuery if you use gCloud

[`gCloud`](https://cloud.google.com/cli) is a command-line tool to work with Google Cloud. Among other things, it can store authentication information for BigQuery. If you already use gCloud to query BigQuery, setting up a connection is as simple as `malloy connections create-bigquery <name>` - no additional authentication information is required. Note that there are other options that you might want to set, such as billing limits - to see possible options, use `malloy connections create-bigquery --help`.

#### Default connections

By default, two connections are created if you don't already have a name that overrides them - "bigquery" and "duckdb". If malloy or malloySQL files reference these connections, they are created automatically. DuckDB uses a built-in instance of DuckDB, and BigQuery attempts to connect to BigQuery using any existing authentication already stored on your computer (like if you have gcloud installed).

## Usage

### Run MalloySQL

MalloySQL enables mixing of you databases DDL commands (for example, CREATE VIEW) with Malloy:

![9f312aa6-ac0c-494d-99da-873ce215470a_1082x1062](https://github.com/malloydata/malloy-cli/assets/108260/6a4b474c-0395-4896-8d38-dedbb945d865)
