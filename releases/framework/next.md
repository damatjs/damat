# @damatjs/framework Unreleased

## Changed

Module locations now produce one resolved runtime surface. Packaged routes
mount through external file-router providers, and declared workflow, job,
event, and pipeline providers load before the job worker starts.

## Action required

None for source users. Package modules need a valid `damat.json`; package mode
remains early alpha.
