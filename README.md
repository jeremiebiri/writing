# ResearchWriter

Local research workspace for Windows. React and Vite provide the interface, Node.js connects PostgreSQL, Neo4j, and Redis, and Ollama reviews research claims using models already installed on your computer.

## Run it on Windows

In PowerShell, with Node.js 22.12 or newer, Git, Docker Desktop, and Ollama installed:

```powershell
Set-Location D:\AI
git clone https://github.com/jeremiebiri/writing.git ResearchWriter
Set-Location ResearchWriter
Copy-Item .env.example .env
docker compose up -d --wait
npm install
ollama list
npm run dev
```

Create `D:\AI` first if needed. Open the local URL Vite prints. Keep Ollama running in the system tray. The two supported tags are `qwen3:8b` and `qwen2.5:14b`. The example credentials and exposed ports are for loopback use on a personal computer. Edit `.env` before startup if a default database port conflicts.

## First review

1. Create a project and import your LaTeX section.
2. Import an experiment CSV, for example:

   ```csv
   run,latency_ms
   baseline,60
   hybrid,66
   ```

3. Save a Claim record with the text “The hybrid run recorded 62 ms.”
4. Link the claim to the CSV and select **Check evidence**. The model should report that the second data row says 66 ms. Open the source excerpt beside the answer to verify it.
5. Reload or restart the application. Records, links, and reviews remain available.

## Storage and retrieval

- PostgreSQL owns projects, research records, confirmed links, and review history. A pending projection marker is stored with each link.
- Neo4j holds the evidence graph. A background loop retries pending projections and uses stable PostgreSQL IDs. PostgreSQL supplies confirmed links while the graph catches up.
- Redis caches retrieval IDs by project, project revision, claim, and query. Cache entries expire after two minutes. Redis can restart without affecting saved research.
- Ollama receives a bounded selection of excerpts and labels distinguishing confirmed links from search suggestions. Reviews are model judgments, and CSV discrepancy detection is prompt based. For long CSVs, import the relevant range as its own record to ensure it fits the excerpt sent to the model.

The current interface supports project creation, record imports, evidence linking, and saved claim reviews. LaTeX imports are workspace copies. Development starts both servers via `npm run dev`. The Vite build alone does not start the API. Run `npm run check` for syntax and frontend build checks.
