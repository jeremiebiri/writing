import React, {useEffect,useState} from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const types = {manuscript:'LaTeX section', run:'Experiment CSV', claim:'Claim', note:'Research note', reference:'Reference'};
const empty = {records:[],links:[],reviews:[]};
const initialQuestion = 'Check this claim against the available evidence. Flag mismatched numbers and unsupported conclusions.';

async function request(path, body) {
  const response = await fetch('/api' + path, body === undefined ? {} : {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

function RecordSelect({name, label, records}) {
  return <label>{label}<select name={name} required defaultValue="">
    <option value="" disabled>Choose {label.toLowerCase()}</option>
    {records.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
  </select></label>;
}

function Project({id}) {
  const [data,setData] = useState(empty);
  const [kind,setKind] = useState('manuscript');
  const [title,setTitle] = useState('');
  const [body,setBody] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const path = '/projects/' + id;
  useEffect(() => {
    let current = true;
    request(path).then(result=>{if(current)setData(result);}).catch(e=>{if(current)setError(e.message);});
    return ()=>{current=false;};
  },[path]);

  async function submit(event, endpoint, makePayload, done) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request(path+endpoint,makePayload(new FormData(event.currentTarget)));
      setData(await request(path));
      done?.();
    } catch(e) {setError(e.message);}
    finally {setBusy(false);}
  }

  async function importFile(event) {
    const file=event.target.files[0];
    event.target.value='';
    if (!file) return;
    try {
      if (file.size > 160000) throw new Error('Choose a smaller file or paste an excerpt.');
      const contents=await file.text();
      if (contents.length > 40000) throw new Error('Choose a file with at most 40,000 characters.');
      setKind(file.name.toLowerCase().endsWith('.csv')?'run':'manuscript');
      setTitle(file.name.slice(0,180));
      setBody(contents);
      setError('');
    } catch(e) {setError(e.message);}
  }

  const claims=data.records.filter(r=>r.kind==='claim');
  const sources=data.records.filter(r=>['run','note','reference'].includes(r.kind));
  return <>
    {error && <p role="alert" className="error">{error}</p>}
    {busy && <p role="status">Working… Local model reviews may take a few minutes.</p>}
    <div className="grid">
      <section><h2>Add research material</h2>
        <form onSubmit={e=>submit(e,'/records',()=>({kind,title,body}),()=>{setTitle('');setBody('');})}>
          <fieldset disabled={busy}>
            <label>Record type<select value={kind} onChange={e=>setKind(e.target.value)}>
              {Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select></label>
            <label>Import LaTeX or CSV<input type="file" accept=".tex,.csv" onChange={importFile}/></label>
            <label>Title<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
            <label>Content<textarea required rows={7} maxLength={40000} value={body} onChange={e=>setBody(e.target.value)}/></label>
            <button>Save record</button>
          </fieldset>
        </form>
      </section>
      <div className="stack">
        <section><h2>Link evidence</h2>
          <form onSubmit={e=>submit(e,'/links',d=>({claimId:Number(d.get('claim')),recordId:Number(d.get('source'))}))}>
            <fieldset disabled={busy || !claims.length || !sources.length}>
              <RecordSelect name="claim" label="Claim" records={claims}/>
              <RecordSelect name="source" label="Source" records={sources}/>
              <button>Confirm link</button>
            </fieldset>
          </form>
          {(!claims.length || !sources.length) && <p>Add a claim and an experiment CSV, note, or reference.</p>}
        </section>
        <section><h2>Review a claim</h2>
          <form onSubmit={e=>submit(e,'/reviews',d=>({claimId:Number(d.get('claim')),model:d.get('model'),question:d.get('question')}))}>
            <fieldset disabled={busy || !claims.length}>
              <RecordSelect name="claim" label="Claim" records={claims}/>
              <label>Ollama model<select name="model"><option>qwen3:8b</option><option>qwen2.5:14b</option></select></label>
              <label>Review instructions<textarea name="question" required maxLength={1000} defaultValue={initialQuestion}/></label>
              <button>Check evidence</button>
            </fieldset>
          </form>
        </section>
      </div>
    </div>
    <section><h2>Research records</h2>
      {!data.records.length && <p>Saved material will appear here.</p>}
      {data.records.map(r=><details key={r.id}><summary>{r.title} · {types[r.kind]} · #{r.id}</summary>
        <pre>{r.body}</pre>
        {data.links.filter(link=>link.claim_id===r.id).map(link=><p key={link.record_id}>
          Linked evidence: #{link.record_id} {sources.find(s=>s.id===link.record_id)?.title}
        </p>)}
      </details>)}
    </section>
    <section><h2>Review history</h2>
      {!data.reviews.length && <p>Completed Ollama reviews will appear here.</p>}
      {data.reviews.map(r=><article key={r.id}>
        <h3>{r.model} · {new Date(r.created_at).toLocaleString()}</h3>
        <p>{r.question}</p><pre>{r.reply}</pre>
        {r.sources.map(s=><details key={s.id}><summary>{s.confirmed?'Confirmed link':'Search suggestion'} · #{s.id} {s.title}</summary>
          <pre>{s.excerpt}</pre>
        </details>)}
      </article>)}
    </section>
  </>;
}

function App() {
  const [projects,setProjects]=useState([]);
  const [active,setActive]=useState(null);
  const [error,setError]=useState('');
  const [creating,setCreating]=useState(false);
  useEffect(()=>{
    request('/projects').then(rows=>{setProjects(rows);setActive(rows[0]?.id || null);}).catch(e=>setError(e.message));
  },[]);
  async function create(event) {
    event.preventDefault();
    const form=event.currentTarget;
    setCreating(true);
    setError('');
    try {
      const next=await request('/projects',{name:new FormData(form).get('name')});
      setProjects(previous=>[next,...previous]);setActive(next.id);form.reset();
    } catch(e) {setError(e.message);}
    finally {setCreating(false);}
  }
  return <main>
    <header><p>LOCAL RESEARCH WORKSPACE</p><h1>ResearchWriter</h1></header>
    <section className="project-picker">
      <label>Active project<select value={active ?? ''} onChange={e=>setActive(Number(e.target.value))}>
        <option disabled value="">Select a project</option>
        {projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
      </select></label>
      <form onSubmit={create}><label>New project<input name="name" placeholder="ESANN manuscript" required maxLength={120}/></label>
        <button disabled={creating}>Create project</button>
      </form>
    </section>
    {error && <p className="error" role="alert">{error}</p>}
    {active && <Project key={active} id={active}/>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
