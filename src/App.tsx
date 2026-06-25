import { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Events from './pages/Events';
import Transactions from './pages/Transactions';
import { importSeedData } from './db';
import { seedEvents, seedMembers, seedTransactions } from './seed';

let seeded = false;

export default function App() {
  const initDone = useRef(false);
  const [importKey, setImportKey] = useState(0);

  useEffect(() => {
    if (initDone.current || seeded) return;
    initDone.current = true;
    seeded = true;

    const run = async () => {
      try {
        await importSeedData(seedEvents, seedMembers, seedTransactions);
      } catch (e) {
        console.error('Seed import error:', e);
      }
      setImportKey(k => k + 1);
    };
    run();
  }, []);

  return (
    <HashRouter>
      <Layout key={importKey}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/events" element={<Events />} />
          <Route path="/transactions" element={<Transactions />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
