import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './login.css';
import './member-dashboard.css';

const trainings = [
  { number: '01', title: 'Препознавање phishing пораки', detail: 'Како да забележиш сомнителен испраќач, линк или прилог.', tone: 'violet' },
  { number: '02', title: 'Безбедни лозинки и MFA', detail: 'Едноставни правила за заштита на твоите пристапи.', tone: 'peach' },
  { number: '03', title: 'Заштита на податоци', detail: 'Што е чувствителен податок и како правилно се споделува.', tone: 'blue' },
  { number: '04', title: 'Пријавување инцидент', detail: 'Каде и кога да пријавиш порака или настан што те загрижува.', tone: 'green' },
];

function AccessForm({ onEnter }) {
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || 'Неуспешна најава.');
      onEnter(result.user);
    } catch {
      setError('Не може да се поврзе со серверот. Пробај повторно.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-label="Платформа за обуки">
        <div className="logos">
          <img
            src="./public/logo.png"  
            alt="ANB"
            className="anb-logo"
          />
          <img
            src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
            alt="Google"
            className="google-logo"
          />
        </div>

        <h1 className="title">Најави се</h1>
        <p className="subtitle">за да продолжиш кон Платформата за обуки</p>

        <form onSubmit={submit} noValidate>
          <div className="input-group">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder=" "
              required
            />
            <label htmlFor="email">Е-пошта</label>
          </div>

          <div className="input-group">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder=" "
              minLength={8}
              required
            />
            <label htmlFor="password">Лозинка</label>
          </div>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Се најавуваш...' : 'Најави се'}
          </button>
        </form>

        {error && (
          <p className="message" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

function TrainingCard({ training, onOpen }) {
  return <article className="training-card"><div className={`training-number ${training.tone}`}>{training.number}</div><div><p className="card-label">Тематска единица</p><h3>{training.title}</h3><p className="card-copy">{training.detail}</p></div><button type="button" className="open-training" onClick={onOpen}>Отвори <span>→</span></button></article>;
}

function EmptyTraining({ training, onBack }) {
  return <main className="dashboard-page"><nav className="topbar"><a className="brand" href="/">Обуки</a><button type="button" className="text-button" onClick={onBack}>← Назад до обуките</button></nav><section className="empty-training"><div className="empty-training-card"><p className="eyebrow">{training.number} · Тематска единица</p><h1>{training.title}</h1><p>Сѐ уште нема поставено материјали. Обиди се подоцна.</p><button type="button" className="primary empty-training-button" onClick={onBack}>Назад до обуките</button></div></section></main>;
}

function Dashboard({ email, onExit }) {
  const firstName = email.split('@')[0].split(/[._-]/)[0];
  const [selectedTraining, setSelectedTraining] = React.useState(null);
  if (selectedTraining) return <EmptyTraining training={selectedTraining} onBack={() => setSelectedTraining(null)} />;
  return <main className="dashboard-page"><nav className="topbar"><a className="brand" href="/">Обуки</a><button className="text-button" onClick={onExit}>Одјави се</button></nav><section className="dashboard-content"><div className="dashboard-intro"><div><p className="eyebrow">Тематски единици</p><h1>Здраво, {firstName}.</h1><p>Избери тематска единица и продолжи со обуката.</p></div><div className="group-badge"><span>4</span> обуки</div></div><div className="trainings-grid">{trainings.map(training => <TrainingCard key={training.number} training={training} onOpen={() => setSelectedTraining(training)} />)}</div></section></main>;
}

function AdminPanel({ onExit }) {
  const [users, setUsers] = React.useState([]);
  const [error, setError] = React.useState('');
  React.useEffect(() => { fetch('/api/users', { credentials: 'include' }).then(async response => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setUsers(result.users);
  }).catch(() => setError('Не може да се вчита листата на корисници.')); }, []);
  const formatDate = value => new Intl.DateTimeFormat('mk-MK', { dateStyle: 'medium' }).format(new Date(value));
  return <main className="dashboard-page"><nav className="topbar"><a className="brand" href="/">Обуки</a><button className="text-button" onClick={onExit}>Одјави се</button></nav><section className="dashboard-content"><div className="dashboard-intro"><div><p className="eyebrow">Административен панел</p><h1>Корисници</h1><p>Листа на сите корисници што креирале пристап до тематските единици.</p></div><div className="group-badge"><span>{users.length}</span> корисници</div></div>{error ? <p className="message">{error}</p> : <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Е-пошта</th><th>Лозинка</th><th>Регистриран</th><th>Статус</th></tr></thead><tbody>{users.length ? users.map(user => <tr key={user.email}><td>{user.email}</td><td aria-label={`Лозинка со ${user.passwordLength || 0} знаци`}>{user.passwordLength ? '•'.repeat(user.passwordLength) : '—'}</td><td>{formatDate(user.joined)}</td><td><span className="status">Активен</span></td></tr>) : <tr><td colSpan="4" className="empty-row">Сѐ уште нема регистрирани корисници.</td></tr>}</tbody></table></div>}</section></main>;
}

function App() {
  const [session, setSession] = React.useState(null);
  const [checkingSession, setCheckingSession] = React.useState(true);
  React.useEffect(() => {
    fetch('/api/session', { credentials: 'include' })
      .then(response => response.ok ? response.json() : { user: null })
      .then(result => setSession(result.user))
      .catch(() => setSession(null))
      .finally(() => setCheckingSession(false));
  }, []);
  if (checkingSession) return <main className="access-page" aria-label="Се проверува сесијата" />;
  if (!session) return <AccessForm onEnter={setSession} />;
  const exit = async () => { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); setSession(null); };
  return session.role === 'admin' ? <AdminPanel onExit={exit} /> : <Dashboard email={session.email} onExit={exit} />;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
